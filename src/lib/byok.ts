import "server-only";

import prisma from "@/lib/db";
import { decryptApiKey } from "@/lib/api-key-crypto";
import { getProviderConfig } from "@/lib/ai/provider";
import { MODELS } from "@/lib/models";

/**
 * BYOK (Bring Your Own Key) resolver — server-only.
 *
 * Security rules:
 * - Decrypted keys NEVER leave the server. They are used per-request to call
 *   the upstream provider and are never returned, logged, or embedded in errors.
 * - Only prefix/suffix (already stored masked) are exposed to the client.
 * - Model IDs are allow-list validated before any upstream call.
 */

export const BYOK_REQUIRED_CODE = "BYOK_REQUIRED";

export class ByokError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 402) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface ByokCredential {
  /** Decrypted key — server memory only, never serialize to client. */
  apiKey: string;
  baseUrl: string;
  /** Model id to send upstream. */
  model: string;
  /** Which stored key was used (for audit, safe to expose id only). */
  keyId: string;
  /** Provider of the stored key (openai, openrouter, ...). */
  provider: string;
  source: "byok" | "server";
  extraHeaders: Record<string, string>;
}

const MODEL_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._\-\/]*$/i;
const MAX_MODEL_LEN = 120;

function isModelAllowed(model: string): boolean {
  if (!model || model.length > MAX_MODEL_LEN) return false;
  if (MODELS.some((m) => m.id === model)) return true;
  // Allow other OpenRouter-style "provider/name" ids, but nothing else.
  if (MODEL_ID_PATTERN.test(model)) return true;
  // Allow plain OpenAI model names (gpt-4o, o1-mini, ...)
  if (/^(gpt|o1|o3|chatgpt)-[a-z0-9.\-_]+$/i.test(model)) return true;
  return false;
}

/** Map a model id to the provider key that can serve it directly. */
function directProviderForModel(model: string): string | null {
  const lower = model.toLowerCase();
  if (lower.startsWith("openai/") || /^(gpt|o1|o3|chatgpt)-/.test(lower)) return "openai";
  if (lower.startsWith("openrouter/")) return "openrouter";
  return null;
}

function baseUrlFor(provider: string): string {
  if (provider === "openai") return "https://api.openai.com/v1";
  // Everything else routes through OpenRouter's OpenAI-compatible endpoint.
  // (Anthropic/Google/DeepSeek native APIs use different auth schemes, so the
  // user's OpenRouter key acts as the universal router for non-OpenAI models.)
  return process.env.AI_BASE_URL || "https://openrouter.ai/api/v1";
}

function extraHeadersFor(provider: string, baseUrl: string): Record<string, string> {
  if (provider === "openrouter" || baseUrl.includes("openrouter.ai")) {
    return {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://cobentt.com",
      "X-Title": "Cobentt",
    };
  }
  return {};
}

function serverFallbackAllowed(): boolean {
  return process.env.BYOK_ALLOW_SERVER_FALLBACK === "true";
}

/**
 * Resolve the credential for a user + model.
 * Prefers the user's own key; falls back to server env keys only when
 * BYOK_ALLOW_SERVER_FALLBACK=true (dev convenience).
 * Throws ByokError(BYOK_REQUIRED) when the user must add a key first.
 */
export async function resolveByokCredential(
  clerkUserId: string,
  requestedModel: string
): Promise<ByokCredential> {
  const model = (requestedModel || "").trim().slice(0, MAX_MODEL_LEN);
  if (!isModelAllowed(model)) {
    throw new ByokError("BYOK_INVALID_MODEL", "That model is not supported. Pick one from the model list.", 400);
  }

  const direct = directProviderForModel(model);

  const keys = await prisma.apiKey.findMany({
    where: { clerkUserId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, provider: true, encryptedKey: true, iv: true, authTag: true },
  });

  // Pick: exact provider match → openrouter universal → most recent key.
  const match =
    (direct && keys.find((k) => k.provider === direct)) ||
    keys.find((k) => k.provider === "openrouter") ||
    keys[0] ||
    null;

  // Non-OpenAI models can only be served via OpenRouter (or server fallback).
  // Use a fresh variable so TS narrowing on `match` isn't violated.
  const usable =
    match && direct === null && match.provider === "openai"
      ? (keys.find((k) => k.provider === "openrouter") ?? null)
      : match;

  if (!usable) {
    if (serverFallbackAllowed()) {
      const cfg = getProviderConfig();
      if (cfg.apiKey) {
        return {
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          model,
          keyId: "server",
          provider: cfg.provider,
          source: "server",
          extraHeaders: cfg.extraHeaders,
        };
      }
    }
    throw new ByokError(
      BYOK_REQUIRED_CODE,
      direct === "openai"
        ? "Add your OpenAI or OpenRouter key to use this model."
        : "Add your OpenRouter key to use AI features.",
      402
    );
  }
  const credential = usable;

  let apiKey: string;
  try {
    apiKey = decryptApiKey(credential.encryptedKey, credential.iv, credential.authTag);
  } catch {
    throw new ByokError("BYOK_DECRYPT_FAILED", "Saved key could not be read. Remove it and add it again.", 500);
  }
  if (!apiKey) {
    throw new ByokError("BYOK_DECRYPT_FAILED", "Saved key could not be read. Remove it and add it again.", 500);
  }

  // Normalize model for the upstream we're actually hitting.
  let upstreamModel = model;
  if (credential.provider === "openai") {
    upstreamModel = model.replace(/^openai\//i, "").replace(/^openrouter\//i, "");
  }
  if (credential.provider === "openrouter" && !model.includes("/")) {
    upstreamModel = `openai/${model}`;
  }

  const baseUrl = baseUrlFor(credential.provider);

  // Non-blocking audit touch. Never await on the hot path failures.
  prisma.apiKey
    .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    apiKey,
    baseUrl,
    model: upstreamModel,
    keyId: credential.id,
    provider: credential.provider,
    source: "byok",
    extraHeaders: extraHeadersFor(credential.provider, baseUrl),
  };
}

/** Lightweight status for the client gate — masked data only, never keys. */
export async function getByokStatus(clerkUserId: string) {
  const keys = await prisma.apiKey.findMany({
    where: { clerkUserId, isActive: true },
    select: { id: true, provider: true, name: true, keyPrefix: true, keySuffix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    hasKey: keys.length > 0,
    providers: [...new Set(keys.map((k) => k.provider))],
    keys,
  };
}
