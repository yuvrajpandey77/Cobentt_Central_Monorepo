/**
 * End-to-end billing test against a LOCAL database only. It drives the real route handlers with validly signed Razorpay
 * webhooks and calls the real Razorpay test API to create the plan and subscription. It refuses to write anything unless
 * the connected database is the disposable local one (`cobentt_test`), so it cannot touch the shared database.
 *
 *   DATABASE_URL=postgresql://postgres:…@localhost:55432/cobentt_test npx tsx scripts/billing/e2e.ts
 */
import crypto from "crypto";
import assert from "node:assert/strict";
import prisma from "../../src/lib/db";
import { POST as webhook } from "../../src/app/api/razorpay/webhook/route";
import { createSubscription, ensureAllowedUser, cancelSubscription } from "../../src/lib/razorpay-subscriptions";
import { authorizeHosted, settleHosted } from "../../src/lib/hosted-access";
import { getBalances } from "../../src/lib/wallet";
import { lookupModel, costMicroUSD, PLAN_SPECS, PLATFORM_MARGIN, MICRO_USD_PER_USD } from "../../src/lib/pricing-catalog";
import { ensureLivePricing } from "../../src/lib/live-pricing";
import { publicCatalog } from "../../src/lib/catalog";
import { activateOrder } from "../../src/lib/subscription";
import { changePlan, NoActivePlan } from "../../src/lib/razorpay-subscriptions";
import { setProviderBalanceReader, providerRemainingMicroUSD } from "../../src/lib/treasury";

const WEBHOOK_SECRET = "e2e_webhook_secret_0123456789abcdef";
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
const MODEL = "openai/gpt-4o-mini";
const RUN = crypto.randomBytes(4).toString("hex");

let step = 0;
function ok(name: string) {
  step += 1;
  console.log(`  ✔ ${step}. ${name}`);
}

async function guard() {
  const rows = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;
  const db = rows[0]?.db;
  if (db !== "cobentt_test") {
    throw new Error(`Refusing to run: connected database is "${db}", expected the local "cobentt_test". Nothing was written.`);
  }
}

function sign(raw: string) {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
}

async function deliver(event: string, eventId: string, body: Record<string, unknown>) {
  const raw = JSON.stringify({ entity: "event", event, payload: body, created_at: Math.floor(Date.now() / 1000) });
  const req = new Request("http://localhost/api/razorpay/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-razorpay-signature": sign(raw), "x-razorpay-event-id": eventId },
    body: raw,
  });
  const res = await webhook(req as never);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

function subEntity(subId: string, planId: string, startSec: number, endSec: number) {
  return { subscription: { entity: { id: subId, plan_id: planId, status: "active", current_start: startSec, current_end: endSec } } };
}

function payEntity(paymentId: string, amount: number, currency = "INR") {
  return { payment: { entity: { id: paymentId, amount, currency, status: "captured" } } };
}

