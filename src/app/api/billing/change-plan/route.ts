import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { IDEMPOTENCY_HEADER, parseKey, withIdempotency } from "@/lib/idempotency";
import { NoActivePlan, SamePlan, changePlan } from "@/lib/razorpay-subscriptions";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["starter", "plus", "pro"]) }).strict();

/** Upgrades now, or schedules a downgrade for the end of the period. The client names the tier only. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = parseKey(req.headers.get(IDEMPOTENCY_HEADER));
  if (!key) return NextResponse.json({ error: `A valid ${IDEMPOTENCY_HEADER} header is required.` }, { status: 400 });

  const raw = await req.text();
  const parsed = schema.safeParse(safeJson(raw));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  return withIdempotency(userId, "billing:change-plan", key, raw, async () => {
    try {
      const { effective } = await changePlan(userId, parsed.data.plan);
      return NextResponse.json({ ok: true, effective });
    } catch (err) {
      if (err instanceof NoActivePlan) return NextResponse.json({ error: "You need an active plan to change it." }, { status: 409 });
      if (err instanceof SamePlan) return NextResponse.json({ error: "You are already on this plan." }, { status: 409 });
      console.error("[billing] change-plan failed:", err);
      return NextResponse.json({ error: "Could not change your plan. Please try again." }, { status: 500 });
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
