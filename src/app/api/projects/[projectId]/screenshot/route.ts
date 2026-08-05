import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { verifyProjectOwnership } from "@/lib/project-auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  if (!projectId) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const session = await auth();
  if (!session?.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ownership = await verifyProjectOwnership(projectId, session.userId);
  if (!ownership.allowed) {
    return new NextResponse(ownership.reason, { status: ownership.reason === 'Project not found' ? 404 : 403 });
  }

  const rl = await checkRateLimit(`project:${session.userId}`, RATE_LIMITS.project);
  if (!rl.success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    // Cast select to any to accommodate fields added in upcoming migration without typegen yet
    select: { screenshot: true, screenshotMime: true, updatedAt: true } as any,
  });

  const anyProject = project as any;
  if (!anyProject || !anyProject.screenshot || !anyProject.screenshotMime) {
    // Optional tiny SVG placeholder (transparent)
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'></svg>`;
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  }

  const etag = `W/"${(anyProject.updatedAt as Date).getTime()}-${anyProject.screenshot.byteLength}"`;

  const headers: Record<string, string> = {
    "Content-Type": anyProject.screenshotMime,
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    ETag: etag,
  };

  return new NextResponse(anyProject.screenshot as unknown as BodyInit, {
    status: 200,
    headers,
  });
}


