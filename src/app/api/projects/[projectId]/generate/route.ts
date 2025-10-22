import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import prisma from '@/lib/db';
import { z } from 'zod';

const generateContractSchema = z.object({
  projectId: z.string(),
  contractType: z.enum(['ERC20', 'ERC721', 'ERC1155', 'PAYMENT_SPLITTER', 'CUSTOM']),
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenSupply: z.string().optional(),
  decimals: z.string().optional(),
  features: z.array(z.string()).default([]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const validatedData = generateContractSchema.parse({ ...body, projectId });

    // Create a build job
    const buildJob = await prisma.buildJob.create({
      data: {
        projectId: validatedData.projectId,
        type: 'GENERATE',
        status: 'PENDING',
      },
    });

    // Trigger the contract generation job
    await inngest.send({
      name: 'contract/generate',
      data: {
        buildJobId: buildJob.id,
        ...validatedData,
      },
    });

    return NextResponse.json({ 
      success: true, 
      buildJobId: buildJob.id 
    });
  } catch (error) {
    console.error('Error generating contract:', error);
    return NextResponse.json(
      { error: 'Failed to generate contract' },
      { status: 500 }
    );
  }
}
