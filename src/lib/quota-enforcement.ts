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
 * Check if user can make a request with estimated token usage
 */
export async function checkQuota(
  userId: string,
  estimatedTokens: number = 0
): Promise<QuotaCheck> {
  // 1. Get user's allowed limits
  let allowedUser = await prisma.allowedUser.findUnique({
    where: { clerkUserId: userId },
  });

  // If user not in allowed_users, auto-create with free tier
  if (!allowedUser) {
    console.log(`[Auto-provisioning] Creating free tier account for user ${userId}`);
    allowedUser = await prisma.allowedUser.create({
      data: {
        clerkUserId: userId,
        email: `${userId}@cogerphere.local`, // Placeholder, can be updated via profile
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
  const maxDailyRequests = allowedUser.maxDailyRequests;
  const graceTokens = allowedUser.graceTokens;

  // 2. Get current usage with auto-reset if needed
  const now = new Date();
  let usage = await prisma.userUsage.findUnique({
    where: { userId },
  });

  if (!usage) {
    // First-time user: create usage record
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
    // Reset daily counters at midnight UTC
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

    // Reset grace period for the user
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

  // 3. Check request limit - REMOVED: No daily request limit, only token limit
  // Daily requests are tracked but not enforced as a hard limit
  
  // 4. Check token limit
  const projectedUsage = usage.dailyTokens + estimatedTokens;
  const willExceedTokens = projectedUsage > maxDailyTokens;

  if (willExceedTokens) {
    const overage = projectedUsage - maxDailyTokens;

    // Check if we can use grace tokens
    if (!allowedUser.graceUsed && overage <= graceTokens) {
      // Allow with grace period warning
      warnings.push(
        `⚠️ You are using grace tokens (${overage.toLocaleString()} of ${graceTokens.toLocaleString()} available)`
      );

      // Send webhook alert
      await sendQuotaExceeded(userId, projectedUsage, maxDailyTokens, overage);

      // Create alert
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
      // Hard limit reached
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

  // 5. Check for warning thresholds and send alerts
  if (percentUsed >= 90 && !usage.alert90Sent) {
    await prisma.userUsage.update({
      where: { userId },
      data: { alert90Sent: true },
    });

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

    warnings.push(
      `⚠️ You've used ${Math.round(percentUsed)}% of your daily token quota`
    );
  }

  if (percentUsed >= 100 && !usage.alert100Sent) {
    await prisma.userUsage.update({
      where: { userId },
      data: { alert100Sent: true },
    });

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

  // 6. Check lifetime limit (if set)
  // NOTE: Request limits are tracked but not enforced
  // Only token limits are enforced to allow unlimited requests within token budget

  // 7. All checks passed
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
 * Enforce quota - throws error if quota exceeded
 */
export async function enforceQuota(
  userId: string,
  estimatedTokens?: number
): Promise<QuotaCheck> {
  // Allow bypassing quota checks in development
  if (process.env.DISABLE_QUOTA_CHECK === 'true') {
    console.log(`[DEV MODE] Quota check bypassed for user ${userId}`);
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
    data: {
      graceUsed: true,
      graceResetAt: new Date(),
    },
  });
}

/**
 * Get quota status for user (non-throwing)
 */
export async function getQuotaStatus(userId: string): Promise<QuotaCheck> {
  return checkQuota(userId, 0);
}

