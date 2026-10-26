import { MODEL_PRICING } from "@/lib/token-pricing";
import { buildModelTable, replaceModelTable } from "@/lib/pricing-catalog";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const TTL_MS = 60 * 60_000;
const TIMEOUT_MS = 5_000;

export type PerMillion = { input: number; output: number };
export type LivePrices = Record<string, PerMillion>;

let loadedAt = 0;
let inFlight: Promise<unknown> | null = null;

/** OpenRouter quotes USD per token as strings; the catalog works in USD per million tokens. */
export function parseOpenRouterPrices(payload: unknown): LivePrices {
  const data = (payload as { data?: unknown } | null)?.data;
  const out: LivePrices = {};
  if (!Array.isArray(data)) return out;
  for (const m of data) {
    const id = (m as { id?: unknown })?.id;
    const p = (m as { pricing?: { prompt?: unknown; completion?: unknown } })?.pricing;
    if (typeof id !== "string" || !p) continue;
    const input = Number(p.prompt) * 1e6;
    const output = Number(p.completion) * 1e6;
    if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) continue;
    out[id] = { input, output };
  }
  return out;
}

/**
 * Pulls OpenRouter's public model list and makes it the active price table. Keeps the static table as the base so a
 * provider that OpenRouter does not list still resolves; OpenRouter prices win wherever both exist.
 */
export async function refreshLivePricing(fetchFn: typeof fetch = fetch, now = Date.now()): Promise<boolean> {
  try {
    const res = await fetchFn(OPENROUTER_MODELS_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return false;
    const live = parseOpenRouterPrices(await res.json());
    if (Object.keys(live).length === 0) return false;
    const table = buildModelTable(MODEL_PRICING as never);
    for (const [k, v] of buildModelTable({ OPENROUTER: live }).entries()) table.set(k, v);
    replaceModelTable(table);
    loadedAt = now;
    return true;
  } catch {
    return false;
  }
}

/** Call before metering. Refreshes at most once per TTL and shares one in-flight request across callers. */
export async function ensureLivePricing(fetchFn: typeof fetch = fetch, now = Date.now()): Promise<void> {
  if (now - loadedAt < TTL_MS) return;
  inFlight ??= refreshLivePricing(fetchFn, now).finally(() => {
    inFlight = null;
  });
  await inFlight;
}
