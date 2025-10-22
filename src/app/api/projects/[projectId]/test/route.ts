import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { inngest } from '@/inngest/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { projectId } = resolvedParams;
    
    const body = await request.json();
    const { contractCode, contractName, contractType } = body;

    if (!contractCode) {
      return NextResponse.json(
        { error: 'Contract code is required' },
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
