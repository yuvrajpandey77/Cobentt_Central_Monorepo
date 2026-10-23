import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { TOPUP_VALID_DAYS } from "@/lib/pricing-catalog";
import { debit, debitUpTo, grantPlan, grantTopup, liveBalances, refund, type WalletState } from "@/lib/wallet-math";
import { MODEL_TABLE, costInST, lookupModel, type ModelRate } from "@/lib/pricing-catalog";

type Tx = Prisma.TransactionClient;

interface Row {
  clerkUserId: string;
  planST: bigint;
  planExpiresAt: Date | null;
  paygST: bigint;
  paygExpiresAt: Date | null;
}

const toState = (r: Row): WalletState => ({ planST: Number(r.planST), planExpiresAt: r.planExpiresAt, paygST: Number(r.paygST), paygExpiresAt: r.paygExpiresAt });

/** Locks the user's wallet row for the rest of the transaction (creating it first). Serialises every spend and grant per user. */
async function lockWallet(tx: Tx, userId: string): Promise<WalletState> {
  await tx.$executeRaw`INSERT INTO "token_wallets" ("clerkUserId") VALUES (${userId}) ON CONFLICT ("clerkUserId") DO NOTHING`;
  const rows = await tx.$queryRaw<Row[]>`SELECT * FROM "token_wallets" WHERE "clerkUserId" = ${userId} FOR UPDATE`;
  return toState(rows[0]);
}

async function save(tx: Tx, userId: string, w: WalletState) {
  await tx.tokenWallet.update({
    where: { clerkUserId: userId },
    data: { planST: BigInt(Math.max(0, Math.floor(w.planST))), planExpiresAt: w.planExpiresAt, paygST: BigInt(Math.max(0, Math.floor(w.paygST))), paygExpiresAt: w.paygExpiresAt },
  });
}

export async function getBalances(userId: string, now = new Date()) {
  const row = await prisma.tokenWallet.findUnique({ where: { clerkUserId: userId } });
  const w: WalletState = row ? toState(row) : { planST: 0, planExpiresAt: null, paygST: 0, paygExpiresAt: null };
  return { ...liveBalances(w, now), planExpiresAt: w.planExpiresAt, paygExpiresAt: w.paygExpiresAt };
}

/** Grants the monthly allowance for a paid order. Idempotent on `refId`. Call inside the activation transaction. */
export async function grantPlanTokens(tx: Tx, userId: string, st: number, periodEnd: Date, refId: string): Promise<boolean> {
  const w = await lockWallet(tx, userId);
  const seen = await tx.tokenLedger.findUnique({ where: { refId }, select: { id: true } });
  if (seen) return false;
  await save(tx, userId, grantPlan(w, st, periodEnd));
  await tx.tokenLedger.create({ data: { clerkUserId: userId, kind: "GRANT_PLAN", deltaST: BigInt(st), refId } });
  return true;
}

export async function grantTopupTokens(tx: Tx, userId: string, st: number, refId: string, now = new Date()): Promise<boolean> {
  const w = await lockWallet(tx, userId);
  const seen = await tx.tokenLedger.findUnique({ where: { refId }, select: { id: true } });
  if (seen) return false;
  await save(tx, userId, grantTopup(w, st, now, TOPUP_VALID_DAYS));
  await tx.tokenLedger.create({ data: { clerkUserId: userId, kind: "TOPUP", deltaST: BigInt(st), refId } });
  return true;
}

export type ReserveResult = { ok: true; replay: boolean } | { ok: false; available: number };

/**
 * Takes the worst-case cost of a request out of the wallet BEFORE any provider call. All-or-nothing, serialised per user,
 * and idempotent on `requestId` (a retried request cannot be charged twice or reserve twice).
 */
export async function reserve(userId: string, requestId: string, amountST: number, model: string, now = new Date()): Promise<ReserveResult> {
  const refId = `res:${requestId}`;
  return prisma.$transaction(async (tx) => {
    const w = await lockWallet(tx, userId);
    const existing = await tx.tokenLedger.findUnique({ where: { refId }, select: { clerkUserId: true } });
    if (existing) return existing.clerkUserId === userId ? { ok: true as const, replay: true } : { ok: false as const, available: 0 };
    const d = debit(w, amountST, now);
    if (!d.ok) return { ok: false as const, available: d.available };
    await save(tx, userId, d.wallet);
    await tx.tokenLedger.create({
      data: { clerkUserId: userId, kind: "RESERVE", deltaST: BigInt(-amountST), fromPlan: BigInt(d.fromPlan), fromPayg: BigInt(d.fromPayg), refId, model },
    });
    return { ok: true as const, replay: false };
  });
}

