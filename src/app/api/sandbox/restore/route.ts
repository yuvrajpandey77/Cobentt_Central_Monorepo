import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Sandbox } from "@e2b/code-interpreter";
import { SANDBOX_TIMEOUT } from "@/inngest/types";

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { fragmentId } = await req.json();
    if (!fragmentId) {
      return NextResponse.json({ error: "fragmentId required" }, { status: 400 });
    }

    const fragment = await prisma.fragment.findUnique({
      where: { id: fragmentId },
    } as any);

    const files = (fragment?.files || {}) as Record<string, string>;
    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No files to restore for this fragment" }, { status: 404 });
    }

    // Enforce per-user daily restore limit (30/day)
    const message = await prisma.message.findUnique({
      where: { id: fragment?.messageId },
      select: { projectId: true },
    } as any);
    const projectId: string | undefined = message?.projectId;
    if (!projectId) {
      return NextResponse.json({ error: "Invalid fragment: missing project" }, { status: 400 });
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    } as any);
    if (!project?.userId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const restoresToday = await prisma.message.count({
      where: {
        project: { userId: project.userId },
        content: "SANDBOX_RESTORE_LOG",
        createdAt: { gte: since },
      },
    } as any);
    if (restoresToday >= 30) {
      return NextResponse.json({ error: "Daily restore limit reached (30/day). Try again later." }, { status: 429 });
    }

    const sandbox = await Sandbox.create("cogerphereailabsbeta1");
    await sandbox.setTimeout(SANDBOX_TIMEOUT);
    for (const [path, content] of Object.entries(files)) {
      await sandbox.files.write(path, content);
    }
    const host = sandbox.getHost(3000);
    const sandboxUrl = `https://${host}`;

    // Persist new URL so future loads use it
    try {
      await (prisma as any).fragment.update({
        where: { id: fragmentId },
        data: { sandboxUrl },
      });
    } catch {}

    // Log the restore as a message (used for daily limit accounting)
    try {
      await (prisma as any).message.create({
        data: {
          projectId,
          role: "ASSISTANT",
          type: "RESULT",
          content: "SANDBOX_RESTORE_LOG",
        },
      });
    } catch {}

    return NextResponse.json({ sandboxUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Restore failed" }, { status: 500 });
  }
}


