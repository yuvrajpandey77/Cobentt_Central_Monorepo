import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`payment:${session.userId}`, RATE_LIMITS.payment);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const payments = await prisma.paymentRecord.findMany({
    where: { clerkUserId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      amount: true,
      currency: true,
      plan: true,
      status: true,
      receipt: true,
      verifiedAt: true,
      refundId: true,
      refundAmount: true,
      refundReason: true,
      refundedAt: true,
      refundStatus: true,
      periodStart: true,
      periodEnd: true,
      correlationId: true,
      createdAt: true,
    },
  });

  const subscription = await prisma.allowedUser.findUnique({
    where: { clerkUserId: session.userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      lastPaymentAt: true,
    },
  });

  return NextResponse.json({
    payments,
    subscription,
  });
}
