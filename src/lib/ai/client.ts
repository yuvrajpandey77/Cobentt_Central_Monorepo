import { getProviderConfig, type ProviderConfig } from "./provider";

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

  const body = {
    model: options.model,
    messages: options.messages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature,
    top_p: options.topP,
    stream: options.stream ?? false,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
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
      throw new Error(`AI API error ${response.status}: ${errorBody}`);
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error(`AI API timeout after ${timeoutMs}ms`);
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
