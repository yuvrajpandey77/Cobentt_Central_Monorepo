import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  sendLimitChanged,
  sendPlanUpgraded,
  sendPlanDowngraded,
} from "@/lib/webhook-system";
import { PLAN_LIMITS } from "@/lib/token-pricing";

/**
 * Check if user is admin
 */
async function requireAdmin(userId: string) {
  const admin = await prisma.adminUser.findFirst({
    where: {
      clerkUserId: userId,
    },
  });

  if (!admin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return admin;
}

export const adminRouter = createTRPCRouter({
  /**
   * Search user by email
   */
  findUserByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      await requireAdmin(ctx.auth.userId);

      const allowedUser = await prisma.allowedUser.findUnique({
        where: { email: input.email },
      });

      if (!allowedUser) {
        return null;
      }

      // Get usage stats
      const usage = await prisma.userUsage.findUnique({
        where: { userId: allowedUser.clerkUserId || "" },
      });

      return {
        ...allowedUser,
        usage,
      };
    }),

  /**
   * Get all users with pagination
   */
  listUsers: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        status: z.enum(["PENDING", "APPROVED", "REVOKED"]).optional(),
        plan: z.enum(["FREE", "PRO", "ENTERPRISE", "CUSTOM"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requireAdmin(ctx.auth.userId);

      const skip = (input.page - 1) * input.limit;

      const [users, total] = await Promise.all([
        prisma.allowedUser.findMany({
          where: {
            ...(input.status && { status: input.status }),
            ...(input.plan && { plan: input.plan }),
          },
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.allowedUser.count({
          where: {
            ...(input.status && { status: input.status }),
            ...(input.plan && { plan: input.plan }),
          },
        }),
      ]);

      return {
        users,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  /**
   * Update user limits
   */
  updateUserLimits: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        maxDailyTokens: z.number().int().positive().optional(),
        maxDailyRequests: z.number().int().positive().optional(),
        graceTokens: z.number().int().nonnegative().optional(),
        status: z.enum(["PENDING", "APPROVED", "REVOKED"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const admin = await requireAdmin(ctx.auth.userId);

      const user = await prisma.allowedUser.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Log action
      await prisma.adminActionLog.create({
        data: {
          adminEmail: admin.email,
          clerkUserId: ctx.auth.userId,
          action: "UPDATE_USER_LIMITS",
          targetEmail: input.email,
          changes: {
            before: {
              maxDailyTokens: user.maxDailyTokens,
              maxDailyRequests: user.maxDailyRequests,
              graceTokens: user.graceTokens,
              status: user.status,
            },
            after: {
              maxDailyTokens: input.maxDailyTokens ?? user.maxDailyTokens,
              maxDailyRequests: input.maxDailyRequests ?? user.maxDailyRequests,
              graceTokens: input.graceTokens ?? user.graceTokens,
              status: input.status ?? user.status,
            },
          },
        },
      });

      // Send webhook if token limit changed
      if (
        input.maxDailyTokens &&
        input.maxDailyTokens !== user.maxDailyTokens &&
        user.clerkUserId
      ) {
        await sendLimitChanged(
          user.clerkUserId,
          user.maxDailyTokens,
          input.maxDailyTokens,
          admin.email
        );
      }

      // Update limits
      return prisma.allowedUser.update({
        where: { email: input.email },
        data: {
          maxDailyTokens: input.maxDailyTokens,
          maxDailyRequests: input.maxDailyRequests,
          graceTokens: input.graceTokens,
          status: input.status,
          approvedAt:
            input.status === "APPROVED" && user.status !== "APPROVED"
              ? new Date()
              : undefined,
          updatedAt: new Date(),
        },
      });
    }),

  /**
   * Update user plan
   */
  updateUserPlan: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        plan: z.enum(["FREE", "PRO", "ENTERPRISE", "CUSTOM"]),
        applyPlanLimits: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const admin = await requireAdmin(ctx.auth.userId);

      const user = await prisma.allowedUser.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const oldPlan = user.plan;
      const newPlan = input.plan;

      // Get plan limits
      const planLimits = PLAN_LIMITS[newPlan];

      // Log action
      await prisma.adminActionLog.create({
        data: {
          adminEmail: admin.email,
          clerkUserId: ctx.auth.userId,
          action: "UPDATE_USER_PLAN",
          targetEmail: input.email,
          changes: {
            oldPlan,
            newPlan,
            applyPlanLimits: input.applyPlanLimits,
          },
        },
      });

      // Send webhook
      if (user.clerkUserId) {
        const planOrder = { FREE: 0, PRO: 1, ENTERPRISE: 2, CUSTOM: 3 };
        if (planOrder[newPlan] > planOrder[oldPlan]) {
          await sendPlanUpgraded(user.clerkUserId, oldPlan, newPlan);
        } else if (planOrder[newPlan] < planOrder[oldPlan]) {
          await sendPlanDowngraded(user.clerkUserId, oldPlan, newPlan);
        }
      }

      // Update plan and optionally apply default limits
      return prisma.allowedUser.update({
        where: { email: input.email },
        data: {
          plan: newPlan,
          ...(input.applyPlanLimits &&
            newPlan !== "CUSTOM" && {
              maxDailyTokens: planLimits.maxDailyTokens,
              maxDailyRequests: planLimits.maxDailyRequests,
              graceTokens: planLimits.graceTokens,
            }),
          updatedAt: new Date(),
        },
      });
    }),

  /**
   * Get admin action logs
   */
  getAdminLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        targetEmail: z.string().optional(),
        action: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requireAdmin(ctx.auth.userId);

      return prisma.adminActionLog.findMany({
        where: {
          ...(input.targetEmail && { targetEmail: input.targetEmail }),
          ...(input.action && { action: input.action }),
        },
        orderBy: { timestamp: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Get platform analytics
   */
  platformAnalytics: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      await requireAdmin(ctx.auth.userId);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Total users by status
      const usersByStatus = await prisma.allowedUser.groupBy({
        by: ["status"],
        _count: true,
      });

      // Users by plan
      const usersByPlan = await prisma.allowedUser.groupBy({
        by: ["plan"],
        _count: true,
      });

      // Total token usage
      const totalUsage = await prisma.tokenUsage.aggregate({
        _sum: {
          totalTokens: true,
          costUsd: true,
        },
        _count: true,
        where: {
          createdAt: { gte: startDate },
        },
      });

      // Daily usage trend
      const dailyUsage = await prisma.$queryRaw<
        Array<{
          date: Date;
          total_tokens: bigint;
          total_cost: any;
          request_count: bigint;
        }>
      >`
        SELECT 
          DATE(created_at) as date,
          SUM(total_tokens)::bigint as total_tokens,
          SUM(cost_usd) as total_cost,
          COUNT(*)::bigint as request_count
        FROM token_usage
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      // Top users by token usage
      const topUsers = await prisma.tokenUsage.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: {
          totalTokens: true,
          costUsd: true,
        },
        _count: true,
        orderBy: {
          _sum: {
            totalTokens: "desc",
          },
        },
        take: 10,
      });

      return {
        usersByStatus,
        usersByPlan,
        totalUsage: {
          totalTokens: totalUsage._sum.totalTokens ?? 0,
          totalCost: totalUsage._sum.costUsd ?? 0,
          totalRequests: totalUsage._count,
        },
        dailyUsage: dailyUsage.map((d) => ({
          date: d.date,
          totalTokens: Number(d.total_tokens),
          totalCost: d.total_cost,
          requestCount: Number(d.request_count),
        })),
        topUsers,
      };
    }),

  /**
   * Create or invite new user
   */
  inviteUser: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        plan: z.enum(["FREE", "PRO", "ENTERPRISE", "CUSTOM"]).default("FREE"),
        autoApprove: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const admin = await requireAdmin(ctx.auth.userId);

      // Check if user already exists
      const existing = await prisma.allowedUser.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists",
        });
      }

      const planLimits = PLAN_LIMITS[input.plan];

      const user = await prisma.allowedUser.create({
        data: {
          email: input.email,
          plan: input.plan,
          status: input.autoApprove ? "APPROVED" : "PENDING",
          approvedAt: input.autoApprove ? new Date() : undefined,
          invitedBy: admin.email,
          maxDailyTokens: planLimits.maxDailyTokens,
          maxDailyRequests: planLimits.maxDailyRequests,
          graceTokens: planLimits.graceTokens,
        },
      });

      // Log action
      await prisma.adminActionLog.create({
        data: {
          adminEmail: admin.email,
          clerkUserId: ctx.auth.userId,
          action: "INVITE_USER",
          targetEmail: input.email,
          changes: {
            plan: input.plan,
            autoApprove: input.autoApprove,
          },
        },
      });

      return user;
    }),
});

