import { test } from "node:test";
import assert from "node:assert/strict";
import { signInternal, verifyInternal } from "./internal-auth";

const secret = "s".repeat(40);
const body = '{"userId":"user_1"}';
const now = 1_800_000_000_000;
const ts = String(now);

test("valid signature within the window passes", () => {
  assert.equal(verifyInternal({ secret, timestamp: ts, signature: signInternal(secret, ts, body), rawBody: body, nowMs: now }), true);
});
test("tampered body, wrong secret, stale or future timestamp, short secret all fail", () => {
  const sig = signInternal(secret, ts, body);
  assert.equal(verifyInternal({ secret, timestamp: ts, signature: sig, rawBody: body + " ", nowMs: now }), false);
  assert.equal(verifyInternal({ secret: "x".repeat(40), timestamp: ts, signature: sig, rawBody: body, nowMs: now }), false);
  assert.equal(verifyInternal({ secret, timestamp: ts, signature: sig, rawBody: body, nowMs: now + 61_000 }), false);
  assert.equal(verifyInternal({ secret, timestamp: ts, signature: sig, rawBody: body, nowMs: now - 61_000 }), false);
  assert.equal(verifyInternal({ secret: "short", timestamp: ts, signature: signInternal("short", ts, body), rawBody: body, nowMs: now }), false);
  assert.equal(verifyInternal({ secret: undefined, timestamp: ts, signature: sig, rawBody: body, nowMs: now }), false);
});
test("missing or malformed headers fail", () => {
  assert.equal(verifyInternal({ secret, timestamp: null, signature: "ab", rawBody: body, nowMs: now }), false);
  assert.equal(verifyInternal({ secret, timestamp: ts, signature: "zz", rawBody: body, nowMs: now }), false);
  assert.equal(verifyInternal({ secret, timestamp: "abc", signature: "ab", rawBody: body, nowMs: now }), false);
});
