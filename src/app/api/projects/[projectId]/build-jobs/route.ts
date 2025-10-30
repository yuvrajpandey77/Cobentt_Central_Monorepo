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
    console.log('🔍 Fetching build jobs for project:', projectId);
    
    const buildJobs = await prisma.buildJob.findMany({
      where: {
        projectId: projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('📦 Found build jobs:', buildJobs.length);
    if (buildJobs.length > 0) {
      const latestJob = buildJobs[0];
      console.log('🔍 Latest job details:', {
        jobId: latestJob.id,
        status: latestJob.status,
        contractAddress: latestJob.contractAddress,
        transactionHash: latestJob.transactionHash,
        hasArtifacts: !!latestJob.artifacts,
        artifactsType: typeof latestJob.artifacts,
        artifactsKeys: latestJob.artifacts ? Object.keys(latestJob.artifacts as any) : [],
        abiLength: (latestJob.artifacts as any)?.abi?.length || 0,
        bytecodeLength: (latestJob.artifacts as any)?.bytecode?.length || 0
      });
    }

    return NextResponse.json({ buildJobs });
  } catch (error) {
    console.error('Error fetching build jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch build jobs' },
      { status: 500 }
    );
  }
}
