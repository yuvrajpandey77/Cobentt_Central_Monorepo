import { userIdFromRequest } from "@/lib/cloud-computer/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getProviderConfig } from "@/lib/ai/provider";
import { resolveByokCredential, ByokError, type ByokCredential } from "@/lib/byok";
import { recordAITokens } from "@/lib/ai/pipeline";

/**
 * OpenAI-compatible chat endpoint for the mobile app.
 *
 * The app signs in with Clerk, so this route verifies the `Authorization: Bearer`
 * session token itself (middleware cannot see it as a cookie). It speaks the same
 * shape as OpenRouter/OpenAI so the client's existing streaming code works unchanged.
 *
 * Credential order:
 *   1. The user's own saved key (Settings → API keys on the web, or on-device key
 *      sent by a future client).
 *   2. Cobentt's managed key, but only for zero-cost models (`:free`, `openrouter/free`).
 *      Paid models always need the user's own key — hosted paid inference is metered
 *      through the paid plan on the web, not silently given away here.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MESSAGES = 100;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_TOKENS_CAP = 2048;

type Msg = { role: "system" | "user" | "assistant"; content: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const fail = (status: number, code: string, message: string) =>
  json({ error: { code, message } }, status);

function isAllowedModel(model: string): boolean {
  if (!model || model.length > 120) return false;
  if (/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._\-\/:]*$/i.test(model)) return true;
  if (/^(gpt|o1|o3|chatgpt)-[a-z0-9.\-_]+$/i.test(model)) return true;
  return false;
}

/**
 * Models Cobentt serves with its own key when the user has no BYOK key.
 * `openrouter/auto` is cheap and reliable; `:free` models cost nothing but are
 * rate-limited upstream. Both are capped per day below.
 */
function isManagedModel(model: string): boolean {
  return model === "openrouter/auto" || model === "openrouter/free" || /:free$/i.test(model);
}

/** A managed-key request may not burn a huge prompt. */
const MANAGED_PROMPT_CHARS = 8_000;

function sanitizeMessages(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const out: Msg[] = [];
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "system" && role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    total += content.length;
    if (total > 120_000) return null;
    out.push({ role, content });
  }
  return out;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function parseUsage(body: string): { promptTokens: number; completionTokens: number } | null {
  try {
    const parsed = JSON.parse(body) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    if (!parsed.usage) return null;
    return {
      promptTokens: parsed.usage.prompt_tokens ?? 0,
      completionTokens: parsed.usage.completion_tokens ?? 0,
    };
  } catch {
    return null;
  }
}

/** Reads the last `usage` object from an SSE stream without buffering the reply. */
function meterStream(stream: ReadableStream<Uint8Array>, userId: string, model: string) {
  void (async () => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let tail = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        tail += decoder.decode(value, { stream: true });
        if (tail.length > 16 * 1024) tail = tail.slice(-16 * 1024);
      }
      const match = [...tail.matchAll(/data:\s*(\{.*?\})\s*(?:\n|$)/g)].pop();
      if (!match) return;
      const usage = parseUsage(match[1]!);
      if (usage) {
        void recordAITokens({
          userId,
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          endpoint: "mobile/ai/chat",
        });
      }
    } catch {
      // Metering must never break the response the user is reading.
    }
  })();
}

