import prisma from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { PLAN_SPECS, PLAN_PERIOD_DAYS, type PlanKey } from "@/lib/pricing-catalog";
import { grantPlanTokens, expirePlanAllowance } from "@/lib/wallet";
import { logPaymentEvent } from "@/lib/payment-audit";
import { syncPlanMetadata } from "@/lib/plan-sync";
import { BILLING_CURRENCY } from "@/lib/billing-config";

/** Razorpay bills monthly until cancelled. 120 cycles is a ten-year ceiling, not a promise. */
const SUBSCRIPTION_CYCLES = 120;

export class AlreadySubscribed extends Error {}
export class UnknownPlan extends Error {}

export async function ensureAllowedUser(clerkUserId: string) {
  return prisma.allowedUser.upsert({
    where: { clerkUserId },
    create: { clerkUserId, email: `${clerkUserId}@cobentt.local`, status: "APPROVED", approvedAt: new Date() },
    update: {},
  });
}

/** One Razorpay Plan per tier and price. Created on first use, then reused for every subscription. */
export async function ensureRazorpayPlan(planKey: PlanKey): Promise<string> {
  const spec = PLAN_SPECS[planKey];
  if (!spec) throw new UnknownPlan(planKey);
  const existing = await prisma.razorpayPlanRef.findUnique({
    where: { planKey_amountPaise: { planKey, amountPaise: spec.priceINRPaise } },
  });
  if (existing) return existing.razorpayPlanId;

  const created = await getRazorpay().plans.create({
    period: "monthly",
    interval: 1,
    item: {
      name: `Cobentt ${spec.label}`,
      amount: spec.priceINRPaise,
      currency: BILLING_CURRENCY,
      description: `${PLAN_PERIOD_DAYS}-day API budget`,
    },
    notes: { planKey },
  });
  try {
    await prisma.razorpayPlanRef.create({ data: { planKey, amountPaise: spec.priceINRPaise, razorpayPlanId: created.id } });
    return created.id;
  } catch {
    const raced = await prisma.razorpayPlanRef.findUniqueOrThrow({
      where: { planKey_amountPaise: { planKey, amountPaise: spec.priceINRPaise } },
    });
    return raced.razorpayPlanId;
  }
}

export async function createSubscription(clerkUserId: string, planKey: PlanKey): Promise<{ subscriptionId: string; shortUrl: string }> {
  const user = await ensureAllowedUser(clerkUserId);
  if (user.plan !== "FREE" && user.subscriptionStatus === "ACTIVE" && user.currentPeriodEnd && user.currentPeriodEnd > new Date()) {
    throw new AlreadySubscribed();
  }
  const planId = await ensureRazorpayPlan(planKey);
  const sub = await getRazorpay().subscriptions.create({
    plan_id: planId,
    total_count: SUBSCRIPTION_CYCLES,
    customer_notify: 1,
    notes: { clerkUserId, planKey },
  });
  await prisma.allowedUser.update({
    where: { clerkUserId },
    data: { razorpaySubscriptionId: sub.id, cancelAtPeriodEnd: false },
  });
  await logPaymentEvent({
    clerkUserId,
    event: "subscription.created",
    actor: "user",
    details: { subscriptionId: sub.id, planKey },
  });
  return { subscriptionId: sub.id, shortUrl: String(sub.short_url) };
}

