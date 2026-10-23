import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternal } from "@/lib/internal-auth";
import { settleHosted } from "@/lib/hosted-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(5).max(100),
  requestId: z.string().min(8).max(100),
  model: z.string().min(1).max(120),
  promptTokens: z.number().int().min(0).max(10_000_000),
  completionTokens: z.number().int().min(0).max(10_000_000),
}).strict();

/** Charges real usage and returns the unused part of the reservation. Idempotent. A request that is never settled stays fully charged. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyInternal({ secret: process.env.INTERNAL_API_SECRET, timestamp: req.headers.get("x-cobentt-timestamp"), signature: req.headers.get("x-cobentt-signature"), rawBody: raw })) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body;
  try {
    body = schema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const ok = await settleHosted(body);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
