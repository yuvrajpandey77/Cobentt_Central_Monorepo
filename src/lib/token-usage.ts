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
      // Aggregate FIRST: the upsert guarantees the parent user_usage row
      // exists (token_usage.userId has a FK onto it — creating the child
      // first fails for users without a row yet).
      // Atomic daily aggregate update using raw SQL.
      // Uses a CASE to reset daily counters when the bucket changes (midnight UTC).
      // This avoids the read-check-write race in the previous implementation.
      // NOTE: columns are camelCase (Prisma default) — they must be
      // double-quoted or Postgres folds them to lowercase and misses.
      await tx.$executeRawUnsafe(`
        INSERT INTO user_usage (
          "id", "userId", "dailyRequests", "dailyTokens",
          "totalRequests", "totalTokens", "totalCostUsd",
          "lastResetAt", "alert90Sent", "alert100Sent",
          "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, 1, $2, 1, $2, $3, NOW(), false, false, NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "dailyRequests" = CASE
            WHEN date_trunc('day', user_usage."lastResetAt" AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage."dailyRequests" + 1
            ELSE 1
          END,
          "dailyTokens" = CASE
            WHEN date_trunc('day', user_usage."lastResetAt" AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage."dailyTokens" + $2
            ELSE $2
          END,
          "totalRequests" = user_usage."totalRequests" + 1,
          "totalTokens" = user_usage."totalTokens" + $2,
          "totalCostUsd" = user_usage."totalCostUsd" + $3,
          "lastResetAt" = CASE
            WHEN date_trunc('day', user_usage."lastResetAt" AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage."lastResetAt"
            ELSE NOW()
          END,
          "alert90Sent" = CASE
            WHEN date_trunc('day', user_usage."lastResetAt" AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage."alert90Sent"
            ELSE false
          END,
          "alert100Sent" = CASE
            WHEN date_trunc('day', user_usage."lastResetAt" AT TIME ZONE 'UTC')
                 = date_trunc('day', NOW() AT TIME ZONE 'UTC')
            THEN user_usage."alert100Sent"
            ELSE false
          END
      `, input.userId, totalTokens, costUsd);

      // Create per-call record (parent row now guaranteed to exist)
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

  // Daily aggregates (camelCase columns must be double-quoted)
  const dailyUsage = await prisma.$queryRaw<
    Array<{
      date: Date;
      total_tokens: bigint;
      total_cost: Decimal;
      request_count: bigint;
    }>
  >`
    SELECT
      date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS date,
      SUM("totalTokens")::bigint AS total_tokens,
      SUM("costUsd") AS total_cost,
      COUNT(*)::bigint AS request_count
    FROM token_usage
    WHERE "userId" = ${userId}
      AND "createdAt" >= ${startDate}
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

