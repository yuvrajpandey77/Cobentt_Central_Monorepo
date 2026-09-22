import type { LayoutShell, SlideDensity, SlidePurpose, VisualNeed } from "./types";

/**
 * Layout registry — the decoupling layer between CONTENT TYPE and LAYOUT.
 * The planner selects a family (+variant/shell) from communicative intent;
 * the renderer interprets it. Block `type` remains the props contract.
 */

export interface LayoutDef {
  family: string;
  /** Block types that carry this family's props. First entry is canonical. */
  blockTypes: string[];
  purposes: SlidePurpose[];
  densities: SlideDensity[];
  variants: string[];
  defaultVariant: string;
  shell: LayoutShell;
  /** Rough capacity caps used by planner + evaluator. */
  capacity: { headlineChars: number; bodyChars: number; bullets: number };
  visualSupport: VisualNeed[];
  /** How pptx/html exporters should approximate this family. */
  exportStrategy: string;
  /** Controlled layer order for shells that layer content. */
  layers?: Array<"background" | "media" | "decoration" | "content" | "accent">;
}

export const LAYOUT_REGISTRY: LayoutDef[] = [
  {
    family: "hero", blockTypes: ["title-slide"], purposes: ["hook", "close"],
    densities: ["sparse"], variants: ["centered", "left"], defaultVariant: "centered",
    shell: "contained", capacity: { headlineChars: 60, bodyChars: 140, bullets: 0 },
    visualSupport: ["none", "texture"], exportStrategy: "title",
  },
  {
    family: "statement", blockTypes: ["statement-slide"], purposes: ["hook", "insight", "turn", "problem"],
    densities: ["sparse"], variants: ["centered", "left", "giant"], defaultVariant: "centered",
    shell: "contained", capacity: { headlineChars: 90, bodyChars: 160, bullets: 0 },
    visualSupport: ["none"], exportStrategy: "title",
  },
  {
    family: "editorial", blockTypes: ["editorial-slide"], purposes: ["context", "evidence", "insight", "detail"],
    densities: ["balanced", "dense"], variants: ["standard", "stat-side", "visual-side"], defaultVariant: "standard",
    shell: "contained", capacity: { headlineChars: 70, bodyChars: 600, bullets: 0 },
    visualSupport: ["none", "photo", "icon"], exportStrategy: "title-body",
  },
  {
    family: "media-split", blockTypes: ["media-split-slide", "image-slide"], purposes: ["solution", "evidence", "detail", "context"],
    densities: ["balanced"], variants: ["50-50", "60-40", "40-60", "65-35"], defaultVariant: "50-50",
    shell: "split", capacity: { headlineChars: 60, bodyChars: 320, bullets: 4 },
    visualSupport: ["photo"], exportStrategy: "title-text-image",
    layers: ["background", "media", "content", "accent"],
  },
  {
    family: "bleed", blockTypes: ["bleed-slide"], purposes: ["hook", "turn", "close", "insight"],
    densities: ["sparse"], variants: ["bottom-text", "center-text", "side-card"], defaultVariant: "bottom-text",
    shell: "bleed", capacity: { headlineChars: 60, bodyChars: 140, bullets: 0 },
    visualSupport: ["photo"], exportStrategy: "full-image-text",
    layers: ["background", "media", "decoration", "content"],
  },
  {
    family: "compare", blockTypes: ["compare-slide", "two-column-slide"], purposes: ["comparison", "evidence", "turn"],
    densities: ["balanced", "dense"], variants: ["vs-split", "before-after", "pros-cons", "table", "migration"], defaultVariant: "vs-split",
    shell: "contained", capacity: { headlineChars: 60, bodyChars: 200, bullets: 10 },
    visualSupport: ["none", "icon"], exportStrategy: "two-column",
  },
  {
    family: "timeline", blockTypes: ["timeline-slide"], purposes: ["mechanism", "context", "result", "detail"],
    densities: ["balanced", "dense"], variants: ["axis-horizontal", "axis-vertical"], defaultVariant: "axis-horizontal",
    shell: "contained", capacity: { headlineChars: 50, bodyChars: 120, bullets: 8 },
    visualSupport: ["none", "icon"], exportStrategy: "numbered",
  },
  {
    family: "process", blockTypes: ["process-slide", "numbered-steps"], purposes: ["mechanism", "solution", "detail"],
    densities: ["balanced", "dense"], variants: ["horizontal", "vertical", "stepped"], defaultVariant: "horizontal",
    shell: "contained", capacity: { headlineChars: 50, bodyChars: 120, bullets: 8 },
    visualSupport: ["none", "icon"], exportStrategy: "numbered",
  },
  {
    family: "metrics", blockTypes: ["stat-slide", "grid-slide"], purposes: ["proof", "evidence", "result"],
    densities: ["sparse", "balanced"], variants: ["hero-metric", "metric-row"], defaultVariant: "hero-metric",
    shell: "contained", capacity: { headlineChars: 50, bodyChars: 120, bullets: 4 },
    visualSupport: ["none"], exportStrategy: "stat",
  },
  {
    family: "chart", blockTypes: ["chart-slide"], purposes: ["proof", "evidence", "result", "insight"],
    densities: ["balanced"], variants: ["bar", "line", "donut"], defaultVariant: "bar",
    shell: "contained", capacity: { headlineChars: 60, bodyChars: 140, bullets: 0 },
    visualSupport: ["chart"], exportStrategy: "native-chart",
  },
  {
    family: "diagram", blockTypes: ["diagram-slide"], purposes: ["mechanism", "solution", "detail", "context"],
    densities: ["balanced", "dense"], variants: ["flow", "hierarchy", "hub"], defaultVariant: "flow",
    shell: "contained", capacity: { headlineChars: 60, bodyChars: 100, bullets: 0 },
    visualSupport: ["diagram"], exportStrategy: "shapes",
  },
  {
    family: "quote", blockTypes: ["quote-slide"], purposes: ["proof", "turn", "insight"],
    densities: ["sparse"], variants: ["centered", "editorial"], defaultVariant: "centered",
    shell: "contained", capacity: { headlineChars: 220, bodyChars: 60, bullets: 0 },
    visualSupport: ["none"], exportStrategy: "quote",
  },
  {
    family: "agenda", blockTypes: ["agenda-slide"], purposes: ["context"],
    densities: ["balanced"], variants: ["numbered", "sections"], defaultVariant: "numbered",
    shell: "contained", capacity: { headlineChars: 40, bodyChars: 60, bullets: 8 },
    visualSupport: ["none"], exportStrategy: "numbered",
  },
  {
    family: "close", blockTypes: ["closing-slide", "bleed-slide"], purposes: ["close"],
    densities: ["sparse"], variants: ["centered", "ask", "bleed"], defaultVariant: "centered",
    shell: "contained", capacity: { headlineChars: 50, bodyChars: 140, bullets: 0 },
    visualSupport: ["none", "photo"], exportStrategy: "title",
  },
  {
    family: "cards", blockTypes: ["grid-slide", "content-slide"], purposes: ["detail", "solution", "result"],
    densities: ["balanced", "dense"], variants: ["grid", "list"], defaultVariant: "grid",
    shell: "contained", capacity: { headlineChars: 60, bodyChars: 400, bullets: 8 },
    visualSupport: ["none", "icon"], exportStrategy: "bullets",
  },
];

