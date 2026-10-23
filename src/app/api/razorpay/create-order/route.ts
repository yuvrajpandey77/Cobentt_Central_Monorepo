import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { logPaymentEvent } from "@/lib/payment-audit";
import { getRazorpay } from "@/lib/razorpay";
import { ALL_PRODUCT_KEYS, billingCurrency, parseProduct, productAmount } from "@/lib/billing-config";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// The browser names WHAT it wants. Price, currency and quantity are decided here, never by the client.
const createOrderSchema = z.object({ product: z.enum(ALL_PRODUCT_KEYS) }).strict();

export async function POST(req: NextRequest) {
  const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rl = await checkRateLimit(`payment:create:${userId}`, { requests: 20, window: "60 s", failClosed: true });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) } }
      );
    }

    const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const productKey = parsed.data.product;
    const product = parseProduct(productKey)!;
    const currency = billingCurrency();
    const amount = productAmount(product, currency);

    // Reuse a still-open order for the SAME product, price and currency (so a double click does not create two charges).
    const open = await prisma.paymentRecord.findFirst({
      where: { clerkUserId: userId, product: productKey, amount, currency, status: { in: ["CREATED"] }, createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
      select: { razorpayOrderId: true },
    });
    if (open) return NextResponse.json({ order_id: open.razorpayOrderId, amount, currency });

    const receipt = `r_${userId.slice(-8)}_${Date.now().toString(36)}`;
    const order = await getRazorpay().orders.create({ amount, currency, receipt, notes: { product: productKey, user: userId } });
    const rec = await prisma.paymentRecord.create({
      data: {
        clerkUserId: userId,
        razorpayOrderId: order.id,
        amount,
        currency,
        // `plan` is a required legacy column; paid tiers are all PRO and top-ups leave the user's plan alone.
        plan: product.kind === "plan" ? "PRO" : "FREE",
        product: productKey,
        status: "CREATED",
        receipt,
        correlationId,
      },
    });
    await logPaymentEvent({
      paymentRecordId: rec.id,
      clerkUserId: userId,
      event: "order.created",
      actor: "user",
      razorpayOrderId: order.id,
      correlationId,
      details: { product: productKey, amount, currency },
    });
    return NextResponse.json({ order_id: order.id, amount, currency });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    await logPaymentEvent({ clerkUserId: userId, event: "order.failed", actor: "system", correlationId, success: false, errorMessage: err instanceof Error ? err.message.slice(0, 200) : "Unknown error" });
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
