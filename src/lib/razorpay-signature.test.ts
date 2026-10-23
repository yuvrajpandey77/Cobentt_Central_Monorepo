import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./razorpay-signature";

const hmac = (s: string, k: string) => crypto.createHmac("sha256", k).update(s).digest("hex");

test("checkout signature roundtrip and tamper", () => {
  const sig = hmac("order_1|pay_1", "secret");
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", sig, "secret"), true);
  assert.equal(verifyCheckoutSignature("order_1", "pay_2", sig, "secret"), false);
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", sig, "other"), false);
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", "zz", "secret"), false);
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", "", "secret"), false);
  assert.equal(verifyCheckoutSignature("order_1", "pay_1", sig, ""), false);
});
test("webhook signature roundtrip, case and tamper", () => {
  const body = '{"event":"payment.captured"}';
  const sig = hmac(body, "whsec");
  assert.equal(verifyWebhookSignature(body, sig, "whsec"), true);
  assert.equal(verifyWebhookSignature(body + " ", sig, "whsec"), false);
  assert.equal(verifyWebhookSignature(body, sig, ""), false);
  assert.equal(verifyWebhookSignature(body, "not-hex", "whsec"), false);
});
