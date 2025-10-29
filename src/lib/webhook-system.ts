import prisma from "@/lib/db";
import crypto from "crypto";

export type WebhookEventType =
  | "QUOTA_WARNING_90"
  | "QUOTA_WARNING_100"
  | "QUOTA_EXCEEDED"
  | "LIMIT_CHANGED"
  | "PLAN_UPGRADED"
  | "PLAN_DOWNGRADED";

interface WebhookPayload {
  event: WebhookEventType;
  userId: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Send webhook with retry logic
 */
async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Cogerphere-Webhooks/1.0",
    "X-Webhook-Event": payload.event,
  };

  if (secret) {
    headers["X-Webhook-Signature"] = generateSignature(payloadString, secret);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseBody = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : responseBody,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Trigger webhook for user if configured
 */
export async function triggerWebhook(
  userId: string,
  eventType: WebhookEventType,
  data: Record<string, any>
) {
  // Get user's webhook configuration
  const allowedUser = await prisma.allowedUser.findUnique({
    where: { clerkUserId: userId },
    select: {
      webhookUrl: true,
      webhookSecret: true,
      webhookEvents: true,
    },
  });

  if (!allowedUser?.webhookUrl) {
    // No webhook configured
    return;
  }

  // Check if user subscribed to this event
  if (
    allowedUser.webhookEvents.length > 0 &&
    !allowedUser.webhookEvents.includes(eventType)
  ) {
    // User not subscribed to this event type
    return;
  }

  const payload: WebhookPayload = {
    event: eventType,
    userId,
    timestamp: new Date().toISOString(),
    data,
  };

  // Send webhook
  const result = await sendWebhook(
    allowedUser.webhookUrl,
    payload,
    allowedUser.webhookSecret ?? undefined
  );

  // Log webhook attempt
  await prisma.webhookLog.create({
    data: {
      userId,
      eventType,
      webhookUrl: allowedUser.webhookUrl,
      payload: payload as any, // Store webhook payload as JSON
      responseCode: result.statusCode,
      responseBody: result.error,
      success: result.success,
      attempts: 1,
      nextRetryAt: result.success ? null : new Date(Date.now() + 60000), // Retry in 1 min
    },
  });

  return result;
}

/**
 * Retry failed webhooks
 */
export async function retryFailedWebhooks(maxAttempts: number = 3) {
  const now = new Date();

  // Find webhooks ready for retry
  const failedWebhooks = await prisma.webhookLog.findMany({
    where: {
      success: false,
      attempts: { lt: maxAttempts },
      nextRetryAt: { lte: now },
    },
    take: 50, // Process batch of 50
  });

  for (const log of failedWebhooks) {
    const allowedUser = await prisma.allowedUser.findUnique({
      where: { clerkUserId: log.userId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!allowedUser?.webhookUrl) {
      continue;
    }

    const result = await sendWebhook(
      allowedUser.webhookUrl,
      log.payload as unknown as WebhookPayload,
      allowedUser.webhookSecret ?? undefined
    );

    // Update log
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        attempts: { increment: 1 },
        success: result.success,
        responseCode: result.statusCode,
        responseBody: result.error,
        nextRetryAt: result.success
          ? null
          : new Date(Date.now() + Math.pow(2, log.attempts + 1) * 60000), // Exponential backoff
      },
    });
  }
}

/**
 * Quota warning webhook (90% usage)
 */
export async function sendQuotaWarning90(
  userId: string,
  currentUsage: number,
  limit: number
) {
  return triggerWebhook(userId, "QUOTA_WARNING_90", {
    percentUsed: 90,
    tokensUsed: currentUsage,
    tokenLimit: limit,
    tokensRemaining: limit - currentUsage,
    message: "You have used 90% of your daily token quota",
  });
}

/**
 * Quota warning webhook (100% usage)
 */
export async function sendQuotaWarning100(
  userId: string,
  currentUsage: number,
  limit: number
) {
  return triggerWebhook(userId, "QUOTA_WARNING_100", {
    percentUsed: 100,
    tokensUsed: currentUsage,
    tokenLimit: limit,
    tokensRemaining: 0,
    message: "You have reached your daily token quota",
  });
}

/**
 * Quota exceeded webhook (grace period)
 */
export async function sendQuotaExceeded(
  userId: string,
  currentUsage: number,
  limit: number,
  graceTokensUsed: number
) {
  return triggerWebhook(userId, "QUOTA_EXCEEDED", {
    tokensUsed: currentUsage,
    tokenLimit: limit,
    graceTokensUsed,
    message: "You have exceeded your daily token quota and are using grace tokens",
  });
}

/**
 * Limit changed webhook
 */
export async function sendLimitChanged(
  userId: string,
  oldLimit: number,
  newLimit: number,
  changedBy: string
) {
  return triggerWebhook(userId, "LIMIT_CHANGED", {
    oldLimit,
    newLimit,
    changedBy,
    message: `Your daily token limit has been changed from ${oldLimit.toLocaleString()} to ${newLimit.toLocaleString()}`,
  });
}

/**
 * Plan upgrade webhook
 */
export async function sendPlanUpgraded(
  userId: string,
  oldPlan: string,
  newPlan: string
) {
  return triggerWebhook(userId, "PLAN_UPGRADED", {
    oldPlan,
    newPlan,
    message: `Your plan has been upgraded from ${oldPlan} to ${newPlan}`,
  });
}

/**
 * Plan downgrade webhook
 */
export async function sendPlanDowngraded(
  userId: string,
  oldPlan: string,
  newPlan: string
) {
  return triggerWebhook(userId, "PLAN_DOWNGRADED", {
    oldPlan,
    newPlan,
    message: `Your plan has been changed from ${oldPlan} to ${newPlan}`,
  });
}

