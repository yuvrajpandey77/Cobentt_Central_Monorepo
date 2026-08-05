import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { chatCompletion } from "@/lib/ai/client";
import { getProviderConfig } from "@/lib/ai/provider";
import { parseArtifact, buildModePrompt, extractJson } from "@/lib/modes/prompt";
import { MODE_DEFINITIONS } from "@/lib/modes/definitions";
import { runAIPipeline, recordAITokens, aiErrorResponse } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MODES_WITH_ROUTE = ["slides", "document", "sheet", "deep-research"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode } = await params;
    if (!MODES_WITH_ROUTE.includes(mode)) {
      return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const { conversationId, message, currentArtifact } = await req.json();

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
    const cfg = getProviderConfig();
    const model = conversation.model || cfg.defaultModel;
    const start = Date.now();

    const response = await chatCompletion({
      model,
      maxTokens: 3500,
      messages: [
        {
          role: "system",
          content: "You are Cobentt, an expert AI content builder. Always respond with valid JSON only.",
        },
        ...history,
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage;

    if (!content) {
      throw new Error("Empty AI response");
    }

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
    } else {
      const assistantMessage = await prisma.message.create({
        data: {
          conversationId,
          content: `Generated ${((MODE_DEFINITIONS[mode] as unknown as { label?: string } | undefined)?.label) ?? mode} from your request.`,
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
    if (usage) {
      await recordAITokens({
        userId,
        model,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: `/api/modes/${mode}/generate`,
        durationMs: Date.now() - start,
      });
    }

    return NextResponse.json({ ok: true, artifact });
  } catch (error: unknown) {
    return aiErrorResponse(error, "Generation failed");
  }
}
