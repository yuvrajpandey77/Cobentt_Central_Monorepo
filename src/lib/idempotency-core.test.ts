import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, hashBody, parseKey } from "./idempotency-core";

const KEY = "0123456789abcdef";

test("no stored row means the request runs", () => {
  assert.deepEqual(decide(null, hashBody("{}")), { action: "run" });
});

test("a completed request is replayed with its stored status and body", () => {
  const h = hashBody('{"plan":"plus"}');
  const stored = { requestHash: h, status: 200, responseBody: '{"ok":true}' };
  assert.deepEqual(decide(stored, h), { action: "replay", status: 200, body: '{"ok":true}' });
});

test("a key reused with a different body is refused, even after completion", () => {
  const stored = { requestHash: hashBody('{"plan":"plus"}'), status: 200, responseBody: "{}" };
  assert.deepEqual(decide(stored, hashBody('{"plan":"pro"}')), { action: "conflict" });
});

test("a reservation with no response yet is treated as in progress", () => {
  const h = hashBody("{}");
  assert.deepEqual(decide({ requestHash: h, status: null, responseBody: null }, h), { action: "in_progress" });
});

test("hashBody is stable for identical bodies and differs for different bodies", () => {
  assert.equal(hashBody('{"a":1}'), hashBody('{"a":1}'));
  assert.notEqual(hashBody('{"a":1}'), hashBody('{"a":2}'));
});

test("parseKey accepts well-formed keys and rejects missing or malformed ones", () => {
  assert.equal(parseKey(KEY), KEY);
  assert.equal(parseKey(null), null);
  assert.equal(parseKey(""), null);
  assert.equal(parseKey("short"), null);
  assert.equal(parseKey("has spaces in it 123456"), null);
  assert.equal(parseKey("a".repeat(129)), null);
});