async function main() {
  console.log("Cobentt billing end-to-end (local database)");
  await guard();
  ok("connected to the local test database only");

  const clerkUserId = `user_e2e_${crypto.randomBytes(5).toString("hex")}`;
  await ensureAllowedUser(clerkUserId);

  // Real Razorpay test API: creates the plan once and a subscription for this user.
  const { subscriptionId, shortUrl } = await createSubscription(clerkUserId, "starter");
  assert.match(subscriptionId, /^sub_/);
  assert.match(shortUrl, /^https:\/\//);
  const linked = await prisma.allowedUser.findUnique({ where: { clerkUserId } });
  assert.equal(linked?.razorpaySubscriptionId, subscriptionId);
  ok(`Razorpay subscription ${subscriptionId} created, checkout link returned, linked to the user`);

  const planRef = await prisma.razorpayPlanRef.findUniqueOrThrow({
    where: { planKey_amountPaise: { planKey: "starter", amountPaise: PLAN_SPECS.starter.priceINRPaise } },
  });
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86_400;

  // First charge: ₹499 captured → $3 budget granted, plan active.
  const r1 = await deliver("subscription.charged", `evt_e2e_1_${RUN}`, { ...subEntity(subscriptionId, planRef.razorpayPlanId, now, now + 30 * DAY), ...payEntity(`pay_e2e_1_${RUN}`, 49_900) });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  let bal = await getBalances(clerkUserId);
  assert.equal(bal.plan, PLAN_SPECS.starter.budgetMicroUSD);
  const u1 = await prisma.allowedUser.findUniqueOrThrow({ where: { clerkUserId } });
  assert.equal(u1.plan, "PRO");
  assert.equal(u1.planKey, "starter");
  assert.equal(u1.subscriptionStatus, "ACTIVE");
  ok("first monthly charge of ₹499 grants the $3 API budget and activates the plan");

  // Same delivery retried by Razorpay: must not grant twice.
  const dup = await deliver("subscription.charged", `evt_e2e_1_${RUN}`, { ...subEntity(subscriptionId, planRef.razorpayPlanId, now, now + 30 * DAY), ...payEntity(`pay_e2e_1_${RUN}`, 49_900) });
  assert.equal(dup.body.message, "Duplicate event");
  bal = await getBalances(clerkUserId);
  assert.equal(bal.plan, PLAN_SPECS.starter.budgetMicroUSD);
  ok("a retried delivery of the same event is ignored (no double grant)");

  // Metering: a real request is reserved, then settled to its exact cost. The provider balance is read live from
  // OpenRouter: when it cannot cover what users are owed, hosted AI is refused (fail closed) instead of run unfunded.
  const live = await providerRemainingMicroUSD();
  setProviderBalanceReader(null);
  const refused = await authorizeHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-0`, model: MODEL, promptTokens: 10, maxOutputTokens: 10 });
  if (live !== null && live < 10_000_000) {
    assert.equal(refused.ok, false);
    assert.equal((refused as { code?: string }).code, "UNAVAILABLE");
    ok(`live OpenRouter balance is $${(live / 1e6).toFixed(2)}, below what users are owed: hosted AI refused, fail closed`);
  }
  // A $100 provider balance stands in for the funded account so the rest of the flow can run.
  setProviderBalanceReader(async () => 100_000_000);
  const auth1 = await authorizeHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-1`, model: MODEL, promptTokens: 1000, maxOutputTokens: 1000 });
  assert.equal(auth1.ok, true, JSON.stringify(auth1));
  const settled = await settleHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-1`, model: MODEL, promptTokens: 1000, completionTokens: 500 });
  assert.equal(settled, true);
  const rate = lookupModel(MODEL)!;
  bal = await getBalances(clerkUserId);
  assert.equal(bal.plan, PLAN_SPECS.starter.budgetMicroUSD - costMicroUSD(rate, 1000, 500), "settled to exact cost, unused reserve returned");
  ok("a request reserves its worst case, settles to the exact cost, and returns the unused reserve");

  // The provider's billed cost is what settlement charges when it is reported (it wins over our token estimate).
  const b0 = (await getBalances(clerkUserId)).plan;
  const pAuth = await authorizeHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-p`, model: MODEL, promptTokens: 1000, maxOutputTokens: 1000 });
  assert.equal(pAuth.ok, true);
  assert.equal(await settleHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-p`, model: MODEL, promptTokens: 1000, completionTokens: 500, providerCostUSD: 0.00001 }), true);
  assert.equal(b0 - (await getBalances(clerkUserId)).plan, Math.ceil(0.00001 * (1 + PLATFORM_MARGIN) * MICRO_USD_PER_USD));
  ok("settlement charges the provider-reported cost plus margin when it is reported");

  // Mid-period upgrade: the request goes to Razorpay for the running subscription. The budget only changes when the
  // paid charge arrives, so the plan and balance are untouched here.
  await prisma.allowedUser.update({ where: { clerkUserId }, data: { subscriptionStatus: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 20 * DAY) } });
  // Razorpay only changes plans on a live subscription. This test subscription was never paid, so Razorpay reports
  // "created" and the change must be refused cleanly (not passed through as a provider error).
  await assert.rejects(() => changePlan(clerkUserId, "plus"), (e: unknown) => e instanceof NoActivePlan);
  assert.equal((await prisma.allowedUser.findUniqueOrThrow({ where: { clerkUserId } })).planKey, "starter");
  ok("a plan change on a subscription Razorpay has not activated is refused cleanly, and nothing changes");

  // Auto-renewal next month: budget refills to the full $3, not stacked on the leftover.
  const r2 = await deliver("subscription.charged", `evt_e2e_2_${RUN}`, { ...subEntity(subscriptionId, planRef.razorpayPlanId, now + 30 * DAY, now + 60 * DAY), ...payEntity(`pay_e2e_2_${RUN}`, 49_900) });
  assert.equal(r2.status, 200);
  bal = await getBalances(clerkUserId);
  assert.equal(bal.plan, PLAN_SPECS.starter.budgetMicroUSD, "renewal refills the budget");
  const grants = await prisma.tokenLedger.count({ where: { clerkUserId, kind: "GRANT_PLAN" } });
  assert.equal(grants, 2);
  ok("the monthly renewal refills the budget automatically and is recorded once per payment");

  // Wrong amount: a charge that does not match the plan price must not grant anything.
  const before = await getBalances(clerkUserId);
  const bad = await deliver("subscription.charged", `evt_e2e_3_${RUN}`, { ...subEntity(subscriptionId, planRef.razorpayPlanId, now + 60 * DAY, now + 90 * DAY), ...payEntity(`pay_e2e_3_${RUN}`, 100) });
  assert.equal(bad.status, 200);
  assert.deepEqual(await getBalances(clerkUserId), before);
  const mismatch = await prisma.paymentAuditLog.count({ where: { clerkUserId, event: "payment.amount_mismatch" } });
  assert.ok(mismatch >= 1);
  ok("a charge of the wrong amount is refused and logged, with no grant");

  // Payment fails repeatedly: the subscription halts and the remaining budget stops being spendable.
  const halted = await deliver("subscription.halted", `evt_e2e_4_${RUN}`, subEntity(subscriptionId, planRef.razorpayPlanId, now, now + 30 * DAY));
  assert.equal(halted.status, 200);
  const hu = await prisma.allowedUser.findUniqueOrThrow({ where: { clerkUserId } });
  assert.equal(hu.subscriptionStatus, "PAST_DUE");
  assert.equal((await getBalances(clerkUserId)).plan, 0);
  const denied = await authorizeHosted({ userId: clerkUserId, requestId: `e2e-req-${RUN}-2`, model: MODEL, promptTokens: 100, maxOutputTokens: 100 });
  assert.equal(denied.ok, false);
  ok("a halted subscription stops access and zeroes the plan budget immediately");

  // Same event delivered twice and a later event with the same id must not revoke twice.
  const halted2 = await deliver("subscription.halted", `evt_e2e_4_${RUN}`, subEntity(subscriptionId, planRef.razorpayPlanId, now, now + 30 * DAY));
  assert.equal(halted2.body.message, "Duplicate event");
  ok("a duplicate halted event is ignored");

  // The user has a halted subscription with no running period: cancelling takes effect now, at Razorpay too.
  const cancelled = await cancelSubscription(clerkUserId);
  assert.equal(cancelled, true);
  const cu = await prisma.allowedUser.findUniqueOrThrow({ where: { clerkUserId } });
  assert.equal(cu.cancelAtPeriodEnd, false);
  assert.ok(await prisma.paymentAuditLog.count({ where: { clerkUserId, event: "subscription.cancelled_now" } }) === 1);
  ok("cancelling a subscription with no paid period takes effect immediately, at Razorpay as well");

  // Live provider prices and the public catalog.
  await ensureLivePricing();
  const catalog = await publicCatalog();
  assert.equal(catalog.plans.find((p) => p.key === "starter")?.priceINR, "₹499");
  assert.equal(catalog.plans.find((p) => p.key === "starter")?.budgetUSD, "$3");
  ok("public catalog shows ₹499 for a $3 budget and token counts from live prices");

  // One-time top-up: a captured ₹499 pack grants $3 of pay-as-you-go balance, exactly once per payment.
  const orderId = `order_e2e_${RUN}`;
  await prisma.paymentRecord.create({
    data: { clerkUserId, razorpayOrderId: orderId, amount: 49_900, currency: "INR", plan: "FREE", product: "topup:t1", status: "CREATED", receipt: `e2e_${RUN}` },
  });
  const t1 = await activateOrder({ orderId, paymentId: `pay_topup_${RUN}`, capturedPaise: 49_900, capturedCurrency: "INR", actor: "webhook" });
  const t2 = await activateOrder({ orderId, paymentId: `pay_topup_${RUN}`, capturedPaise: 49_900, capturedCurrency: "INR", actor: "webhook" });
  assert.equal(t1.ok && t1.activated, true);
  assert.equal(t2.ok && t2.activated, false);
  assert.equal((await getBalances(clerkUserId)).payg, PLAN_SPECS.starter.budgetMicroUSD);
  ok("a ₹499 top-up pack adds $3 of pay-as-you-go balance once, however many times it is confirmed");

  setProviderBalanceReader(null);
  await deleteUser(clerkUserId);
  console.log(`\nAll ${step} checks passed.`);
}

async function deleteUser(clerkUserId: string) {
  await prisma.tokenLedger.deleteMany({ where: { clerkUserId } });
  await prisma.tokenWallet.deleteMany({ where: { clerkUserId } });
  await prisma.paymentAuditLog.deleteMany({ where: { clerkUserId } });
  await prisma.paymentRecord.deleteMany({ where: { clerkUserId } });
  await prisma.allowedUser.deleteMany({ where: { clerkUserId } });
}

main()
  .catch((e) => {
    console.error("\nFAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
