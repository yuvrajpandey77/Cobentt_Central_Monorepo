import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternal } from "@/lib/internal-auth";
import { purgeAccount } from "@/lib/account-purge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({ clerkUserId: z.string().min(5).max(100) }).strict();

/** Called by the Rust API during account deletion. Cancels billing and removes the account's website rows. Idempotent. */
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
  try {
    await purgeAccount(body.clerkUserId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account] purge failed:", err);
    return NextResponse.json({ error: "Could not finish account purge" }, { status: 503 });
  }
}
