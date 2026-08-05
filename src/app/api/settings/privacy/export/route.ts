import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`privacy:export:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const [profile, apiKeys, auditLogs] = await Promise.all([
      prisma.userProfile.findUnique({ where: { clerkUserId: session.userId } }),
      prisma.apiKey.findMany({
        where: { clerkUserId: session.userId },
        select: { provider: true, name: true, createdAt: true },
      }),
      prisma.userAuditLog.findMany({
        where: { clerkUserId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      apiKeys: apiKeys.map((k) => ({
        provider: k.provider,
        name: k.name,
        createdAt: k.createdAt,
      })),
      auditLogs: auditLogs.map((l) => ({
        event: l.event,
        actor: l.actor,
        createdAt: l.createdAt,
      })),
    };

    await logUserAuditEvent({
      clerkUserId: session.userId,
      event: "privacy.data_exported",
    });

    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cobentt-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (err) {
    console.error("[privacy] Export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
