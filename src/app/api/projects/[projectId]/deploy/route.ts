import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/inngest/client';
import prisma from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const deployContractSchema = z.object({
  buildJobId: z.string(),
  contractAddress: z.string().optional(),
  transactionHash: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Ownership check
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const rl = await checkRateLimit(`project:${userId}`, RATE_LIMITS.project);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const validatedData = deployContractSchema.parse({ ...body, projectId });

    // Verify the build job belongs to this project
    const buildJob = await prisma.buildJob.findUnique({
      where: { id: validatedData.buildJobId },
      select: { projectId: true },
    });
    if (!buildJob || buildJob.projectId !== projectId) {
      return NextResponse.json({ error: 'Build job not found' }, { status: 404 });
    }

    // Update the build job with deployment info
    await prisma.buildJob.update({
      where: { id: validatedData.buildJobId },
      data: {
        status: 'COMPLETED',
        contractAddress: validatedData.contractAddress,
        transactionHash: validatedData.transactionHash,
      },
    });

    // Also update the project with the contract address for easier access
    if (validatedData.contractAddress) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          contractAddress: validatedData.contractAddress,
        },
      });
    }

    // Trigger verification if contract address is provided
    if (validatedData.contractAddress) {
      await inngest.send({
        name: 'contract/verify',
        data: {
          buildJobId: validatedData.buildJobId,
          contractAddress: validatedData.contractAddress,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deploying contract:', error);
    return NextResponse.json(
      { error: 'Failed to deploy contract' },
      { status: 500 }
    );
  }
}
