import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";
import prisma from "@/lib/db";
import { requireAdmin } from "@/lib/admin-security";

export const settingsRouter = createTRPCRouter({
  getUserAuditLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
        event: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const where: Record<string, unknown> = {
        clerkUserId: ctx.auth.userId!,
      };
      if (input.event) {
        where.event = input.event;
      }
      if (input.cursor) {
        where.createdAt = { lt: new Date(input.cursor) };
      }

      const logs = await prisma.userAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
      });

      let nextCursor: string | undefined;
      if (logs.length > input.limit) {
        const next = logs.pop();
        nextCursor = next?.createdAt.toISOString();
      }

      return { logs, nextCursor };
    }),

  getAdminAuditLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        targetEmail: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requireAdmin(ctx.auth.userId!);

      const where: Record<string, unknown> = {};
      if (input.targetEmail) where.targetEmail = input.targetEmail;
      if (input.action) where.action = input.action;

      return prisma.adminActionLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: input.limit,
      });
    }),
});
