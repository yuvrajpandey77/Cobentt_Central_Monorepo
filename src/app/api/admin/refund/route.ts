import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { z } from "zod";
import prisma from "@/lib/db";
import { logPaymentEvent } from "@/lib/payment-audit";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const refundSchema = z.object({
  paymentRecordId: z.string().min(1),
  amount: z.number().int().min(1).optional(), // partial refund amount in paise
  reason: z.string().min(1).max(500),
});

let _razorpay: Razorpay | null = null;
function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  if (!_razorpay) _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _razorpay;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const admin = await prisma.adminUser.findFirst({
      where: { clerkUserId: session.userId },
    });
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rl = await checkRateLimit(`admin:${session.userId}`, RATE_LIMITS.admin);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { paymentRecordId, amount, reason } = parsed.data;

    const payment = await prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
    });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!payment.razorpayPaymentId) {
      return NextResponse.json(
        { error: "Payment has no Razorpay payment ID" },
        { status: 400 }
      );
    }

    if (payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") {
      return NextResponse.json(
        { error: "Payment already refunded" },
        { status: 400 }
      );
    }

    const refundAmount = amount ?? payment.amount;

    // SECURITY: Validate refund amount does not exceed original payment
    if (refundAmount > payment.amount) {
      return NextResponse.json(
        { error: `Refund amount (${refundAmount}) exceeds payment amount (${payment.amount})` },
        { status: 400 }
      );
    }

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be positive" },
        { status: 400 }
      );
    }

    const refund = await getRazorpay().payments.refund(payment.razorpayPaymentId, {
      amount: refundAmount,
      notes: { reason, adminId: session.userId },
    });

    const isFullRefund = refundAmount >= payment.amount;

    await prisma.paymentRecord.update({
      where: { id: paymentRecordId },
      data: {
        refundId: refund.id,
        refundAmount,
        refundReason: reason,
        refundStatus: "PENDING",
        status: isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });

    // Downgrade if full refund AND no other active payments
    if (isFullRefund && payment.clerkUserId) {
      const otherActivePayments = await prisma.paymentRecord.count({
        where: {
          clerkUserId: payment.clerkUserId,
          id: { not: paymentRecordId },
          status: "CAPTURED",
          periodEnd: { gt: new Date() },
        },
      });

      // Only downgrade if no other active (non-expired, captured) payments exist
      if (otherActivePayments === 0) {
        await prisma.allowedUser.updateMany({
          where: { clerkUserId: payment.clerkUserId },
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
          await client.users.updateUserMetadata(payment.clerkUserId, {
            publicMetadata: { plan: "FREE", subscriptionStatus: "CANCELLED" },
          });
        } catch (clerkErr) {
          console.error("[admin-refund] Clerk metadata sync failed:", clerkErr);
        }
      }
    }

    await logPaymentEvent({
      paymentRecordId: payment.id,
      clerkUserId: payment.clerkUserId,
      event: "refund.initiated",
      actor: "admin",
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      details: { refundId: refund.id, refundAmount, reason, isFullRefund },
    });

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundAmount,
      isFullRefund,
    });
  } catch (err: unknown) {
    console.error("Refund error:", err);
    const message = err instanceof Error ? err.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