/**
 * After the provider answers, charges the real usage and returns the unused part of the reservation. Idempotent.
 * Usage can never exceed the reservation here, and a request that is never settled simply keeps its full reservation.
 */
export async function settle(userId: string, requestId: string, actualST: number, usage?: { promptTokens?: number; completionTokens?: number }, now = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const res = await tx.tokenLedger.findUnique({ where: { refId: `res:${requestId}` } });
    if (!res || res.clerkUserId !== userId) return false;
    const done = await tx.tokenLedger.findUnique({ where: { refId: `set:${requestId}` }, select: { id: true } });
    if (done) return true;
    const w = await lockWallet(tx, userId);
    const reserved = Number(-res.deltaST);
    const charged = Math.min(Math.max(0, Math.ceil(actualST)), reserved);
    const unused = reserved - charged;
    if (unused > 0) await save(tx, userId, refund(w, Number(res.fromPlan), Number(res.fromPayg), unused, now));
    await tx.tokenLedger.create({
      data: { clerkUserId: userId, kind: "SETTLE", deltaST: BigInt(unused), refId: `set:${requestId}`, model: res.model, promptTokens: usage?.promptTokens, completionTokens: usage?.completionTokens },
    });
    return true;
  });
}

/** Most expensive known model: what an UNKNOWN model is billed at, so "unknown" can never mean "free". */
const WORST_RATE: ModelRate = [...MODEL_TABLE.values()].reduce((a, b) => (a.inputPerM + a.outputPerM >= b.inputPerM + b.outputPerM ? a : b));

/**
 * Bills a finished call (site flows that cannot pre-reserve). Idempotent on `refId`. Charges what is available and
 * logs the shortfall; the pre-check in `requireFunds` plus daily caps and concurrency bound how large a shortfall can be.
 */
export async function chargeUsage(userId: string, model: string, promptTokens: number, completionTokens: number, refId: string, now = new Date()): Promise<{ chargedST: number; shortfallST: number }> {
  const rate = lookupModel(model) ?? WORST_RATE;
  if (rate.inputPerM === 0 && rate.outputPerM === 0) return { chargedST: 0, shortfallST: 0 };
  const owed = costInST(rate, promptTokens, completionTokens);
  return prisma.$transaction(async (tx) => {
    const seen = await tx.tokenLedger.findUnique({ where: { refId: `use:${refId}` }, select: { deltaST: true } });
    if (seen) return { chargedST: Number(-seen.deltaST), shortfallST: 0 };
    const w = await lockWallet(tx, userId);
    const r = debitUpTo(w, owed, now);
    await save(tx, userId, r.wallet);
    await tx.tokenLedger.create({
      data: { clerkUserId: userId, kind: "USAGE", deltaST: BigInt(-r.charged), fromPlan: BigInt(r.fromPlan), fromPayg: BigInt(r.fromPayg), refId: `use:${refId}`, model, promptTokens, completionTokens },
    });
    return { chargedST: r.charged, shortfallST: owed - r.charged };
  });
}

/** Pre-check for site flows: hosted AI needs a live balance that covers the estimate. */
export async function hasFunds(userId: string, estimateST: number, now = new Date()): Promise<boolean> {
  const b = await getBalances(userId, now);
  return b.total >= Math.max(1, estimateST);
}

/**
 * A full refund takes back what that order granted: a plan allowance is zeroed, a top-up is deducted (never below zero).
 * Idempotent on the order. Without this a refunded customer could keep spending the tokens they got their money back for.
 */
export async function revokeOrderGrant(userId: string, orderId: string, now = new Date()): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const done = await tx.tokenLedger.findUnique({ where: { refId: `rev:${orderId}` }, select: { id: true } });
    if (done) return false;
    const plan = await tx.tokenLedger.findUnique({ where: { refId: `grant:${orderId}` } });
    const topup = await tx.tokenLedger.findUnique({ where: { refId: `topup:${orderId}` } });
    if (!plan && !topup) return false;
    const w = await lockWallet(tx, userId);
    let next = w;
    let taken = 0;
    if (plan && plan.clerkUserId === userId) {
      taken = Math.max(0, liveBalances(w, now).plan);
      next = { ...w, planST: 0, planExpiresAt: now };
    } else if (topup && topup.clerkUserId === userId) {
      const live = liveBalances(w, now).payg;
      taken = Math.min(live, Number(topup.deltaST));
      next = { ...w, paygST: live - taken };
    }
    await save(tx, userId, next);
    await tx.tokenLedger.create({ data: { clerkUserId: userId, kind: "REVERSAL", deltaST: BigInt(-taken), refId: `rev:${orderId}` } });
    return true;
  });
}
