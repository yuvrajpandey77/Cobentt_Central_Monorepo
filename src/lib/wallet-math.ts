/** Pure wallet arithmetic. The database layer wraps these in row locks; nothing here touches I/O. */

export interface WalletState {
  planST: number;
  planExpiresAt: Date | null;
  paygST: number;
  paygExpiresAt: Date | null;
}

export const EMPTY_WALLET: WalletState = { planST: 0, planExpiresAt: null, paygST: 0, paygExpiresAt: null };

/** Expired buckets are worth zero, regardless of what the column still says. */
export function liveBalances(w: WalletState, now: Date): { plan: number; payg: number; total: number } {
  const plan = w.planExpiresAt && w.planExpiresAt.getTime() > now.getTime() ? Math.max(0, w.planST) : 0;
  const payg = w.paygExpiresAt && w.paygExpiresAt.getTime() > now.getTime() ? Math.max(0, w.paygST) : 0;
  return { plan, payg, total: plan + payg };
}

export type DebitResult = { ok: true; wallet: WalletState; fromPlan: number; fromPayg: number } | { ok: false; reason: "insufficient"; available: number };

/** Spend the expiring plan allowance first, then pay-as-you-go. All or nothing. */
export function debit(w: WalletState, amount: number, now: Date): DebitResult {
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, reason: "insufficient", available: 0 };
  const live = liveBalances(w, now);
  if (amount > live.total) return { ok: false, reason: "insufficient", available: live.total };
  const fromPlan = Math.min(amount, live.plan);
  const fromPayg = amount - fromPlan;
  return {
    ok: true,
    fromPlan,
    fromPayg,
    wallet: { ...w, planST: live.plan - fromPlan, planExpiresAt: w.planExpiresAt, paygST: live.payg - fromPayg, paygExpiresAt: w.paygExpiresAt },
  };
}

/** Give back unused reservation to the buckets it came from (never past what was taken). */
export function refund(w: WalletState, fromPlan: number, fromPayg: number, unused: number, now: Date): WalletState {
  const backToPlan = Math.min(unused, fromPlan);
  const backToPayg = Math.min(unused - backToPlan, fromPayg);
  const live = liveBalances(w, now);
  return { ...w, planST: live.plan + backToPlan, paygST: live.payg + backToPayg };
}

/** A new plan period replaces the previous allowance (no rollover of a monthly allowance). */
export function grantPlan(w: WalletState, st: number, newEnd: Date): WalletState {
  return { ...w, planST: st, planExpiresAt: newEnd };
}

/** A top-up adds to the pay-as-you-go balance and pushes its expiry out. */
export function grantTopup(w: WalletState, st: number, now: Date, validDays: number): WalletState {
  const live = liveBalances(w, now);
  const end = new Date(now.getTime() + validDays * 86_400_000);
  return { ...w, paygST: live.payg + st, paygExpiresAt: w.paygExpiresAt && w.paygExpiresAt > end ? w.paygExpiresAt : end };
}

/** Spend as much as is available up to `amount` (used to bill finished usage; never goes negative). */
export function debitUpTo(w: WalletState, amount: number, now: Date): { wallet: WalletState; charged: number; fromPlan: number; fromPayg: number } {
  const live = liveBalances(w, now);
  const want = Number.isFinite(amount) && amount > 0 ? Math.ceil(amount) : 0;
  const charged = Math.min(want, live.total);
  const d = debit(w, charged, now);
  if (!d.ok) return { wallet: w, charged: 0, fromPlan: 0, fromPayg: 0 };
  return { wallet: d.wallet, charged, fromPlan: d.fromPlan, fromPayg: d.fromPayg };
}
