import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { chatCompletion } from "@/lib/ai/client";
import { extractJson } from "@/lib/modes/prompt";
import { runAIPipeline, recordAITokens } from "@/lib/ai/pipeline";
import { resolveByokCredential, ByokError } from "@/lib/byok";
import { runWebSearchPipeline, type SearchResult } from "@/lib/intent/web-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function sse(controller: ReadableStreamDefaultController, event: string, data: Record<string, unknown>) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, message, currentArtifact, attachmentIds } = body;

  // Shared pipeline: auth, rate limit (3/min — expensive multi-call), sanitize, injection, quota, ownership
  const pipeline = await runAIPipeline(message, {
    rateLimitKey: "ai",
    rateLimitConfig: { requests: 3, window: "60 s" },
    conversationId,
    estimatedTokens: 12000,
  });
  if (!pipeline.ok) return pipeline.response;

  const { userId, sanitizedMessage } = pipeline.ctx;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, model: true },
  });
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Prior report context (when user gives a follow-up), so new research
  // builds on the existing report rather than starting from scratch.
  let priorContext = "";
  if (typeof currentArtifact === "string") {
    try {
      const prior = JSON.parse(currentArtifact);
      const priorTitle = (prior as { title?: string })?.title;
      const priorSummary = (prior as { summary?: string })?.summary;
      if (priorTitle || priorSummary) {
        priorContext = `\nBuild on and refine the existing report:\nTitle: ${priorTitle ?? ""}\nCurrent summary: ${priorSummary ?? ""}`;
      }
    } catch {
      priorContext = "";
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sse(controller, "phase", { phase: "Planning", progress: 10 });

        let credential;
        try {
          credential = await resolveByokCredential(userId, conversation.model || "openai/gpt-4o");
        } catch (err) {
          sse(controller, "error", {
            error: err instanceof Error ? err.message : "BYOK key required",
            code: err instanceof ByokError ? err.code : "BYOK_REQUIRED",
          });
          controller.close();
          return;
        }
        const model = credential.model;

        // Research must ground claims in retrieved sources. The chat route
        // already uses this pipeline, but this mode previously only displayed a
        // “Searching sources” phase while asking the model to invent plausible
        // citations. Keep attachment content bounded so it can inform the
        // report without crowding out source evidence.
        let attachmentContext = "";
        if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
          const attachments = await prisma.attachment.findMany({
            where: { id: { in: attachmentIds }, conversationId, extractedText: { not: null } },
            select: { fileName: true, extractedText: true },
          });
          attachmentContext = attachments
            .map((a) => `[${a.fileName}]\n${(a.extractedText ?? "").slice(0, 6000)}`)
            .join("\n\n")
            .slice(0, 12000);
        }

        sse(controller, "phase", { phase: "Searching sources", progress: 20 });
        const search = await runWebSearchPipeline(sanitizedMessage);
        const searchResults: SearchResult[] = search.failed ? [] : search.results.slice(0, 6);
        const researchEvidence = search.failed
          ? "No live sources were available. State that the report could not verify external claims and do not add citations."
          : search.answerContext;
        const sourceList = searchResults.map((source) => ({
          title: source.title,
          url: source.url,
        }));

        // Phase 1: Plan research outline
        const planRes = await chatCompletion({
          model,
          credential,
          maxTokens: 2000,
          messages: [
            { role: "system", content: "You are a research planner. Respond with a JSON array of 4-6 section headings for a research report on the topic." },
            { role: "user", content: `Topic: ${sanitizedMessage}\n\nOutput ONLY a JSON array of strings, e.g. ["Introduction", "Key Findings"].${priorContext}` },
          ],
        });
        if (!planRes.ok) throw new Error("Planning failed");
        const planData = await planRes.json();
        const planText = planData.choices?.[0]?.message?.content ?? "";
        let sections: string[] = [];
        try {
          const parsed = JSON.parse(extractJson(planText));
          sections = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
          sections = ["Introduction", "Key Findings", "Analysis", "Outlook"];
        }

        // Record plan phase tokens
        if (planData.usage) {
          await recordAITokens({
            userId, model,
            promptTokens: planData.usage.prompt_tokens ?? 0,
            completionTokens: planData.usage.completion_tokens ?? 0,
            endpoint: "/api/modes/deep-research/generate",
          });
        }

        const total = sections.length;
        const sectionContents: string[] = [];

        // Phase 2: Generate each section
        for (let i = 0; i < total; i++) {
          const heading = sections[i];
          sse(controller, "phase", { phase: `Writing: ${heading}`, progress: 35 + Math.round(((i + 1) / total) * 40) });
          const sectionRes = await chatCompletion({
            model,
            credential,
            maxTokens: 3000,
            messages: [
              {
                role: "system",
                content: "You are an expert research writer. Write a detailed, well-structured markdown section. Use only the supplied source evidence for external factual claims. Cite supported claims with [1], [2], etc. matching the supplied source list. Never invent statistics, sources, URLs, or citations. If evidence is insufficient, say so plainly. Respond ONLY with the markdown section content.",
              },
              {
                role: "user",
                content: `Topic: ${sanitizedMessage}\nSection heading: "${heading}"\n\nSource evidence:\n${researchEvidence}\n\nAttached source material:\n${attachmentContext || "None"}\n\nPrevious sections: ${sectionContents.map((c, j) => `\n--- ${sections[j]} ---\n${c}`).join("\n")}${priorContext}`,
              },
            ],
          });
          if (!sectionRes.ok) throw new Error(`Section ${heading} failed`);
          const sectionData = await sectionRes.json();
          sectionContents.push(sectionData.choices?.[0]?.message?.content ?? "");
          if (sectionData.usage) {
            await recordAITokens({
              userId, model,
              promptTokens: sectionData.usage.prompt_tokens ?? 0,
              completionTokens: sectionData.usage.completion_tokens ?? 0,
              endpoint: "/api/modes/deep-research/generate",
            });
          }
        }

        sse(controller, "phase", { phase: "Summarizing findings", progress: 80 });

        // Phase 3: Summary. Sources come from the verified search result, not
        // from model output, so the report never presents fabricated links.
        const summaryRes = await chatCompletion({
          model,
          credential,
          maxTokens: 1500,
          messages: [
            { role: "system", content: "You are a research editor. Based on the sections below, produce a concise 1-2 sentence executive summary. Do not introduce claims that are not supported by the sections. Respond ONLY with valid JSON: {\"summary\": \"...\"}" },
            { role: "user", content: sectionContents.join("\n\n") },
          ],
        });
        if (!summaryRes.ok) throw new Error("Summary failed");
        const summaryData = await summaryRes.json();
        const summaryText = summaryData.choices?.[0]?.message?.content ?? "";
        let summary = "";
        try {
          const parsed = JSON.parse(extractJson(summaryText));
          summary = parsed.summary ?? "";
        } catch {}

        // Record summary phase tokens
        if (summaryData.usage) {
          await recordAITokens({
            userId, model,
            promptTokens: summaryData.usage.prompt_tokens ?? 0,
            completionTokens: summaryData.usage.completion_tokens ?? 0,
            endpoint: "/api/modes/deep-research/generate",
          });
        }

        sse(controller, "phase", { phase: "Compiling report", progress: 95 });

        const artifact = {
          title: sanitizedMessage.slice(0, 80),
          summary,
          sections: sections.map((heading, i) => ({ heading, content: sectionContents[i] })),
          sources: sourceList,
        };

        const assistantMessage = await prisma.message.create({
          data: {
            conversationId,
            content: `Research report generated for: ${sanitizedMessage.slice(0, 100)}`,
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
            title: artifact.title,
            files: { artifact: JSON.stringify(artifact) },
            mode: "deep-research",
          },
        });

        sse(controller, "phase", { phase: "Complete", progress: 100 });
        sse(controller, "done", { artifact });
        controller.close();
      } catch (err: unknown) {
        sse(controller, "error", { error: err instanceof Error ? err.message : "Research failed" });
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