export async function cancelSubscription(clerkUserId: string): Promise<boolean> {
  const user = await prisma.allowedUser.findUnique({
    where: { clerkUserId },
    select: { razorpaySubscriptionId: true, subscriptionStatus: true, currentPeriodEnd: true },
  });
  if (!user?.razorpaySubscriptionId) return false;
  // A paid, running period is cancelled at its end so the customer keeps what they paid for. Without one there is no
  // billing cycle to end, and Razorpay only accepts an immediate cancel.
  const inPaidPeriod = user.subscriptionStatus === "ACTIVE" && !!user.currentPeriodEnd && user.currentPeriodEnd > new Date();
  await getRazorpay().subscriptions.cancel(user.razorpaySubscriptionId, inPaidPeriod);
  await prisma.allowedUser.update({ where: { clerkUserId }, data: { cancelAtPeriodEnd: inPaidPeriod } });
  await logPaymentEvent({
    clerkUserId,
    event: inPaidPeriod ? "subscription.cancel_at_period_end" : "subscription.cancelled_now",
    actor: "user",
    details: { subscriptionId: user.razorpaySubscriptionId },
  });
  await syncPlanMetadata(clerkUserId);
  return true;
}

export class NoActivePlan extends Error {}
export class SamePlan extends Error {}

/**
 * Moves a running subscription to another tier. An upgrade takes effect now and Razorpay bills the new price at once;
 * the budget changes only when that charge arrives (`subscription.charged`), so nothing is granted without payment.
 * A downgrade waits for the end of the paid period.
 */
export async function changePlan(clerkUserId: string, to: PlanKey): Promise<{ effective: "now" | "cycle_end" }> {
  const user = await prisma.allowedUser.findUnique({
    where: { clerkUserId },
    select: { razorpaySubscriptionId: true, planKey: true, subscriptionStatus: true, currentPeriodEnd: true },
  });
  const active = user?.subscriptionStatus === "ACTIVE" && !!user.currentPeriodEnd && user.currentPeriodEnd > new Date();
  if (!user?.razorpaySubscriptionId || !user.planKey || !active) throw new NoActivePlan();
  if (user.planKey === to) throw new SamePlan();
  const from = PLAN_SPECS[user.planKey as PlanKey];
  const target = PLAN_SPECS[to];
  const upgrade = target.priceINRPaise > from.priceINRPaise;
  const live = await getRazorpay().subscriptions.fetch(user.razorpaySubscriptionId);
  if (live.status !== "active" && live.status !== "authenticated") throw new NoActivePlan();
  const planId = await ensureRazorpayPlan(to);
  await getRazorpay().subscriptions.update(user.razorpaySubscriptionId, {
    plan_id: planId,
    schedule_change_at: upgrade ? "now" : "cycle_end",
  });
  await logPaymentEvent({
    clerkUserId,
    event: upgrade ? "subscription.upgrade_requested" : "subscription.downgrade_scheduled",
    actor: "user",
    details: { subscriptionId: user.razorpaySubscriptionId, from: from.key, to },
  });
  return { effective: upgrade ? "now" : "cycle_end" };
}

type SubEntity = { id: string; plan_id: string; status: string; current_start?: number | null; current_end?: number | null };
type PaymentEntity = { id: string; amount: number; currency: string; status?: string };

/**
 * Applies one Razorpay subscription event. Renewals are granted exactly once per payment (`sub:<id>:<payment>`), so
 * a retried or duplicated `subscription.charged` cannot add budget twice.
 */
