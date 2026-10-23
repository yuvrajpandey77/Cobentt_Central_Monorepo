import { test } from "node:test";
import assert from "node:assert/strict";
import { amountMatches, computePeriod, hasActiveAccess } from "./subscription-period";

const now = new Date("2026-10-23T00:00:00Z");
const days = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

test("new purchase starts now for 30 days", () => {
  const p = computePeriod(now, null);
  assert.equal(days(now, p.end), 30);
});
test("buying while active stacks onto the remaining period", () => {
  const end = new Date("2026-11-02T00:00:00Z"); // 10 days left
  assert.equal(days(now, computePeriod(now, end).end), 40);
});
test("an expired period does not stack", () => {
  assert.equal(days(now, computePeriod(now, new Date("2026-09-01T00:00:00Z")).end), 30);
});
test("access needs a paid plan, ACTIVE status and a future end", () => {
  const future = new Date("2026-11-20T00:00:00Z");
  assert.equal(hasActiveAccess({ plan: "PRO", subscriptionStatus: "ACTIVE", currentPeriodEnd: future }, now), true);
  assert.equal(hasActiveAccess({ plan: "FREE", subscriptionStatus: "ACTIVE", currentPeriodEnd: future }, now), false);
  assert.equal(hasActiveAccess({ plan: "PRO", subscriptionStatus: "PAST_DUE", currentPeriodEnd: future }, now), false);
  assert.equal(hasActiveAccess({ plan: "PRO", subscriptionStatus: "ACTIVE", currentPeriodEnd: new Date("2026-10-01T00:00:00Z") }, now), false);
  assert.equal(hasActiveAccess({ plan: "PRO", subscriptionStatus: "ACTIVE", currentPeriodEnd: null }, now), false);
  assert.equal(hasActiveAccess(null, now), false);
});
test("amount must equal the plan price when known", () => {
  assert.equal(amountMatches(2000, 2000), true);
  assert.equal(amountMatches(2000, 1), false);
  assert.equal(amountMatches(2000, undefined), true);
});
