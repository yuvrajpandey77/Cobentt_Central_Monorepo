/**
 * Project ownership verification helper.
 *
 * Used by API routes that accept a projectId parameter to verify
 * the authenticated user owns the project (or it's public).
 */
import prisma from "@/lib/db";

export async function verifyProjectOwnership(
  projectId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true, isPublic: true },
  });

  if (!project) {
    return { allowed: false, reason: "Project not found" };
  }

  if (project.userId !== userId && !project.isPublic) {
    return { allowed: false, reason: "Forbidden" };
  }

  return { allowed: true };
}
