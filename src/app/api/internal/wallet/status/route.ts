import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternal } from "@/lib/internal-auth";
import { hostedStatus } from "@/lib/hosted-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ userId: z.string().min(5).max(100) }).strict();

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
  return NextResponse.json(await hostedStatus(body.userId));
}
