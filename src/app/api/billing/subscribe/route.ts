import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { AlreadySubscribed, createSubscription } from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["starter", "plus", "pro"]) }).strict();

/** Starts a monthly Razorpay subscription. The client names the tier; price and cycle come from the server catalog. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(`billing:subscribe:${userId}`, { requests: 5, window: "60 s", failClosed: true });
  if (!rl.success) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  try {
    const { shortUrl, subscriptionId } = await createSubscription(userId, parsed.data.plan);
    return NextResponse.json({ checkoutUrl: shortUrl, subscriptionId });
  } catch (err) {
    if (err instanceof AlreadySubscribed) return NextResponse.json({ error: "You already have an active plan." }, { status: 409 });
    console.error("[billing] subscribe failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
