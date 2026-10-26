import prisma from "@/lib/db";
import { parseProduct } from "@/lib/billing-config";
import { grantTopupTokens } from "@/lib/wallet";
import { logPaymentEvent } from "@/lib/payment-audit";
import { amountMatches } from "@/lib/subscription-period";

export type ActivationResult =
  | { ok: true; activated: boolean; plan: string }
  | { ok: false; reason: "not_found" | "bad_product" | "amount_mismatch" | "refunded" };

/**
 * The single place a captured one-time top-up becomes balance. Safe to call from the browser confirm route and the
 * webhook, in any order and any number of times: the order row is claimed atomically (`periodEnd IS NULL`), so the
 * grant happens exactly once.
 */
export async function activateOrder(opts: {
  orderId: string;
  paymentId: string;
  /** When set, the order must belong to this user (browser routes). Webhooks omit it. */
  userId?: string;
  /** Amount (paise) and currency Razorpay says were captured, when known. Both must equal the order. */
  capturedPaise?: number;
  capturedCurrency?: string;
  actor: "user" | "webhook" | "system";
  correlationId?: string;
}): Promise<ActivationResult> {
  const rec = await prisma.paymentRecord.findUnique({ where: { razorpayOrderId: opts.orderId } });
  if (!rec || (opts.userId && rec.clerkUserId !== opts.userId)) return { ok: false, reason: "not_found" };
  const product = parseProduct(rec.product);
  if (!product) return { ok: false, reason: "bad_product" };
  if (rec.status === "REFUNDED" || rec.status === "PARTIALLY_REFUNDED") return { ok: false, reason: "refunded" };
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

  const granted = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.paymentRecord.updateMany({
      where: { id: rec.id, periodEnd: null },
      data: { status: "CAPTURED", razorpayPaymentId: opts.paymentId, signatureVerified: true, verifiedAt: now, periodStart: now, periodEnd: now },
    });
    if (claimed.count === 0) return false;
    await grantTopupTokens(tx, rec.clerkUserId, product.spec.budgetMicroUSD, `topup:${opts.orderId}`, now);
    return true;
  });

  await logPaymentEvent({
    paymentRecordId: rec.id,
    clerkUserId: rec.clerkUserId,
    event: granted ? "payment.activated" : "payment.activation_replayed",
    actor: opts.actor,
    razorpayOrderId: opts.orderId,
    razorpayPaymentId: opts.paymentId,
    correlationId: opts.correlationId,
    details: { product: rec.product ?? "", budgetMicroUSD: product.spec.budgetMicroUSD },
  });
  return { ok: true, activated: granted, plan: "Top-up" };
}
