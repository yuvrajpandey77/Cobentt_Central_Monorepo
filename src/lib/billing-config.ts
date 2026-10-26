import { PLAN_SPECS, TOPUP_SPECS, type PlanKey, type PlanSpec, type TopupKey, type TopupSpec } from "@/lib/pricing-catalog";

/** Every charge is in rupees. Prices are fixed paise values, not converted from a dollar rate. */
export const BILLING_CURRENCY = "INR" as const;

export type ProductKey = `topup:${TopupKey}`;

export type Product = { kind: "topup"; key: TopupKey; spec: TopupSpec };

/** One-time packs only. Monthly plans are Razorpay Subscriptions and never go through a one-time order. */
export function parseProduct(raw: string | null | undefined): Product | null {
  if (!raw) return null;
  const [kind, key] = raw.split(":");
  if (kind === "topup" && key in TOPUP_SPECS) return { kind: "topup", key: key as TopupKey, spec: TOPUP_SPECS[key as TopupKey] };
  return null;
}

export function productAmount(p: Product): number {
  return p.spec.priceINRPaise;
}

export const ALL_PRODUCT_KEYS = (Object.keys(TOPUP_SPECS) as TopupKey[]).map((k) => `topup:${k}` as const) as [ProductKey, ...ProductKey[]];

export function planPrice(key: PlanKey): PlanSpec {
  return PLAN_SPECS[key];
}
