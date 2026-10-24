import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { getBalances } from "@/lib/wallet";
import { tokensPreview } from "@/lib/catalog";
import { PLAN_SPECS, formatUSD, type PlanKey } from "@/lib/pricing-catalog";
import { ensureLivePricing } from "@/lib/live-pricing";
import { hasActiveAccess } from "@/lib/subscription-period";

export const dynamic = "force-dynamic";

/** The signed-in user's plan, renewal date, live API balance and recent usage. Used by the settings page. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLivePricing();

  const [user, balances, entries] = await Promise.all([
    prisma.allowedUser.findUnique({
      where: { clerkUserId: userId },
      select: { plan: true, planKey: true, subscriptionStatus: true, currentPeriodEnd: true, cancelAtPeriodEnd: true, status: true },
    }),
    getBalances(userId),
    prisma.tokenLedger.findMany({
      where: { clerkUserId: userId, kind: { in: ["USAGE", "GRANT_PLAN", "TOPUP", "REVERSAL"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { kind: true, deltaST: true, model: true, promptTokens: true, completionTokens: true, createdAt: true },
    }),
  ]);

  const active = hasActiveAccess(user ? { plan: user.plan, subscriptionStatus: user.subscriptionStatus, currentPeriodEnd: user.currentPeriodEnd } : null);
  const planSpec = user?.planKey && user.planKey in PLAN_SPECS ? PLAN_SPECS[user.planKey as PlanKey] : null;

  return NextResponse.json({
    plan: active && planSpec ? planSpec.key : "free",
    planLabel: active && planSpec ? planSpec.label : "Free",
    renewsAt: active ? user?.currentPeriodEnd ?? null : null,
    cancelAtPeriodEnd: user?.cancelAtPeriodEnd ?? false,
    subscriptionStatus: user?.subscriptionStatus ?? null,
    balance: {
      planUSD: formatUSD(balances.plan),
      topupUSD: formatUSD(balances.payg),
      totalUSD: formatUSD(balances.total),
      planMicroUSD: balances.plan,
      topupMicroUSD: balances.payg,
      planExpiresAt: balances.planExpiresAt,
      topupExpiresAt: balances.paygExpiresAt,
      tokens: tokensPreview(balances.total),
    },
    usage: entries.map((e) => ({
      kind: e.kind,
      amountUSD: formatUSD(Math.abs(Number(e.deltaST))),
      direction: Number(e.deltaST) < 0 ? "spent" : "added",
      model: e.model,
      promptTokens: e.promptTokens,
      completionTokens: e.completionTokens,
      at: e.createdAt,
    })),
  });
}
