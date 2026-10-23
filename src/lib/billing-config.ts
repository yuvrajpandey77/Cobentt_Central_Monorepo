import { PLAN_SPECS, TOPUP_SPECS, chargeAmount, type Currency, type PlanKey, type PlanSpec, type TopupKey, type TopupSpec } from "@/lib/pricing-catalog";

/**
 * Charging currency. Razorpay accounts charge INR by default; USD needs "International Payments" enabled on the account.
 * Prices are defined in USD; INR is derived from `USD_INR_RATE` and rounded up to whole rupees. Set both in production.
 */
export function billingCurrency(env: Record<string, string | undefined> = process.env): Currency {
  return env.BILLING_CURRENCY === "USD" ? "USD" : "INR";
}

export function usdInrRate(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.USD_INR_RATE);
  return Number.isFinite(n) && n >= 50 && n <= 200 ? n : 85;
}

export type ProductKey = `plan:${PlanKey}` | `topup:${TopupKey}`;

export type Product = { kind: "plan"; key: PlanKey; spec: PlanSpec } | { kind: "topup"; key: TopupKey; spec: TopupSpec };

export function parseProduct(raw: string | null | undefined): Product | null {
  if (!raw) return null;
  const [kind, key] = raw.split(":");
  if (kind === "plan" && key in PLAN_SPECS) return { kind: "plan", key: key as PlanKey, spec: PLAN_SPECS[key as PlanKey] };
  if (kind === "topup" && key in TOPUP_SPECS) return { kind: "topup", key: key as TopupKey, spec: TOPUP_SPECS[key as TopupKey] };
  return null;
}

export function productAmount(p: Product, currency = billingCurrency(), rate = usdInrRate()): number {
  return chargeAmount(p.spec.usdCents, currency, rate);
}

export const ALL_PRODUCT_KEYS = [
  ...(Object.keys(PLAN_SPECS) as PlanKey[]).map((k) => `plan:${k}` as const),
  ...(Object.keys(TOPUP_SPECS) as TopupKey[]).map((k) => `topup:${k}` as const),
] as [ProductKey, ...ProductKey[]];
