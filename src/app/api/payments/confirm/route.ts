import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { updateUserMetadata } from "@/lib/clerk-admin";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

const PLANS: Record<string, { plan: string; periodDays: number }> = {
  pro: { plan: "pro", periodDays: 30 },
  teams: { plan: "teams", periodDays: 30 },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!INTERNAL_SECRET) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, plan } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    const planConfig = PLANS[plan as string];
    if (!planConfig) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const periodEnd = Math.floor(Date.now() / 1000) + planConfig.periodDays * 86400;

    // Update Clerk user metadata
    const metadataUpdated = await updateUserMetadata(session.userId, {
      publicMetadata: {
        subscription: {
          plan: planConfig.plan,
          status: "active",
          currentPeriodEnd: periodEnd,
        },
      },
    });

    if (!metadataUpdated) {
      console.error("Failed to update Clerk metadata for user", session.userId);
    }

    // Record subscription in backend database
    const backendRes = await fetch(`${BACKEND_URL}/v1/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": INTERNAL_SECRET,
        "X-Clerk-User-Id": session.userId,
      },
      body: JSON.stringify({
        user_id: session.userId,
        plan: planConfig.plan,
        razorpay_order_id,
        period_end: periodEnd,
      }),
    });

    if (!backendRes.ok) {
      console.error("Failed to record subscription in backend:", await backendRes.text());
    }

    return NextResponse.json({
      success: true,
      plan: planConfig.plan,
      periodEnd,
    });
  } catch (err: unknown) {
    console.error("Payment confirmation error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
