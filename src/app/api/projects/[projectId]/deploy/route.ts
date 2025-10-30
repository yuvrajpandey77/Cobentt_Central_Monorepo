import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import prisma from '@/lib/db';
import { z } from 'zod';

// Ensure this API route is always dynamic (avoid static path generation attempts)
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
    const { projectId } = await params;
    const body = await request.json();
    const validatedData = deployContractSchema.parse({ ...body, projectId });

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
