import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getByokStatus } from "@/lib/byok";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Masked BYOK status for the client gate. Never includes key material. */
export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Polled by the client on load — throttle per user to prevent abuse.
  const rl = await checkRateLimit(`byok-status:${session.userId}`, {
    requests: 30,
    window: "60 s",
  });
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const status = await getByokStatus(session.userId);
  return NextResponse.json(status);
}
