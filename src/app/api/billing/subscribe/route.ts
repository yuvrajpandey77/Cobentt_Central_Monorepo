import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { IDEMPOTENCY_HEADER, parseKey, withIdempotency } from "@/lib/idempotency";
import { AlreadySubscribed, createSubscription } from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["starter", "plus", "pro"]) }).strict();

/** Starts a monthly Razorpay subscription. The client names the tier; price and cycle come from the server catalog. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = parseKey(req.headers.get(IDEMPOTENCY_HEADER));
  if (!key) return NextResponse.json({ error: `A valid ${IDEMPOTENCY_HEADER} header is required.` }, { status: 400 });

  const rl = await checkRateLimit(`billing:subscribe:${userId}`, { requests: 5, window: "60 s", failClosed: true });
  if (!rl.success) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

  const raw = await req.text();
  const parsed = schema.safeParse(safeJson(raw));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  return withIdempotency(userId, "billing:subscribe", key, raw, async () => {
    try {
      const { shortUrl, subscriptionId } = await createSubscription(userId, parsed.data.plan);
      return NextResponse.json({ checkoutUrl: shortUrl, subscriptionId });
    } catch (err) {
      if (err instanceof AlreadySubscribed) return NextResponse.json({ error: "You already have an active plan." }, { status: 409 });
      console.error("[billing] subscribe failed:", err);
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
    }
  });
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
