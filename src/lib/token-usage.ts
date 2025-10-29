import prisma from "@/lib/db";
import { calculateCost, AIProvider } from "./token-pricing";
import { Decimal } from "@prisma/client/runtime/library";

interface RecordUsageInput {
  userId: string;
  projectId?: string;
  messageId?: string;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  endpoint?: string;
  durationMs?: number;
}

const isSameUTCDate = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

/**
 * Record token usage and update user aggregates
 */
export async function recordTokenUsage(input: RecordUsageInput) {
  if (!input?.userId) {
    console.warn("[usage] Missing userId; skipping recordTokenUsage", { input });
    return;
  }

  const totalTokens = input.promptTokens + input.completionTokens;
  const costUsd = calculateCost(
    input.provider,
    input.model,
    input.promptTokens,
    input.completionTokens
  );

  // Add debug log
  console.log("[usage] recordTokenUsage", {
    userId: input.userId,
    model: input.model,
    totalTokens,
    endpoint: input.endpoint,
  });

  try {
    await prisma.$transaction(async (tx) => {
      // Create per-call record
      await tx.tokenUsage.create({
        data: {
          userId: input.userId,
          projectId: input.projectId,
          messageId: input.messageId,
          provider: input.provider,
          model: input.model,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          totalTokens,
          costUsd: new Decimal(costUsd),
          endpoint: input.endpoint,
          durationMs: input.durationMs,
        },
      });

      // Update user aggregates with daily reset logic
      const now = new Date();
      const existing = await tx.userUsage.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          dailyRequests: 1,
          dailyTokens: totalTokens,
          totalRequests: 1,
          totalTokens: totalTokens,
          totalCostUsd: new Decimal(costUsd),
          lastResetAt: now,
          alert90Sent: false,
          alert100Sent: false,
        },
        update: {},
      });

      // Check if we need to reset daily counters (midnight UTC)
      const shouldReset = !isSameUTCDate(existing.lastResetAt, now);

      await tx.userUsage.update({
        where: { userId: input.userId },
        data: shouldReset
          ? {
              // Reset daily counters
              dailyRequests: 1,
              dailyTokens: totalTokens,
              totalRequests: { increment: 1 },
              totalTokens: { increment: totalTokens },
              totalCostUsd: { increment: new Decimal(costUsd) },
              lastResetAt: now,
              alert90Sent: false,
              alert100Sent: false,
            }
          : {
              // Increment all counters
              dailyRequests: { increment: 1 },
              dailyTokens: { increment: totalTokens },
              totalRequests: { increment: 1 },
              totalTokens: { increment: totalTokens },
              totalCostUsd: { increment: new Decimal(costUsd) },
            },
      });
    });
  } catch (err) {
    console.error("[usage] recordTokenUsage failed; continuing without blocking", {
      userId: input.userId,
      model: input.model,
      endpoint: input.endpoint,
      err,
    });
  }
}

/**
 * Get user's total usage
 */
export async function getUserTotals(userId: string) {
  const usage = await prisma.userUsage.findUnique({
    where: { userId },
  });

  if (!usage) {
    return {
      userId,
      dailyRequests: 0,
      dailyTokens: 0,
      totalRequests: 0,
      totalTokens: 0,
      totalCostUsd: new Decimal(0),
      lastResetAt: new Date(),
      alert90Sent: false,
      alert100Sent: false,
    };
  }

  return usage;
}

/**
 * Get project-specific usage totals
 */
export async function getProjectTotals(userId: string, projectId: string) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [allTime, today] = await Promise.all([
    prisma.tokenUsage.aggregate({
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
      },
      _count: true,
      where: { userId, projectId },
    }),
    prisma.tokenUsage.aggregate({
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        costUsd: true,
      },
      _count: true,
      where: {
        userId,
        projectId,
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  return {
    totalTokensProject: allTime._sum.totalTokens ?? 0,
    totalCostProject: allTime._sum.costUsd ?? new Decimal(0),
    totalCallsProject: allTime._count,
    totalTokensProjectToday: today._sum.totalTokens ?? 0,
    totalCostProjectToday: today._sum.costUsd ?? new Decimal(0),
    totalCallsProjectToday: today._count,
  };
}

/**
 * Get usage analytics for a user
 */
export async function getUserAnalytics(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Daily aggregates
  const dailyUsage = await prisma.$queryRaw<
    Array<{
      date: Date;
      total_tokens: bigint;
      total_cost: Decimal;
      request_count: bigint;
    }>
  >`
    SELECT 
      date_trunc('day', created_at AT TIME ZONE 'UTC') AS date,
      SUM(total_tokens)::bigint AS total_tokens,
      SUM(cost_usd) AS total_cost,
      COUNT(*)::bigint AS request_count
    FROM token_usage
    WHERE user_id = ${userId}
      AND created_at >= ${startDate}
    GROUP BY 1
    ORDER BY 1 DESC
  `;

  // Provider breakdown
  const providerBreakdown = await prisma.tokenUsage.groupBy({
    by: ["provider"],
    where: {
      userId,
      createdAt: { gte: startDate },
    },
    _sum: {
      totalTokens: true,
      costUsd: true,
    },
    _count: true,
  });

  // Model breakdown
  const modelBreakdown = await prisma.tokenUsage.groupBy({
    by: ["model", "provider"],
    where: {
      userId,
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
    dailyUsage: dailyUsage.map((d) => ({
      date: d.date,
      totalTokens: Number(d.total_tokens),
      totalCost: d.total_cost,
      requestCount: Number(d.request_count),
    })),
    providerBreakdown,
    modelBreakdown,
  };
}

/**
 * Get recent usage alerts for a user
 */
export async function getUserAlerts(userId: string, limit: number = 10) {
  return prisma.usageAlert.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
}

/**
 * Mark alert as acknowledged
 */
export async function acknowledgeAlert(alertId: string, userId: string) {
  return prisma.usageAlert.update({
    where: {
      id: alertId,
      userId, // Ensure user owns the alert
    },
    data: {
      acknowledged: true,
    },
  });
}

