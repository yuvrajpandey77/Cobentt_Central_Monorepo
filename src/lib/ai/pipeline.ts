import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { enforceQuota } from "@/lib/quota-enforcement";
import { detectPromptInjection, sanitizeUserInput } from "@/lib/ai/safety";
import { recordTokenUsage } from "@/lib/token-usage";
import { logUserAuditEvent } from "@/lib/user-audit";
import { type AIProvider } from "@/lib/token-pricing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineContext {
  userId: string;
  message: string;
  sanitizedMessage: string;
  conversationId?: string;
  projectId?: string;
  estimatedTokens?: number;
}

export interface PipelineResult {
  ok: true;
  ctx: PipelineContext;
}

export interface PipelineError {
  ok: false;
  response: NextResponse;
}

export type PipelineOutput = PipelineResult | PipelineError;

export interface RunPipelineOptions {
  /** Rate-limit bucket key prefix. Defaults to "ai". */
  rateLimitKey?: string;
  /** Custom rate-limit config. Falls back to RATE_LIMITS[rateLimitKey]. */
  rateLimitConfig?: { requests: number; window: string };
  /** Max allowed message length. Defaults to 10000. */
  maxLength?: number;
  /** conversationId to validate ownership. */
  conversationId?: string;
  /** Extra estimated tokens to reserve (e.g. for multi-call endpoints). */
  estimatedTokens?: number;
  /** Skip injection check (e.g. for system-generated content). */
  skipInjectionCheck?: boolean;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Shared AI pipeline. Every AI endpoint should call this before making
 * an LLM request. Handles:
 *
 *  1. Authentication
 *  2. Rate limiting
 *  3. Input validation + sanitization
 *  4. Prompt injection detection
 *  5. Quota enforcement
 *  6. Conversation ownership validation
 *
 * Returns a PipelineContext on success, or a NextResponse on failure.
 */
export async function runAIPipeline(
  rawMessage: string,
  opts: RunPipelineOptions = {}
): Promise<PipelineOutput> {
  const {
    rateLimitKey = "ai",
    rateLimitConfig,
    maxLength = 10000,
    conversationId,
    estimatedTokens = 6000,
    skipInjectionCheck = false,
  } = opts;

  // 1. Authentication
  const session = await auth();
  if (!session?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const userId = session.userId;

  // 2. Rate limiting
  const rlConfig = rateLimitConfig || RATE_LIMITS[rateLimitKey as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const rateLimit = await checkRateLimit(`${rateLimitKey}:${userId}`, rlConfig);
  if (!rateLimit.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) },
        }
      ),
    };
  }

  // 3. Input validation
  if (!rawMessage || typeof rawMessage !== "string") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Message required" }, { status: 400 }),
    };
  }
  if (rawMessage.length > maxLength) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Message too long" }, { status: 413 }),
    };
  }

  // 4. Sanitize
  const sanitizedMessage = sanitizeUserInput(rawMessage);

  // 5. Prompt injection detection
  if (!skipInjectionCheck) {
    const injectionCheck = detectPromptInjection(sanitizedMessage);
    if (!injectionCheck.safe) {
      await logUserAuditEvent({
        clerkUserId: userId,
        event: "ai.injection_blocked",
        details: { reason: injectionCheck.reason || "Unknown", endpoint: rateLimitKey },
      });
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Request blocked by security policy" },
          { status: 400 }
        ),
      };
    }
  }

  // 6. Quota enforcement
  try {
    await enforceQuota(userId, estimatedTokens);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Daily quota exceeded. Please upgrade your plan." },
        { status: 429 }
      ),
    };
  }

  // 7. Conversation ownership (optional)
  if (conversationId) {
    const { default: prisma } = await import("@/lib/db");
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!conversation) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Conversation not found" }, { status: 404 }),
      };
    }
  }

  return {
    ok: true,
    ctx: {
      userId,
      message: rawMessage,
      sanitizedMessage,
      conversationId,
      estimatedTokens,
    },
  };
}

// ---------------------------------------------------------------------------
// Token recording helper
// ---------------------------------------------------------------------------

export interface RecordTokensOptions {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  endpoint: string;
  projectId?: string;
  messageId?: string;
  durationMs?: number;
}

/**
 * Record token usage after an AI call completes.
 * Derives provider from model string. Non-blocking on failure.
 */
export function deriveProviderFromModel(model: string): AIProvider {
  const prefix = model.split("/")[0].toUpperCase();
  switch (prefix) {
    case "OPENAI":
    case "GPT":
      return "OPENAI";
    case "ANTHROPIC":
    case "CLAUDE":
      return "ANTHROPIC";
    case "OPENROUTER":
      return "OPENROUTER";
    case "GOOGLE":
    case "GEMINI":
      return "GOOGLE";
    case "DEEPSEEK":
      return "DEEPSEEK";
    case "QWEN":
      return "QWEN";
    default:
      return model.includes("/") ? "OPENROUTER" : "CUSTOM";
  }
}

export async function recordAITokens(opts: RecordTokensOptions) {
  if (!opts.userId || (!opts.promptTokens && !opts.completionTokens)) return;

  await recordTokenUsage({
    userId: opts.userId,
    provider: deriveProviderFromModel(opts.model),
    model: opts.model,
    promptTokens: opts.promptTokens,
    completionTokens: opts.completionTokens,
    endpoint: opts.endpoint,
    projectId: opts.projectId,
    messageId: opts.messageId,
    durationMs: opts.durationMs,
  });
}

// ---------------------------------------------------------------------------
// Error response helper
// ---------------------------------------------------------------------------

export function aiErrorResponse(error: unknown, fallback = "AI request failed") {
  const message = error instanceof Error ? error.message : fallback;
  console.error("[ai-pipeline]", message, error);
  return NextResponse.json({ error: message }, { status: 500 });
}
