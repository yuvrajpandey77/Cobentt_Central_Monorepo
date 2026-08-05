export type PlanTier = "free" | "pro" | "teams";

export interface PlanConfig {
  key: PlanTier;
  label: string;
  price: number;
  period: string;
  amountPaise: number;
  description: string;
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    key: "free",
    label: "Free",
    price: 0,
    period: "forever",
    amountPaise: 0,
    description: "5 chats per day, 3 models, 100MB storage",
  },
  pro: {
    key: "pro",
    label: "Pro",
    price: 20,
    period: "/month",
    amountPaise: 2000, // ₹20 = 2000 paise
    description: "Unlimited chats, all models, 10GB storage",
  },
  teams: {
    key: "teams",
    label: "Teams",
    price: 50,
    period: "/month",
    amountPaise: 5000, // ₹50 = 5000 paise
    description: "Everything in Pro, unlimited storage, team collab",
  },
};

export const FREE_DAILY_LIMIT = 3;

export function getPlanFromStorage(): PlanTier {
  if (typeof window === "undefined") return "free";
  return (localStorage.getItem("cb_plan") as PlanTier) || "free";
}

export function setPlanInStorage(plan: PlanTier) {
  localStorage.setItem("cb_plan", plan);
}

export function getUsageFromStorage(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  const raw = localStorage.getItem(`cb_usage_${today}`);
  return raw ? parseInt(raw, 10) : 0;
}

export function incrementUsageInStorage(): number {
  const today = new Date().toISOString().slice(0, 10);
  const key = `cb_usage_${today}`;
  const current = getUsageFromStorage();
  const next = current + 1;
  localStorage.setItem(key, String(next));
  return next;
}

export function canSendMessage(): { allowed: boolean; reason?: string } {
  const plan = getPlanFromStorage();
  if (plan !== "free") return { allowed: true };
  const used = getUsageFromStorage();
  if (used >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: "Daily limit reached. Upgrade to Pro for unlimited chats." };
  }
  return { allowed: true };
}

export interface ServerUsage {
  chat_count: number;
  free_limit: number;
}

export interface ServerSubscription {
  plan: PlanTier;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd?: number;
  } | null;
}

export async function fetchUsage(): Promise<ServerUsage> {
  try {
    const res = await fetch("/api/usage");
    if (!res.ok) return { chat_count: 0, free_limit: FREE_DAILY_LIMIT };
    return await res.json();
  } catch {
    return { chat_count: 0, free_limit: FREE_DAILY_LIMIT };
  }
}

export async function fetchSubscription(): Promise<ServerSubscription> {
  try {
    const res = await fetch("/api/subscription");
    if (!res.ok) return { plan: "free", subscription: null };
    return await res.json();
  } catch {
    return { plan: "free", subscription: null };
  }
}
