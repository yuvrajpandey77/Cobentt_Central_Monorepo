/**
 * What each price buys. Pure data + math (no I/O) so it is unit-tested and shared by the pricing page, order creation,
 * activation and the metering endpoints. Changing a number here changes what users are charged AND what they receive.
 *
 * Unit of account: a "standard token" (ST). 1,000,000 ST = USD 0.26 of provider cost, i.e. the blended price of a small
 * model (3 input : 1 output) such as gpt-4o-mini. Premium models cost more ST per real token, which is why a $5 plan
 * lasts for ~10M tokens of a small model or ~1M tokens of a frontier model. Allowances are sized to ~50% of the price
 * so payment fees, tax, infrastructure and margin are covered.
 */
import { MODEL_PRICING } from "@/lib/token-pricing";

export const REFERENCE_USD_PER_MILLION_ST = 0.26;
export const PLAN_PERIOD_DAYS = 30;
export const TOPUP_VALID_DAYS = 365;

export type PlanKey = "starter" | "plus" | "pro";
export type TopupKey = "t5" | "t10" | "t25";

export interface PlanSpec {
  key: PlanKey;
  label: string;
  /** Prisma `UserPlan` value written to AllowedUser: every paid tier is "PRO"; the tier itself lives in `planKey`. */
  id: "PRO";
  usdCents: number;
  /** Standard tokens granted per 30-day period (no rollover). */
  monthlyST: number;
  /** Abuse and speed protection, independent of balance. */
  dailyRequests: number;
  maxConcurrent: number;
  maxOutputTokens: number;
  /** Highest model cost tier this plan may use ("standard" < "premium" < "frontier"). */
  modelTier: ModelTier;
}

export type ModelTier = "free" | "standard" | "premium" | "frontier";
const TIER_RANK: Record<ModelTier, number> = { free: 0, standard: 1, premium: 2, frontier: 3 };

export const PLAN_SPECS: Record<PlanKey, PlanSpec> = {
  starter: { key: "starter", label: "Starter", id: "PRO", usdCents: 500, monthlyST: 10_000_000, dailyRequests: 300, maxConcurrent: 2, maxOutputTokens: 4096, modelTier: "standard" },
  plus: { key: "plus", label: "Plus", id: "PRO", usdCents: 1200, monthlyST: 25_000_000, dailyRequests: 800, maxConcurrent: 4, maxOutputTokens: 8192, modelTier: "premium" },
  pro: { key: "pro", label: "Pro", id: "PRO", usdCents: 2000, monthlyST: 40_000_000, dailyRequests: 2000, maxConcurrent: 8, maxOutputTokens: 16384, modelTier: "frontier" },
};

export interface TopupSpec {
  key: TopupKey;
  usdCents: number;
  st: number;
}
/** Pay-as-you-go: priced a little above plans per token (plans reward commitment). Valid for 12 months. */
export const TOPUP_SPECS: Record<TopupKey, TopupSpec> = {
  t5: { key: "t5", usdCents: 500, st: 8_000_000 },
  t10: { key: "t10", usdCents: 1000, st: 17_000_000 },
  t25: { key: "t25", usdCents: 2500, st: 45_000_000 },
};

/** Limits for someone with only pay-as-you-go balance (no active plan): same as Starter. */
export const PAYG_ONLY_LIMITS = { dailyRequests: 300, maxConcurrent: 2, maxOutputTokens: 4096, modelTier: "standard" as ModelTier };
/** Free users: zero-cost models only, capped. Hosted paid models need a plan or a balance. */
export const FREE_LIMITS = { dailyRequests: 20, maxConcurrent: 1, maxOutputTokens: 1024, modelTier: "free" as ModelTier };

// ---------------------------------------------------------------- charging currency

export type Currency = "USD" | "INR";

/** Minor units (cents / paise) actually charged. INR is derived from USD at an explicit, configured rate. */
export function chargeAmount(usdCents: number, currency: Currency, usdInrRate: number): number {
  if (currency === "USD") return usdCents;
  // ₹ = $ × rate; paise rounded up to the next whole rupee so prices look clean (e.g. ₹425).
  return Math.ceil((usdCents / 100) * usdInrRate) * 100;
}

export function formatMoney(minor: number, currency: Currency): string {
  const major = minor / 100;
  const s = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return currency === "USD" ? `$${s}` : `₹${s}`;
}

// ---------------------------------------------------------------- models

export interface ModelRate {
  provider: string;
  model: string;
  inputPerM: number;
  outputPerM: number;
  tier: ModelTier;
}

function tierFor(blended: number): ModelTier {
  if (blended <= 0) return "free";
  if (blended <= 1.0) return "standard";
  if (blended <= 6.0) return "premium";
  return "frontier";
}

/** Allow-list built from the priced models. A model that is not here cannot be called with our keys: unknown never means free. */
export function buildModelTable(pricing: Record<string, Record<string, { input: number; output: number }>> = MODEL_PRICING as never): Map<string, ModelRate> {
  const out = new Map<string, ModelRate>();
  for (const [provider, models] of Object.entries(pricing)) {
    for (const [model, r] of Object.entries(models)) {
      const blended = (3 * r.input + r.output) / 4;
      out.set(model.toLowerCase(), { provider, model, inputPerM: r.input, outputPerM: r.output, tier: tierFor(blended) });
    }
  }
  return out;
}

export const MODEL_TABLE = buildModelTable();

export function lookupModel(model: string, table = MODEL_TABLE): ModelRate | null {
  const key = model.toLowerCase().trim();
  const slash = key.lastIndexOf("/");
  return table.get(key) ?? (slash >= 0 ? (table.get(key.slice(slash + 1)) ?? null) : null);
}

export function tierAllows(planTier: ModelTier, modelTier: ModelTier): boolean {
  return TIER_RANK[modelTier] <= TIER_RANK[planTier];
}

/** Standard tokens for an exact usage. Rounded UP: we never under-charge a fraction. */
export function costInST(rate: ModelRate, promptTokens: number, completionTokens: number): number {
  const usd = (Math.max(0, promptTokens) / 1e6) * rate.inputPerM + (Math.max(0, completionTokens) / 1e6) * rate.outputPerM;
  return Math.ceil((usd / REFERENCE_USD_PER_MILLION_ST) * 1e6);
}

/** Worst case for a request: the full prompt plus the maximum output the caller allows. Reserved before any provider call. */
export function reserveST(rate: ModelRate, promptTokens: number, maxOutputTokens: number): number {
  return costInST(rate, promptTokens, maxOutputTokens);
}

/** Cheap, deliberately pessimistic prompt-size estimate (never below the true size for normal text). */
export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 3) + 16;
}
