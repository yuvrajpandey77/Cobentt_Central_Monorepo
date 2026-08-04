import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

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
