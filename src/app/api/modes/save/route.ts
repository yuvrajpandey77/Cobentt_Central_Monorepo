import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_MODES = ["slides", "document", "sheet", "deep-research"];
const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`default:${userId}`, RATE_LIMITS.default);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { fragmentId, mode, artifact } = body;
    if (!fragmentId || !artifact) {
      return NextResponse.json({ error: "fragmentId and artifact required" }, { status: 400 });
    }
    if (mode && !VALID_MODES.includes(mode as string)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    const artifactSize =
      typeof artifact === "string"
        ? Buffer.byteLength(artifact, "utf8")
        : JSON.stringify(artifact)?.length ?? 0;
    if (artifactSize > MAX_ARTIFACT_BYTES) {
      return NextResponse.json({ error: "Artifact too large" }, { status: 413 });
    }

    const fragment = await prisma.fragment.findUnique({
      where: { id: fragmentId },
      include: { message: { include: { conversation: true } } },
    });

    if (!fragment || fragment.message.conversation?.userId !== userId) {
      return NextResponse.json({ error: "Fragment not found" }, { status: 404 });
    }

    const files = (fragment.files as Record<string, unknown>) ?? {};
    files.artifact = artifact;

    const updated = await prisma.fragment.update({
      where: { id: fragmentId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        files: files as any,
        ...(mode ? { mode: mode as string } : {}),
      },
    });

    return NextResponse.json({ ok: true, fragment: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 500 });
  }
}
