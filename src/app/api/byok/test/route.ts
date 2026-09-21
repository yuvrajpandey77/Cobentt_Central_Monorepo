import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { decryptApiKey } from "@/lib/api-key-crypto";
import { validateProviderKey } from "@/lib/provider-validation";
import { MODELS } from "@/lib/models";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const testSchema = z.object({
  /** Test an already-saved key by id. */
  keyId: z.string().uuid().optional(),
  /** Or test a not-yet-saved key (pre-save validation). Never stored/logged. */
  provider: z.string().min(1).max(50).optional(),
  apiKey: z.string().min(10).max(500).optional(),
  /** Model to test with. Must be in the allow-list. */
  model: z.string().min(1).max(120),
});

function isModelAllowed(model: string): boolean {
  if (MODELS.some((m) => m.id === model)) return true;
  if (/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._\-\/]*$/i.test(model)) return true;
  if (/^(gpt|o1|o3|chatgpt)-[a-z0-9.\-_]+$/i.test(model)) return true;
  return false;
}

function baseUrlFor(provider: string): string {
  if (provider === "openai") return "https://api.openai.com/v1";
  return process.env.AI_BASE_URL || "https://openrouter.ai/api/v1";
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

  // Strict rate limit: key testing hits upstream providers.
  let rateLimit;
  try {
    rateLimit = await checkRateLimit(`byok:test:${session.userId}`, {
      // Key tests are paid by the caller's own credential. Permit enough
      // retries for a typo or provider/model mismatch without allowing an
      // unbounded validation endpoint.
      requests: 10,
      window: "60 s",
      // Hits upstream providers (= spend) — never run unlimited.
      failClosed: true,
    });
  } catch (err) {
    console.error("[byok/test] rate-limit check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Retry in a minute.", code: "RATE_LIMIT_UNAVAILABLE" },
      { status: 503 }
    );
  }
  if (!rateLimit.success) {
    return NextResponse.json(
      { ok: false, error: "Too many tests. Wait a minute and retry.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { keyId, provider, apiKey: rawKey, model } = parsed.data;

  if (!isModelAllowed(model)) {
    return NextResponse.json({ error: "Unsupported model. Pick one from the list." }, { status: 400 });
  }

  let providerName: string;
  let keyMaterial: string;
  let resolvedKeyId: string | null = null;

  if (rawKey && provider) {
    const validation = validateProviderKey(provider, rawKey);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    providerName = provider;
    keyMaterial = rawKey;
  } else if (keyId) {
    let record;
    try {
      record = await prisma.apiKey.findFirst({
        where: { id: keyId, clerkUserId: session.userId, isActive: true },
        select: { id: true, provider: true, encryptedKey: true, iv: true, authTag: true },
      });
    } catch (err) {
      console.error("[byok/test] DB lookup failed:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { ok: false, error: "Database unavailable. Retry in a moment.", code: "DB_UNAVAILABLE" },
        { status: 503 }
      );
    }
    if (!record) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    try {
      keyMaterial = decryptApiKey(record.encryptedKey, record.iv, record.authTag);
    } catch {
      return NextResponse.json(
        { error: "Saved key could not be read. Remove it and add it again." },
        { status: 500 }
      );
    }
    providerName = record.provider;
    resolvedKeyId = record.id;
  } else {
    return NextResponse.json(
      { error: "Provide keyId or provider + apiKey" },
      { status: 400 }
    );
  }

  // OpenAI keys can only test OpenAI models; everything else goes via OpenRouter.
  const needsRouter = !/^(openai\/|openrouter\/|gpt-|o1-|o3-|chatgpt-)/i.test(model);
  if (needsRouter && providerName === "openai") {
    return NextResponse.json(
      { error: "This model needs an OpenRouter key. Add one to test it." },
      { status: 400 }
    );
  }

  const baseUrl = baseUrlFor(providerName);
  let upstreamModel = model;
  if (providerName === "openai") {
    upstreamModel = model.replace(/^openai\//i, "").replace(/^openrouter\//i, "");
  } else if (providerName === "openrouter" && !model.includes("/")) {
    upstreamModel = `openai/${model}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${keyMaterial}`,
  };
  if (baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://cobentt.com";
    headers["X-Title"] = "Cobentt";
  }
  // Drop the key from memory as soon as possible (no logs of keyMaterial anywhere).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: upstreamModel,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
        max_tokens: 8,
        temperature: 0,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json(
        { ok: false, error: "Provider rejected the key. Check it and retry." },
        { status: 200 }
      );
    }
    if (res.status === 404) {
      return NextResponse.json(
        { ok: false, error: "Model not available for this key. Try another model." },
        { status: 200 }
      );
    }
    if (res.status === 429 || res.status === 402) {
      return NextResponse.json(
        { ok: false, error: "Key works but is rate-limited or out of credits." },
        { status: 200 }
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Provider error (${res.status}). Retry or try another model.` },
        { status: 200 }
      );
    }
    if (resolvedKeyId) {
      prisma.apiKey
        .update({ where: { id: resolvedKeyId }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      await logUserAuditEvent({
        clerkUserId: session.userId,
        event: "api_key.tested",
        details: { keyId: resolvedKeyId, model },
      });
    }
    return NextResponse.json({ ok: true, model });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { ok: false, error: timedOut ? "Test timed out. Retry." : "Test failed. Check the key and retry." },
      { status: 200 }
    );
  } finally {
    clearTimeout(timeout);
    keyMaterial = "";
  }
  } catch (err) {
    // Last-resort guard: this route must ALWAYS return JSON, never an HTML
    // 500 page (clients do res.json() and crash on "<!DOCTYPE...").
    console.error("[byok/test] unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: "Service temporarily unavailable. Retry in a moment.", code: "INTERNAL" },
      { status: 503 }
    );
  }
}
