import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_MODES = ["slides", "document", "sheet", "deep-research"];
const VALID_FORMATS = ["pptx", "docx", "xlsx", "pdf"];
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mode: string }> }
) {
  try {
    const { mode } = await params;
    if (!VALID_MODES.includes(mode)) {
      return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`default:${userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { format, artifact, conversationId } = body;
    if (!VALID_FORMATS.includes(format)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }
    if (!artifact) {
      return NextResponse.json({ error: "artifact required" }, { status: 400 });
    }
    const artifactSize =
      typeof artifact === "string"
        ? Buffer.byteLength(artifact, "utf8")
        : JSON.stringify(artifact)?.length ?? 0;
    if (artifactSize > MAX_ARTIFACT_BYTES) {
      return NextResponse.json({ error: "Artifact too large" }, { status: 413 });
    }

    if (typeof conversationId === "string" && conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    }

    const parsed: { title?: string } = typeof artifact === "string" ? JSON.parse(artifact) : artifact;

    if (mode === "slides" && format === "pptx") {
      const { buildPptx } = await import("./pptx");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await buildPptx(parsed as any);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(parsed.title || "deck")}.pptx"`,
        },
      });
    }

    if (mode === "document" && format === "docx") {
      const { buildDocx } = await import("./docx");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await buildDocx(parsed as any);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(parsed.title || "document")}.docx"`,
        },
      });
    }

    if (mode === "sheet" && format === "xlsx") {
      const { buildXlsx } = await import("./xlsx");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await buildXlsx(parsed as any);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(parsed.title || "sheet")}.xlsx"`,
        },
      });
    }

    if (mode === "deep-research" && format === "pdf") {
      const { buildResearchPdf } = await import("./pdf");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buffer = await buildResearchPdf(parsed as any);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(parsed.title || "research")}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Format not supported for this mode" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[modes/export] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed" }, { status: 500 });
  }
}
