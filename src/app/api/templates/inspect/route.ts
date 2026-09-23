import { NextRequest, NextResponse } from "next/server";
import {
  REGISTRY_VERSION,
  TEMPLATES,
  buildTemplateContext,
  emptyUsage,
  retrieveTemplates,
  selectDirection,
  selectForSlide,
  validateRegistry,
  type TemplateSelectionContext,
} from "@/lib/templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Development-only template inspector (§24).
 * GET /api/templates/inspect?purpose=hook&density=sparse&tone=investor
 * Returns registry status + a sample retrieval with scores and reasons.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Inspector is development-only" }, { status: 404 });
  }
  const q = req.nextUrl.searchParams;
  const ctx: TemplateSelectionContext = {
    slidePurpose: (q.get("purpose") as never) ?? "hook",
    density: (q.get("density") as never) ?? "sparse",
    tone: q.get("tone") ?? "investor pitch",
    audience: q.get("audience") ?? "investors",
    contentTypes: (((q.get("content") ?? "text").split(",")) as never[]) ?? ["text"],
    aspectRatio: "16:9",
  };
  const validation = validateRegistry();
  const direction = selectDirection({ audience: ctx.audience, tone: ctx.tone });
  const picks = retrieveTemplates(ctx, { limit: 5 });
  const usage = emptyUsage();
  const slidePick = selectForSlide(ctx, usage);
  return NextResponse.json({
    registry: { version: REGISTRY_VERSION, count: TEMPLATES.length, valid: validation.valid, errors: validation.errors },
    direction: {
      primary: direction.primary.id,
      secondaries: direction.secondaries.map((s) => s.id),
      rationale: direction.rationale,
    },
    sampleRetrieval: picks.map((p) => ({
      id: p.template.id,
      name: p.template.name,
      score: Math.round(p.score * 100) / 100,
      reasons: p.reasons,
      layouts: p.template.layoutPatterns,
      purposes: p.template.supportedSlidePurposes,
      theme: p.template.appMapping.themeId,
      source: p.template.source,
    })),
    slideSelection: {
      id: slidePick.template.id,
      score: slidePick.score,
      reasons: slidePick.reasons,
    },
    contextPreview: buildTemplateContext(direction, [
      { index: 1, templateId: slidePick.template.id, score: slidePick.score, reasons: slidePick.reasons },
    ]).slice(0, 2000),
  });
}
