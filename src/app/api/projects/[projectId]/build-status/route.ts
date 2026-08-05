import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { verifyProjectOwnership } from '@/lib/project-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    // Get the latest build job for this project
    const buildJob = await prisma.buildJob.findFirst({
      where: {
        projectId: projectId,
        type: 'GENERATE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!buildJob) {
      return NextResponse.json(
        { error: 'No build job found' },
        { status: 404 }
      );
    }

    // Parse logs if they exist
    let logsArray: string[] = [];
    if (buildJob.logs) {
      try {
        logsArray = JSON.parse(buildJob.logs);
      } catch {
        logsArray = [buildJob.logs];
      }
    }

    return NextResponse.json({
      id: buildJob.id,
      status: buildJob.status,
      progress: buildJob.progress,
      currentStep: buildJob.currentStep,
      logs: logsArray,
      artifacts: buildJob.artifacts,
      createdAt: buildJob.createdAt,
      updatedAt: buildJob.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching build status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch build status' },
      { status: 500 }
    );
  }
}

