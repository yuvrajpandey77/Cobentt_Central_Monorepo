import { getSlideTheme } from "@/lib/modes/slide-themes";
import { TEMPLATES, getTemplate } from "./registry";
import { compatibilityScore, retrieveTemplates } from "./retriever";
import type {
  PresentationDirection,
  ScoredTemplate,
  TemplateCategory,
  TemplateSelectionContext,
  TemplateUsageState,
} from "./types";

export function emptyUsage(): TemplateUsageState {
  return { usedTemplates: [], usedLayouts: [], usedVisualPatterns: [] };
}

/**
 * Map free-text visual intent ("premium YC-style startup deck") onto
 * compatible OPEN grammars — never a proprietary copy (§21).
 */
export function visualIntentToCategories(intent: string): TemplateCategory[] {
  const t = intent.toLowerCase();
  const out = new Set<TemplateCategory>();
  if (/yc|y combinator|seed|pitch|fundrais|investor|raise/.test(t)) {
    out.add("investor"); out.add("startup"); out.add("minimal");
  }
  if (/premium|luxury|craft|atelier/.test(t)) { out.add("luxury"); out.add("editorial"); }
  if (/technical|dev|api|engineer|architecture|system/.test(t)) out.add("technical");
  if (/playful|fun|consumer|gen-z|meme/.test(t)) { out.add("playful"); out.add("creative"); }
  if (/academic|research|thesis|scientific|paper/.test(t)) { out.add("academic"); out.add("research"); }
  if (/brutal|raw|poster|punk/.test(t)) out.add("brutalist");
  if (/editorial|magazine|story|narrative/.test(t)) out.add("editorial");
  if (/data|metric|dashboard|financial|report|quarter/.test(t)) out.add("data-heavy");
  if (/product|launch|saas|showcase/.test(t)) out.add("product");
  if (/experiment|avant|art/.test(t)) out.add("experimental");
  if (/retro|terminal|nostalgi|pixel/.test(t)) out.add("nostalgic");
  if (/corporate|enterprise|board|executive/.test(t)) { out.add("corporate"); out.add("institutional"); }
  if (/minimal|clean|simple|keynote/.test(t)) out.add("minimal");
  if (/market|growth|campaign/.test(t)) out.add("marketing");
  if (/portfolio|case stud|agency/.test(t)) { out.add("portfolio"); out.add("agency"); }
  return [...out];
}

/** Setup-modal style presets (§22) → preferred categories. "automatic" = []. */
export function stylePresetToCategories(preset: string | undefined): TemplateCategory[] {
  switch ((preset ?? "automatic").toLowerCase()) {
    case "minimal": return ["minimal"];
    case "editorial": return ["editorial"];
    case "startup": return ["startup"];
    case "investor": return ["investor"];
    case "technical": return ["technical"];
    case "academic": return ["academic", "research"];
    case "creative": return ["creative"];
    case "brutalist": return ["brutalist"];
    case "experimental": return ["experimental"];
    default: return [];
  }
}

/** Planned layout family → layout-pattern vocabulary for scoring. */
export function familyToPattern(family: string | undefined): string {
  switch (family) {
    case "media-split": return "split";
    case "bleed": return "image-text";
    case "metrics": return "metric-grid";
    case "cards": return "grid";
    case "close": return "closing";
    default: return family ?? "";
  }
}

/** Planned layout family → likely content types for compatibility scoring. */
export function contentTypesForFamily(family: string | undefined): Array<"text" | "numbers" | "image" | "chart" | "table" | "diagram" | "code" | "quote"> {
  switch (family) {
    case "chart": return ["numbers", "chart"];
    case "metrics": return ["numbers", "text"];
    case "diagram": return ["diagram", "text"];
    case "timeline":
    case "process": return ["text", "diagram"];
    case "media-split":
    case "bleed": return ["image", "text"];
    case "compare": return ["text", "table"];
    case "quote": return ["quote", "text"];
    case "editorial": return ["text", "numbers"];
    default: return ["text"];
  }
}

