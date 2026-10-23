/** Pure rules for paid periods. No I/O so they are unit-tested (`npm run test:payments`). */

export const PERIOD_DAYS = 30;

/**
 * A new paid period starts when the previous one ends. Buying early stacks instead of throwing away
 * days the user already paid for; buying after expiry starts now.
 */
export function computePeriod(now: Date, currentEnd: Date | null | undefined, days = PERIOD_DAYS): { start: Date; end: Date } {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const end = new Date(base.getTime() + days * 86_400_000);
  return { start: now, end };
}

/** Access exists only while status is ACTIVE and the paid period has not ended. */
export function hasActiveAccess(
  user: { plan: string; subscriptionStatus: string; currentPeriodEnd: Date | null } | null | undefined,
  now = new Date()
): boolean {
  if (!user) return false;
  if (user.plan === "FREE" || user.subscriptionStatus !== "ACTIVE") return false;
  return !!user.currentPeriodEnd && user.currentPeriodEnd.getTime() > now.getTime();
}

/** A payment may activate a plan only if the money paid equals the price of that plan. */
export function amountMatches(expectedPaise: number, paidPaise: number | undefined): boolean {
  return paidPaise === undefined || paidPaise === expectedPaise;
}
