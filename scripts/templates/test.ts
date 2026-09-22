import {
  TEMPLATES,
  compatibilityScore,
  emptyUsage,
  getTemplate,
  retrieveTemplates,
  selectDirection,
  selectForSlide,
  stylePresetToCategories,
  validateRegistry,
  visualIntentToCategories,
  type TemplateSelectionContext,
} from "@/lib/templates";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function baseCtx(over: Partial<TemplateSelectionContext> = {}): TemplateSelectionContext {
  return {
    slidePurpose: "detail",
    density: "balanced",
    contentTypes: ["text"],
    aspectRatio: "16:9",
    ...over,
  };
}

async function main() {
  console.log("== registry ==");
  const v = validateRegistry();
  check("registry valid", v.valid, v.errors.join("; "));
  check(">= 15 templates", TEMPLATES.length >= 15, `${TEMPLATES.length}`);
  check("unique ids", new Set(TEMPLATES.map((t) => t.id)).size === TEMPLATES.length);
  check("all licensed", TEMPLATES.every((t) => !!t.source.license));
  check("no proprietary copies", TEMPLATES.every((t) => t.source.type !== "github" || !!t.source.url));

  console.log("== scoring ==");
  const investor = retrieveTemplates(
    baseCtx({ slidePurpose: "proof", density: "sparse", contentTypes: ["numbers"], audience: "seed investors", presentationType: "persuade" }),
    { limit: 3 }
  );
  check(
    "investor slide favors investor-compatible systems",
    ["investor", "startup", "institutional", "corporate"].some((c) => investor[0].template.categories.includes(c as never)),
    investor[0]?.template.id
  );
  const technical = retrieveTemplates(
    baseCtx({ slidePurpose: "mechanism", density: "dense", contentTypes: ["diagram"], tone: "technical architecture review" }),
    { limit: 3 }
  );
  check(
    "technical slide favors technical systems",
    technical[0].template.categories.includes("technical") || technical[0].template.layoutPatterns.includes("diagram"),
    technical[0]?.template.id
  );
  const editorial = retrieveTemplates(
    baseCtx({ slidePurpose: "insight", density: "sparse", tone: "editorial magazine story" }),
    { limit: 3 }
  );
  check(
    "editorial slide favors editorial systems",
    editorial[0].template.categories.includes("editorial") || editorial[0].template.categories.includes("luxury"),
    editorial[0]?.template.id
  );

  console.log("== diversity ==");
  const first = retrieveTemplates(baseCtx({ slidePurpose: "hook" }), { limit: 1 })[0];
  const second = retrieveTemplates(
    baseCtx({ slidePurpose: "hook", previousTemplateIds: [first.template.id] }),
    { limit: 3 }
  );
  check("repeat usage penalized (different top pick)", second[0].template.id !== first.template.id, `${first.template.id} vs ${second[0].template.id}`);

  console.log("== compatibility ==");
  const signal = getTemplate("signal")!;
  const ledger = getTemplate("mono-ledger")!;
  const zine = getTemplate("zine-cut")!;
  check("compatible pair scores high", compatibilityScore(signal, ledger) >= 0.6, `${compatibilityScore(signal, ledger)}`);
  check("clashing pair scores lower", compatibilityScore(signal, zine) < compatibilityScore(signal, ledger));

  console.log("== user override ==");
  const overridden = retrieveTemplates(
    baseCtx({ slidePurpose: "proof", preferredCategories: ["brutalist"] }),
    { limit: 1 }
  );
  check("explicit style always wins", overridden[0].template.categories.includes("brutalist"), overridden[0]?.template.id);
  check("preset mapping", JSON.stringify(stylePresetToCategories("investor")) === JSON.stringify(["investor"]));
  check("visual intent mapping", visualIntentToCategories("premium YC-style startup deck").includes("investor"));

  console.log("== direction + slide selection ==");
  const dir = selectDirection({ audience: "Investors", goal: "persuade", tone: "premium confident" });
  check("direction has primary + rationale", !!dir.primary && dir.rationale.length > 0, dir.primary?.id);
  let usage = emptyUsage();
  const seen = new Set<string>();
  for (const purpose of ["hook", "problem", "evidence", "solution", "close"] as const) {
    const pick = selectForSlide(baseCtx({ slidePurpose: purpose }), usage);
    usage = pick.updated;
    seen.add(pick.template.id);
    check(`slide ${purpose} explained`, pick.reasons.length > 0, pick.template.id);
  }
  check("multi-slide run rotates systems", seen.size >= 2, [...seen].join(","));

  console.log("== 15 golden scenarios ==");
  const scenarios: Array<{ name: string; ctx: TemplateSelectionContext; expectCats: string[] }> = [
    { name: "SaaS investor pitch", ctx: baseCtx({ slidePurpose: "hook", audience: "seed investors", presentationType: "persuade" }), expectCats: ["investor", "startup"] },
    { name: "AI research paper", ctx: baseCtx({ slidePurpose: "evidence", contentTypes: ["chart"], tone: "research academic" }), expectCats: ["research", "academic", "data-heavy"] },
    { name: "University project", ctx: baseCtx({ slidePurpose: "detail", audience: "classroom", tone: "academic" }), expectCats: ["academic", "minimal"] },
    { name: "Product launch", ctx: baseCtx({ slidePurpose: "hook", contentTypes: ["image"], tone: "excite launch" }), expectCats: ["product", "marketing", "creative"] },
    { name: "Startup fundraising", ctx: baseCtx({ slidePurpose: "result", contentTypes: ["numbers"], audience: "investors" }), expectCats: ["investor", "startup", "institutional"] },
    { name: "Technical architecture", ctx: baseCtx({ slidePurpose: "mechanism", density: "dense", contentTypes: ["diagram"] }), expectCats: ["technical"] },
    { name: "Marketing strategy", ctx: baseCtx({ slidePurpose: "detail", tone: "creative campaign" }), expectCats: ["marketing", "creative", "agency"] },
    { name: "Financial report", ctx: baseCtx({ slidePurpose: "result", density: "dense", contentTypes: ["numbers", "chart"] }), expectCats: ["data-heavy", "institutional", "corporate"] },
    { name: "Quarterly business review", ctx: baseCtx({ slidePurpose: "result", audience: "executives", presentationType: "inform" }), expectCats: ["corporate", "institutional"] },
    { name: "Scientific presentation", ctx: baseCtx({ slidePurpose: "evidence", contentTypes: ["chart"], tone: "scientific research" }), expectCats: ["research", "academic", "data-heavy"] },
    { name: "Portfolio", ctx: baseCtx({ slidePurpose: "result", contentTypes: ["image"], tone: "luxury portfolio" }), expectCats: ["portfolio", "luxury", "creative"] },
    { name: "Agency pitch", ctx: baseCtx({ slidePurpose: "hook", audience: "customers", tone: "creative" }), expectCats: ["agency", "creative"] },
    { name: "Product roadmap", ctx: baseCtx({ slidePurpose: "mechanism", contentTypes: ["text"], tone: "product plan" }), expectCats: ["product", "startup", "technical"] },
    { name: "Case study", ctx: baseCtx({ slidePurpose: "evidence", contentTypes: ["image", "numbers"] }), expectCats: ["portfolio", "editorial", "research"] },
    { name: "Executive strategy", ctx: baseCtx({ slidePurpose: "insight", audience: "executives", density: "sparse" }), expectCats: ["corporate", "institutional", "editorial"] },
  ];
  for (const s of scenarios) {
    const [top] = retrieveTemplates(s.ctx, { limit: 3 });
    const hit = s.expectCats.some((c) => top.template.categories.includes(c as never));
    check(s.name, hit, `${top.template.id} [${top.template.categories.join(",")}]`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
