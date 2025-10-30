import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        buildJobs: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Project API - returning project:', {
      projectId: project.id,
      projectName: project.name,
      contractAddress: project.contractAddress,
      buildJobsCount: project.buildJobs?.length || 0,
      latestBuildJob: project.buildJobs?.[0] ? {
        id: project.buildJobs[0].id,
        status: project.buildJobs[0].status,
        contractAddress: project.buildJobs[0].contractAddress,
        transactionHash: project.buildJobs[0].transactionHash
      } : null
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

