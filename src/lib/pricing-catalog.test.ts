import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_SPECS, TOPUP_SPECS, REFERENCE_USD_PER_MILLION_ST, MODEL_TABLE, chargeAmount, costInST, formatMoney, lookupModel, reserveST, tierAllows } from "./pricing-catalog";
import { debit, grantPlan, grantTopup, liveBalances, refund, EMPTY_WALLET } from "./wallet-math";

const now = new Date("2026-10-23T00:00:00Z");
const later = new Date("2026-11-22T00:00:00Z");

test("every plan and top-up keeps provider cost under 60% of the price", () => {
  for (const p of Object.values(PLAN_SPECS)) {
    const cost = (p.monthlyST / 1e6) * REFERENCE_USD_PER_MILLION_ST;
    assert.ok(cost / (p.usdCents / 100) <= 0.6, `${p.key} cost ratio`);
  }
  for (const t of Object.values(TOPUP_SPECS)) {
    assert.ok(((t.st / 1e6) * REFERENCE_USD_PER_MILLION_ST) / (t.usdCents / 100) <= 0.6, `${t.key} cost ratio`);
  }
});
test("pay-as-you-go is never better value than the plan at the same price", () => {
  assert.ok(TOPUP_SPECS.t5.st < PLAN_SPECS.starter.monthlyST);
});
test("INR is derived from USD at the configured rate and rounded up to whole rupees", () => {
  assert.equal(chargeAmount(500, "USD", 85), 500);
  assert.equal(chargeAmount(500, "INR", 85), 42500);
  assert.equal(chargeAmount(1200, "INR", 84.2), 101100);
  assert.equal(formatMoney(42500, "INR"), "₹425");
  assert.equal(formatMoney(500, "USD"), "$5");
});
test("unknown models are not allowed (never free)", () => {
  assert.equal(lookupModel("totally-made-up-model"), null);
  assert.ok(lookupModel("gpt-4o-mini"));
  assert.ok(lookupModel("openai/gpt-4o-mini"), "provider-prefixed ids resolve");
});
test("cost rounds up and premium models cost more standard tokens", () => {
  const mini = lookupModel("gpt-4o-mini")!;
  const big = lookupModel("claude-3-opus")!;
  assert.ok(costInST(big, 1000, 1000) > costInST(mini, 1000, 1000) * 20);
  assert.ok(costInST(mini, 1, 0) >= 1);
  assert.equal(reserveST(mini, 1000, 500), costInST(mini, 1000, 500));
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
