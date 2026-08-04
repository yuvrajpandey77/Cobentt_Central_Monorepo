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

/**
 * Record token usage and update user aggregates.
 * Uses atomic SQL to handle daily reset safely under concurrency.
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

      // Atomic daily aggregate update using raw SQL.
      // Uses a CASE to reset daily counters when the bucket changes (midnight UTC).
      // This avoids the read-check-write race in the previous implementation.
      await tx.$executeRawUnsafe(`
        INSERT INTO user_usage (
          user_id, daily_requests, daily_tokens,
          total_requests, total_tokens, total_cost_usd,
          last_reset_at, alert90_sent, alert100_sent
        ) VALUES ($1, 1, $2, 1, $2, $3, NOW(), false, false)
        ON CONFLICT (user_id) DO UPDATE SET
          daily_requests = CASE
            WHEN date_trunc('day', user_usage.last_reset_at AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage.daily_requests + 1
            ELSE 1
          END,
          daily_tokens = CASE
            WHEN date_trunc('day', user_usage.last_reset_at AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage.daily_tokens + $2
            ELSE $2
          END,
          total_requests = user_usage.total_requests + 1,
          total_tokens = user_usage.total_tokens + $2,
          total_cost_usd = user_usage.total_cost_usd + $3,
          last_reset_at = CASE
            WHEN date_trunc('day', user_usage.last_reset_at AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage.last_reset_at
            ELSE NOW()
          END,
          alert90_sent = CASE
            WHEN date_trunc('day', user_usage.last_reset_at AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage.alert90_sent
            ELSE false
          END,
          alert100_sent = CASE
            WHEN date_trunc('day', user_usage.last_reset_at AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage.alert100_sent
            ELSE false
          END
      `, input.userId, totalTokens, costUsd);
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

