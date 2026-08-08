import { getProviderConfig } from "./provider";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

// Free/limited tier models cap max_tokens per request (e.g. OpenRouter free → 3999).
// On a 402 "insufficient credits / max_tokens too high" we retry with progressively
// smaller budgets instead of failing hard.
const MAX_TOKEN_LADDER = [3500, 2500, 1600, 1000];
const MIN_MAX_TOKENS = 256;

export interface AIError extends Error {
  code:
    | "INSUFFICIENT_CREDITS"
    | "RATE_LIMITED"
    | "CONTEXT_TOO_LONG"
    | "AUTH"
    | "TIMEOUT"
    | "OTHER";
  userMessage: string;
  rawStatus?: number;
  providerBody?: string;
}

function makeAIError(opts: {
  code: AIError["code"];
  userMessage: string;
  rawStatus?: number;
  providerBody?: string;
  cause?: unknown;
}): AIError {
  const err = new Error(
    `AI API error${opts.rawStatus ? ` ${opts.rawStatus}` : ""}: ${
      opts.providerBody || opts.userMessage
    }`
  ) as AIError;
  err.code = opts.code;
  err.userMessage = opts.userMessage;
  err.rawStatus = opts.rawStatus;
  err.providerBody = opts.providerBody;
  return err;
}

// Try to pull the "can only afford N tokens" value out of an OpenRouter 402 body.
function parseAffordableTokens(body: string): number | null {
  const m = body.match(/can only afford (\d+)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Best user-facing message for any error thrown from the AI client.
export function friendlyAIErrorMessage(err: unknown, fallback = "The AI request failed. Please try again."): string {
  if (err && typeof err === "object" && "userMessage" in err && typeof (err as AIError).userMessage === "string") {
    return (err as AIError).userMessage;
  }
  if (err instanceof Error && err.message) {
    const raw = err.message;
    if (/^AI API error 402/.test(raw)) {
      return "Your AI credits are too low to continue. Add credits to your provider account or upgrade your plan, then retry.";
    }
    if (/^AI API error 401/.test(raw) || /^AI API error 403/.test(raw)) {
      return "The AI provider rejected the API key. Check your key in Settings, or ask an admin to refill automation keys.";
    }
    if (/^AI API error 429/.test(raw)) {
      return "The AI provider is rate-limiting requests. Wait a moment and try again.";
    }
    if (/timeout/i.test(raw)) {
      return `The AI request timed out. Try again or pick a faster model.`;
    }
    // Strip the raw provider JSON so users don't see a giant blob.
    return raw.replace(/^AI API error \d+:\s*/i, "").slice(0, 300);
  }
  return fallback;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  timeoutMs: 60000,
};

function isRetryableError(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function getRetryDelay(attempt: number, base: number, max: number): number {
  const delay = base * Math.pow(2, attempt) + Math.random() * 1000;
  return Math.min(delay, max);
}

export async function chatCompletion(
  options: CompletionOptions,
  retryOpts: RetryOptions = {}
): Promise<Response> {
  const config = getProviderConfig();
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, timeoutMs = 60000 } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...retryOpts,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
    ...config.extraHeaders,
  };

  if (config.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://cobentt.com";
    headers["X-Title"] = "Cobentt";
  }

  const body = () =>
    ({
      model: options.model,
      messages: options.messages,
      max_tokens: activeMaxTokens,
      temperature: options.temperature,
      top_p: options.topP,
      stream: options.stream ?? false,
    }) as Record<string, unknown>;

  let lastError: Error | null = null;
  let activeMaxTokens = options.maxTokens || 4096;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body()),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // 402: credit/token-limit exceeded on limited tiers — retry with a smaller budget.
      if (response.status === 402) {
        const errorBody = await response.text().catch(() => "Credit limit exceeded");
        const affordable = parseAffordableTokens(errorBody);
        let attemptedShrink = false;

        if (affordable != null) {
          const target = Math.max(MIN_MAX_TOKENS, Math.floor(affordable - 50));
          if (target < activeMaxTokens) {
            activeMaxTokens = target;
            attemptedShrink = true;
            console.warn(
              `[ai-client] 402 credit limit, capping max_tokens to ${activeMaxTokens} (affordable ${affordable})`
            );
          }
        }

        if (!attemptedShrink) {
          const nextIndex = MAX_TOKEN_LADDER.findIndex((m) => m < activeMaxTokens);
          if (nextIndex !== -1) {
            activeMaxTokens = MAX_TOKEN_LADDER[nextIndex];
            attemptedShrink = true;
            console.warn(
              `[ai-client] 402 credit limit, reducing max_tokens to ${activeMaxTokens}, attempt ${attempt + 1}/${maxRetries}`
            );
          }
        }

        if (attemptedShrink && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        throw makeAIError({
          code: "INSUFFICIENT_CREDITS",
          userMessage:
            "Your AI credits are too low to continue. Add credits to your provider account or upgrade your plan, then retry.",
          rawStatus: 402,
          providerBody: errorBody,
        });
      }

      if (isRetryableError(response.status) && attempt < maxRetries) {
        const delay = getRetryDelay(attempt, baseDelayMs!, maxDelayMs!);
        console.warn(
          `[ai-client] Retryable error ${response.status}, attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      const errorBody = await response.text().catch(() => "Unknown error");
      if (response.status === 401 || response.status === 403) {
        throw makeAIError({
          code: "AUTH",
          userMessage:
            "The AI provider rejected the API key. Check the key in Settings, or ask an admin to refill automation keys.",
          rawStatus: response.status,
          providerBody: errorBody.slice(0, 800),
        });
      }
      if (response.status === 400 && /context|too many tokens|please reduce/i.test(errorBody)) {
        throw makeAIError({
          code: "CONTEXT_TOO_LONG",
          userMessage:
            "This request exceeds the model's context window. Shorten the prompt or drop a few attachments, then retry.",
          rawStatus: response.status,
          providerBody: errorBody.slice(0, 800),
        });
      }
      throw makeAIError({
        code: isRetryableError(response.status) ? "RATE_LIMITED" : "OTHER",
        userMessage: isRetryableError(response.status)
          ? "The AI provider is rate-limiting requests. Wait a moment and try again."
          : "The AI request failed. Please try again.",
        rawStatus: response.status,
        providerBody: errorBody.slice(0, 800),
      });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        lastError = makeAIError({
          code: "TIMEOUT",
          userMessage: `The AI request timed out after ${timeoutMs}s. Try again or pick a faster model.`,
          rawStatus: 408,
        });
        if (attempt < maxRetries) {
          const delay = getRetryDelay(attempt, baseDelayMs!, maxDelayMs!);
          console.warn(
            `[ai-client] Timeout, attempt ${attempt + 1}/${maxRetries}, waiting ${Math.round(delay)}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } else if (err instanceof Error) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = getRetryDelay(attempt, baseDelayMs!, maxDelayMs!);
          console.warn(
            `[ai-client] Error: ${err.message}, attempt ${attempt + 1}/${maxRetries}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
    }
  }

  throw lastError || new Error("AI API failed after all retries");
}

export async function nonStreamingCompletion(
  options: Omit<CompletionOptions, "stream">
): Promise<string> {
  const response = await chatCompletion({ ...options, stream: false });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
