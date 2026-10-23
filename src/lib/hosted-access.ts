import prisma from "@/lib/db";
import { FREE_LIMITS, PAYG_ONLY_LIMITS, PLAN_SPECS, costInST, lookupModel, reserveST, tierAllows, type ModelTier, type PlanKey } from "@/lib/pricing-catalog";
import { hasActiveAccess } from "@/lib/subscription-period";
import { getBalances, reserve, settle } from "@/lib/wallet";

export interface AccessLimits {
  source: "plan" | "payg" | "free";
  planKey: PlanKey | null;
  dailyRequests: number;
  maxConcurrent: number;
  maxOutputTokens: number;
  modelTier: ModelTier;
}

export async function limitsFor(userId: string, now = new Date()): Promise<AccessLimits> {
  const u = await prisma.allowedUser.findUnique({ where: { clerkUserId: userId }, select: { plan: true, planKey: true, status: true, subscriptionStatus: true, currentPeriodEnd: true } });
  if (u && u.status === "APPROVED" && hasActiveAccess(u, now) && u.planKey && u.planKey in PLAN_SPECS) {
    const s = PLAN_SPECS[u.planKey as PlanKey];
    return { source: "plan", planKey: s.key, dailyRequests: s.dailyRequests, maxConcurrent: s.maxConcurrent, maxOutputTokens: s.maxOutputTokens, modelTier: s.modelTier };
  }
  const b = await getBalances(userId, now);
  if (b.payg > 0 || b.plan > 0) return { source: "payg", planKey: null, ...PAYG_ONLY_LIMITS };
  return { source: "free", planKey: null, ...FREE_LIMITS };
}

export type Denied = { ok: false; status: 400 | 402 | 403 | 429; code: "MODEL_NOT_ALLOWED" | "MODEL_NOT_IN_PLAN" | "PAYMENT_REQUIRED" | "DAILY_LIMIT" | "BUSY" | "BAD_REQUEST" };

/**
 * The one decision point for hosted AI used by the mobile gateway: who is this user, what may they use, how much may
 * one request cost, and is the money there. Reserves the worst case before any provider call.
 */
export async function authorizeHosted(input: { userId: string; requestId: string; model: string; promptTokens: number; maxOutputTokens: number }, now = new Date()): Promise<Denied | { ok: true; reservedST: number; maxOutputTokens: number; source: AccessLimits["source"] }> {
  const { userId, requestId, model } = input;
  if (!userId || !/^[\w-]{8,100}$/.test(requestId) || !Number.isInteger(input.promptTokens) || input.promptTokens < 0 || input.promptTokens > 2_000_000 || !Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens < 1) {
    return { ok: false, status: 400, code: "BAD_REQUEST" };
  }
  const rate = lookupModel(model);
  if (!rate) return { ok: false, status: 403, code: "MODEL_NOT_ALLOWED" };

  const lim = await limitsFor(userId, now);
  if (!tierAllows(lim.modelTier, rate.tier)) return { ok: false, status: lim.source === "free" ? 402 : 403, code: lim.source === "free" ? "PAYMENT_REQUIRED" : "MODEL_NOT_IN_PLAN" };

  const maxOut = Math.min(input.maxOutputTokens, lim.maxOutputTokens);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const today = await prisma.tokenLedger.count({ where: { clerkUserId: userId, kind: "RESERVE", createdAt: { gte: dayStart }, refId: { not: `res:${requestId}` } } });
  if (today >= lim.dailyRequests) return { ok: false, status: 429, code: "DAILY_LIMIT" };

  const open = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*) AS n FROM token_ledger r
    WHERE r."clerkUserId" = ${userId} AND r.kind = 'RESERVE' AND r."createdAt" > now() - interval '2 minutes'
      AND r."refId" <> ${`res:${requestId}`}
      AND NOT EXISTS (SELECT 1 FROM token_ledger s WHERE s."refId" = 'set:' || substr(r."refId", 5))`;
  if (Number(open[0]?.n ?? 0) >= lim.maxConcurrent) return { ok: false, status: 429, code: "BUSY" };

  const need = reserveST(rate, input.promptTokens, maxOut);
  if (need === 0) return { ok: true, reservedST: 0, maxOutputTokens: maxOut, source: lim.source }; // zero-cost model: still capped above
  const r = await reserve(userId, requestId, need, rate.model, now);
  if (!r.ok) return { ok: false, status: 402, code: "PAYMENT_REQUIRED" };
  return { ok: true, reservedST: need, maxOutputTokens: maxOut, source: lim.source };
}

export async function settleHosted(input: { userId: string; requestId: string; model: string; promptTokens: number; completionTokens: number }): Promise<boolean> {
  const rate = lookupModel(input.model);
  if (!rate) return false;
  const actual = costInST(rate, input.promptTokens, input.completionTokens);
  return settle(input.userId, input.requestId, actual, { promptTokens: input.promptTokens, completionTokens: input.completionTokens });
}

export async function hostedStatus(userId: string, now = new Date()) {
  const [lim, b] = await Promise.all([limitsFor(userId, now), getBalances(userId, now)]);
  return { cloud: lim.source !== "free", source: lim.source, planKey: lim.planKey, planST: b.plan, paygST: b.payg, planExpiresAt: b.planExpiresAt, paygExpiresAt: b.paygExpiresAt };
}
