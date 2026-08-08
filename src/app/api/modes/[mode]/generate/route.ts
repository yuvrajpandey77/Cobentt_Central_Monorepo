import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { chatCompletion } from "@/lib/ai/client";
import { getProviderConfig } from "@/lib/ai/provider";
import { parseArtifact, buildModePrompt, extractJson } from "@/lib/modes/prompt";
import { MODE_DEFINITIONS } from "@/lib/modes/definitions";
import { runAIPipeline, recordAITokens } from "@/lib/ai/pipeline";

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

  const prompt = buildModePrompt(mode as never, sanitizedMessage, conversation.template ?? undefined, currentArtifactParsed);

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

  const finalPrompt = attachmentContext
    ? buildModePrompt(mode as never, sanitizedMessage, conversation.template ?? undefined, currentArtifactParsed, attachmentContext)
    : prompt;
  const cfg = getProviderConfig();
  const model = conversation.model || cfg.defaultModel;
  const start = Date.now();

  // Stream the generated artifact tokens over SSE so the client can render a
  // loading skeleton and progressively reveal the updated document instead of
  // swapping the whole canvas at once.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await chatCompletion({
          model,
          maxTokens: 3500,
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
        if (mode === "deep-research") {
          artifact = JSON.parse(extractJson(content));
        } else {
          artifact = parseArtifact(content);
        }

        const previousFragment = conversation.messages
          .flatMap((m) => m.fragments ?? [])
          .reverse()
          .find((f) => f.mode === mode);

        const summary = summarizeChanges(mode, currentArtifactParsed, artifact);

        // Apply the new artifact to the previous fragment when present so the doc
        // actually updates in place (the canvas reads the latest fragment).
        if (previousFragment && mode !== "deep-research") {
          await prisma.fragment.update({
            where: { id: previousFragment.id },
            data: {
              files: { ...((previousFragment.files as Record<string, unknown>) ?? {}), artifact: JSON.stringify(artifact) },
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
              files: { artifact: JSON.stringify(artifact) },
              mode,
            },
          });
        }

        // Record token usage via shared helper
        if (promptTokens || completionTokens) {
          await recordAITokens({
            userId,
            model,
            promptTokens,
            completionTokens,
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
