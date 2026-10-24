import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/db";
import { logPaymentEvent } from "@/lib/payment-audit";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { activateOrder } from "@/lib/subscription";
import { applySubscriptionEvent } from "@/lib/razorpay-subscriptions";
import { expirePlanAllowance, revokeOrderGrant } from "@/lib/wallet";
import { syncPlanMetadata } from "@/lib/plan-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Payload = Record<string, { entity: Record<string, unknown> }>;

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.halted",
  "subscription.pending",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed",
]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET ?? "")) {
    console.warn("[razorpay-webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; payload: Payload };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event;
  const payload = event.payload ?? {};
  // Razorpay gives every delivery a unique id. Dedupe on it: a retry of the same delivery is skipped, while each renewal
  // (same subscription id, new event) is processed. Falls back to a body hash when the header is absent.
  const deliveryId = req.headers.get("x-razorpay-event-id");
  const dedupeKey = deliveryId ? `delivery:${deliveryId}` : `body:${crypto.createHash("sha256").update(rawBody).digest("hex")}`;
  const seen = await prisma.paymentAuditLog.findFirst({
    where: { event: `webhook.${eventType}`, actor: "webhook", details: { path: ["dedupeKey"], equals: dedupeKey } },
    select: { id: true },
  });
  if (seen) return NextResponse.json({ status: "ok", message: "Duplicate event" });

  try {
    if (SUBSCRIPTION_EVENTS.has(eventType)) {
      const subscription = payload.subscription?.entity as Record<string, unknown> | undefined;
      const payment = payload.payment?.entity as Record<string, unknown> | undefined;
      if (subscription) {
        await applySubscriptionEvent({
          event: eventType,
          eventId: deliveryId ?? dedupeKey,
          subscription: subscription as never,
          payment: payment ? { id: String(payment.id), amount: Number(payment.amount), currency: String(payment.currency ?? ""), status: String(payment.status ?? "") } : undefined,
        });
      }
    } else {
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
          await handleRefund(eventType, payload, deliveryId ?? dedupeKey);
          break;
        default:
          console.info(`[razorpay-webhook] Unhandled event: ${eventType}`);
      }
    }

    // Recorded only after success: if anything above throws, Razorpay's retry runs again instead of being deduped away.
    await logPaymentEvent({ event: `webhook.${eventType}`, actor: "webhook", details: { eventType, dedupeKey } });
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

async function handlePaymentCaptured(payload: Payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;
  const orderId = String(payment.order_id ?? "");
  const paymentId = String(payment.id ?? "");
  if (!orderId || !paymentId) return;
  const r = await activateOrder({ orderId, paymentId, capturedPaise: Number(payment.amount), capturedCurrency: String(payment.currency ?? ""), actor: "webhook" });
  if (!r.ok && r.reason !== "not_found") {
    console.warn(`[razorpay-webhook] capture not activated for ${orderId}: ${r.reason}`);
  }
}

async function handlePaymentFailed(payload: Payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;
  const orderId = String(payment.order_id ?? "");
  const paymentId = String(payment.id ?? "");
  const errorDescription = String(payment.error_description ?? "Payment failed");

  const existing = orderId ? await prisma.paymentRecord.findUnique({ where: { razorpayOrderId: orderId } }) : null;
  if (existing && (existing.status === "CREATED" || existing.status === "AUTHORIZED")) {
    await prisma.paymentRecord.update({ where: { id: existing.id }, data: { status: "FAILED" } });
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

async function handlePaymentAuthorized(payload: Payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;
  const orderId = String(payment.order_id ?? "");
  const paymentId = String(payment.id ?? "");
  const existing = await prisma.paymentRecord.findUnique({ where: { razorpayOrderId: orderId } });
  // Events can arrive out of order: never move CAPTURED/REFUNDED/FAILED back to AUTHORIZED.
  if (existing && existing.status === "CREATED") {
    await prisma.paymentRecord.update({ where: { id: existing.id }, data: { razorpayPaymentId: paymentId, status: "AUTHORIZED" } });
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

async function handleRefund(eventType: string, payload: Payload, eventId: string) {
  const refund = payload.refund?.entity;
  if (!refund) return;
  const paymentId = String(refund.payment_id);
  const refundId = String(refund.id);
  const amount = Number(refund.amount);

  const existing = await prisma.paymentRecord.findUnique({ where: { razorpayPaymentId: paymentId } });
  if (!existing) {
    // A refunded subscription renewal: take back the budget that payment granted, and stop the subscription.
    const grant = await prisma.tokenLedger.findFirst({ where: { refId: { startsWith: "sub:" }, AND: { refId: { endsWith: `:${paymentId}` } } }, select: { clerkUserId: true } });
    if (grant) {
      await expirePlanAllowance(grant.clerkUserId, eventId);
      await prisma.allowedUser.updateMany({ where: { clerkUserId: grant.clerkUserId }, data: { subscriptionStatus: "CANCELLED" } });
      await syncPlanMetadata(grant.clerkUserId);
      await logPaymentEvent({ clerkUserId: grant.clerkUserId, event: eventType, actor: "webhook", razorpayPaymentId: paymentId, details: { refundId, refundAmount: amount, scope: "subscription" } });
    }
    return;
  }

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

  if (isFullRefund && existing.clerkUserId) {
    await revokeOrderGrant(existing.clerkUserId, existing.razorpayOrderId);
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
