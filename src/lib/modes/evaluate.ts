import { getLayoutDef } from "./layouts";
import type { Artifact, ArtifactBlock } from "./types";

export type EvalAction = "pass" | "repair" | "regen";

export interface SlideEval {
  index: number;
  blockId: string;
  type: string;
  action: EvalAction;
  reasons: string[];
  /** Field-level repair hints for targeted regeneration. */
  changes: string[];
}

export interface DeckEval {
  results: SlideEval[];
  needsWork: boolean;
  summary: string;
}

function textOf(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function countBullets(p: Record<string, unknown>): number {
  let n = 0;
  for (const k of ["bullets", "left", "right", "items", "steps"]) {
    const v = p[k];
    if (Array.isArray(v)) n += v.length;
  }
  return n;
}

function copyLength(p: Record<string, unknown>): number {
  let n = 0;
  for (const v of Object.values(p)) {
    if (typeof v === "string") n += v.length;
    else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") n += item.length;
        else if (item && typeof item === "object") {
          for (const f of Object.values(item as Record<string, unknown>)) {
            if (typeof f === "string") n += f.length;
          }
        }
      }
    }
  }
  return n;
}

function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h || "000000", 16);
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((num >> 16) & 255) + 0.7152 * f((num >> 8) & 255) + 0.0722 * f(num & 255);
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const CARDISH = new Set(["content-slide", "grid-slide", "two-column-slide", "stat-slide"]);

/**
 * Deterministic per-slide quality checks. No LLM cost.
 * Returns PASS | REPAIR (fixable fields) | REGENERATE (structural failure).
 */
export function evaluateDeck(
  artifact: Artifact,
  themeBg = "#0b1220",
  _themeText = "#f1f5f9"
): DeckEval {
  const results: SlideEval[] = [];
  const blocks = artifact.blocks ?? [];
  let prevFamily: string | null = null;
  let cardRun = 0;

  blocks.forEach((b: ArtifactBlock, idx: number) => {
    const p = (b.props ?? {}) as Record<string, unknown>;
    const reasons: string[] = [];
    const changes: string[] = [];
    let action: EvalAction = "pass";

    const family = b.layout?.family ?? b.type.replace(/-slide$/, "").replace("content", "cards").replace("grid", "cards");
    const def = getLayoutDef(family);

    // 1. Overflow / density
    const bullets = countBullets(p);
    const chars = copyLength(p);
    const cap = def?.capacity;
    if (bullets > (cap?.bullets ?? 8) && (cap?.bullets ?? 8) < 8) {
      action = "regen";
      reasons.push(`too many list items (${bullets}) for ${family}`);
      changes.push("reduce list items or change family to cards/compare");
    } else if (bullets > 8) {
      if (action === "pass") action = "repair";
      reasons.push(`excessive bullets (${bullets})`);
      changes.push("shorten to at most 5 bullets or split across slides");
    }
    if (chars > (cap ? cap.headlineChars + cap.bodyChars + 200 : 900)) {
      if (action === "pass") action = "repair";
      reasons.push(`copy overflow (~${chars} chars) for ${family}`);
      changes.push("shorten body copy; move detail to speaker-note style brevity");
    }

    // 2. Anti-card: statement-ish content trapped in cards
    if (CARDISH.has(b.type) && bullets <= 1 && chars < 220 && textOf(p.title ?? p.headline).length > 0) {
      if (action === "pass") action = "repair";
      reasons.push("single-message content rendered as cards/UI list");
      changes.push("change family to statement or editorial with display typography");
    }

    // 3. Broken / missing visuals
    const need = b.visual?.need ?? "none";
    const url = textOf(p.url);
    if ((b.type === "image-slide" || b.type === "media-split-slide" || b.type === "bleed-slide") && !url) {
      action = "regen";
      reasons.push("image-led layout without an image URL");
      changes.push("set visual.need to none and switch to a typographic family, or supply a resolved asset URL");
    }
    if (need === "photo" && !url) {
      if (action === "pass") action = "repair";
      reasons.push("visual.need photo but no resolved asset");
      changes.push("set visual.need to none and use a typographic layout");
    }
    if (b.type === "chart-slide") {
      const labels = Array.isArray(p.labels) ? p.labels : [];
      const values = Array.isArray(p.values) ? p.values : [];
      if (labels.length < 2 || values.length < 2 || labels.length !== values.length) {
        action = "regen";
        reasons.push("chart lacks matching labels/values");
        changes.push("provide 2-6 labels with matching numeric values");
      }
    }
    if (b.type === "diagram-slide") {
      const nodes = Array.isArray(p.nodes) ? p.nodes : [];
      if (nodes.length < 2) {
        action = "regen";
        reasons.push("diagram has fewer than 2 nodes");
        changes.push("provide 2-6 nodes with connecting edges");
      }
    }
    if ((b.type === "timeline-slide" || b.type === "process-slide")) {
      const list = Array.isArray(p.items) ? p.items : Array.isArray(p.steps) ? p.steps : [];
      if (list.length < 2) {
        action = "regen";
        reasons.push(`${b.type} has fewer than 2 entries`);
        changes.push("provide 3-5 entries with labels");
      }
    }

    // 4. Contrast (custom per-block colors only; themes are pre-checked)
    const fg = b.style?.color;
    if (fg && /^#[0-9a-fA-F]{6}$/.test(fg) && contrast(fg, themeBg) < 2.2) {
      if (action === "pass") action = "repair";
      reasons.push(`insufficient text contrast (${fg} on background)`);
      changes.push("use theme text color or a higher-contrast color");
    }

    // 5. Rhythm: same family twice in a row (cards runs are the classic failure)
    if (prevFamily && family === prevFamily) {
      if (CARDISH.has(b.type)) cardRun += 1;
      if (CARDISH.has(b.type) && cardRun >= 1) {
        if (action === "pass") action = "repair";
        reasons.push(`repeated ${family} layout (card run)`);
        changes.push("switch this slide to a different family: statement, metrics, editorial, or visual-led");
      }
    } else {
      cardRun = 0;
    }
    prevFamily = family;

    // 6. Empty regions
    if (!textOf(p.title ?? p.headline) && !textOf(p.quote) && chars < 10) {
      action = "regen";
      reasons.push("slide has no headline or meaningful content");
      changes.push("write presentation-ready copy for all required fields");
    }

    results.push({ index: idx, blockId: b.id, type: b.type, action, reasons, changes });
  });

  const bad = results.filter((r) => r.action !== "pass");
  return {
    results,
    needsWork: bad.length > 0,
    summary: bad.length === 0 ? "All slides passed evaluation." : `${bad.length} slide${bad.length === 1 ? "" : "s"} flagged for refinement.`,
  };
}
