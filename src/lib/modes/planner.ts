import { chatCompletion } from "@/lib/ai/client";
import { extractJson } from "./prompt";
import { LAYOUT_REGISTRY } from "./layouts";
import type { LayoutShell, SlideDensity, SlidePurpose, VisualNeed } from "./types";

export interface PlannedSlide {
  index: number;
  purpose: SlidePurpose;
  message: string;
  density: SlideDensity;
  layout: { family: string; variant: string; shell: LayoutShell; ratio?: number };
  visual: { need: VisualNeed; concept?: string; query?: string };
  /** Assigned by template intelligence after planning (optional). */
  template?: { id: string; score: number; treatment: string };
}

export interface PresentationPlan {
  presentationGoal: string;
  audience: string;
  tone: string;
  narrativeArc: string[];
  visualDirection: string;
  slides: PlannedSlide[];
}

export interface PlannerInput {
  request: string;
  audience?: string;
  goal?: string;
  slideCount: number;
  themeLabel?: string;
  sourceContext?: string;
}

type Credential = { apiKey: string; baseUrl: string; extraHeaders?: Record<string, string> };

const PURPOSES: SlidePurpose[] = [
  "hook", "context", "problem", "proof", "detail", "comparison",
  "turn", "insight", "evidence", "solution", "mechanism", "result", "close",
];

function familyCatalog(): string {
  return LAYOUT_REGISTRY.map(
    (l) => `- ${l.family} (purposes: ${l.purposes.join("/")}; density: ${l.densities.join("/")}; variants: ${l.variants.join("/")}; shell: ${l.shell})`
  ).join("\n");
}

function sanitizePlan(raw: unknown, slideCount: number): PresentationPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.slides)) return null;
  const slides: PlannedSlide[] = (r.slides as unknown[]).slice(0, slideCount).map((s, i) => {
    const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const layout = (o.layout && typeof o.layout === "object" ? o.layout : {}) as Record<string, unknown>;
    const visual = (o.visual && typeof o.visual === "object" ? o.visual : {}) as Record<string, unknown>;
    const purpose = PURPOSES.includes(o.purpose as SlidePurpose) ? (o.purpose as SlidePurpose) : "detail";
    const density: SlideDensity =
      o.density === "sparse" || o.density === "dense" ? (o.density as SlideDensity) : "balanced";
    const validFamilies = LAYOUT_REGISTRY.map((l) => l.family);
    const family = validFamilies.includes(String(layout.family)) ? String(layout.family) : "cards";
    const def = LAYOUT_REGISTRY.find((l) => l.family === family)!;
    const variant = def.variants.includes(String(layout.variant)) ? String(layout.variant) : def.defaultVariant;
    const shell: LayoutShell =
      layout.shell === "bleed" || layout.shell === "split" || layout.shell === "overlap"
        ? (layout.shell as LayoutShell) : def.shell;
    const needs: VisualNeed[] = ["none", "photo", "diagram", "chart", "icon", "texture"];
    const need: VisualNeed = needs.includes(visual.need as VisualNeed) ? (visual.need as VisualNeed) : "none";
    return {
      index: i + 1,
      purpose,
      message: typeof o.message === "string" && o.message ? o.message.slice(0, 220) : "Key point",
      density,
      layout: { family, variant, shell, ratio: typeof layout.ratio === "number" ? layout.ratio : undefined as number | undefined },
      visual: {
        need,
        concept: (typeof visual.concept === "string" ? visual.concept.slice(0, 280) : undefined) as string | undefined,
        query: (typeof visual.query === "string" ? visual.query.slice(0, 160) : undefined) as string | undefined,
      },
    };
  });
  // Pad if the model returned too few slides so the count contract holds.
  while (slides.length < slideCount) {
    slides.push({
      index: slides.length + 1, purpose: "detail", message: "Supporting point",
      density: "balanced",
      layout: { family: "cards", variant: "grid", shell: "contained" },
      visual: { need: "none" },
    });
  }
  return {
    presentationGoal: typeof r.presentationGoal === "string" ? r.presentationGoal : "",
    audience: typeof r.audience === "string" ? r.audience : "",
    tone: typeof r.tone === "string" ? r.tone : "",
    narrativeArc: Array.isArray(r.narrativeArc) ? r.narrativeArc.map(String).slice(0, slideCount) : [],
    visualDirection: typeof r.visualDirection === "string" ? r.visualDirection : "",
    slides,
  };
}

/**
 * Cheap structured planning pass. Runs BEFORE composition and owns:
 * story, per-slide purpose, density, layout family/variant/shell, visual need.
 * Returns null on failure so the caller can fall back to single-pass generation.
 */
export async function planPresentation(
  input: PlannerInput,
  credential: Credential,
  model: string
): Promise<{ plan: PresentationPlan | null; promptTokens: number; completionTokens: number }> {
  const system = `You are a presentation architect. Design the story structure of a slide deck as strict JSON. You do NOT write slide copy — only the plan.`;
  const user = `Request: """${input.request}"""
Audience: ${input.audience || "Executives"}
Goal: ${input.goal || "persuade"} (persuade = drive a decision; inform = transfer understanding; excite = build energy)
Slides: EXACTLY ${input.slideCount}
Theme: ${input.themeLabel || "default"}
${input.sourceContext ? `Source material:\n${input.sourceContext.slice(0, 3000)}` : ""}

Available layout families (choose by communicative intent, NEVER by availability):
${familyCatalog()}

Rules:
- Output EXACTLY ${input.slideCount} slides in "slides".
- Build a narrative progression (e.g. hook → problem → evidence → insight → solution → mechanism → proof → opportunity → close), adapted to the request.
- Every slide: one purpose, one single-sentence "message" (the takeaway), one density.
- Density: sparse = one idea, large type (statement/hero/bleed); balanced = normal; dense = data-rich (grid/table/diagram/multi-column).
- Never use the same family twice in a row unless the story justifies it. Vary rhythm: typographic moments, evidence, visuals, comparisons.
- Default to visual.need "none". Request photo only for emotional/hero/product moments; chart only for quantitative claims; diagram only for systems/processes; icon only for labeled features. Never decorative filler.
- When visual.need is photo/chart/diagram, include a "concept" (what the visual must communicate) and a "query" (stock search query or chart/diagram subject).

Respond ONLY with JSON:
{"presentationGoal":"","audience":"","tone":"","narrativeArc":[""],"visualDirection":"","slides":[{"index":1,"purpose":"hook","message":"","density":"sparse","layout":{"family":"statement","variant":"centered","shell":"contained"},"visual":{"need":"none","concept":"","query":""}}]}`;

  try {
    const res = await chatCompletion(
      {
        model, credential, maxTokens: 2000, stream: false, temperature: 0.4,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      },
      // Bounded: planning must never stall deck generation (1 retry, 45s cap).
      { maxRetries: 1, timeoutMs: 45000 }
    );
    if (!res.ok) return { plan: null, promptTokens: 0, completionTokens: 0 };
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content ?? "";
    if (!content) return { plan: null, promptTokens: 0, completionTokens: 0 };
    const plan = sanitizePlan(JSON.parse(extractJson(content)), input.slideCount);
    return {
      plan,
      promptTokens: body.usage?.prompt_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
    };
  } catch {
    return { plan: null, promptTokens: 0, completionTokens: 0 };
  }
}
