import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordOutcome, telemetryStats, recentEvents } from "@/lib/intent/telemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OutcomeSchema = z.object({
  telemetryId: z.string().min(1).max(64),
  userDecision: z.enum(["confirmed", "cancelled", "auto", "corrected"]).optional(),
  executionSuccess: z.boolean().optional(),
});

/** POST /api/intent/telemetry — client reports confirm/cancel/execution outcome. */
export async function POST(req: NextRequest) {
  const parsed = OutcomeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  recordOutcome(parsed.data.telemetryId, {
    ...(parsed.data.userDecision ? { userDecision: parsed.data.userDecision } : {}),
    ...(typeof parsed.data.executionSuccess === "boolean" ? { executionSuccess: parsed.data.executionSuccess } : {}),
  });
  return NextResponse.json({ ok: true });
}

/** GET /api/intent/telemetry — aggregate routing quality (internal evaluation). */
export async function GET() {
  return NextResponse.json({ stats: telemetryStats(), recent: recentEvents(20) });
}