export async function applySubscriptionEvent(opts: {
  event: string;
  /** Razorpay's id for this delivery. Makes revocations idempotent per event, not per subscription. */
  eventId: string;
  subscription: SubEntity;
  payment?: PaymentEntity;
  correlationId?: string;
}): Promise<void> {
  const { event, subscription: sub, payment } = opts;
  const user = await prisma.allowedUser.findFirst({ where: { razorpaySubscriptionId: sub.id } });
  if (!user?.clerkUserId) {
    await logPaymentEvent({ event: `subscription.unknown.${event}`, actor: "webhook", success: false, details: { subscriptionId: sub.id } });
    return;
  }
  const clerkUserId = user.clerkUserId;

  if (event === "subscription.charged") {
    if (!payment) throw new Error("subscription.charged without payment");
    const plan = await prisma.razorpayPlanRef.findUnique({ where: { razorpayPlanId: sub.plan_id } });
    if (!plan || !(plan.planKey in PLAN_SPECS)) {
      await logPaymentEvent({ clerkUserId, event: "subscription.plan_unknown", actor: "webhook", success: false, details: { planId: sub.plan_id } });
      return;
    }
    const spec = PLAN_SPECS[plan.planKey as PlanKey];
    if (payment.amount !== spec.priceINRPaise || payment.currency.toUpperCase() !== BILLING_CURRENCY) {
      await logPaymentEvent({
        clerkUserId,
        event: "payment.amount_mismatch",
        actor: "webhook",
        success: false,
        razorpayPaymentId: payment.id,
        errorMessage: `plan ${spec.priceINRPaise} ${BILLING_CURRENCY}, charged ${payment.amount} ${payment.currency}`,
      });
      return;
    }
    const periodStart = new Date((sub.current_start ?? Date.now() / 1000) * 1000);
    const periodEnd = new Date((sub.current_end ?? Date.now() / 1000 + PLAN_PERIOD_DAYS * 86_400) * 1000);
    await prisma.$transaction(async (tx) => {
      await tx.allowedUser.update({
        where: { clerkUserId },
        data: {
          plan: "PRO",
          planKey: spec.key,
          status: "APPROVED",
          subscriptionStatus: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          lastPaymentAt: new Date(),
          lastPaymentId: payment.id,
        },
      });
      await grantPlanTokens(tx, clerkUserId, spec.budgetMicroUSD, periodEnd, `sub:${sub.id}:${payment.id}`);
    });
    await logPaymentEvent({
      clerkUserId,
      event: "subscription.renewed",
      actor: "webhook",
      razorpayPaymentId: payment.id,
      correlationId: opts.correlationId,
      details: { subscriptionId: sub.id, planKey: spec.key, periodEnd: periodEnd.toISOString() },
    });
    await syncPlanMetadata(clerkUserId);
    return;
  }

  const transition: Record<string, { status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "PAUSED"; revoke: boolean } | undefined> = {
    "subscription.activated": { status: "ACTIVE", revoke: false },
    "subscription.halted": { status: "PAST_DUE", revoke: true },
    "subscription.paused": { status: "PAUSED", revoke: true },
    "subscription.resumed": { status: "ACTIVE", revoke: false },
    "subscription.cancelled": { status: "CANCELLED", revoke: true },
    "subscription.completed": { status: "EXPIRED", revoke: true },
  };
  const t = transition[event];
  if (!t) return;

  await prisma.allowedUser.update({ where: { clerkUserId }, data: { subscriptionStatus: t.status } });
  if (t.revoke) await expirePlanAllowance(clerkUserId, opts.eventId);
  await logPaymentEvent({ clerkUserId, event: event, actor: "webhook", details: { subscriptionId: sub.id, status: t.status } });
  await syncPlanMetadata(clerkUserId);
}

/**
 * Ends billing for an account that is being deleted. The subscription is cancelled now: there is no period left to finish,
 * and nothing renews after deletion. Returns false when there was nothing to cancel. Throws if Razorpay refuses, so the
 * caller can stop the deletion instead of leaving a live subscription behind.
 */
export async function cancelSubscriptionForDeletion(clerkUserId: string): Promise<boolean> {
  const user = await prisma.allowedUser.findUnique({
    where: { clerkUserId },
    select: { razorpaySubscriptionId: true },
  });
  const subscriptionId = user?.razorpaySubscriptionId;
  if (!subscriptionId) return false;

  const remote = await getRazorpay().subscriptions.fetch(subscriptionId);
  if (remote.status !== "cancelled" && remote.status !== "completed") {
    await getRazorpay().subscriptions.cancel(subscriptionId, false);
  }
  await logPaymentEvent({
    clerkUserId,
    event: "subscription.cancelled_for_deletion",
    actor: "system",
    details: { subscriptionId },
  });
  return true;
}
