import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`default:${session.userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { pagePath, value } = body ?? {};
    if (!pagePath || !value) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }
    // For now, just log to server console. In production, persist to DB or analytics.
    console.log("docs.feedback", { pagePath, value, at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}


