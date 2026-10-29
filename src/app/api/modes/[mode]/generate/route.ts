import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { chatCompletion } from "@/lib/ai/client";
import { parseArtifact, buildModePrompt, extractJson } from "@/lib/modes/prompt";
import { MODE_DEFINITIONS } from "@/lib/modes/definitions";
import { runAIPipeline, recordAITokens } from "@/lib/ai/pipeline";
import { resolveByokCredential, ByokError } from "@/lib/byok";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODES_WITH_ROUTE = ["slides", "document", "sheet", "deep-research"];

const encoder = new TextEncoder();
function sse(controller: ReadableStreamDefaultController, data: Record<string, unknown>) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function modeLabel(mode: string): string {
  return ((MODE_DEFINITIONS[mode] as unknown as { label?: string } | undefined)?.label) ?? mode;
}

/** Compact, deterministic summary of what changed between two artifacts. */
function summarizeChanges(
  mode: string,
  prev: import("@/lib/modes/types").Artifact | undefined,
  next: { title?: string; theme?: string; blocks?: Array<{ type?: string }>; sections?: unknown[] }
): string {
  const label = modeLabel(mode);

  if (mode === "deep-research") {
    const sections = Array.isArray(next.sections) ? next.sections.length : 0;
    return `Generated a ${label} report titled “${next.title || "Untitled"}” with ${sections} section${sections === 1 ? "" : "s"}.`;
  }

  const prevBlocks = prev?.blocks ?? [];
  const nextBlocks = Array.isArray(next.blocks) ? next.blocks : [];

  if (!prev || prevBlocks.length === 0) {
    const n = nextBlocks.length;
    return `Generated a ${label} titled “${next.title || "Untitled"}” with ${n} block${n === 1 ? "" : "s"}.`;
  }

  const prevCounts = new Map<string, number>();
  for (const b of prevBlocks) {
    const t = b?.type || "block";
    prevCounts.set(t, (prevCounts.get(t) ?? 0) + 1);
  }
  const nextCounts = new Map<string, number>();
  for (const b of nextBlocks) {
    const t = b?.type || "block";
    nextCounts.set(t, (nextCounts.get(t) ?? 0) + 1);
  }

  const changes: string[] = [];
  for (const [type, count] of nextCounts) {
    const before = prevCounts.get(type) ?? 0;
    const diff = count - before;
    if (diff > 0) changes.push(`added ${diff} ${type} block${diff === 1 ? "" : "s"}`);
    else if (diff < 0) changes.push(`removed ${-diff} ${type} block${diff === -1 ? "" : "s"}`);
  }
  for (const [type, count] of prevCounts) {
    if (!nextCounts.has(type)) {
      changes.push(`removed ${count} ${type} block${count === 1 ? "" : "s"}`);
    }
  }
  if (prev.title !== next.title && next.title) changes.push(`renamed it to “${next.title}”`);
  if (prev.theme !== next.theme && next.theme) changes.push(`switched theme to ${next.theme}`);

  if (changes.length === 0) {
    const n = nextBlocks.length;
    changes.push(`refreshed ${n} block${n === 1 ? "" : "s"}`);
  }

  return `${label} updated — ${changes.join(", ")}.`;
}

/**
 * Targeted single-slide repair: recompose ONE flagged block with structured
 * reasons injected. Returns the replacement block (same id) or null to keep
 * the original. Never regenerates the whole deck.
 */
