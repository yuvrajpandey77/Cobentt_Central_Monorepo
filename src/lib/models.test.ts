import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultModelFor, modelOptionsFor, DEFAULT_MODEL } from "./models";

test("no saved key: default is OpenRouter Fusion and the full list is offered", () => {
  assert.equal(defaultModelFor([]), "openrouter/fusion");
  assert.equal(DEFAULT_MODEL, "openrouter/fusion");
  assert.ok(modelOptionsFor([]).length > 2);
});

test("OpenRouter key: default is Fusion, and the two choices are Fusion and Free", () => {
  assert.equal(defaultModelFor(["openrouter"]), "openrouter/fusion");
  assert.deepEqual(
    modelOptionsFor(["openrouter"]).map((m) => m.id),
    ["openrouter/fusion", "openrouter/free"],
  );
});

test("OpenAI-only key: default is GPT-4o mini, and the two choices are the GPT-4o models", () => {
  assert.equal(defaultModelFor(["openai"]), "openai/gpt-4o-mini");
  assert.deepEqual(
    modelOptionsFor(["openai"]).map((m) => m.id),
    ["openai/gpt-4o-mini", "openai/gpt-4o"],
  );
});

test("both keys: OpenRouter wins", () => {
  assert.equal(defaultModelFor(["openai", "openrouter"]), "openrouter/fusion");
});
