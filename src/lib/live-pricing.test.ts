import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOpenRouterPrices, refreshLivePricing } from "./live-pricing";
import { costMicroUSD, lookupModel, PLATFORM_MARGIN } from "./pricing-catalog";

const payload = {
  data: [
    { id: "openai/gpt-4o-mini", pricing: { prompt: "0.00000015", completion: "0.0000006" } },
    { id: "acme/free-model:free", pricing: { prompt: "0", completion: "0" } },
    { id: "bad/model", pricing: { prompt: "nope", completion: "1" } },
    { id: "no/pricing" },
  ],
};

test("OpenRouter per-token strings become USD per million tokens and bad rows are skipped", () => {
  const p = parseOpenRouterPrices(payload);
  assert.ok(Math.abs(p["openai/gpt-4o-mini"].input - 0.15) < 1e-9);
  assert.ok(Math.abs(p["openai/gpt-4o-mini"].output - 0.6) < 1e-9);
  assert.equal(p["acme/free-model:free"].input, 0);
  assert.equal("bad/model" in p, false);
  assert.equal("no/pricing" in p, false);
  assert.deepEqual(parseOpenRouterPrices({}), {});
});

test("a successful refresh replaces the table with live prices; a failure keeps the previous table", async () => {
  const ok = await refreshLivePricing(async () => new Response(JSON.stringify({ data: [{ id: "zzz/live-only", pricing: { prompt: "0.000002", completion: "0.000002" } }] })), 1);
  assert.equal(ok, true);
  assert.ok(lookupModel("zzz/live-only"), "live-only model is now allowed");
  const failed = await refreshLivePricing(async () => new Response("down", { status: 503 }), 2);
  assert.equal(failed, false);
  assert.ok(lookupModel("zzz/live-only"), "table kept after a failed refresh");
  assert.ok(lookupModel("gpt-4o-mini"), "static base still resolves");
});

test("metering charges provider cost plus the platform margin", () => {
  const rate = { provider: "t", model: "x", inputPerM: 1, outputPerM: 1, tier: "standard" as const };
  assert.equal(costMicroUSD(rate, 1_000_000, 0), Math.ceil(1 * (1 + PLATFORM_MARGIN) * 1e6));
});
