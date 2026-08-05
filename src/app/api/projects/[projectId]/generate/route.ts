import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import prisma from '@/lib/db';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyProjectOwnership } from '@/lib/project-auth';

export const dynamic = 'force-dynamic';

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
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting: 15 requests per minute per user (AI generation is expensive)
    const rateLimit = await checkRateLimit(`ai:generate:${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
      );
    }

    const { projectId } = await params;

    const ownership = await verifyProjectOwnership(projectId, userId);
    if (!ownership.allowed) {
      return NextResponse.json({ error: ownership.reason }, { status: ownership.reason === 'Project not found' ? 404 : 403 });
    }

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
        userId, // Add userId for token tracking
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
