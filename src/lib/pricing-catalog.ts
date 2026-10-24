/**
 * What each price buys. Pure data + math (no I/O) so it is unit-tested and shared by the pricing page, checkout,
 * activation and the metering endpoints. Changing a number here changes what users are charged AND what they receive.
 *
 * Unit of account: micro-US-dollars of provider spend. 1 unit = $0.000001. A plan is sold in rupees and grants a fixed
 * dollar budget of API usage at the provider's live price (e.g. Starter: ₹499 buys $3). Tokens are derived from the live
 * model price, so the same budget buys more tokens on a cheaper model. Balance columns keep their historical `ST` name.
 */
import { MODEL_PRICING } from "@/lib/token-pricing";

export const MICRO_USD_PER_USD = 1_000_000;
/** Cobentt's margin on top of the provider's live per-token price. */
export const PLATFORM_MARGIN = 0.1;
export const PLAN_PERIOD_DAYS = 30;
export const TOPUP_VALID_DAYS = 365;

export type PlanKey = "starter" | "plus" | "pro";
export type TopupKey = "t1" | "t2" | "t3";

export type ModelTier = "free" | "standard" | "premium" | "frontier";
const TIER_RANK: Record<ModelTier, number> = { free: 0, standard: 1, premium: 2, frontier: 3 };

export interface PlanSpec {
  key: PlanKey;
  label: string;
  /** Prisma `UserPlan` value written to AllowedUser: every paid tier is "PRO"; the tier itself lives in `planKey`. */
  id: "PRO";
  priceINRPaise: number;
  /** API budget granted each period, micro-USD. Not carried over: a renewal replaces the unused remainder. */
  budgetMicroUSD: number;
  dailyRequests: number;
  maxConcurrent: number;
  maxOutputTokens: number;
  /** Highest model cost tier this plan may use. */
  modelTier: ModelTier;
}

export const PLAN_SPECS: Record<PlanKey, PlanSpec> = {
  starter: { key: "starter", label: "Starter", id: "PRO", priceINRPaise: 49_900, budgetMicroUSD: 3_000_000, dailyRequests: 300, maxConcurrent: 2, maxOutputTokens: 4096, modelTier: "standard" },
  plus: { key: "plus", label: "Plus", id: "PRO", priceINRPaise: 99_900, budgetMicroUSD: 6_000_000, dailyRequests: 800, maxConcurrent: 4, maxOutputTokens: 8192, modelTier: "premium" },
  pro: { key: "pro", label: "Pro", id: "PRO", priceINRPaise: 199_900, budgetMicroUSD: 12_000_000, dailyRequests: 2000, maxConcurrent: 8, maxOutputTokens: 16384, modelTier: "frontier" },
};

export interface TopupSpec {
  key: TopupKey;
  priceINRPaise: number;
  budgetMicroUSD: number;
}

/** Pay-as-you-go packs, valid for TOPUP_VALID_DAYS. */
export const TOPUP_SPECS: Record<TopupKey, TopupSpec> = {
  t1: { key: "t1", priceINRPaise: 49_900, budgetMicroUSD: 3_000_000 },
  t2: { key: "t2", priceINRPaise: 99_900, budgetMicroUSD: 6_000_000 },
  t3: { key: "t3", priceINRPaise: 199_900, budgetMicroUSD: 12_000_000 },
};

/** Limits for someone with only pay-as-you-go balance (no active plan): same as Starter. */
export const PAYG_ONLY_LIMITS = { dailyRequests: 300, maxConcurrent: 2, maxOutputTokens: 4096, modelTier: "standard" as ModelTier };
/** Free users: zero-cost models only, capped. Hosted paid models need a plan or a balance. */
export const FREE_LIMITS = { dailyRequests: 20, maxConcurrent: 1, maxOutputTokens: 1024, modelTier: "free" as ModelTier };

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees.toLocaleString("en-IN") : rupees.toFixed(2)}`;
}

export function formatUSD(microUSD: number): string {
  const usd = microUSD / MICRO_USD_PER_USD;
  return `$${Number.isInteger(usd) ? usd : usd.toFixed(2)}`;
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
export function buildModelTable(pricing: Record<string, Record<string, { input: number; output: number }>>): Map<string, ModelRate> {
  const out = new Map<string, ModelRate>();
  for (const [provider, models] of Object.entries(pricing)) {
    for (const [model, r] of Object.entries(models)) {
      const blended = (3 * r.input + r.output) / 4;
      out.set(model.toLowerCase(), { provider, model, inputPerM: r.input, outputPerM: r.output, tier: tierFor(blended) });
    }
  }
  return out;
}

/** Static prices are the fallback until live prices load; a model missing from both is refused. */
export let MODEL_TABLE = buildModelTable(MODEL_PRICING as never);

/** Swaps in live provider prices (see live-pricing.ts). Lookups and metering read the table at call time. */
export function replaceModelTable(table: Map<string, ModelRate>): void {
  MODEL_TABLE = table;
}

export function lookupModel(model: string, table = MODEL_TABLE): ModelRate | null {
  const key = model.toLowerCase().trim();
  const slash = key.lastIndexOf("/");
  return table.get(key) ?? (slash >= 0 ? (table.get(key.slice(slash + 1)) ?? null) : null);
}

export function tierAllows(planTier: ModelTier, modelTier: ModelTier): boolean {
  return TIER_RANK[modelTier] <= TIER_RANK[planTier];
}

/** Provider cost in USD for an exact usage, before any margin. */
export function providerCostUSD(rate: ModelRate, promptTokens: number, completionTokens: number): number {
  return (Math.max(0, promptTokens) / 1e6) * rate.inputPerM + (Math.max(0, completionTokens) / 1e6) * rate.outputPerM;
}

/** Micro-USD charged for an exact usage: provider cost plus the platform margin. Rounded UP so we never under-charge. */
export function costMicroUSD(rate: ModelRate, promptTokens: number, completionTokens: number): number {
  return Math.ceil(providerCostUSD(rate, promptTokens, completionTokens) * (1 + PLATFORM_MARGIN) * MICRO_USD_PER_USD);
}

/** Worst case for a request: the full prompt plus the maximum output the caller allows. Reserved before any provider call. */
export function reserveMicroUSD(rate: ModelRate, promptTokens: number, maxOutputTokens: number): number {
  return costMicroUSD(rate, promptTokens, maxOutputTokens);
}

/**
 * How many tokens a budget buys on one model, assuming the blended 3:1 input:output mix the tiers are built on. This is
 * what the pricing page and the usage screen show, so the number a user sees matches what metering will charge.
 */
export function tokensForBudget(rate: ModelRate, budgetMicroUSD: number): number {
  const perToken = ((3 * rate.inputPerM + rate.outputPerM) / 4 / 1e6) * (1 + PLATFORM_MARGIN);
  if (perToken <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(budgetMicroUSD / MICRO_USD_PER_USD / perToken);
}

/** Cheap, deliberately pessimistic prompt-size estimate (never below the true size for normal text). */
export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 3) + 16;
}
