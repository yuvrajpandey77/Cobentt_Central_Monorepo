import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";
import {
  sendQuotaWarning90,
  sendQuotaWarning100,
  sendQuotaExceeded,
} from "./webhook-system";

const isSameUTCDate = (a: Date, b: Date) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
  inGracePeriod?: boolean;
  usage?: {
    dailyTokens: number;
    dailyRequests: number;
    limit: number;
    percentUsed: number;
    graceAvailable: number;
    graceUsed: number;
  };
  warnings?: string[];
}

/**
 * Derive a stable advisory lock key from a userId string.
 * Uses a simple hash to convert string → 32-bit integer for pg_advisory_xact_lock.
 */
function advisoryKey(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return hash || 1;
}

/**
 * Check quota with serialized access via advisory lock.
 * Prevents concurrent requests from double-spending the same quota.
 */
async function checkQuotaSerialized(
  userId: string,
  estimatedTokens: number = 0
): Promise<QuotaCheck> {
  const lockKey = advisoryKey(userId);

  // Acquire advisory lock — serializes all quota operations for this user
  await prisma.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

  // 1. Get user's allowed limits
  let allowedUser = await prisma.allowedUser.findUnique({
    where: { clerkUserId: userId },
  });

  if (!allowedUser) {
    allowedUser = await prisma.allowedUser.create({
      data: {
        clerkUserId: userId,
        email: `${userId}@cobentt.local`,
        status: "APPROVED",
        approvedAt: new Date(),
        plan: "FREE",
        maxDailyRequests: 6,
        maxDailyTokens: 200000,
        graceTokens: 20000,
      },
    });
  }

  if (allowedUser.status !== "APPROVED") {
    return {
      allowed: false,
      reason:
        allowedUser.status === "PENDING"
          ? "Your account is pending approval. Please wait for admin approval."
          : "Your account access has been revoked. Contact admin for details.",
    };
  }

  const maxDailyTokens = allowedUser.maxDailyTokens;
  const graceTokens = allowedUser.graceTokens;

  // 2. Get current usage with auto-reset if needed
  const now = new Date();
  let usage = await prisma.userUsage.findUnique({
    where: { userId },
  });

  if (!usage) {
    usage = await prisma.userUsage.create({
      data: {
        userId,
        dailyTokens: 0,
        dailyRequests: 0,
        totalTokens: 0,
        totalRequests: 0,
        lastResetAt: now,
        alert90Sent: false,
        alert100Sent: false,
      },
    });
  } else if (!isSameUTCDate(usage.lastResetAt, now)) {
    usage = await prisma.userUsage.update({
      where: { userId },
      data: {
        dailyTokens: 0,
        dailyRequests: 0,
        lastResetAt: now,
        alert90Sent: false,
        alert100Sent: false,
      },
    });

    await prisma.allowedUser.update({
      where: { clerkUserId: userId },
      data: {
        graceUsed: false,
        graceResetAt: now,
      },
    });
  }

  const warnings: string[] = [];
  const percentUsed = (usage.dailyTokens / maxDailyTokens) * 100;

  // 3. Check token limit
  const projectedUsage = usage.dailyTokens + estimatedTokens;
  const willExceedTokens = projectedUsage > maxDailyTokens;

  if (willExceedTokens) {
    const overage = projectedUsage - maxDailyTokens;

    if (!allowedUser.graceUsed && overage <= graceTokens) {
      warnings.push(
        `⚠️ You are using grace tokens (${overage.toLocaleString()} of ${graceTokens.toLocaleString()} available)`
      );
      await sendQuotaExceeded(userId, projectedUsage, maxDailyTokens, overage);
      await prisma.usageAlert.create({
        data: {
          userId,
          alertType: "grace_period",
          message: `Grace period activated: using ${overage.toLocaleString()} grace tokens`,
          percentUsed: Math.round((projectedUsage / maxDailyTokens) * 100),
          tokensUsed: projectedUsage,
          tokenLimit: maxDailyTokens,
        },
      });
      return {
        allowed: true,
        inGracePeriod: true,
        warnings,
        usage: {
          dailyTokens: usage.dailyTokens,
          dailyRequests: usage.dailyRequests,
          limit: maxDailyTokens,
          percentUsed: Math.round((projectedUsage / maxDailyTokens) * 100),
          graceAvailable: graceTokens - overage,
          graceUsed: overage,
        },
      };
    } else {
      return {
        allowed: false,
        reason: `Daily token limit exceeded (${maxDailyTokens.toLocaleString()}). ${
          allowedUser.graceUsed
            ? "Grace tokens already used."
            : `Grace tokens insufficient (need ${overage.toLocaleString()}, have ${graceTokens.toLocaleString()}).`
        } Resets at midnight UTC.`,
        usage: {
          dailyTokens: usage.dailyTokens,
          dailyRequests: usage.dailyRequests,
          limit: maxDailyTokens,
          percentUsed,
          graceAvailable: allowedUser.graceUsed ? 0 : graceTokens,
          graceUsed: allowedUser.graceUsed ? graceTokens : 0,
        },
      };
    }
  }

  // 4. Warning thresholds
  if (percentUsed >= 90 && !usage.alert90Sent) {
    await prisma.userUsage.update({ where: { userId }, data: { alert90Sent: true } });
    await sendQuotaWarning90(userId, usage.dailyTokens, maxDailyTokens);
    await prisma.usageAlert.create({
      data: {
        userId,
        alertType: "90_percent",
        message: "You have used 90% of your daily token quota",
        percentUsed: Math.round(percentUsed),
        tokensUsed: usage.dailyTokens,
        tokenLimit: maxDailyTokens,
      },
    });
    warnings.push(`⚠️ You've used ${Math.round(percentUsed)}% of your daily token quota`);
  }

  if (percentUsed >= 100 && !usage.alert100Sent) {
    await prisma.userUsage.update({ where: { userId }, data: { alert100Sent: true } });
    await sendQuotaWarning100(userId, usage.dailyTokens, maxDailyTokens);
    await prisma.usageAlert.create({
      data: {
        userId,
        alertType: "100_percent",
        message: "You have reached your daily token quota",
        percentUsed: 100,
        tokensUsed: usage.dailyTokens,
        tokenLimit: maxDailyTokens,
      },
    });
  }

  // 5. All checks passed
  return {
    allowed: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    usage: {
      dailyTokens: usage.dailyTokens,
      dailyRequests: usage.dailyRequests,
      limit: maxDailyTokens,
      percentUsed: Math.round(percentUsed),
      graceAvailable: graceTokens,
      graceUsed: 0,
    },
  };
}

