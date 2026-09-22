import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/modes/slides/present?conversationId=...
 *
 * Serves the stored `slides.html` representation inline so a deck can be
 * presented in a new browser tab. Falls back to rebuilding from the JSON
 * artifact (the source of truth) when the stored copy is missing.
 *
 * Success returns `text/html` (a presentation document, not API data);
 * every failure returns JSON so callers can distinguish them.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required", code: "BAD_REQUEST" }, { status: 400 });
    }

    const rl = await checkRateLimit(`present:${userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 10,
          // Note: Message.fragments is a singular optional relation.
          select: { fragments: { select: { files: true, updatedAt: true } } },
        },
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const fragments = conversation.messages
      .map((m) => m.fragments)
      .filter((f): f is NonNullable<typeof f> => f !== null);
    let html: string | null = null;
    let artifact: unknown = null;
    for (const f of fragments) {
      const files = (f.files ?? {}) as Record<string, unknown>;
      if (typeof files["slides.html"] === "string" && files["slides.html"]) {
        html = files["slides.html"] as string;
        break;
      }
      if (!artifact && files.artifact) {
        try {
          artifact = typeof files.artifact === "string" ? JSON.parse(files.artifact) : files.artifact;
        } catch {
          /* keep looking */
        }
      }
    }

    if (!html && artifact) {
      const { buildDeckHtml } = await import("../../[mode]/export/html");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      html = buildDeckHtml(artifact as any);
    }

    if (!html) {
      return NextResponse.json({ error: "No deck yet. Generate slides first.", code: "EMPTY" }, { status: 404 });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Served inline for presentation. The deck is static CSS with no
        // scripts or external resources; lock it down accordingly. All dynamic
        // values are HTML-escaped by buildDeckHtml.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[slides/present] unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Retry in a moment.", code: "INTERNAL" },
      { status: 503 }
    );
  }
}
