import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const resolvedParams: any = (params as any)?.then ? await (params as any) : params;
    const { projectId } = resolvedParams as { projectId: string };
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

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

