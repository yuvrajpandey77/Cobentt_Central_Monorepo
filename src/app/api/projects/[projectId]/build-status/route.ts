import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
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

