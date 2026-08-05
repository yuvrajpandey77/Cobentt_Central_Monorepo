import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { verifyProjectOwnership } from '@/lib/project-auth';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownership = await verifyProjectOwnership(projectId, session.userId);
    if (!ownership.allowed) {
      return NextResponse.json({ error: ownership.reason }, { status: ownership.reason === 'Project not found' ? 404 : 403 });
    }

    const rl = await checkRateLimit(`project:${session.userId}`, RATE_LIMITS.project);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const buildJobs = await prisma.buildJob.findMany({
      where: {
        projectId: projectId,
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ buildJobs });
  } catch (error) {
    console.error('Error fetching build jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch build jobs' },
      { status: 500 }
    );
  }
}
