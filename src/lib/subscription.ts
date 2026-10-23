import prisma from "@/lib/db";
import { parseProduct } from "@/lib/billing-config";
import { grantPlanTokens, grantTopupTokens } from "@/lib/wallet";
import { logPaymentEvent } from "@/lib/payment-audit";
import { amountMatches, computePeriod } from "@/lib/subscription-period";
import { PLAN_PERIOD_DAYS } from "@/lib/pricing-catalog";

export type ActivationResult =
  | { ok: true; activated: boolean; kind: "plan" | "topup"; plan: string; periodEnd: Date }
  | { ok: false; reason: "not_found" | "bad_plan" | "amount_mismatch" | "refunded" };

/** Writes the user's plan into Clerk public metadata (the mobile app and API read it). Returns false on failure. */
export async function syncClerkPlan(clerkUserId: string): Promise<boolean> {
  try {
    const u = await prisma.allowedUser.findUnique({
      where: { clerkUserId },
      select: { plan: true, planKey: true, subscriptionStatus: true, currentPeriodEnd: true },
    });
    if (!u) return false;
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        plan: u.plan,
        planKey: u.planKey,
        subscriptionStatus: u.subscriptionStatus,
        currentPeriodEnd: u.currentPeriodEnd ? u.currentPeriodEnd.toISOString() : null,
      },
    });
    return true;
  } catch (err) {
    console.error("[subscription] Clerk metadata sync failed:", err);
    return false;
  }
}

/**
 * The single place a captured payment becomes a paid plan. Safe to call from the browser confirm route and the
 * webhook, in any order and any number of times: the order row is claimed atomically (`periodEnd IS NULL`), so the
 * period is granted exactly once; later calls only re-sync Clerk.
 */
export async function activateOrder(opts: {
  orderId: string;
  paymentId: string;
  /** When set, the order must belong to this user (browser routes). Webhooks omit it. */
  userId?: string;
  /** Amount (minor units) and currency Razorpay says were captured, when known. Both must equal the order. */
  capturedPaise?: number;
  capturedCurrency?: string;
  actor: "user" | "webhook" | "system";
  correlationId?: string;
}): Promise<ActivationResult> {
  const rec = await prisma.paymentRecord.findUnique({ where: { razorpayOrderId: opts.orderId } });
  if (!rec || (opts.userId && rec.clerkUserId !== opts.userId)) return { ok: false, reason: "not_found" };
  const product = parseProduct(rec.product);
  if (!product) return { ok: false, reason: "bad_plan" };
  if (rec.status === "REFUNDED" || rec.status === "PARTIALLY_REFUNDED") return { ok: false, reason: "refunded" };
  // The order row was created by the server with the price at that moment: it is the only amount that counts.
  const currencyOk = !opts.capturedCurrency || opts.capturedCurrency.toUpperCase() === rec.currency.toUpperCase();
  if (!currencyOk || !amountMatches(rec.amount, opts.capturedPaise)) {
    await logPaymentEvent({
      paymentRecordId: rec.id,
      clerkUserId: rec.clerkUserId,
      event: "payment.amount_mismatch",
      actor: opts.actor,
      razorpayOrderId: opts.orderId,
      razorpayPaymentId: opts.paymentId,
      correlationId: opts.correlationId,
      success: false,
      errorMessage: `order ${rec.amount} ${rec.currency}, captured ${opts.capturedPaise ?? "n/a"} ${opts.capturedCurrency ?? ""}`,
    });
    return { ok: false, reason: "amount_mismatch" };
  }
  const userId = rec.clerkUserId;

  const out = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const current = await tx.allowedUser.findUnique({
      where: { clerkUserId: userId },
      select: { plan: true, subscriptionStatus: true, currentPeriodEnd: true },
    });
    const stackOn = current && current.plan !== "FREE" && current.subscriptionStatus === "ACTIVE" ? current.currentPeriodEnd : null;
    // Top-ups do not touch the plan period; the claim marker is simply "periodEnd set".
    const { start, end } = product.kind === "plan" ? computePeriod(now, stackOn, PLAN_PERIOD_DAYS) : { start: now, end: now };
    const claimed = await tx.paymentRecord.updateMany({
      where: { id: rec.id, periodEnd: null },
      data: { status: "CAPTURED", razorpayPaymentId: opts.paymentId, signatureVerified: true, verifiedAt: now, periodStart: start, periodEnd: end },
    });
    if (claimed.count === 0) {
      const done = await tx.paymentRecord.findUnique({ where: { id: rec.id }, select: { periodEnd: true } });
      return { activated: false, periodEnd: done?.periodEnd ?? end };
    }
    if (product.kind === "topup") {
      await grantTopupTokens(tx, userId, product.spec.st, `topup:${opts.orderId}`, now);
      return { activated: true, periodEnd: end };
    }
    const spec = product.spec;
    const data = {
      plan: spec.id,
      planKey: spec.key,
      status: "APPROVED" as const,
      approvedAt: now,
      // Daily caps are speed/abuse limits only; the wallet is what actually pays for usage.
      maxDailyTokens: Math.ceil(spec.monthlyST / 5),
      maxDailyRequests: spec.dailyRequests,
      graceTokens: 0,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      subscriptionStatus: "ACTIVE" as const,
      lastPaymentAt: now,
      lastPaymentId: opts.paymentId,
    };
    await tx.allowedUser.upsert({
      where: { clerkUserId: userId },
      create: { clerkUserId: userId, email: `${userId}@cobentt.local`, ...data },
      update: data,
    });
    await grantPlanTokens(tx, userId, spec.monthlyST, end, `grant:${opts.orderId}`);
    return { activated: true, periodEnd: end };
  });

  const synced = await syncClerkPlan(userId);
  await logPaymentEvent({
    paymentRecordId: rec.id,
    clerkUserId: userId,
    event: out.activated ? "payment.activated" : "payment.activation_replayed",
    actor: opts.actor,
    razorpayOrderId: opts.orderId,
    razorpayPaymentId: opts.paymentId,
    correlationId: opts.correlationId,
    details: { product: rec.product ?? "", periodEnd: out.periodEnd.toISOString(), clerkSynced: synced },
  });
  return { ok: true, activated: out.activated, kind: product.kind, plan: product.kind === "plan" ? product.spec.label : "Top-up", periodEnd: out.periodEnd };
}
