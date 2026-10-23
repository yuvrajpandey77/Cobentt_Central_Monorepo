import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternal } from "@/lib/internal-auth";
import { authorizeHosted } from "@/lib/hosted-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(5).max(100),
  requestId: z.string().min(8).max(100),
  model: z.string().min(1).max(120),
  promptTokens: z.number().int().min(0).max(2_000_000),
  maxOutputTokens: z.number().int().min(1).max(1_000_000),
}).strict();

/** Called only by the Rust API (HMAC-signed). Decides whether a hosted AI request may run and reserves its worst-case cost. */
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
  const r = await authorizeHosted(body);
  if (!r.ok) return NextResponse.json({ ok: false, code: r.code }, { status: r.status });
  return NextResponse.json({ ok: true, reservedST: r.reservedST, maxOutputTokens: r.maxOutputTokens, source: r.source });
}
