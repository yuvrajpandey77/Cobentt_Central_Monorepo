import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { extractAttachmentText } from "@/lib/attachments/extract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".xls",
  ".txt",
  ".md",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const conversationId = form.get("conversationId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (typeof conversationId !== "string" || !conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const rl = await checkRateLimit(`attachment:${session.userId}`, RATE_LIMITS.upload);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 413 });
    }

    const lowerName = file.name.toLowerCase();
    const ext = `.${lowerName.split(".").pop() ?? ""}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type "${ext || "unknown"}"` },
        { status: 415 }
      );
    }

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId: session.userId },
      select: { id: true },
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const buffer = await file.arrayBuffer();

    // Extract text for supported document types; images fall through (null)
    const extractedText = await extractAttachmentText(buffer, file.type, file.name);

    const attachment = await prisma.attachment.create({
      data: {
        conversationId,
        userId: session.userId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        blob: Buffer.from(buffer),
        extractedText,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        extractedText: true,
      },
    });

    return NextResponse.json({ attachment });
  } catch (error: unknown) {
    console.error("[attachments/upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
