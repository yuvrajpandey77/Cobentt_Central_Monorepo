import { Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";

export async function logUserAuditEvent(params: {
  clerkUserId: string;
  event: string;
  actor?: string;
  details?: Record<string, string | number | boolean>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.userAuditLog.create({
      data: {
        clerkUserId: params.clerkUserId,
        event: params.event,
        actor: params.actor || "user",
        details: (params.details || {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to log event:", params.event, err);
  }
}