export async function POST(req: Request): Promise<Response> {
  let userId: string | null = null;
  try {
    userId = await userIdFromRequest(req);
  } catch {
    userId = null;
  }
  if (!userId) return fail(401, "UNAUTHORIZED", "Sign in to use AI features.");

  // Cheap abuse guard before we touch the provider.
  const limit = await checkRateLimit(`mobile-ai:${userId}`, {
    requests: 40,
    window: "60 s",
  }).catch(() => null);
  if (limit && !limit.success) {
    return fail(429, "RATE_LIMITED", "Too many requests. Wait a moment and try again.");
  }

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) return fail(413, "TOO_LARGE", "That message is too long.");
  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(400, "INVALID_JSON", "The request wasn't valid JSON.");
  }

  const model = typeof body.model === "string" ? body.model.trim() : "";
  if (!isAllowedModel(model)) {
    return fail(400, "INVALID_MODEL", "That model isn't supported. Pick one from the model list.");
  }
  const messages = sanitizeMessages(body.messages);
  if (!messages) return fail(400, "INVALID_MESSAGES", "The conversation could not be read.");

  let credential: ByokCredential;
  try {
    credential = await resolveByokCredential(userId, model);
  } catch (err) {
    if (!(err instanceof ByokError) || err.code !== "BYOK_REQUIRED") {
      if (err instanceof ByokError) return fail(err.status, err.code, err.message);
      console.error("[ai/chat] credential resolution failed:", err instanceof Error ? err.message : err);
      return fail(503, "AI_UNAVAILABLE", "AI is temporarily unavailable. Try again in a moment.");
    }
    // No user key. The managed key serves only the capped, low-cost models.
    const managed = getProviderConfig();
    if (!isManagedModel(model) || !managed.apiKey) {
      return fail(
        402,
        "BYOK_REQUIRED",
        "Add your OpenRouter key in Settings → API keys to use this model, or pick Auto."
      );
    }
    const managedChars = messages.reduce((n, m) => n + m.content.length, 0);
    if (managedChars > MANAGED_PROMPT_CHARS) {
      return fail(
        413,
        "TOO_LARGE",
        "That conversation is too long for the free tier. Start a new chat or add your own API key."
      );
    }
    // A daily cap keeps the shared key from being drained by one account.
    const daily = await checkRateLimit(`mobile-ai-day:${userId}`, {
      requests: 60,
      window: "86400 s",
    }).catch(() => null);
    if (daily && !daily.success) {
      return fail(
        429,
        "DAILY_LIMIT",
        "You've reached today's free limit. Add your own API key in Settings for unlimited chat."
      );
    }
    credential = {
      apiKey: managed.apiKey,
      baseUrl: managed.baseUrl,
      model,
      keyId: "server",
      provider: managed.provider,
      source: "server",
      extraHeaders: managed.extraHeaders,
    };
  }

  const streaming = body.stream === true;
  const payload = {
    model: credential.model,
    messages,
    stream: streaming,
    max_tokens: clampNumber(body.max_tokens, 512, 1, MAX_TOKENS_CAP),
    temperature: clampNumber(body.temperature, 0.7, 0, 2),
    top_p: clampNumber(body.top_p, 0.9, 0, 1),
    ...(streaming ? { stream_options: { include_usage: true } } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  let upstream: Response;
  try {
    upstream = await fetch(`${credential.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: streaming ? "text/event-stream" : "application/json",
        Authorization: `Bearer ${credential.apiKey}`,
        ...credential.extraHeaders,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === "AbortError";
    return fail(
      504,
      "PROVIDER_TIMEOUT",
      aborted
        ? "The model took too long to answer. Try a shorter question."
        : "Couldn't reach the model provider. Check your connection and try again."
    );
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    const text = await upstream.text().catch(() => "");
    let detail = "";
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } | string };
      detail = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? "";
    } catch {
      // provider may return plain text; never forward raw bodies wholesale
    }
    // Log only status + short detail; never prompts, messages or keys.
    console.warn("[ai/chat] upstream", upstream.status, detail.slice(0, 200));

    if (upstream.status === 401 || upstream.status === 403) {
      return fail(401, "PROVIDER_KEY_REJECTED", "The provider rejected the saved key. Check it in Settings → API keys.");
    }
    if (upstream.status === 402) {
      return fail(402, "PROVIDER_NO_CREDIT", "The provider says this account is out of credit. Add credit or switch models.");
    }
    if (upstream.status === 404) {
      return fail(404, "MODEL_NOT_FOUND", "That model isn't available on this provider. Pick another model.");
    }
    if (upstream.status === 429) {
      return fail(429, "PROVIDER_RATE_LIMITED", "The provider is rate-limiting you. Wait a moment and try again.");
    }
    return fail(502, "PROVIDER_ERROR", "The model provider had a problem. Try again in a moment.");
  }

  if (!streaming) {
    const text = await upstream.text().catch(() => "");
    clearTimeout(timeout);
    if (!text.trim()) return fail(502, "PROVIDER_EMPTY", "The model provider returned an empty answer. Try again.");
    const usage = parseUsage(text);
    if (usage) {
      void recordAITokens({
        userId,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        endpoint: "mobile/ai/chat",
      });
    }
    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // Streaming: hand bytes through untouched and clear the timeout when the body ends.
  if (!upstream.body) {
    clearTimeout(timeout);
    return fail(502, "PROVIDER_EMPTY", "The model provider returned an empty answer. Try again.");
  }
  clearTimeout(timeout);
  const [toClient, toMeter] = upstream.body.tee();
  meterStream(toMeter, userId, model);
  return new Response(toClient, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
