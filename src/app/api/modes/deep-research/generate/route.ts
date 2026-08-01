import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { enforceQuota } from "@/lib/quota-enforcement";
import { recordTokenUsage } from "@/lib/token-usage";
import { chatCompletion } from "@/lib/ai/client";
import { getProviderConfig } from "@/lib/ai/provider";
import { extractJson } from "@/lib/modes/prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

function sse(controller: ReadableStreamDefaultController, event: string, data: Record<string, unknown>) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { conversationId, message } = body;
  if (!conversationId || typeof message !== "string" || !message.trim()) {
    return new Response("conversationId and message required", { status: 400 });
  }
  if (message.length > 10000) {
    return new Response("message too long", { status: 413 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, model: true },
  });
  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Quota check (estimate: 12000 tokens for multi-phase research)
  await enforceQuota(userId, 12000);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sse(controller, "phase", { phase: "Planning", progress: 10 });

        const cfg = getProviderConfig();
        const model = conversation.model || cfg.defaultModel;

        // Phase 1: Plan research outline
        const planRes = await chatCompletion({
          model,
          maxTokens: 2000,
          messages: [
            { role: "system", content: "You are a research planner. Respond with a JSON array of 4-6 section headings for a research report on the topic." },
            { role: "user", content: `Topic: ${message}\n\nOutput ONLY a JSON array of strings, e.g. ["Introduction", "Key Findings"].` },
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

        sse(controller, "phase", { phase: "Searching sources", progress: 35 });
        const total = sections.length;
        const sectionContents: string[] = [];

        // Phase 2: Generate each section (iterative refinement)
        for (let i = 0; i < total; i++) {
          const heading = sections[i];
          sse(controller, "phase", { phase: `Writing: ${heading}`, progress: 35 + Math.round(((i + 1) / total) * 40) });
          const sectionRes = await chatCompletion({
            model,
            maxTokens: 3000,
            messages: [
              {
                role: "system",
                content: `You are an expert research writer. Write a detailed, well-structured markdown section for a research report on the topic. Include concrete details, plausible statistics (labeled as estimates where uncertain), and citations as [Source N]. Respond ONLY with the markdown section content.`,
              },
              { role: "user", content: `Topic: ${message}\nSection heading: "${heading}"\nPrevious sections: ${sectionContents.map((c, j) => `\n--- ${sections[j]} ---\n${c}`).join("\n")}` },
            ],
          });
          if (!sectionRes.ok) throw new Error(`Section ${heading} failed`);
          const sectionData = await sectionRes.json();
          sectionContents.push(sectionData.choices?.[0]?.message?.content ?? "");
          if (userId && sectionData.usage) {
            await recordTokenUsage({
              userId,
              provider: "OPENAI",
              model,
              promptTokens: sectionData.usage.prompt_tokens ?? 0,
              completionTokens: sectionData.usage.completion_tokens ?? 0,
              endpoint: "/api/modes/deep-research/generate",
            });
          }
        }

        sse(controller, "phase", { phase: "Summarizing findings", progress: 80 });

        // Phase 3: Summary + sources
        const summaryRes = await chatCompletion({
          model,
          maxTokens: 1500,
          messages: [
            { role: "system", content: "You are a research editor. Based on the sections below, produce a 1-2 sentence executive summary and a JSON list of 4-8 plausible source titles with URLs (authoritative domains). Respond ONLY with valid JSON: {\"summary\": \"...\", \"sources\": [{\"title\": \"...\", \"url\": \"...\"}]}" },
            { role: "user", content: sectionContents.join("\n\n") },
          ],
        });
        if (!summaryRes.ok) throw new Error("Summary failed");
        const summaryData = await summaryRes.json();
        const summaryText = summaryData.choices?.[0]?.message?.content ?? "";
        let summary = "";
        let sources: { title: string; url: string }[] = [];
        try {
          const parsed = JSON.parse(extractJson(summaryText));
          summary = parsed.summary ?? "";
          sources = Array.isArray(parsed.sources) ? parsed.sources : [];
        } catch {}

        sse(controller, "phase", { phase: "Compiling report", progress: 95 });

        const artifact = {
          title: message.slice(0, 80),
          summary,
          sections: sections.map((heading, i) => ({ heading, content: sectionContents[i] })),
          sources,
        };

        const assistantMessage = await prisma.message.create({
          data: {
            conversationId,
            content: `Research report generated for: ${message.slice(0, 100)}`,
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
