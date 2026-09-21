/**
 * Router evaluation runner.
 * Usage: npx tsx src/lib/intent/eval.ts
 * Measures: correct routing rate, false positives/negatives,
 * unnecessary confirmations, override honor rate.
 */
import { routeIntent } from "./router";
import { EVALUATION_CASES } from "./eval-dataset";
import type { CapabilityId } from "./types";

function capsMatch(actual: CapabilityId[], expected: CapabilityId[]): boolean {
  // Alternative expectations: "chat" alongside others means "any of these".
  if (expected.includes("chat") && expected.length > 1) {
    if (actual.length === 1 && actual[0] === "chat") return true;
  }
  // deep_research is a valid substitute for web_search (both satisfy requires_web).
  const normE = expected.map((e) => (e === "web_search" ? "__web__" : e));
  const normA = actual.map((a) => (a === "web_search" || a === "deep_research" ? "__web__" : a));
  if (normE.length === 1 && normE[0] === "chat") {
    return normA.length === 1 && normA[0] === "chat";
  }
  return normE.every((e) => {
    if (e === "chat") return true;
    if (e === "writing") return normA.includes("writing") || normA.includes("document");
    if (e === "document") return normA.includes("document") || normA.includes("writing");
    return (normA as string[]).includes(e);
  });
}

async function main() {
  let correct = 0;
  let falsePos = 0; // routed to artifact when chat expected
  let falseNeg = 0; // stayed in chat when artifact/web expected
  let needlessConfirm = 0;
  let overrideHonored = 0;
  let overrideTotal = 0;
  const failures: string[] = [];

  for (const c of EVALUATION_CASES) {
    const r = routeIntent({
      message: c.message,
      history: c.history,
      explicitSelection: c.explicitSelection ?? null,
      explicitMode: c.explicitMode ?? null,
      hasAttachments: c.hasAttachments ?? false,
    });
    const okCaps = capsMatch(r.capabilities, c.expect.capabilities);
    const okWeb = c.expect.requires_web === undefined || r.requires_web === c.expect.requires_web;
    const okAction = !c.expect.action || r.action === c.expect.action ||
      (c.expect.action === "auto" && r.action === "auto");
    const ok = okCaps && okWeb && okAction;
    if (ok) correct++;
    else failures.push(`FAIL ${c.id} [${c.category}] "${c.message}"\n  expected ${c.expect.capabilities.join("+")}${c.expect.requires_web ? " +web" : ""}${c.expect.action ? ` action=${c.expect.action}` : ""}\n  got ${r.capabilities.join("+")} web=${r.requires_web} action=${r.action} conf=${r.confidence} (${r.reason})`);

    if (c.expect.capabilities.length === 1 && c.expect.capabilities[0] === "chat" && r.capabilities[0] !== "chat") falsePos++;
    if (c.expect.capabilities[0] !== "chat" && r.capabilities[0] === "chat" && r.action === "chat") falseNeg++;
    if (c.category === "chat" && (r.action === "confirm" || r.requires_confirmation)) needlessConfirm++;
    if (c.category === "override") {
      overrideTotal++;
      if (ok) overrideHonored++;
    }
  }

  const total = EVALUATION_CASES.length;
  console.log(`\nIntent Router Evaluation — ${correct}/${total} correct (${Math.round((correct / total) * 100)}%)`);
  console.log(`False positives (artifact when chat expected): ${falsePos}`);
  console.log(`False negatives (chat when capability expected): ${falseNeg}`);
  console.log(`Unnecessary confirmations on chat cases: ${needlessConfirm}`);
  console.log(`Explicit-override honor rate: ${overrideHonored}/${overrideTotal}`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`\n${f}`);
  }
  if (correct < total) process.exitCode = 1;
}

main();
