import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  // In app router, `params` is a plain object, not a Promise
  { params }: { params: { projectId: string } }
) {
  try {
    // Support both Next.js behaviors: params as object or as Promise (dev warnings)
    const resolvedParams: any = (params as any)?.then ? await (params as any) : params;
    const { projectId } = resolvedParams as { projectId: string };
    
    // Get the latest build job for this project
    const buildJob = await prisma.buildJob.findFirst({
      where: {
        projectId: projectId,
        type: 'GENERATE', // Only get generation jobs
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
        logsArray = [buildJob.logs]; // If not JSON, treat as single log
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

