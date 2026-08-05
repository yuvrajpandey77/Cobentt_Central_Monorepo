import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`sessions:list:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const client = await clerkClient();
    const sessionsList = await client.sessions.getSessionList({
      userId: session.userId,
    });

    const sessions = sessionsList.data.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      deviceType: "unknown",
      browser: "Unknown Browser",
      os: "Unknown OS",
      isCurrent: s.id === session.sessionId,
    }));

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`sessions:delete:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const client = await clerkClient();
    const sessionsList = await client.sessions.getSessionList({
      userId: session.userId,
    });

    for (const s of sessionsList.data) {
      if (s.id !== session.sessionId) {
        await client.sessions.revokeSession(s.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke sessions" }, { status: 500 });
  }
}
