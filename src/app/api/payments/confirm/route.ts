import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseProduct } from "@/lib/billing-config";
import { logPaymentEvent } from "@/lib/payment-audit";
import { ensurePaymentCaptured, fetchProviderPayment } from "@/lib/razorpay";
import { verifyCheckoutSignature } from "@/lib/razorpay-signature";
import { activateOrder } from "@/lib/subscription";

export const dynamic = "force-dynamic";

// The plan is never read from the request: it comes from the order row created server-side.
const confirmSchema = z.object({
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Called by the browser right after Razorpay Checkout succeeds (the old /api/razorpay/verify-payment is an alias).
 * Order of checks: session → rate limit → checkout signature → order ownership → ask Razorpay (amount, currency,
 * captured) → atomically grant the period. The webhook runs the same `activateOrder`, so whichever arrives first wins
 * and the other is a harmless replay.
 */
export async function POST(req: NextRequest) {
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { userId } = await auth();
  if (!userId) return fail(401, "Unauthorized");

  const rl = await checkRateLimit(`payment:confirm:${userId}`, { requests: 20, window: "60 s", failClosed: true });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) } }
    );
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return fail(503, "Payments are not available right now.");

  let parsed;
  try {
    parsed = confirmSchema.safeParse(await req.json());
  } catch {
    return fail(400, "Invalid request");
  }
  if (!parsed.success) return fail(400, "Invalid request");
  const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = parsed.data;

  const audit = (event: string, errorMessage: string, actor: "user" | "system" = "user") =>
    logPaymentEvent({ clerkUserId: userId, event, actor, razorpayOrderId: orderId, razorpayPaymentId: paymentId, correlationId, success: false, errorMessage });

  if (!verifyCheckoutSignature(orderId, paymentId, signature, secret)) {
    await audit("payment.confirm_failed", "Signature mismatch");
    return fail(400, "Payment signature verification failed");
  }

  try {
    const rec = await prisma.paymentRecord.findUnique({ where: { razorpayOrderId: orderId }, select: { clerkUserId: true, product: true, amount: true, currency: true } });
    // Same answer for "no such order" and "someone else's order" so order ids cannot be probed.
    if (!rec || rec.clerkUserId !== userId) {
      await audit("payment.confirm_failed", "Order not found for user");
      return fail(404, "Order not found");
    }
    if (!parseProduct(rec.product)) return fail(500, "Something went wrong. Contact support.");

    let provider = await fetchProviderPayment(orderId, paymentId).catch(async (e) => {
      await audit("payment.confirm_failed", e instanceof Error ? e.message : "Provider lookup failed", "system");
      return null;
    });
    if (!provider) return fail(502, "Could not confirm payment with the provider. Retry in a moment.");

    if (provider.amountPaise !== rec.amount || provider.currency.toUpperCase() !== rec.currency.toUpperCase()) {
      await audit("payment.confirm_failed", `Provider amount mismatch: ${provider.amountPaise} ${provider.currency}`, "system");
      return fail(400, "Payment amount mismatch");
    }
    try {
      provider = await ensurePaymentCaptured(provider);
    } catch (e) {
      await audit("payment.confirm_failed", e instanceof Error ? e.message : "Capture failed", "system");
      return fail(402, "Payment could not be captured. Contact support.");
    }
    if (provider.status !== "captured") {
      await audit("payment.confirm_failed", `Provider status ${provider.status}`, "system");
      return fail(402, "Payment not completed. Finish the checkout and retry.");
    }

    const r = await activateOrder({ orderId, paymentId, userId, capturedPaise: provider.amountPaise, capturedCurrency: provider.currency, actor: "user", correlationId });
    if (!r.ok) {
      const map = { not_found: [404, "Order not found"], bad_plan: [500, "Something went wrong. Contact support."], amount_mismatch: [400, "Payment amount mismatch"], refunded: [409, "This payment was refunded"] } as const;
      const [status, msg] = map[r.reason];
      return fail(status, msg);
    }
    return NextResponse.json({ success: true, kind: r.kind, plan: r.plan, periodEnd: r.periodEnd.toISOString(), alreadyActive: !r.activated });
  } catch (err) {
    console.error("[payment-confirm] error:", err);
    await audit("payment.confirm_failed", err instanceof Error ? err.message : "Unknown error", "system");
    return fail(500, "Something went wrong. If you were charged, your plan will activate automatically within a few minutes.");
  }
}
