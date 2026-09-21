import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { logPaymentEvent } from "@/lib/payment-audit";
import { fetchProviderPayment } from "@/lib/razorpay";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const verifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`payment:verify:${userId}`, {
      requests: 20,
      window: "60 s",
      failClosed: true,
    });
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpaySecret) {
      return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
    }

    // Verify HMAC signature (timing-safe comparison)
    const body_str = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(body_str)
      .digest("hex");

    const sigBuffer = Buffer.from(razorpay_signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const isValid = sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isValid) {
      await logPaymentEvent({
        clerkUserId: userId,
        event: "payment.verification_failed",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: "Signature mismatch",
      });
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    // Update payment record (only if status allows upgrade)
    const existing = await prisma.paymentRecord.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!existing) {
      await logPaymentEvent({
        clerkUserId: userId,
        event: "payment.verification_failed",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: "No matching order found",
      });
      return NextResponse.json(
        { error: "No matching order found for this payment" },
        { status: 404 }
      );
    }

    // SECURITY: orders belong to exactly one user. Return the same 404 so a
    // caller can't probe for other users' order ids.
    if (existing.clerkUserId !== userId) {
      await logPaymentEvent({
        paymentRecordId: existing.id,
        clerkUserId: userId,
        event: "payment.verification_failed",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: "Order does not belong to user",
      });
      return NextResponse.json(
        { error: "No matching order found for this payment" },
        { status: 404 }
      );
    }

    // SECURITY: reconcile against Razorpay's servers. The HMAC above only
    // proves the pair came from Checkout — it says nothing about capture.
    let providerStatus: string;
    try {
      const providerPayment = await fetchProviderPayment(razorpay_order_id, razorpay_payment_id);
      providerStatus = providerPayment.status;
    } catch (providerErr) {
      await logPaymentEvent({
        paymentRecordId: existing.id,
        clerkUserId: userId,
        event: "payment.verification_failed",
        actor: "system",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: providerErr instanceof Error ? providerErr.message : "Provider lookup failed",
      });
      return NextResponse.json(
        { error: "Could not confirm payment with provider. Retry." },
        { status: 502 }
      );
    }

    // Map provider truth to record status — never downgrade a CAPTURED record,
    // and never promote on `created`/`failed` provider states.
    const nextStatus =
      providerStatus === "captured"
        ? "CAPTURED"
        : providerStatus === "authorized"
          ? "AUTHORIZED"
          : providerStatus === "failed"
            ? "FAILED"
            : null;

    // Provider reconciliation is server-to-server, so its status is truthful
    // bookkeeping (not attacker-controlled). Only rule: never downgrade a
    // CAPTURED record — capture is terminal here; refunds arrive via webhook.
    if (nextStatus && nextStatus !== existing.status && existing.status !== "CAPTURED") {
      await prisma.paymentRecord.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          status: nextStatus as "AUTHORIZED" | "CAPTURED" | "FAILED",
          signatureVerified: true,
          verifiedAt: new Date(),
        },
      });
    }

    await logPaymentEvent({
      paymentRecordId: existing?.id,
      clerkUserId: userId,
      event: "payment.verified",
      actor: "user",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      correlationId,
      details: { signatureVerified: true },
    });

    return NextResponse.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err: unknown) {
    console.error("Razorpay verify-payment error:", err);
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
