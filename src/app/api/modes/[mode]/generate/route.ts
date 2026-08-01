import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { enforceQuota } from "@/lib/quota-enforcement";
import { recordTokenUsage } from "@/lib/token-usage";
import { chatCompletion } from "@/lib/ai/client";
import { getProviderConfig } from "@/lib/ai/provider";
import { parseArtifact, buildModePrompt, extractJson } from "@/lib/modes/prompt";
import { MODE_DEFINITIONS } from "@/lib/modes/definitions";

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

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, message } = await req.json();
    if (!conversationId || !message || typeof message !== "string") {
      return NextResponse.json({ error: "conversationId and message required" }, { status: 400 });
    }
    if (message.length > 10000) {
      return NextResponse.json({ error: "message too long" }, { status: 413 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true, model: true, template: true, messages: { orderBy: { createdAt: "desc" }, take: 8 } },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Quota check (estimate: 6000 tokens for mode generation)
    await enforceQuota(userId, 6000);

    const history = [...conversation.messages].reverse().map((m) => ({
      role: m.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = buildModePrompt(mode as any, message, conversation.template ?? undefined);
    const cfg = getProviderConfig();

    const response = await chatCompletion({
      model: conversation.model || cfg.defaultModel,
      maxTokens: 8000,
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

    // Create assistant message + fragment for this mode artifact
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        content: `Generated ${((MODE_DEFINITIONS[mode] as unknown as { label?: string } | undefined)?.label) ?? mode} from your request.`,
        role: "ASSISTANT",
        type: "RESULT",
        status: "COMPLETE",
        modelUsed: conversation.model || cfg.defaultModel,
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

    if (userId && usage) {
      await recordTokenUsage({
        userId,
        provider: "OPENAI",
        model: conversation.model || cfg.defaultModel,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        endpoint: `/api/modes/${mode}/generate`,
      });
    }

    return NextResponse.json({ ok: true, artifact });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error(`[modes/${req.url}] generation error:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
