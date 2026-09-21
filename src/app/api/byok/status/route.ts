import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getByokStatus } from "@/lib/byok";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Masked BYOK status for the client gate. Never includes key material. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    // Polled by the client on load — throttle per user to prevent abuse.
    let rl;
    try {
      rl = await checkRateLimit(`byok-status:${session.userId}`, {
        requests: 30,
        window: "60 s",
      });
    } catch (err) {
      console.error("[byok/status] rate-limit check failed:", err instanceof Error ? err.message : err);
      // Rate-limiter outage must not block the gate: fail open with empty status.
      return NextResponse.json({ hasKey: false, canUseServerKey: false, providers: [], keys: [], degraded: true });
    }
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }
    try {
      const status = await getByokStatus(session.userId);
      return NextResponse.json(status);
    } catch (err) {
      console.error("[byok/status] DB lookup failed:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "Database unavailable. Retry in a moment.", code: "DB_UNAVAILABLE" },
        { status: 503 }
      );
    }
  } catch (err) {
    // ALWAYS return JSON — never let Next render an HTML 500 page here.
    console.error("[byok/status] unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Retry in a moment.", code: "INTERNAL" },
      { status: 503 }
    );
  }
}
