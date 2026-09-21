import prisma from "@/lib/db";
import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/models";
import { chatCompletion } from "@/lib/ai/client";
import type { ChatMessage } from "@/lib/ai/client";
import { estimateTokens } from "@/lib/token-estimator";
import { logUserAuditEvent } from "@/lib/user-audit";
import { runAIPipeline, recordAITokens } from "@/lib/ai/pipeline";
import { resolveByokCredential, ByokError } from "@/lib/byok";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const { message, model: reqModel, sources: reqSources, attachmentIds } = await req.json();

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

  // BYOK: resolve the caller's own key before spending anything.
  let credential;
  try {
    credential = await resolveByokCredential(userId, model);
  } catch (err) {
    if (err instanceof ByokError) {
      return new Response(
        JSON.stringify({ error: err.message, code: err.code }),
        { status: err.status, headers: { "Content-Type": "application/json" } }
      );
    }
    throw err;
  }
  const sources = Array.isArray(reqSources) ? reqSources : [];

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { role: true, content: true },
  });

  // The current user message is persisted before streaming, so the last
  // history entry is this same message. Drop it to avoid feeding the model
  // a duplicate; the current message is appended below.
  if (history.length > 0 && history[history.length - 1].role === "USER") {
    history.pop();
  }

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

            // Persist refs onto the latest user message so the sent bubble can
            // echo the attachment pills (the fresh-conversation path creates
            // the message before queued files are uploaded, so it has no refs).
            const refs = await prisma.attachment.findMany({
              where: { id: { in: attachmentIds }, conversationId },
              select: { id: true, fileName: true, size: true },
            });
            if (refs.length > 0) {
              const latestUser = await prisma.message.findFirst({
                where: { conversationId, role: "USER" },
                orderBy: { createdAt: "desc" },
                select: { id: true },
              });
              if (latestUser) {
                await prisma.message.update({
                  where: { id: latestUser.id },
                  data: {
                    attachments: refs.map((a) => ({ id: a.id, fileName: a.fileName, size: a.size })),
                  },
                });
              }
            }
          } catch (err) {
            console.warn("[chat/stream] attachment context load failed:", err);
          }
        }

        const userContent = attachmentContext
          ? `The user attached one or more files. Use their content as source material for the question below.\n\nAttached files:\n${attachmentContext}\n\nUser question:\n${sanitizedMessage}`
          : sanitizedMessage;

        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({
            role: (m.role.toLowerCase() === "assistant"
              ? "assistant"
              : "user") as ChatMessage["role"],
            content: m.content,
          })),
          { role: "user", content: userContent },
        ];

        const start = Date.now();
        const response = await chatCompletion({
          model: credential.model,
          credential,
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
