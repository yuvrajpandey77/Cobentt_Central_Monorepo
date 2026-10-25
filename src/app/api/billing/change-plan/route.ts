import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { NoActivePlan, SamePlan, changePlan } from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["starter", "plus", "pro"]) }).strict();

/** Upgrades now, or schedules a downgrade for the end of the period. The client names the tier only. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  try {
    const { effective } = await changePlan(userId, parsed.data.plan);
    return NextResponse.json({ ok: true, effective });
  } catch (err) {
    if (err instanceof NoActivePlan) return NextResponse.json({ error: "You need an active plan to change it." }, { status: 409 });
    if (err instanceof SamePlan) return NextResponse.json({ error: "You are already on this plan." }, { status: 409 });
    console.error("[billing] change-plan failed:", err);
    return NextResponse.json({ error: "Could not change your plan. Please try again." }, { status: 500 });
  }
}
