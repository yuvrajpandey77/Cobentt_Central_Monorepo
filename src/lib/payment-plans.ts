import { UserPlan } from "@/generated/prisma";

export interface PlanDefinition {
  id: UserPlan;
  label: string;
  amountPaise: number;
  currency: string;
  maxDailyTokens: number;
  maxDailyRequests: number;
  graceTokens: number;
  features: string[];
}

export const PAYMENT_PLANS: Record<string, PlanDefinition> = {
  pro: {
    id: "PRO",
    label: "Pro",
    amountPaise: 2000, // ₹20
    currency: "INR",
    maxDailyTokens: 2_000_000,
    maxDailyRequests: 100,
    graceTokens: 200_000,
    features: ["priority-support", "analytics", "webhooks"],
  },
  teams: {
    id: "ENTERPRISE",
    label: "Teams",
    amountPaise: 5000, // ₹50
    currency: "INR",
    maxDailyTokens: 10_000_000,
    maxDailyRequests: 1000,
    graceTokens: 1_000_000,
    features: ["dedicated-support", "custom-limits", "sla", "webhooks", "advanced-analytics"],
  },
};

export type PlanKey = keyof typeof PAYMENT_PLANS;

export function getPlanDefinition(planKey: string): PlanDefinition | null {
  return PAYMENT_PLANS[planKey] ?? null;
}

export function validatePlanAmount(planKey: string, amountPaise: number): boolean {
  const plan = getPlanDefinition(planKey);
  if (!plan) return false;
  return plan.amountPaise === amountPaise;
}