/**
 * Check quota — wraps serialized check in advisory lock transaction.
 */
export async function checkQuota(
  userId: string,
  estimatedTokens: number = 0
): Promise<QuotaCheck> {
  return prisma.$transaction(async () => {
    return checkQuotaSerialized(userId, estimatedTokens);
  });
}

/**
 * Enforce quota — throws error if quota exceeded.
 * Uses advisory lock to prevent concurrent double-spend.
 */
export async function enforceQuota(
  userId: string,
  estimatedTokens?: number
): Promise<QuotaCheck> {
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_QUOTA_CHECK === 'true') {
    return {
      allowed: true,
      usage: {
        dailyTokens: 0,
        dailyRequests: 0,
        limit: 999999,
        percentUsed: 0,
        graceAvailable: 999999,
        graceUsed: 0,
      },
    };
  }

  const check = await checkQuota(userId, estimatedTokens);

  if (!check.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: check.reason || "Quota exceeded",
    });
  }

  return check;
}

/**
 * Mark grace period as used
 */
export async function markGraceUsed(userId: string) {
  await prisma.allowedUser.update({
    where: { clerkUserId: userId },
    data: { graceUsed: true, graceResetAt: new Date() },
  });
}

/**
 * Get quota status for user (non-throwing)
 */
export async function getQuotaStatus(userId: string): Promise<QuotaCheck> {
  return checkQuota(userId, 0);
}

