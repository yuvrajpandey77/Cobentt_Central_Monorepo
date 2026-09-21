import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { logPaymentEvent } from "@/lib/payment-audit";
import { PAYMENT_PLANS } from "@/lib/payment-plans";

export const dynamic = "force-dynamic";

// Disable body parsing — we need the raw body for signature verification
export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return false;
  }
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  return sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[razorpay-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: Record<string, { entity: Record<string, unknown> }> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event: eventType, payload } = event;

  // Webhook event deduplication: key on the Razorpay entity id so that
  // re-deliveries of the SAME event dedupe, but distinct payments never collide.
  // (The old key used only top-level payload key names, which are identical for
  // every event of a given type — it dropped all payments after the first.)
  const entityKey = Object.keys(payload ?? {})[0] ?? "unknown";
  const entity = (payload?.[entityKey] as { entity?: Record<string, unknown> } | undefined)?.entity;
  const entityId = typeof entity?.id === "string" && entity.id ? entity.id : null;
  const dedupeKey = entityId
    ? `${eventType}:${entityKey}:${entityId}`
    : `${eventType}:body:${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
  const existingLog = await prisma.paymentAuditLog.findFirst({
    where: {
      event: `webhook.${eventType}`,
      actor: "webhook",
      details: { path: ["dedupeKey"], equals: dedupeKey },
    },
    select: { id: true },
  });

  if (existingLog) {
    console.info(`[razorpay-webhook] Duplicate event ignored: ${eventType}`);
    return NextResponse.json({ status: "ok", message: "Duplicate event" });
  }

  await logPaymentEvent({
    event: `webhook.${eventType}`,
    actor: "webhook",
    details: { eventType, payloadKeys: Object.keys(payload).join(","), dedupeKey },
  });

  try {
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(payload);
        break;
      case "payment.failed":
        await handlePaymentFailed(payload);
        break;
      case "payment.authorized":
        await handlePaymentAuthorized(payload);
        break;
      case "refund.created":
      case "refund.processed":
        await handleRefund(eventType, payload);
        break;
      case "subscription.activated":
      case "subscription.charged":
        await handleSubscriptionEvent(eventType, payload);
        break;
      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.paused":
      case "subscription.resumed":
        await handleSubscriptionEvent(eventType, payload);
        break;
      default:
        console.info(`[razorpay-webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error(`[razorpay-webhook] Error processing ${eventType}:`, err);
    await logPaymentEvent({
      event: `webhook.${eventType}.failed`,
      actor: "webhook",
      success: false,
      errorMessage: err instanceof Error ? err.message : "Processing error",
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handlePaymentCaptured(payload: Record<string, { entity: Record<string, unknown> }>) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = String(payment.order_id ?? "");
  const paymentId = String(payment.id ?? "");

  const existing = await prisma.paymentRecord.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    // Idempotency: skip if already captured
    if (existing.status === "CAPTURED") return;

    await prisma.paymentRecord.update({
      where: { razorpayOrderId: orderId },
      data: {
        razorpayPaymentId: paymentId,
        status: "CAPTURED",
      },
    });

    // Activate subscription via webhook (ensures user gets access even if confirm route fails)
    const planKey = Object.keys(PAYMENT_PLANS).find(
      (k) => PAYMENT_PLANS[k].id === existing.plan
    );
    const planDef = planKey ? PAYMENT_PLANS[planKey] : null;

    // SECURITY: only entitle when the captured amount matches the order amount.
    // A mismatch means the money paid differs from the plan price — record it,
    // but do NOT activate the plan (prevents pay-less-get-plan via tampered orders).
    const capturedAmount = Number(payment.amount);
    if (planDef && existing.clerkUserId && capturedAmount !== existing.amount) {
      await logPaymentEvent({
        paymentRecordId: existing.id,
        clerkUserId: existing.clerkUserId,
        event: "payment.amount_mismatch",
        actor: "webhook",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        success: false,
        errorMessage: `Captured ${capturedAmount} != order ${existing.amount} for plan ${existing.plan}`,
      });
    }

    if (planDef && existing.clerkUserId && capturedAmount === existing.amount) {
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await prisma.allowedUser.upsert({
        where: { clerkUserId: existing.clerkUserId },
        create: {
          clerkUserId: existing.clerkUserId,
          email: `${existing.clerkUserId}@cobentt.local`,
          status: "APPROVED",
          plan: planDef.id,
          maxDailyTokens: planDef.maxDailyTokens,
          maxDailyRequests: planDef.maxDailyRequests,
          graceTokens: planDef.graceTokens,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          subscriptionStatus: "ACTIVE",
          lastPaymentAt: new Date(),
          lastPaymentId: paymentId,
        },
        update: {
          plan: planDef.id,
          status: "APPROVED",
          approvedAt: new Date(),
          maxDailyTokens: planDef.maxDailyTokens,
          maxDailyRequests: planDef.maxDailyRequests,
          graceTokens: planDef.graceTokens,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          subscriptionStatus: "ACTIVE",
          lastPaymentAt: new Date(),
          lastPaymentId: paymentId,
        },
      });

      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        await client.users.updateUserMetadata(existing.clerkUserId, {
          publicMetadata: {
            plan: planDef.id,
            subscriptionStatus: "ACTIVE",
            currentPeriodEnd: periodEnd.toISOString(),
          },
        });
      } catch (clerkErr) {
        console.error("[razorpay-webhook] Clerk metadata sync failed:", clerkErr);
      }
    }
  }

  await logPaymentEvent({
    paymentRecordId: existing?.id,
    clerkUserId: existing?.clerkUserId,
    event: "payment.captured",
    actor: "webhook",
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    details: { amount: Number(payment.amount), currency: String(payment.currency) },
  });
}

