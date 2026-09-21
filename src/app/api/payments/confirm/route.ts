import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { logPaymentEvent } from "@/lib/payment-audit";
import { ensurePaymentCaptured, fetchProviderPayment } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

// SECURITY: `plan` is removed from the request body.
// The plan is derived from the PaymentRecord created during order creation,
// preventing plan tampering attacks.
const confirmSchema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`payment:confirm:${session.userId}`, {
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

  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpaySecret) {
    return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = parsed.data;

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
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
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

    // SECURITY: Look up the PaymentRecord by razorpayOrderId to get the server-assigned plan.
    // Never trust the client-supplied plan.
    const paymentRecord = await prisma.paymentRecord.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      select: { id: true, status: true, plan: true, amount: true, clerkUserId: true },
    });

    if (!paymentRecord) {
      await logPaymentEvent({
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: "Order not found",
      });
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify ownership: payment must belong to this user
    if (paymentRecord.clerkUserId !== session.userId) {
      await logPaymentEvent({
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: "Payment does not belong to user",
      });
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Derive plan from the PaymentRecord (server-assigned), not from client
    const planKey = Object.keys(PAYMENT_PLANS).find(
      (k) => PAYMENT_PLANS[k].id === paymentRecord.plan
    );
    const planDef = planKey ? PAYMENT_PLANS[planKey] : null;
    if (!planDef) {
      return NextResponse.json({ error: "Invalid plan on payment record" }, { status: 500 });
    }

    // SECURITY: Validate payment amount matches plan amount
    if (paymentRecord.amount !== planDef.amountPaise) {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "system",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: `Amount mismatch: expected ${planDef.amountPaise}, got ${paymentRecord.amount}`,
      });
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    // Idempotency: if payment already captured, return success without
    // re-hitting the provider (a previous confirm already verified it).
    if (paymentRecord.status === "CAPTURED") {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_idempotent",
        actor: "user",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        details: { message: "Already captured" },
      });
      return NextResponse.json({
        success: true,
        plan: planDef.label,
        message: "Payment already confirmed",
      });
    }

    // SECURITY: reconcile against Razorpay's servers BEFORE granting
    // entitlement. The HMAC only proves the pair came from Checkout; an
    // authorized-but-never-captured (or wrong-amount) payment must not
    // activate a plan.
    let providerPayment;
    try {
      providerPayment = await fetchProviderPayment(razorpay_order_id, razorpay_payment_id);
    } catch (providerErr) {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
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

    // Provider amount/currency must match the plan price.
    if (
      providerPayment.amountPaise !== planDef.amountPaise ||
      providerPayment.amountPaise !== paymentRecord.amount ||
      providerPayment.currency.toUpperCase() !== planDef.currency.toUpperCase()
    ) {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "system",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: `Provider amount mismatch: got ${providerPayment.amountPaise} ${providerPayment.currency}, expected ${planDef.amountPaise} ${planDef.currency}`,
      });
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    // Capture if still only authorized (covers manual-capture merchants);
    // refuse entitlement for anything not captured.
    try {
      providerPayment = await ensurePaymentCaptured(providerPayment);
    } catch (captureErr) {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "system",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: captureErr instanceof Error ? captureErr.message : "Capture failed",
      });
      return NextResponse.json(
        { error: "Payment could not be captured. Contact support." },
        { status: 402 }
      );
    }
    if (providerPayment.status !== "captured") {
      await logPaymentEvent({
        paymentRecordId: paymentRecord.id,
        clerkUserId: session.userId,
        event: "payment.confirm_failed",
        actor: "system",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        correlationId,
        success: false,
        errorMessage: `Provider status is ${providerPayment.status}, not captured`,
      });
      return NextResponse.json(
        { error: "Payment not completed. Finish the checkout and retry." },
        { status: 402 }
      );
    }
    // Atomic transaction: verify → activate → update quota
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    await prisma.$transaction(async (tx) => {
      // Update payment record
      await tx.paymentRecord.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          status: "CAPTURED",
          signatureVerified: true,
          verifiedAt: new Date(),
          periodStart,
          periodEnd,
        },
      });

      // Upsert AllowedUser (activate subscription)
      await tx.allowedUser.upsert({
        where: { clerkUserId: session.userId! },
        create: {
          clerkUserId: session.userId!,
          email: `${session.userId}@cobentt.local`,
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
          lastPaymentId: razorpay_payment_id,
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
          lastPaymentId: razorpay_payment_id,
        },
      });
    });

    // Sync to Clerk (outside transaction — non-critical)
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      await client.users.updateUserMetadata(session.userId!, {
        publicMetadata: {
          plan: planDef.id,
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: periodEnd.toISOString(),
        },
      });
    } catch (clerkErr) {
      console.error("[payment-confirm] Clerk metadata sync failed:", clerkErr);
    }

    await logPaymentEvent({
      clerkUserId: session.userId,
      event: "payment.confirmed",
      actor: "user",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      correlationId,
      details: {
        plan: planDef.id,
        amount: planDef.amountPaise,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      plan: planDef.label,
      periodEnd: periodEnd.toISOString(),
    });
  } catch (err: unknown) {
    console.error("Payment confirmation error:", err);
    await logPaymentEvent({
      clerkUserId: session.userId,
      event: "payment.confirm_failed",
      actor: "system",
      correlationId,
      success: false,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
