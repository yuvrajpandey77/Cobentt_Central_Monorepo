import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import {
  getUserTotals,
  getProjectTotals,
  getUserAnalytics,
  getUserAlerts,
  acknowledgeAlert,
} from "@/lib/token-usage";
import { getQuotaStatus } from "@/lib/quota-enforcement";
import prisma from "@/lib/db";

export const usageRouter = createTRPCRouter({
  /**
   * Get user's total usage statistics
   */
  userTotals: protectedProcedure.query(async ({ ctx }) => {
    const totals = await getUserTotals(ctx.auth.userId);
    return totals;
  }),

  /**
   * Get project-specific usage totals
   */
  projectTotals: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return getProjectTotals(ctx.auth.userId, input.projectId);
    }),

  /**
   * Get user's quota status and limits
   */
  quotaStatus: protectedProcedure.query(async ({ ctx }) => {
    const [status, allowedUser] = await Promise.all([
      getQuotaStatus(ctx.auth.userId),
      prisma.allowedUser.findUnique({
        where: { clerkUserId: ctx.auth.userId },
        select: {
          plan: true,
          maxDailyTokens: true,
          maxDailyRequests: true,
          graceTokens: true,
          graceUsed: true,
          status: true,
        },
      }),
    ]);

    return {
      ...status,
      plan: allowedUser?.plan || "FREE",
      maxDailyTokens: allowedUser?.maxDailyTokens || 200000,
      maxDailyRequests: allowedUser?.maxDailyRequests || 6,
      graceTokens: allowedUser?.graceTokens || 20000,
      graceUsed: allowedUser?.graceUsed || false,
      accountStatus: allowedUser?.status || "PENDING",
    };
  }),

  /**
   * Get usage analytics
   */
  analytics: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getUserAnalytics(ctx.auth.userId, input.days);
      } catch (e) {
        console.warn("[usage] analytics failed; returning safe fallback", e);
        return { dailyUsage: [], providerBreakdown: [], modelBreakdown: [] };
      }
    }),

  /**
   * Get recent usage alerts
   */
  alerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getUserAlerts(ctx.auth.userId, input.limit);
      } catch (e) {
        console.warn("[usage] alerts failed; returning []", e);
        return [];
      }
    }),

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return acknowledgeAlert(input.alertId, ctx.auth.userId);
    }),

  /**
   * Get usage breakdown by provider/model
   */
  breakdown: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const breakdown = await prisma.tokenUsage.groupBy({
        by: ["provider", "model"],
        where: {
          userId: ctx.auth.userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          costUsd: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            totalTokens: "desc",
          },
        },
      });

      return breakdown;
    }),

  /**
   * Get recent usage history (last N calls)
   */
  recentCalls: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        projectId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await prisma.tokenUsage.findMany({
          where: {
            userId: ctx.auth.userId,
            projectId: input.projectId,
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          select: {
            id: true,
            provider: true,
            model: true,
            totalTokens: true,
            costUsd: true,
            endpoint: true,
            durationMs: true,
            createdAt: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      } catch (e) {
        console.warn("[usage] recentCalls failed; returning []", e);
        return [];
      }
    }),

  /**
   * Debug status for usage counters and last 3 calls
   */
  debugStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const usage = await prisma.userUsage.findUnique({ where: { userId: ctx.auth.userId } });
      const last3 = await prisma.tokenUsage.findMany({
        where: { userId: ctx.auth.userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, totalTokens: true, provider: true, model: true, createdAt: true, endpoint: true },
      });
      return { usage, last3 };
    } catch (e) {
      console.warn("[usage] debugStatus failed", e);
      return { usage: null, last3: [] };
    }
  }),

  /**
   * Token usage grouped by project
   */
  projectBreakdown: protectedProcedure
    .input(z.object({
      days: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const cutoff = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        const records = await prisma.tokenUsage.groupBy({
          by: ["projectId"],
          where: {
            userId: ctx.auth.userId,
            createdAt: { gte: cutoff },
            projectId: { not: null },
          },
          _sum: { totalTokens: true, promptTokens: true, completionTokens: true },
          _count: { id: true },
          orderBy: { _sum: { totalTokens: "desc" } },
        });

        const projectIds = records.map((r) => r.projectId).filter(Boolean) as string[];
        const projects = projectIds.length > 0
          ? await prisma.project.findMany({
              where: { id: { in: projectIds } },
              select: { id: true, name: true },
            })
          : [];
        const projectMap = new Map(projects.map((p) => [p.id, p.name]));

        return records.map((r) => ({
          projectId: r.projectId,
          projectName: projectMap.get(r.projectId!) || "Unknown",
          totalTokens: r._sum.totalTokens ?? 0,
          promptTokens: r._sum.promptTokens ?? 0,
          completionTokens: r._sum.completionTokens ?? 0,
          callCount: r._count.id,
        }));
      } catch (e) {
        console.warn("[usage] projectBreakdown failed", e);
        return [];
      }
    }),
});

