import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { logPaymentEvent } from "@/lib/payment-audit";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const createOrderSchema = z.object({
  plan: z.enum(["pro", "teams"]),
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
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`payment:create:${userId}`, {
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
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { plan } = parsed.data;
    const planDef = PAYMENT_PLANS[plan];
    if (!planDef) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Prevent rapid duplicate orders: reuse a pending order for the SAME plan
    // only. (A plan-blind reuse returned another plan's order id with this
    // plan's amount — user pays one price, gets the other plan.)
    const recentPendingOrder = await prisma.paymentRecord.findFirst({
      where: {
        clerkUserId: userId,
        plan: planDef.id,
        status: { in: ["CREATED", "AUTHORIZED"] },
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      select: { razorpayOrderId: true, createdAt: true },
    });

    if (recentPendingOrder) {
      return NextResponse.json({
        order_id: recentPendingOrder.razorpayOrderId,
        amount: planDef.amountPaise,
        currency: planDef.currency,
        message: "Existing pending order returned",
      });
    }

    const idempotencyKey = `order_${userId}_${plan}_${Date.now()}`;

    const order = await getRazorpay().orders.create({
      amount: planDef.amountPaise,
      currency: planDef.currency,
      receipt: idempotencyKey,
    });

    // Store pending order in database
    const paymentRecord = await prisma.paymentRecord.create({
      data: {
        clerkUserId: userId,
        razorpayOrderId: order.id,
        amount: planDef.amountPaise,
        currency: planDef.currency,
        plan: planDef.id,
        status: "CREATED",
        receipt: idempotencyKey,
        correlationId,
      },
    });

    await logPaymentEvent({
      paymentRecordId: paymentRecord.id,
      clerkUserId: userId,
      event: "order.created",
      actor: "user",
      razorpayOrderId: order.id,
      correlationId,
      details: { plan, amount: planDef.amountPaise, currency: planDef.currency },
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      correlationId,
    });
  } catch (err: unknown) {
    console.error("Razorpay create-order error:", err);
    await logPaymentEvent({
      clerkUserId: undefined,
      event: "order.failed",
      actor: "system",
      correlationId,
      success: false,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