/** Level 1: presentation-level visual direction (primary + secondaries). */
export function selectDirection(opts: {
  audience?: string;
  goal?: string;
  tone?: string;
  visualIntent?: string;
  preferredCategories?: TemplateCategory[];
  excludedCategories?: TemplateCategory[];
}): PresentationDirection {
  const fromIntent = opts.visualIntent ? visualIntentToCategories(opts.visualIntent) : [];
  const preferred = [...(opts.preferredCategories ?? []), ...fromIntent];
  const probe: TemplateSelectionContext = {
    presentationType: opts.goal,
    audience: opts.audience,
    tone: opts.tone,
    slidePurpose: "hook",
    density: "balanced",
    contentTypes: ["text"],
    preferredCategories: preferred.length > 0 ? [...new Set(preferred)] : undefined,
    excludedCategories: opts.excludedCategories,
  };
  const ranked = retrieveTemplates(probe, { limit: 4 });
  const primary = ranked[0]?.template ?? TEMPLATES[0];
  // Secondaries must clear the compatibility threshold (§18).
  const secondaries = ranked
    .slice(1)
    .filter((s) => compatibilityScore(primary, s.template) >= 0.6)
    .map((s) => s.template);
  return {
    primary,
    secondaries,
    rationale: [
      `Primary visual language: ${primary.name} (${primary.categories.slice(0, 3).join(" / ")})`,
      ...(ranked[0]?.reasons ?? []),
      ...secondaries.map((s) => `Secondary: ${s.name} (compat ${compatibilityScore(primary, s).toFixed(2)})`),
    ],
  };
}

/** Level 2: slide-level selection with usage-state diversity (§12). */
export function selectForSlide(
  ctx: TemplateSelectionContext,
  usage: TemplateUsageState
): ScoredTemplate & { updated: TemplateUsageState } {
  const merged: TemplateSelectionContext = {
    ...ctx,
    previousTemplateIds: [...(ctx.previousTemplateIds ?? []), ...usage.usedTemplates],
  };
  const [top] = retrieveTemplates(merged, { limit: 3 });
  const fallback = {
    template: getTemplate("signal") ?? TEMPLATES[0],
    score: 0,
    reasons: ["Fallback grammar"],
  };
  const pick = top ?? fallback;
  return {
    ...pick,
    updated: {
      usedTemplates: [...usage.usedTemplates, pick.template.id],
      usedLayouts: [...usage.usedLayouts, ctx.layout?.family ?? ""],
      usedVisualPatterns: [...usage.usedVisualPatterns, ctx.visualNeed ?? "none"],
    },
  };
}

/** Level 3: element-level treatment hints derived from the system record. */
export function elementTreatment(templateId: string): string {
  const t = getTemplate(templateId);
  if (!t) return "Use theme defaults for all elements.";
  const theme = getSlideTheme(t.appMapping.themeId, null);
  return [
    `Typography: ${t.typography.headingStyle}; ${t.typography.bodyStyle} (rendered in ${theme.fontHeading}/${theme.fontBody}).`,
    `Metrics: ${t.typography.numericStyle ?? "tabular numerals"} with ${t.typography.hierarchy} hierarchy.`,
    `Cards/surfaces: ${t.appMapping.accentTreatment ?? "rule"} accent treatment on ${theme.bg} field.`,
    `Borders: ${t.visualStyle.minimalism > 0.7 ? "hairlines only, generous spacing" : "visible structure, deliberate geometry"}.`,
  ].join(" ");
}

/**
 * Compact template context for the composer (§15). Never ships raw HTML —
 * normalized metadata only, so planning stays cheap.
 */
export function buildTemplateContext(
  direction: PresentationDirection,
  slidePicks: Array<{ index: number; templateId: string; score: number; reasons: string[] }>
): string {
  const byId = new Map(slidePicks.map((p) => [p.index, p]));
  const describe = (id: string): string => {
    const t = getTemplate(id);
    if (!t) return id;
    return [
      `Name: ${t.name}`,
      `Style: ${t.visualStyle.mood.slice(0, 3).join(", ")}; energy ${t.visualStyle.energy}; density ${t.visualStyle.density}`,
      `Best for: ${t.bestFor.slice(0, 3).join(", ")}`,
      `Typography: ${t.typography.hierarchy} hierarchy, ${t.typography.alignment}-aligned`,
      `Layouts: ${t.layoutPatterns.slice(0, 7).join(", ")}`,
      `Color: ${t.colorSystem.contrast}-contrast on ${t.colorSystem.background[0]}`,
      t.avoidFor?.length ? `Avoid: ${t.avoidFor.join("; ")}` : "",
    ].filter(Boolean).join("\n");
  };
  const lines = [
    "AVAILABLE VISUAL SYSTEMS (grammar references — adapt, do not copy slides):",
    `\nPrimary:\n${describe(direction.primary.id)}`,
    ...direction.secondaries.map((s) => `\nSecondary:\n${describe(s.id)}`),
    "\nPer-slide assignment:",
    ...slidePicks.map((p) => {
      const prev = byId.get(p.index);
      return `- Slide ${p.index}: ${getTemplate(p.templateId)?.name ?? p.templateId} (match ${(p.score * 100).toFixed(0)}%: ${(prev?.reasons ?? []).slice(0, 3).join("; ")})`;
    }),
    "\nRule: slides sharing a system must still differ in layout family and composition. Same system twice in a row requires a different layout variant.",
  ];
  return lines.join("\n");
}
