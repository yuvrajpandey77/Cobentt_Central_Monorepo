import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/db';
import { inngest } from '@/inngest/client';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 20 requests per minute per user
    const rateLimit = await checkRateLimit(`test:${userId}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
      );
    }

    const resolvedParams = await params;
    const { projectId } = resolvedParams;

    // Ownership check
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contractCode, contractName, contractType } = body;

    if (!contractCode || typeof contractCode !== 'string') {
      return NextResponse.json(
        { error: 'Contract code is required' },
        { status: 400 }
      );
    }

    // Basic input sanitization
    if (contractCode.length > 100000) {
      return NextResponse.json(
        { error: 'Contract code exceeds maximum length' },
        { status: 400 }
      );
    }

    // Create a test job
    const testJob = await prisma.buildJob.create({
      data: {
        projectId,
        type: 'COMPILE',
        status: 'PENDING',
        progress: 0,
        currentStep: 'Starting test suite...',
        logs: JSON.stringify(['Test job initiated']),
        artifacts: {
          contractCode,
          contractName: contractName || 'Token',
          contractType: contractType || 'ERC20',
          testMode: true,
        },
      },
    });

    // Send test event to Inngest
    await inngest.send({
      name: 'test-contract',
      data: {
        buildJobId: testJob.id,
        projectId,
        userId, // Include userId for token tracking
        contractCode,
        contractName: contractName || 'Token',
        contractType: contractType || 'ERC20',
      },
    });

    return NextResponse.json({
      success: true,
      testJobId: testJob.id,
      message: 'Test suite started successfully',
    });

  } catch (error) {
    console.error('Error starting test suite:', error);
    return NextResponse.json(
      { error: 'Failed to start test suite' },
      { status: 500 }
    );
  }
}