async function recomposeSlide(
  model: string,
  credential: { apiKey: string; baseUrl: string; extraHeaders?: Record<string, string> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  block: any,
  reasons: string[],
  changes: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  try {
    const defs = MODE_DEFINITIONS["slides"]?.blockTypes ?? [];
    const allowlist = defs.map((d) => d.type).join(", ");
    const res = await chatCompletion(
      {
        model,
        credential,
        maxTokens: 1500,
        stream: false,
        temperature: 0.3,
        messages: [
        {
          role: "system",
          content: "You are a slide repair specialist. Fix exactly one slide. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: `This slide failed visual quality checks. Recompose it as a SINGLE slide block that fixes every issue while preserving the slide's message and content.

Current block JSON:
${JSON.stringify(block).slice(0, 4000)}

Issues: ${reasons.join("; ") || "unspecified"}
Required fixes: ${changes.join("; ") || "improve layout and readability"}

Allowed block types: ${allowlist}
Anti-card rules: single statements → statement-slide; numbers → stat/chart-slide; progression → timeline-slide; flows → process-slide; systems → diagram-slide; comparisons → compare-slide with the right variant; image-led → media-split/bleed (only with a real URL already present — never invent URLs).
Include "purpose", "message", "density", and "layout" {family, variant, shell} fields matching the chosen type.

Respond ONLY with JSON: {"type": "<one of allowed>", "props": {...}, "purpose": "", "message": "", "density": "sparse|balanced|dense", "layout": {"family": "", "variant": "", "shell": "contained"}}`,
        },
      ],
      },
      // Bounded: a single repair must never stall the deck (1 retry, 30s cap).
      { maxRetries: 1, timeoutMs: 30000 }
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) return null;
    const fixed = JSON.parse(extractJson(text)) as {
      type?: string;
      props?: Record<string, unknown>;
      purpose?: string;
      message?: string;
      density?: string;
      layout?: Record<string, unknown>;
      visual?: Record<string, unknown>;
    };
    const validTypes = new Set(defs.map((d) => d.type));
    if (!fixed || !validTypes.has(String(fixed.type)) || !fixed.props || typeof fixed.props !== "object") {
      return null;
    }
    return {
      id: typeof block?.id === "string" ? block.id : `blk_repaired_${Date.now().toString(36)}`,
      type: fixed.type,
      props: fixed.props,
      ...(typeof fixed.purpose === "string" ? { purpose: fixed.purpose } : {}),
      ...(typeof fixed.message === "string" ? { message: fixed.message } : {}),
      ...(fixed.density === "sparse" || fixed.density === "balanced" || fixed.density === "dense" ? { density: fixed.density } : {}),
      ...(fixed.layout && typeof fixed.layout === "object" ? { layout: fixed.layout } : {}),
      ...(fixed.visual && typeof fixed.visual === "object" ? { visual: fixed.visual } : {}),
      ...(block?.style && typeof block.style === "object" ? { style: block.style } : {}),
    };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  const { mode } = await params;
  if (!MODES_WITH_ROUTE.includes(mode)) {
    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  }

  const { conversationId, message, currentArtifact, attachmentIds } = await req.json();

  // Shared pipeline: auth, rate limit, sanitize, injection check, quota, ownership
  const pipeline = await runAIPipeline(message, {
    rateLimitKey: "ai",
    conversationId,
    estimatedTokens: 4000,
    // BYOK calls are paid for by the user's own provider key.
    skipQuotaForByok: true,
  });
  if (!pipeline.ok) return pipeline.response;

  const { userId, sanitizedMessage } = pipeline.ctx;

  // Fetch conversation with history (pipeline already validated ownership)
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, model: true, template: true, messages: { orderBy: { createdAt: "desc" }, take: 8, include: { fragments: true } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const history = [...conversation.messages].reverse().map((m) => ({
    role: m.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  let currentArtifactParsed: import("@/lib/modes/types").Artifact | undefined;
  if (typeof currentArtifact === "string") {
    try {
      currentArtifactParsed = JSON.parse(currentArtifact);
    } catch {
      currentArtifactParsed = undefined;
    }
  } else if (currentArtifact && typeof currentArtifact === "object") {
    currentArtifactParsed = currentArtifact;
  }

  // Slides setup block: exact page count + custom dynamic theme, embedded by
  // the launchpad so no DB migration is needed. Strip it before the LLM sees
  // the message, then re-apply the theme to the saved artifact below.
  let setupSlideCount: number | undefined;
  let setupThemeId: string | undefined;
  let setupThemeConfig: Record<string, unknown> | undefined;
  let setupThemeBrief = "";
  let setupAudience = "Executives";
  let setupGoal = "persuade";
  let setupUseSourceImages = false;
  let setupVisualStyle = "automatic";
  let setupAutoMode = true;
  let promptMessage = sanitizedMessage;
  if (mode === "slides") {
    try {
      const { parseSlidesSetup } = await import("@/lib/modes/slide-themes");
      const parsed = parseSlidesSetup(sanitizedMessage);
      promptMessage = parsed.cleanMessage || sanitizedMessage;
      setupSlideCount = parsed.setup.slideCount;
      setupThemeId = parsed.setup.themeId;
      if (typeof parsed.setup.audience === "string" && parsed.setup.audience) {
        setupAudience = parsed.setup.audience;
      }
      if (typeof parsed.setup.goal === "string" && parsed.setup.goal) {
        setupGoal = parsed.setup.goal;
      }
      setupUseSourceImages = parsed.setup.useSourceImages === true;
      if (typeof parsed.setup.visualStyle === "string" && parsed.setup.visualStyle) {
        setupVisualStyle = parsed.setup.visualStyle;
      }
      setupAutoMode = parsed.setup.autoMode !== false;
      if (parsed.setup.themeConfig) {
        setupThemeConfig = parsed.setup.themeConfig as Record<string, unknown>;
        setupThemeBrief = `Custom theme ${setupThemeId ? `based on "${setupThemeId}"` : ""} with colors/fonts/backdrop ${JSON.stringify(parsed.setup.themeConfig)}. Set artifact "theme" to "${setupThemeId || "midnight"}".`;
      } else if (setupThemeId) {
        setupThemeBrief = `Use the "${setupThemeId}" visual theme.`;
      }
    } catch { /* fall back to raw message */ }
  }

  const isFreshSlidesDeck =
    mode === "slides" &&
    (!currentArtifactParsed || !Array.isArray(currentArtifactParsed.blocks) || currentArtifactParsed.blocks.length === 0);

  const prompt = buildModePrompt(mode as never, promptMessage, conversation.template ?? undefined, currentArtifactParsed, undefined, { slideCount: setupSlideCount, themeBrief: setupThemeBrief || undefined });

  // Load extracted text from attached files (ownership is scoped to the
  // conversation, which the pipeline already validated).
  let attachmentContext = "";
  if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
    try {
      const attachments = await prisma.attachment.findMany({
        where: { id: { in: attachmentIds }, conversationId, extractedText: { not: null } },
        select: { fileName: true, extractedText: true },
      });
      attachmentContext = attachments
        .map((a) => `[${a.fileName}]\n${a.extractedText ?? ""}`)
        .join("\n\n");
    } catch (err) {
      console.warn("[modes/generate] attachment context load failed:", err);
    }
  }

  const requestedModel = conversation.model || "openai/gpt-4o-mini";
  let credential;
  try {
    credential = await resolveByokCredential(userId, requestedModel);
  } catch (err) {
    if (err instanceof ByokError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }
  const model = credential.model;
  const start = Date.now();

  // Presentation planner (fresh slides decks only): owns story, per-slide
  // purpose, density, layout family, and visual need BEFORE composition.
  // Falls back to single-pass generation when planning fails.
  let planText = "";
  let extraPromptTokens = 0;
  let extraCompletionTokens = 0;
  // Template intelligence: direction theme adopted only in Auto mode without
  // a custom theme (explicit user themes always win). Disabled entirely when
  // TEMPLATE_INTELLIGENCE_ENABLED=false (old behavior identical).
  let directionThemeId: string | undefined;
  if (isFreshSlidesDeck) {
    try {
      const { planPresentation } = await import("@/lib/modes/planner");
      const { themeLabel } = await import("@/lib/modes/slide-themes").then((m) => ({
        themeLabel: (m.DYNAMIC_SLIDE_THEMES.find((t) => t.id === setupThemeId)?.label as string | undefined) ?? setupThemeId,
      }));
      const planned = await planPresentation(
        {
          request: promptMessage,
          audience: setupAudience,
          goal: setupGoal,
          slideCount: setupSlideCount ?? 10,
          themeLabel,
          sourceContext: attachmentContext || undefined,
        },
        credential,
        model
      );
      extraPromptTokens += planned.promptTokens;
      extraCompletionTokens += planned.completionTokens;
      console.log(
        `[modes/generate] planner ${planned.plan ? `ok (${planned.plan.slides.length} slides)` : "failed, single-pass fallback"} in ${Date.now() - start}ms`
      );
      if (planned.plan) {
        // Template intelligence: presentation direction + per-slide visual
        // system selection (grammar references, not rigid templates).
        try {
          const templates = await import("@/lib/templates");
          if (templates.templateIntelligenceEnabled()) {
            const direction = templates.selectDirection({
              audience: setupAudience,
              goal: setupGoal,
              tone: planned.plan.tone,
              preferredCategories: templates.stylePresetToCategories(setupVisualStyle),
            });
            let usage = templates.emptyUsage();
            const picks: Array<{ index: number; templateId: string; score: number; reasons: string[] }> = [];
            for (const s of planned.plan.slides) {
              const pick = templates.selectForSlide(
                {
                  presentationType: setupGoal,
                  audience: setupAudience,
                  tone: planned.plan.tone,
                  slidePurpose: s.purpose,
                  density: s.density,
                  layout: { family: s.layout.family, variant: s.layout.variant, shell: s.layout.shell },
                  visualNeed: s.visual.need,
                  contentTypes: templates.contentTypesForFamily(s.layout.family),
                  preferredCategories: templates.stylePresetToCategories(setupVisualStyle),
                  aspectRatio: "16:9",
                },
                usage
              );
              usage = pick.updated;
              s.template = {
                id: pick.template.id,
                score: Math.round(pick.score * 100) / 100,
                treatment: templates.elementTreatment(pick.template.id),
              };
              picks.push({ index: s.index, templateId: pick.template.id, score: s.template.score, reasons: pick.reasons });
            }
            planText = `\n${JSON.stringify(planned.plan)}`;
            planText += `\n\n${templates.buildTemplateContext(direction, picks)}`;
            if (setupAutoMode && !setupThemeConfig) {
              directionThemeId = templates.normalizeTemplate(direction.primary).themeId;
            }
            console.log(
              `[modes/generate] template direction: ${direction.primary.name} + ${direction.secondaries.length} secondaries`
            );
          } else {
            planText = `\n${JSON.stringify(planned.plan)}`;
          }
        } catch (err) {
          console.warn("[modes/generate] template selection skipped:", err instanceof Error ? err.message : err);
          planText = `\n${JSON.stringify(planned.plan)}`;
        }
        // Asset resolution: photo needs → upload/stock candidates.
        let imageAttachments: Array<{ id: string; fileName: string; mimeType: string }> = [];
        if (setupUseSourceImages) {
          try {
            imageAttachments = await prisma.attachment.findMany({
              where: { conversationId, mimeType: { startsWith: "image/" } },
              select: { id: true, fileName: true, mimeType: true },
            });
          } catch { /* uploads unavailable — stock/degrade path */ }
        }
        const { resolveSlideAssets, assetPromptFragment } = await import("@/lib/modes/assets");
        const assets = await resolveSlideAssets(planned.plan, {
          useSourceImages: setupUseSourceImages,
          attachments: imageAttachments,
        });
        planText += `\n\n${assetPromptFragment(assets)}`;
      }
    } catch (err) {
      console.warn("[modes/generate] planner failed, falling back:", err instanceof Error ? err.message : err);
    }
  }

  const planOpts = {
    slideCount: setupSlideCount,
    themeBrief: setupThemeBrief || undefined,
    plan: planText || undefined,
  };
  const finalPrompt = attachmentContext || planText
    ? buildModePrompt(mode as never, promptMessage, conversation.template ?? undefined, currentArtifactParsed, attachmentContext || undefined, planOpts)
    : prompt;

  // Stream the generated artifact tokens over SSE so the client can render a
  // loading skeleton and progressively reveal the updated document instead of
  // swapping the whole canvas at once.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await chatCompletion({
          model,
          credential,
          maxTokens: planText ? 6000 : 3500,
          stream: true,
          messages: [
            {
              role: "system",
              content: "You are Cobentt, an expert AI content builder. Always respond with valid JSON only.",
            },
            ...history,
            { role: "user", content: finalPrompt },
          ],
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI error (${response.status}): ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let content = "";
        let promptTokens = 0;
        let completionTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;
              if (parsed.usage) {
                promptTokens = parsed.usage.prompt_tokens || 0;
                completionTokens = parsed.usage.completion_tokens || 0;
              }
              const token = delta.content || "";
              if (token) {
                content += token;
                sse(controller, { event: "token", token });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        if (!content) throw new Error("Empty AI response");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let artifact: any;
        let refinedCount = 0;
        if (mode === "deep-research") {
          artifact = JSON.parse(extractJson(content));
        } else {
          artifact = parseArtifact(content);
          if (mode === "slides") {
            // Enforce the exact page count the user picked on the setup page.
            if (typeof setupSlideCount === "number" && Array.isArray(artifact.blocks)) {
              if (artifact.blocks.length > setupSlideCount) {
                artifact.blocks = artifact.blocks.slice(0, setupSlideCount);
              }
            }
            // Persist the chosen theme so the canvas + exports render it.
            // Auto mode adopts the template direction's theme; explicit user
            // themes (including custom builds) always win.
            const finalThemeId = setupThemeConfig ? setupThemeId : directionThemeId ?? setupThemeId;
            if (finalThemeId) artifact.theme = finalThemeId;
            if (setupThemeConfig) artifact.themeConfig = setupThemeConfig;

            // Visual evaluation + targeted single-slide repair (fresh decks).
            // Silent: at most 3 slides, 2 passes, then accept. Time-boxed so
            // slow repair calls can delay — but never stall — the response.
            if (isFreshSlidesDeck && Array.isArray(artifact.blocks) && artifact.blocks.length > 0) {
              try {
                const { evaluateDeck } = await import("@/lib/modes/evaluate");
                const themeForEval = async () => {
                  try {
                    const m = await import("@/lib/modes/slide-themes");
                    const custom = (artifact.themeConfig && typeof artifact.themeConfig === "object" ? artifact.themeConfig : null) as Parameters<typeof m.getSlideTheme>[1];
                    const t = m.getSlideTheme(artifact.theme, custom);
                    return t.bg;
                  } catch {
                    return "#0b1220";
                  }
                };
                const bg = await themeForEval();
                for (let pass = 0; pass < 2; pass++) {
                  // Stop repairs if the request is getting long — accept the
                  // deck as-is rather than risking a platform timeout.
                  if (Date.now() - start > 120000) {
                    console.warn("[modes/generate] repair budget exhausted by time, accepting deck");
                    break;
                  }
                  const ev = evaluateDeck(artifact, bg);
                  console.log(`[modes/generate] eval pass ${pass}: ${ev.summary}`);
                  const flagged = ev.results.filter((r) => r.action !== "pass").slice(0, 3);
                  if (flagged.length === 0) break;
                  for (const f of flagged) {
                    const fixed = await recomposeSlide(model, credential, artifact.blocks[f.index], f.reasons, f.changes);
                    if (fixed) {
                      artifact.blocks[f.index] = fixed;
                      refinedCount += 1;
                      // Repair calls are small non-streamed completions; account
                      // approximately since usage isn't parsed for them.
                      extraPromptTokens += 400;
                      extraCompletionTokens += 600;
                    }
                  }
                }
              } catch (err) {
                console.warn("[modes/generate] evaluation skipped:", err instanceof Error ? err.message : err);
              }
            }
          }
        }

        // Slides remain data-first for hand editing, with a self-contained HTML
        // representation stored beside the artifact for presentation and export.
        // Rebuild it on every AI edit so the two representations never drift.
        const generatedFiles: Record<string, unknown> = { artifact: JSON.stringify(artifact) };
        if (mode === "slides") {
          const { buildDeckHtml } = await import("../export/html");
          generatedFiles["slides.html"] = buildDeckHtml(artifact);
        }

        const previousFragment = conversation.messages
          .flatMap((m) => m.fragments ?? [])
          .reverse()
          .find((f) => f.mode === mode);

        let summary = summarizeChanges(mode, currentArtifactParsed, artifact);
        if (refinedCount > 0) {
          summary += ` ${refinedCount} slide${refinedCount === 1 ? "" : "s"} refined for layout and readability.`;
        }

        // Apply the new artifact to the previous fragment when present so the doc
        // actually updates in place (the canvas reads the latest fragment).
        if (previousFragment && mode !== "deep-research") {
          await prisma.fragment.update({
            where: { id: previousFragment.id },
            data: {
              // Prisma's JSON input type cannot infer a spread Record here.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              files: { ...((previousFragment.files as Record<string, unknown>) ?? {}), ...generatedFiles } as any,
              title: artifact.title || `New ${mode}`,
            },
          });
          // Echo what changed as a fresh assistant bubble so the chat panel
          // reflects the edit instead of staying silent.
          await prisma.message.create({
            data: {
              conversationId,
              content: summary,
              role: "ASSISTANT",
              type: "RESULT",
              status: "COMPLETE",
              modelUsed: model,
            },
          });
        } else {
          const assistantMessage = await prisma.message.create({
            data: {
              conversationId,
              content: summary,
              role: "ASSISTANT",
              type: "RESULT",
              status: "COMPLETE",
              modelUsed: model,
            },
          });

          await prisma.fragment.create({
            data: {
              messageId: assistantMessage.id,
              sandboxUrl: null,
              title: artifact.title || `New ${mode}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              files: generatedFiles as any,
              mode,
            },
          });
        }

        // Record token usage via shared helper (composer + planner + repairs)
        if (promptTokens || completionTokens || extraPromptTokens || extraCompletionTokens) {
          await recordAITokens({
            userId,
            model,
            promptTokens: promptTokens + extraPromptTokens,
            completionTokens: completionTokens + extraCompletionTokens,
            endpoint: `/api/modes/${mode}/generate`,
            durationMs: Date.now() - start,
          });
        }

        sse(controller, { event: "done", artifact, summary });
        controller.close();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Generation failed";
        sse(controller, { event: "error", error: errorMsg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
