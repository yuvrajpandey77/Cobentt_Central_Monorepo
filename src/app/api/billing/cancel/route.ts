import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { IDEMPOTENCY_HEADER, parseKey, withIdempotency } from "@/lib/idempotency";
import { cancelSubscription } from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

/** Stops renewal at the end of the paid period. Access continues until then. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = parseKey(req.headers.get(IDEMPOTENCY_HEADER));
  if (!key) return NextResponse.json({ error: `A valid ${IDEMPOTENCY_HEADER} header is required.` }, { status: 400 });

  return withIdempotency(userId, "billing:cancel", key, "", async () => {
    try {
      const cancelled = await cancelSubscription(userId);
      if (!cancelled) return NextResponse.json({ error: "No active subscription" }, { status: 404 });
      return NextResponse.json({ ok: true, endsAtPeriodEnd: true });
    } catch (err) {
      console.error("[billing] cancel failed:", err);
      return NextResponse.json({ error: "Could not cancel. Please try again." }, { status: 500 });
    }
  });
}
