import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/attachments/[id]
 * Serves an uploaded attachment blob (ownership-checked) so user uploads —
 * including images — can be used as real presentation assets in slides,
 * present view, and exports.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const rl = await checkRateLimit(`attachment:${userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }
    const { id } = await params;
    const att = await prisma.attachment.findFirst({
      where: { id, userId },
      select: { blob: true, mimeType: true, fileName: true, size: true },
    });
    if (!att) {
      return NextResponse.json({ error: "Attachment not found", code: "NOT_FOUND" }, { status: 404 });
    }
    return new Response(new Uint8Array(Buffer.from(att.blob)), {
      headers: {
        "Content-Type": att.mimeType || "application/octet-stream",
        "Content-Length": String(att.size),
        "Content-Disposition": `inline; filename="${encodeURIComponent(att.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[attachments/get] unhandled:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Service temporarily unavailable", code: "INTERNAL" }, { status: 503 });
  }
}
