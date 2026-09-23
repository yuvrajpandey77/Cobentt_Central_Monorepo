import { TEMPLATES } from "./registry";
import { scoreTemplate } from "./scorer";
import type {
  PresentationTemplate,
  ScoredTemplate,
  TemplateSelectionContext,
} from "./types";

/**
 * retrieveTemplates: filter incompatible → score → diversify → top N.
 * Pure + deterministic (no LLM): same context ⇒ same ranking.
 */
export function retrieveTemplates(
  ctx: TemplateSelectionContext,
  opts?: { limit?: number; templates?: PresentationTemplate[] }
): ScoredTemplate[] {
  const pool = opts?.templates ?? TEMPLATES;
  const limit = Math.max(1, Math.min(8, opts?.limit ?? 5));
  const excluded = new Set(ctx.excludedCategories ?? []);
  const aspect = ctx.aspectRatio ?? "16:9";

  // 1. Hard filters: excluded categories; aspect support.
  // Explicit user style always wins: constrain the pool to preferred
  // categories when any match (fall back to the full pool otherwise).
  const prefs = ctx.preferredCategories ?? [];
  const preferredPool = prefs.length > 0 ? pool.filter((t) => t.categories.some((c) => prefs.includes(c))) : [];
  const base = preferredPool.length > 0 ? preferredPool : pool;
  const eligible = base.filter((t) => {
    if (t.categories.some((c) => excluded.has(c))) return false;
    if (!t.supportedAspectRatios.includes(aspect)) return false;
    return true;
  });

  // 2. Score everything eligible.
  const scored = eligible.map((t) => scoreTemplate(t, ctx));

  // 3. Sort by score (stable: registry order breaks ties).
  scored.sort((a, b) => b.score - a.score);

  // 4. Diversify: adjacent picks should differ in primary category feel.
  //    Greedy pass — prefer an unused template when scores are close.
  const picked: ScoredTemplate[] = [];
  const used = new Set(ctx.previousTemplateIds ?? []);
  for (const s of scored) {
    if (picked.length >= limit) break;
    const lastCats = picked.length > 0 ? picked[picked.length - 1].template.categories : [];
    const overlap = s.template.categories.filter((c) => lastCats.includes(c)).length;
    const isFresh = !used.has(s.template.id);
    // Accept immediately when fresh or clearly best; defer near-duplicates.
    if (picked.length === 0 || isFresh || overlap === 0 || s.score - (picked[0]?.score ?? 0) > -0.12) {
      picked.push(s);
      used.add(s.template.id);
    }
  }
  // Backfill if diversification starved the list.
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, limit);
}

/** Compatibility between two systems for controlled mixing (§18). */
export function compatibilityScore(a: PresentationTemplate, b: PresentationTemplate): number {
  if (a.id === b.id) return 1;
  let score = 0.3; // shared 16:9 grammar baseline
  const catsA = new Set(a.categories);
  const sharedCats = b.categories.filter((c) => catsA.has(c)).length;
  score += Math.min(0.3, sharedCats * 0.15);
  if (a.compatibleWith?.includes(b.id) || b.compatibleWith?.includes(a.id)) score += 0.3;
  const energy: Record<string, number> = { low: 0, medium: 1, high: 2 };
  if (Math.abs((energy[a.visualStyle.energy] ?? 1) - (energy[b.visualStyle.energy] ?? 1)) <= 1) score += 0.1;
  return Math.max(0, Math.min(1, score));
}
