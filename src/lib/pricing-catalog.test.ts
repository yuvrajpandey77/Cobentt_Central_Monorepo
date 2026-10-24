import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_SPECS, TOPUP_SPECS, MODEL_TABLE, costMicroUSD, formatINR, formatUSD, lookupModel, reserveMicroUSD, tierAllows, tokensForBudget, PLATFORM_MARGIN } from "./pricing-catalog";
import { debit, grantPlan, grantTopup, liveBalances, refund, EMPTY_WALLET } from "./wallet-math";

const now = new Date("2026-10-23T00:00:00Z");
const later = new Date("2026-11-22T00:00:00Z");

test("the starter plan is ₹499 for a $3 API budget, the example the product is built on", () => {
  assert.equal(PLAN_SPECS.starter.priceINRPaise, 49_900);
  assert.equal(PLAN_SPECS.starter.budgetMicroUSD, 3_000_000);
  assert.equal(formatINR(PLAN_SPECS.starter.priceINRPaise), "₹499");
  assert.equal(formatUSD(PLAN_SPECS.starter.budgetMicroUSD), "$3");
});

test("budgets rise with price and every top-up pack is priced in rupees", () => {
  assert.ok(PLAN_SPECS.starter.budgetMicroUSD < PLAN_SPECS.plus.budgetMicroUSD);
  assert.ok(PLAN_SPECS.plus.budgetMicroUSD < PLAN_SPECS.pro.budgetMicroUSD);
  for (const t of Object.values(TOPUP_SPECS)) assert.ok(t.priceINRPaise > 0 && t.budgetMicroUSD > 0);
});

test("unknown models are not allowed (never free)", () => {
  assert.equal(lookupModel("totally-made-up-model"), null);
  assert.ok(lookupModel("gpt-4o-mini"));
  assert.ok(lookupModel("openai/gpt-4o-mini"), "provider-prefixed ids resolve");
});

test("metering charges provider cost plus the platform margin, rounded up", () => {
  const mini = lookupModel("gpt-4o-mini")!;
  const cost = (1000 / 1e6) * mini.inputPerM + (500 / 1e6) * mini.outputPerM;
  assert.equal(costMicroUSD(mini, 1000, 500), Math.ceil(cost * (1 + PLATFORM_MARGIN) * 1e6));
  assert.equal(reserveMicroUSD(mini, 1000, 500), costMicroUSD(mini, 1000, 500));
  assert.ok(costMicroUSD(lookupModel("claude-3-opus")!, 1000, 1000) > costMicroUSD(mini, 1000, 1000) * 20);
});

test("a budget buys tokens at live price plus margin, and the same budget buys more on a cheaper model", () => {
  const mini = lookupModel("gpt-4o-mini")!;
  const opus = lookupModel("claude-3-opus")!;
  const tokensMini = tokensForBudget(mini, PLAN_SPECS.starter.budgetMicroUSD);
  assert.ok(tokensMini > 9_000_000 && tokensMini < 11_000_000, `about 10M mini tokens, got ${tokensMini}`);
  assert.ok(tokensForBudget(opus, PLAN_SPECS.starter.budgetMicroUSD) < tokensMini / 20);
});

test("tier gating", () => {
  assert.equal(tierAllows("standard", lookupModel("gpt-4o-mini")!.tier), true);
  assert.equal(tierAllows("standard", lookupModel("claude-3-opus")!.tier), false);
  assert.equal(tierAllows("frontier", lookupModel("claude-3-opus")!.tier), true);
  assert.ok([...MODEL_TABLE.values()].every((m) => m.tier));
});

test("debit spends plan first, then payg, all or nothing", () => {
  let w = grantTopup(grantPlan(EMPTY_WALLET, 100, later), 50, now, 365);
  const r = debit(w, 120, now);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.fromPlan, 100);
    assert.equal(r.fromPayg, 20);
    w = r.wallet;
  }
  assert.deepEqual(liveBalances(w, now), { plan: 0, payg: 30, total: 30 });
  const bad = debit(w, 31, now);
  assert.equal(bad.ok, false);
  assert.deepEqual(liveBalances(w, now), { plan: 0, payg: 30, total: 30 }, "failed debit changes nothing");
});
test("expired buckets are worth nothing", () => {
  const w = grantPlan(EMPTY_WALLET, 100, new Date("2026-10-01T00:00:00Z"));
  assert.equal(liveBalances(w, now).total, 0);
  assert.equal(debit(w, 1, now).ok, false);
});
test("negative, NaN and infinite amounts are refused", () => {
  const w = grantPlan(EMPTY_WALLET, 100, later);
  for (const a of [-1, NaN, Infinity]) assert.equal(debit(w, a, now).ok, false);
});
test("refund returns unused reservation to its source and never mints tokens", () => {
  const w = grantTopup(grantPlan(EMPTY_WALLET, 100, later), 50, now, 365);
  const d = debit(w, 120, now);
  assert.ok(d.ok);
  if (d.ok) {
    const back = refund(d.wallet, d.fromPlan, d.fromPayg, 70, now);
    assert.deepEqual(liveBalances(back, now), { plan: 70, payg: 30, total: 100 });
    const over = refund(d.wallet, d.fromPlan, d.fromPayg, 9999, now);
    assert.equal(liveBalances(over, now).total, 150, "cannot refund more than was taken");
  }
});
test("a new plan period replaces the allowance; top-ups stack and extend expiry", () => {
  let w = grantPlan(EMPTY_WALLET, 100, later);
  w = grantPlan(w, 100, new Date("2026-12-22T00:00:00Z"));
  assert.equal(liveBalances(w, now).plan, 100);
  w = grantTopup(w, 10, now, 365);
  w = grantTopup(w, 10, now, 365);
  assert.equal(liveBalances(w, now).payg, 20);
});

import { debitUpTo } from "./wallet-math";
test("debitUpTo never overdraws and never charges negatives", () => {
  const w = grantPlan(EMPTY_WALLET, 100, later);
  const r = debitUpTo(w, 250, now);
  assert.equal(r.charged, 100);
  assert.equal(liveBalances(r.wallet, now).total, 0);
  assert.equal(debitUpTo(w, -5, now).charged, 0);
  assert.equal(debitUpTo(w, NaN, now).charged, 0);
});
