import prisma from "@/lib/db";
import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/models";
import { chatCompletion } from "@/lib/ai/client";
import type { ChatMessage } from "@/lib/ai/client";
import { estimateTokens } from "@/lib/token-estimator";
import { logUserAuditEvent } from "@/lib/user-audit";
import { runAIPipeline, recordAITokens } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const { message, model: reqModel, sources: reqSources } = await req.json();

  // Shared pipeline: auth, rate limit, sanitize, injection check, quota, ownership
  const pipeline = await runAIPipeline(message, {
    rateLimitKey: "chat",
    conversationId,
    estimatedTokens: estimateTokens(message || "") + 2000,
  });
  if (!pipeline.ok) return pipeline.response;

  const { userId, sanitizedMessage } = pipeline.ctx;

  // Fetch conversation (pipeline already validated ownership)
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, model: true },
  });
  if (!conversation) {
    return new Response("Not found", { status: 404 });
  }

  const model =
    typeof reqModel === "string" ? reqModel : conversation.model || DEFAULT_MODEL;
  const sources = Array.isArray(reqSources) ? reqSources : [];

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { role: true, content: true },
  });

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId,
      content: "",
      role: "ASSISTANT",
      type: "RESULT",
      status: "STREAMING",
      modelUsed: model,
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ messageId: assistantMessage.id })}\n\n`
          )
        );

        const systemPrompt =
          "You are Cobentt, an AI assistant built by Cogerphere AI Labs. You help users with coding, development, and general questions. Be concise, helpful, and accurate. When sharing code, use markdown code blocks with proper language tags.";

        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({
            role: (m.role.toLowerCase() === "assistant"
              ? "assistant"
              : "user") as ChatMessage["role"],
            content: m.content,
          })),
          { role: "user", content: sanitizedMessage },
        ];

        const start = Date.now();
        const response = await chatCompletion({
          model,
          messages,
          stream: true,
          maxTokens: 4096,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error (${response.status}): ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        let fullContent = "";
        let fullThinking = "";
        let promptTokens = 0;
        let completionTokens = 0;
        const decoder = new TextDecoder();
        let buffer = "";

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
              const reasoning =
                delta.reasoning || delta.reasoning_content || "";
              if (token) {
                fullContent += token;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
                );
              }
              if (reasoning) {
                fullThinking += reasoning;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ thinking: reasoning })}\n\n`
                  )
                );
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        if (!promptTokens) {
          promptTokens = estimateTokens(
            messages.map((m) => m.content).join("\n")
          );
        }
        if (!completionTokens) {
          completionTokens = estimateTokens(fullContent);
        }

        // Record token usage via shared helper
        await recordAITokens({
          userId,
          model,
          promptTokens,
          completionTokens,
          endpoint: "/api/chat/stream",
          durationMs: Date.now() - start,
        });

        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullContent,
            status: "COMPLETE",
            thinking: fullThinking || undefined,
            sources: sources.length > 0 ? sources : undefined,
            tokenCount: promptTokens + completionTokens,
          },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              done: true,
              model,
              thinking: fullThinking || undefined,
              sources: sources.length > 0 ? sources : undefined,
              usage: { promptTokens, completionTokens },
            })}\n\n`
          )
        );
        controller.close();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        const errorMsg = err?.message || "An error occurred";
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: { content: errorMsg, status: "ERROR" },
        });

        await logUserAuditEvent({
          clerkUserId: userId,
          event: "chat.error",
          details: { conversationId, error: errorMsg },
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
        );
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
