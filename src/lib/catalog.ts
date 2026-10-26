import { ensureLivePricing } from "@/lib/live-pricing";
import { PLAN_PERIOD_DAYS, PLAN_SPECS, TOPUP_SPECS, TOPUP_VALID_DAYS, formatINR, formatUSD, lookupModel, tokensForBudget, type PlanKey } from "@/lib/pricing-catalog";

/** Models shown as "about N tokens" on the pricing and usage pages. Only listed when live pricing knows them. */
export const REFERENCE_MODELS = ["openai/gpt-4o-mini", "google/gemini-2.0-flash-001", "openai/gpt-4o", "anthropic/claude-3.5-sonnet"] as const;

export function tokensPreview(budgetMicroUSD: number) {
  return REFERENCE_MODELS.flatMap((m) => {
    const rate = lookupModel(m);
    return rate ? [{ model: rate.model, tokens: tokensForBudget(rate, budgetMicroUSD) }] : [];
  });
}

export async function publicCatalog() {
  await ensureLivePricing();
  const plans = (Object.keys(PLAN_SPECS) as PlanKey[]).map((k) => {
    const s = PLAN_SPECS[k];
    return {
      key: s.key,
      label: s.label,
      priceINR: formatINR(s.priceINRPaise),
      priceINRPaise: s.priceINRPaise,
      periodDays: PLAN_PERIOD_DAYS,
      budgetUSD: formatUSD(s.budgetMicroUSD),
      budgetMicroUSD: s.budgetMicroUSD,
      tokens: tokensPreview(s.budgetMicroUSD),
      dailyRequests: s.dailyRequests,
      modelTier: s.modelTier,
    };
  });
  const topups = Object.values(TOPUP_SPECS).map((t) => ({
    key: t.key,
    priceINR: formatINR(t.priceINRPaise),
    priceINRPaise: t.priceINRPaise,
    validDays: TOPUP_VALID_DAYS,
    budgetUSD: formatUSD(t.budgetMicroUSD),
    budgetMicroUSD: t.budgetMicroUSD,
    tokens: tokensPreview(t.budgetMicroUSD),
  }));
  return { currency: "INR", margin: "Provider price plus 10%", plans, topups };
}
