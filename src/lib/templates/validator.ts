import { DYNAMIC_SLIDE_THEMES } from "@/lib/modes/slide-themes";
import { LAYOUT_REGISTRY } from "@/lib/modes/layouts";
import { TEMPLATES } from "./registry";
import type { PresentationTemplate } from "./types";

const VALID_CATEGORIES = new Set([
  "startup", "investor", "corporate", "editorial", "minimal", "technical",
  "academic", "research", "creative", "agency", "brutalist", "playful",
  "luxury", "institutional", "data-heavy", "product", "marketing",
  "portfolio", "experimental", "nostalgic",
]);

const VALID_PATTERNS = new Set([
  "hero", "statement", "split", "two-column", "three-column", "grid",
  "metric-grid", "comparison", "timeline", "process", "quote", "case-study",
  "image-text", "chart", "table", "diagram", "architecture", "code",
  "section-divider", "closing",
]);

const VALID_PURPOSES = new Set([
  "hook", "context", "problem", "proof", "detail", "comparison", "turn",
  "insight", "evidence", "solution", "mechanism", "result", "close",
]);

const VALID_NEEDS = new Set(["none", "photo", "diagram", "chart", "icon", "texture"]);
const VALID_DENSITY = new Set(["sparse", "balanced", "dense"]);

export interface RegistryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Schema + referential validation for the template corpus. */
export function validateRegistry(templates: PresentationTemplate[] = TEMPLATES): RegistryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const themeIds = new Set(DYNAMIC_SLIDE_THEMES.map((t) => t.id));
  const familyIds = new Set(LAYOUT_REGISTRY.map((l) => l.family));

  for (const t of templates) {
    const tag = `template "${t.id || "?"}"`;
    if (!t.id) { errors.push(`${tag}: missing id`); continue; }
    if (seen.has(t.id)) errors.push(`${tag}: duplicate id`);
    seen.add(t.id);
    if (!t.name) errors.push(`${tag}: missing name`);
    if (!t.source?.type) errors.push(`${tag}: missing source.type`);
    if ((t.source?.type === "github" || t.source?.type === "reference") && !t.source.url) {
      errors.push(`${tag}: github/reference source requires url`);
    }
    if (!t.source?.license) warnings.push(`${tag}: missing license metadata`);
    for (const c of t.categories ?? []) {
      if (!VALID_CATEGORIES.has(c)) errors.push(`${tag}: invalid category "${c}"`);
    }
    if ((t.categories ?? []).length === 0) errors.push(`${tag}: needs at least one category`);
    for (const p of t.layoutPatterns ?? []) {
      if (!VALID_PATTERNS.has(p)) errors.push(`${tag}: unsupported layout pattern "${p}"`);
    }
    if ((t.layoutPatterns ?? []).length === 0) errors.push(`${tag}: needs at least one layout pattern`);
    for (const p of t.supportedSlidePurposes ?? []) {
      if (!VALID_PURPOSES.has(p)) errors.push(`${tag}: invalid purpose "${p}"`);
    }
    for (const n of t.visualNeeds ?? []) {
      if (!VALID_NEEDS.has(n)) errors.push(`${tag}: invalid visual need "${n}"`);
    }
    for (const d of t.preferredContentDensity ?? []) {
      if (!VALID_DENSITY.has(d)) errors.push(`${tag}: invalid density "${d}"`);
    }
    if (!t.appMapping?.themeId) {
      errors.push(`${tag}: missing appMapping.themeId`);
    } else if (!themeIds.has(t.appMapping.themeId)) {
      errors.push(`${tag}: appMapping.themeId "${t.appMapping.themeId}" is not a known dynamic theme`);
    }
    for (const f of t.appMapping?.layoutBoost ?? []) {
      if (!familyIds.has(f)) errors.push(`${tag}: layoutBoost "${f}" is not a known layout family`);
    }
    for (const c of t.compatibleWith ?? []) {
      if (!templates.some((x) => x.id === c)) warnings.push(`${tag}: compatibleWith unknown id "${c}"`);
    }
    const scores = [t.visualStyle?.minimalism, t.visualStyle?.editorial, t.visualStyle?.corporate, t.visualStyle?.playful, t.visualStyle?.technical, t.visualStyle?.experimental];
    if (scores.some((s) => typeof s !== "number" || s < 0 || s > 1)) {
      errors.push(`${tag}: visualStyle scores must be numbers in 0..1`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}
