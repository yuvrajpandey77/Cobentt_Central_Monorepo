import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/db";
import { Sandbox } from "@e2b/code-interpreter";
import { SANDBOX_TIMEOUT } from "@/inngest/types";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`sandbox:restore:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { fragmentId } = await req.json();
    if (!fragmentId) {
      return NextResponse.json({ error: "fragmentId required" }, { status: 400 });
    }

    const fragment = await prisma.fragment.findUnique({
      where: { id: fragmentId },
      select: { files: true, messageId: true },
    });

    const files = (fragment?.files || {}) as Record<string, string>;
    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No files to restore" }, { status: 404 });
    }

    const message = await prisma.message.findUnique({
      where: { id: fragment?.messageId || "" },
      select: { projectId: true },
    });
    const projectId = message?.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Invalid fragment" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const restoresToday = await prisma.message.count({
      where: {
        project: { userId: session.userId },
        content: "SANDBOX_RESTORE_LOG",
        createdAt: { gte: since },
      },
    });
    if (restoresToday >= 30) {
      return NextResponse.json(
        { error: "Daily restore limit (30/day) reached" },
        { status: 429 }
      );
    }

    const sandbox = await Sandbox.create("cogerphereailabsbeta1");
    await sandbox.setTimeout(SANDBOX_TIMEOUT);
    for (const [path, content] of Object.entries(files)) {
      await sandbox.files.write(path, content);
    }
    const host = sandbox.getHost(3000);
    const sandboxUrl = `https://${host}`;

    try {
      await prisma.fragment.update({
        where: { id: fragmentId },
        data: { sandboxUrl },
      });
    } catch {
      // Non-critical
    }

    try {
      await prisma.message.create({
        data: {
          projectId,
          role: "ASSISTANT",
          type: "RESULT",
          content: "SANDBOX_RESTORE_LOG",
        },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ sandboxUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Restore failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