async function handlePaymentFailed(payload: Record<string, { entity: Record<string, unknown> }>) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id as string;
  const paymentId = payment.id as string;
  const errorDescription = String(payment.error_description ?? "Payment failed");

  const existing = await prisma.paymentRecord.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    await prisma.paymentRecord.update({
      where: { razorpayOrderId: orderId },
      data: {
        razorpayPaymentId: paymentId,
        status: "FAILED",
      },
    });
  }

  // Downgrade subscription if payment fails
  if (existing?.clerkUserId) {
    await prisma.allowedUser.updateMany({
      where: { clerkUserId: existing.clerkUserId },
      data: {
        subscriptionStatus: "PAST_DUE",
      },
    });

    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      await client.users.updateUserMetadata(existing.clerkUserId, {
        publicMetadata: { subscriptionStatus: "PAST_DUE" },
      });
    } catch (clerkErr) {
      console.error("[razorpay-webhook] Clerk metadata sync failed:", clerkErr);
    }
  }

  await logPaymentEvent({
    paymentRecordId: existing?.id,
    clerkUserId: existing?.clerkUserId,
    event: "payment.failed",
    actor: "webhook",
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    success: false,
    errorMessage: errorDescription,
  });
}

async function handlePaymentAuthorized(payload: Record<string, { entity: Record<string, unknown> }>) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  const orderId = payment.order_id as string;
  const paymentId = payment.id as string;

  const existing = await prisma.paymentRecord.findUnique({
    where: { razorpayOrderId: orderId },
  });

  if (existing) {
    await prisma.paymentRecord.update({
      where: { razorpayOrderId: orderId },
      data: {
        razorpayPaymentId: paymentId,
        status: "AUTHORIZED",
      },
    });
  }

  await logPaymentEvent({
    paymentRecordId: existing?.id,
    clerkUserId: existing?.clerkUserId,
    event: "payment.authorized",
    actor: "webhook",
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  });
}

async function handleRefund(
  eventType: string,
  payload: Record<string, { entity: Record<string, unknown> }>
) {
  const refund = payload.refund?.entity;
  if (!refund) return;

  const paymentId = String(refund.payment_id);
  const refundId = String(refund.id);
  const amount = Number(refund.amount);

  const existing = await prisma.paymentRecord.findUnique({
    where: { razorpayPaymentId: paymentId },
  });

  if (existing) {
    const isFullRefund = amount >= existing.amount;
    await prisma.paymentRecord.update({
      where: { id: existing.id },
      data: {
        refundId,
        refundAmount: amount,
        refundStatus: "PROCESSED",
        refundedAt: new Date(),
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    // Downgrade if full refund AND no other active payments
    if (isFullRefund && existing.clerkUserId) {
      const otherActivePayments = await prisma.paymentRecord.count({
        where: {
          clerkUserId: existing.clerkUserId,
          id: { not: existing.id },
          status: "CAPTURED",
          periodEnd: { gt: new Date() },
        },
      });

      if (otherActivePayments === 0) {
        await prisma.allowedUser.updateMany({
          where: { clerkUserId: existing.clerkUserId },
          data: {
            plan: "FREE",
            status: "APPROVED",
            maxDailyTokens: 200_000,
            maxDailyRequests: 6,
            graceTokens: 20_000,
            subscriptionStatus: "CANCELLED",
            razorpaySubscriptionId: null,
            currentPeriodEnd: null,
          },
        });

        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          await client.users.updateUserMetadata(existing.clerkUserId, {
            publicMetadata: { plan: "FREE", subscriptionStatus: "CANCELLED" },
          });
        } catch (clerkErr) {
          console.error("[razorpay-webhook] Clerk metadata sync failed:", clerkErr);
        }
      }
    }

    await logPaymentEvent({
      paymentRecordId: existing.id,
      clerkUserId: existing.clerkUserId,
      event: eventType,
      actor: "webhook",
      razorpayPaymentId: paymentId,
      details: { refundId, refundAmount: amount, isFullRefund },
    });
  }
}

async function handleSubscriptionEvent(
  eventType: string,
  payload: Record<string, { entity: Record<string, unknown> }>
) {
  const subscription = payload.subscription?.entity;
  if (!subscription) return;

  const subscriptionId = String(subscription.id);
  const status = String(subscription.status);

  const existing = await prisma.allowedUser.findFirst({
    where: { razorpaySubscriptionId: subscriptionId },
  });

  if (!existing) {
    console.info(`[razorpay-webhook] No user found for subscription ${subscriptionId}`);
    return;
  }

  const statusMap: Record<string, string> = {
    activated: "ACTIVE",
    charged: "ACTIVE",
    cancelled: "CANCELLED",
    completed: "CANCELLED",
    paused: "PAUSED",
    resumed: "ACTIVE",
  };

  const mappedStatus = statusMap[status] ?? "ACTIVE";

  await prisma.allowedUser.updateMany({
    where: { clerkUserId: existing.clerkUserId },
    data: {
      subscriptionStatus: mappedStatus as "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "PAUSED",
    },
  });

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(existing.clerkUserId!, {
      publicMetadata: { subscriptionStatus: mappedStatus },
    });
  } catch (clerkErr) {
    console.error("[razorpay-webhook] Clerk metadata sync failed:", clerkErr);
  }

  await logPaymentEvent({
    clerkUserId: existing.clerkUserId ?? undefined,
    event: `subscription.${status}`,
    actor: "webhook",
    details: { subscriptionId, status, mappedStatus },
  });
}