export function getLayoutDef(family: string | undefined): LayoutDef | undefined {
  if (!family) return undefined;
  return LAYOUT_REGISTRY.find((l) => l.family === family);
}

/** Canonical block type for a planned family (renderer + schema compatible). */
export function blockTypeForFamily(family: string | undefined, fallback: string): string {
  const def = getLayoutDef(family);
  if (!def || def.blockTypes.length === 0) return fallback;
  return def.blockTypes[0];
}

/** Families allowed for a purpose — used by planner prompt + validator. */
export function familiesForPurpose(purpose: SlidePurpose): string[] {
  return LAYOUT_REGISTRY.filter((l) => l.purposes.includes(purpose)).map((l) => l.family);
}

/**
 * Convert a block to a new layout family, preserving shared content keys
 * (title/headline, body-ish text, list-ish items) so layout switching in the
 * editor keeps copy instead of regenerating it.
 */
export function convertBlockLayout(
  fromType: string,
  toFamily: string,
  props: Record<string, unknown>,
  makeId: () => string
): { type: string; props: Record<string, unknown> } {
  const target = blockTypeForFamily(toFamily, fromType);
  const p = { ...(props as Record<string, unknown>) };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]) : []);

  const headline = str(p.title ?? p.headline);
  const bodyPool: string[] = [
    str(p.subtitle), str(p.lede), str(p.body), str(p.note), str(p.caption),
    ...arr(p.bullets).map(String), ...arr(p.items).map((i) => (typeof i === "string" ? i : (i as { label?: string })?.label ?? "")),
    ...arr(p.steps).map(String),
  ].filter(Boolean);

  const fresh: Record<string, unknown> = {};
  switch (target) {
    case "statement-slide":
      fresh.overline = str(p.overline); fresh.headline = headline; fresh.sub = str(p.subtitle ?? p.lede ?? bodyPool[0] ?? "");
      break;
    case "editorial-slide":
      fresh.overline = str(p.overline); fresh.headline = headline; fresh.lede = str(p.lede ?? p.subtitle ?? "");
      fresh.body = str(p.body ?? bodyPool.slice(0, 2).join(" ") ?? ""); fresh.stat = str(p.stat ?? p.value ?? ""); fresh.statLabel = str(p.statLabel ?? p.suffix ?? "");
      break;
    case "media-split-slide":
      fresh.title = headline; fresh.body = str(p.body ?? p.subtitle ?? bodyPool[0] ?? "");
      fresh.bullets = arr(p.bullets).length > 0 ? p.bullets : bodyPool.slice(1, 4);
      fresh.url = str(p.url); fresh.ratio = p.ratio ?? "50-50"; fresh.imageSide = str(p.imageSide) || "right";
      break;
    case "bleed-slide":
      fresh.title = headline; fresh.subtitle = str(p.subtitle ?? bodyPool[0] ?? ""); fresh.url = str(p.url);
      break;
    case "timeline-slide":
      fresh.title = headline;
      fresh.items = arr(p.items).length > 0 ? p.items : bodyPool.slice(0, 5).map((b) => ({ date: "", label: b, detail: "" }));
      break;
    case "process-slide":
      fresh.title = headline;
      fresh.steps = arr(p.steps).length > 0 ? p.steps : bodyPool.slice(0, 5).map((b) => ({ label: b, detail: "" }));
      fresh.direction = str(p.direction) || "horizontal";
      break;
    case "compare-slide":
      fresh.title = headline; fresh.variant = str(p.variant) || "vs-split";
      fresh.leftTitle = str(p.leftTitle) || "Before"; fresh.left = arr(p.left).length > 0 ? p.left : bodyPool.slice(0, 3);
      fresh.rightTitle = str(p.rightTitle) || "After"; fresh.right = arr(p.right).length > 0 ? p.right : bodyPool.slice(3, 6);
      break;
    case "chart-slide":
      fresh.title = headline; fresh.chartType = str(p.chartType) || "bar";
      fresh.labels = arr(p.labels); fresh.values = arr(p.values); fresh.note = str(p.note);
      break;
    case "diagram-slide":
      fresh.title = headline; fresh.direction = str(p.direction) || "horizontal";
      fresh.nodes = arr(p.nodes); fresh.edges = arr(p.edges);
      break;
    default:
      return { type: target, props: { title: headline } };
  }
  void makeId;
  return { type: target, props: fresh };
}
