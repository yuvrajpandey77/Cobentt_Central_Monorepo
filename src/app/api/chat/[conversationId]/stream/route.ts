import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { DEFAULT_MODEL } from "@/lib/models";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.userId },
    select: { id: true, model: true },
  });
  if (!conversation) {
    return new Response("Not found", { status: 404 });
  }

  const { message, model: reqModel, sources: reqSources } = await req.json();
  if (!message || typeof message !== "string") {
    return new Response("Message required", { status: 400 });
  }

  const model = typeof reqModel === "string" ? reqModel : (conversation.model || DEFAULT_MODEL);
  const sources = Array.isArray(reqSources) ? reqSources : [];

  // Get message history for context (last 6)
  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 6,
    select: { role: true, content: true },
  });

  // Create the assistant message in streaming state
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
        // Send assistant message id so frontend can track the streaming message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ messageId: assistantMessage.id })}\n\n`));

        const systemPrompt = "You are Cobentt, an AI assistant built by Cogerphere AI Labs. You help users with coding, development, and general questions. Be concise, helpful, and accurate. When sharing code, use markdown code blocks with proper language tags.";

        const messages = [
          { role: "system", content: systemPrompt },
          ...history.map((m) => ({ role: m.role.toLowerCase(), content: m.content })),
          { role: "user", content: message },
        ];

        const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
        const baseUrl = process.env.OPENROUTER_API_KEY
          ? "https://openrouter.ai/api/v1"
          : "https://api.openai.com/v1";

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(process.env.OPENROUTER_API_KEY ? {
              "HTTP-Referer": "https://cobentt.com",
              "X-Title": "Cobentt",
            } : {}),
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API error (${response.status}): ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        let fullContent = "";
        let fullThinking = "";
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
              const token = delta.content || "";
              const reasoning = delta.reasoning || delta.reasoning_content || "";
              if (token) {
                fullContent += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
              if (reasoning) {
                fullThinking += reasoning;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`));
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        // Persist the full response with thinking and sources
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullContent,
            status: "COMPLETE",
            thinking: fullThinking || undefined,
            sources: sources.length > 0 ? sources : undefined,
          },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, model, thinking: fullThinking || undefined, sources: sources.length > 0 ? sources : undefined })}\n\n`));
        controller.close();
      } catch (err: any) {
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: err.message || "An error occurred",
            status: "ERROR",
          },
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
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
