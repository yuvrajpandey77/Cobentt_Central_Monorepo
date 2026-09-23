import type {
  PresentationTemplate,
  ScoredTemplate,
  TemplateSelectionContext,
} from "./types";

/**
 * Deterministic template scoring. Weighted sum in 0..1:
 * purpose 0.25 + density 0.15 + visualNeed 0.15 + category 0.15 +
 * layout 0.10 + mood 0.05 + content 0.05 + aspect 0.05,
 * minus incompatibility (0.5) and diversity (0..0.3) penalties.
 * The LLM interprets the request; this enforces compatibility.
 */

const WEIGHTS = {
  purpose: 0.25,
  density: 0.15,
  visualNeed: 0.15,
  category: 0.15,
  layout: 0.1,
  mood: 0.05,
  content: 0.05,
  aspect: 0.05,
};

function norm01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function scoreTemplate(
  template: PresentationTemplate,
  ctx: TemplateSelectionContext
): ScoredTemplate {
  const reasons: string[] = [];
  let score = 0;

  // Purpose (0.25): does this system serve the slide's job?
  if (template.supportedSlidePurposes.includes(ctx.slidePurpose)) {
    score += WEIGHTS.purpose;
    reasons.push(`Serves "${ctx.slidePurpose}" slides`);
  }

  // Density (0.15)
  if (template.preferredContentDensity.includes(ctx.density)) {
    score += WEIGHTS.density;
    reasons.push(`Supports ${ctx.density} density`);
  } else if (ctx.density === "balanced") {
    score += WEIGHTS.density * 0.4;
  }

  // Visual need (0.15)
  const need = ctx.visualNeed ?? "none";
  if (template.visualNeeds.includes(need)) {
    score += WEIGHTS.visualNeed;
    reasons.push(need === "none" ? "Clean without imagery" : `Handles ${need} visuals`);
  }

  // Category (0.15): preferred categories + tone/audience keyword overlap.
  const prefs = ctx.preferredCategories ?? [];
  if (prefs.length > 0) {
    const hit = template.categories.filter((c) => prefs.includes(c));
    if (hit.length > 0) {
      score += WEIGHTS.category;
      reasons.push(`Matches style: ${hit.join(", ")}`);
    }
  } else {
    const hay = `${ctx.tone ?? ""} ${ctx.audience ?? ""} ${ctx.presentationType ?? ""} ${ctx.brandStyle ?? ""}`.toLowerCase();
    const kw: Record<string, string[]> = {
      investor: ["investor", "fund", "seed", "pitch", "raise"],
      startup: ["startup", "launch", "founder"],
      corporate: ["corporate", "enterprise", "executive", "board", "quarterly"],
      academic: ["academic", "university", "thesis", "lecture", "class"],
      technical: ["technical", "architecture", "api", "developer", "engineering", "system"],
      luxury: ["luxury", "premium", "craft"],
      creative: ["creative", "agency", "brand", "campaign"],
      minimal: ["minimal", "simple", "keynote"],
    };
    let matched = false;
    for (const [cat, words] of Object.entries(kw)) {
      if ((template.categories as string[]).includes(cat) && words.some((w) => hay.includes(w))) {
        matched = true;
        reasons.push(`Fits ${cat} context`);
        break;
      }
    }
    if (matched) score += WEIGHTS.category;
    else score += WEIGHTS.category * 0.3;
  }

  // Layout (0.10): planned family maps onto a supported pattern.
  const family = ctx.layout?.family;
  if (family) {
    const patternHit =
      template.layoutPatterns.includes(family as never) ||
      template.appMapping.layoutBoost.includes(family);
    if (patternHit) {
      score += WEIGHTS.layout;
      reasons.push(`Expresses ${family} layouts`);
    }
  } else {
    score += WEIGHTS.layout * 0.5;
  }

  // Mood (0.05): energy/tone alignment via tags + mood words.
  const tone = (ctx.tone ?? "").toLowerCase();
  if (tone) {
    const moodHay = [...template.visualStyle.mood, ...template.tags].join(" ").toLowerCase();
    const toneWords = tone.split(/[^a-z]+/).filter((w) => w.length > 3);
    if (toneWords.some((w) => moodHay.includes(w))) {
      score += WEIGHTS.mood;
      reasons.push("Tone alignment");
    }
  }

  // Content compatibility (0.05): numbers→metric/chart systems, etc.
  const ct = ctx.contentTypes ?? [];
  const supportsNumbers = template.layoutPatterns.some((p) => ["metric-grid", "chart", "table"].includes(p));
  const supportsImage = template.visualNeeds.includes("photo") || template.layoutPatterns.some((p) => ["image-text", "split"].includes(p));
  const supportsDiagram = template.layoutPatterns.some((p) => ["diagram", "architecture", "process", "timeline"].includes(p));
  let compat = 0;
  let compatTotal = 0;
  if (ct.includes("numbers")) { compatTotal++; if (supportsNumbers) compat++; }
  if (ct.includes("image")) { compatTotal++; if (supportsImage) compat++; }
  if (ct.includes("diagram") || ct.includes("chart")) { compatTotal++; if (supportsDiagram || supportsNumbers) compat++; }
  if (ct.includes("code")) {
    compatTotal++;
    if (template.layoutPatterns.includes("code")) compat++;
  }
  if (compatTotal > 0) {
    score += WEIGHTS.content * (compat / compatTotal);
    if (compat === compatTotal) reasons.push("Content-type compatible");
  } else {
    score += WEIGHTS.content * 0.5;
  }

  // Aspect (0.05)
  const aspect = ctx.aspectRatio ?? "16:9";
  if (template.supportedAspectRatios.includes(aspect)) {
    score += WEIGHTS.aspect;
  }

  // Incompatibility penalty (0.5): excluded categories or explicit avoidFor.
  const excluded = ctx.excludedCategories ?? [];
  if (template.categories.some((c) => excluded.includes(c))) {
    score -= 0.5;
    reasons.push("Penalty: excluded category");
  }

  // Diversity penalty (0..0.3): reuse within the same deck.
  const prev = ctx.previousTemplateIds ?? [];
  const uses = prev.filter((id) => id === template.id).length;
  if (uses > 0) {
    const penalty = Math.min(0.3, 0.18 + 0.12 * (uses - 1));
    score -= penalty;
    reasons.push(`Diversity penalty (used ${uses}×)`);
  }

  return { template, score: norm01(score), reasons };
}
