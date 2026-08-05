import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { verifyProjectOwnership } from '@/lib/project-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const session = await auth();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownership = await verifyProjectOwnership(projectId, session.userId);
    if (!ownership.allowed) {
      return NextResponse.json({ error: ownership.reason }, { status: ownership.reason === 'Project not found' ? 404 : 403 });
    }

    const body = await request.json();
    const { files } = body;

    if (!files || typeof files !== 'object') {
      return NextResponse.json(
        { error: 'Files object is required' },
        { status: 400 }
      );
    }

    console.log('💾 Saving codebase files for project:', projectId);
    console.log('📁 Files to save:', Object.keys(files));

    // Get the latest build job for this project
    const buildJob = await prisma.buildJob.findFirst({
      where: {
        projectId: projectId,
        type: 'GENERATE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!buildJob) {
      return NextResponse.json(
        { error: 'No build job found' },
        { status: 404 }
      );
    }

    // Get or create sandbox
    let sandboxId = buildJob.sandboxId;
    let sandbox;
    
    if (!sandboxId || sandboxId === 'undefined') {
      console.log('Creating new sandbox for saving files...');
      sandbox = await Sandbox.create("solidity-foundry-template");
      sandboxId = sandbox.sandboxId;
      
      // Update build job with sandbox ID
      await prisma.buildJob.update({
        where: { id: buildJob.id },
        data: { sandboxId: sandboxId },
      });
    } else {
      try {
        sandbox = await Sandbox.connect(sandboxId);
      } catch (error) {
        console.log('Failed to connect to existing sandbox, creating new one...');
        sandbox = await Sandbox.create("solidity-foundry-template");
        sandboxId = sandbox.sandboxId;
        
        await prisma.buildJob.update({
          where: { id: buildJob.id },
          data: { sandboxId: sandboxId },
        });
      }
    }

    // Save all files to the sandbox
    const savedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      try {
        const fullPath = `/home/user/hello_template/${filePath}`;
        
        // Create directory if it doesn't exist
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (dirPath !== '/home/user/hello_template') {
          await sandbox.commands.run(`mkdir -p "${dirPath}"`);
        }
        
        // Write file content
        await sandbox.files.write(fullPath, content as string);
        savedFiles.push(filePath);
        console.log(`✅ Saved file: ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to save file ${filePath}:`, error);
        failedFiles.push(filePath);
      }
    }

    // Update build job artifacts with the complete codebase
    const existingArtifacts = buildJob.artifacts && typeof buildJob.artifacts === 'object' 
      ? buildJob.artifacts as Record<string, any>
      : {};
      
    const updatedArtifacts = {
      ...existingArtifacts,
      codebase: files, // Store the complete file structure
      savedFiles: savedFiles,
      failedFiles: failedFiles,
      lastSaved: new Date().toISOString(),
    };

    await prisma.buildJob.update({
      where: { id: buildJob.id },
      data: {
        artifacts: updatedArtifacts,
      },
    });

    console.log('💾 Codebase saved successfully:', {
      totalFiles: Object.keys(files).length,
      savedFiles: savedFiles.length,
      failedFiles: failedFiles.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Codebase saved successfully',
      savedFiles: savedFiles,
      failedFiles: failedFiles,
      totalFiles: Object.keys(files).length,
      sandboxId: sandboxId,
    });

  } catch (error) {
    console.error('❌ Error saving codebase:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save codebase',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
