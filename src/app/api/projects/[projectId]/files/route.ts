import { NextRequest, NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';
import prisma from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { verifyProjectOwnership } from '@/lib/project-auth';

export const dynamic = 'force-dynamic';

export async function GET(
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
    
    // Get the latest build job to find the sandbox ID
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

    // Extract sandbox ID from build job logs or create a new one
    let sandboxId = (buildJob as any).sandboxId;
    let sandbox;
    
    if (!sandboxId || sandboxId === 'undefined') {
      // If no sandbox ID, create a new sandbox to read files
      console.log('No sandbox ID found, creating new sandbox to read files...');
      try {
        sandbox = await Sandbox.create("solidity-foundry-template");
        sandboxId = sandbox.sandboxId;
        
        // Update build job with sandbox ID
        await prisma.buildJob.update({
          where: { id: buildJob.id },
          data: { sandboxId: sandboxId } as any,
        });
        
        console.log('✅ Created new sandbox:', sandboxId);
      } catch (error) {
        console.error('❌ Failed to create new sandbox:', error);
        return NextResponse.json(
          { error: 'Failed to create sandbox for file access' },
          { status: 500 }
        );
      }
    } else {
      // Try to connect to existing sandbox
      try {
        console.log('🔍 Connecting to existing E2B sandbox:', sandboxId);
        sandbox = await Sandbox.connect(sandboxId);
        console.log('✅ Successfully connected to existing sandbox');
      } catch (error) {
        console.log('⚠️ Failed to connect to existing sandbox, creating new one...');
        try {
          sandbox = await Sandbox.create("solidity-foundry-template");
          sandboxId = (sandbox as any).id;
          
          // Update build job with new sandbox ID
          await prisma.buildJob.update({
            where: { id: buildJob.id },
            data: { sandboxId: sandboxId } as any,
          });
          
          console.log('✅ Created replacement sandbox:', sandboxId);
        } catch (createError) {
          console.error('❌ Failed to create replacement sandbox:', createError);
          return NextResponse.json(
            { error: 'Failed to create sandbox for file access' },
            { status: 500 }
          );
        }
      }
    }
    
    // Get all files from the hello_template directory
    const files: { [path: string]: string } = {};
    
    try {
      // List only relevant files (exclude lib directory and other dependencies)
      // Use a simpler find command that works reliably in the sandbox
      const listResult = await sandbox.commands.run("find /home/user/hello_template -type f -name '*.sol' ! -path '*/lib/*' ! -path '*/out/*' -o -type f -name '*.json' ! -path '*/lib/*' ! -path '*/out/*' -o -type f -name '*.toml' ! -path '*/lib/*' ! -path '*/out/*' -o -type f -name '*.txt' ! -path '*/lib/*' ! -path '*/out/*' -o -type f -name '*.md' ! -path '*/lib/*' ! -path '*/out/*' | head -20");
      const filePaths = listResult.stdout.trim().split('\n').filter(path => path.trim());
      
      console.log('📁 Found relevant files:', filePaths);
      
      // Read each file
      for (const filePath of filePaths) {
        try {
          const content = await sandbox.files.read(filePath);
          // Convert absolute path to relative path for display
          const relativePath = filePath.replace('/home/user/hello_template/', '');
          files[relativePath] = content;
        } catch (fileError) {
          console.log(`⚠️ Could not read file ${filePath}:`, fileError);
        }
      }
      
      // Also try to read common directories (excluding lib and out)
      const commonPaths = [
        'src',
        'test',
        'script',
        'foundry.toml',
        'remappings.txt',
        'README.md'
      ];
      
      for (const path of commonPaths) {
        try {
          const fullPath = `/home/user/hello_template/${path}`;
          const content = await sandbox.files.read(fullPath);
          files[path] = content;
        } catch (error) {
          // File doesn't exist, continue
        }
      }
      
      // If no files found, try to recreate the contract from build job artifacts
      if (Object.keys(files).length === 0) {
        console.log('📂 No files found, checking build job artifacts...');
        
        // First check if we have a saved codebase
        const artifacts = buildJob.artifacts as any;
        if (artifacts?.codebase) {
          console.log('📁 Found saved codebase in artifacts, using it...');
          Object.assign(files, artifacts.codebase);
          console.log('✅ Loaded codebase from artifacts:', Object.keys(files));
        } else if (artifacts?.sourceCode) {
          console.log('📂 No saved codebase, recreating from individual artifacts...');
          
          // Try to get contract code from build job artifacts
          const contractName = artifacts.contractName || 'Token';
          files[`src/${contractName}.sol`] = artifacts.sourceCode;
          console.log('✅ Recreated contract file from artifacts');
        }
        
        // Add ABI and bytecode if available
        if (artifacts?.abi) {
          files['artifacts/abi.json'] = JSON.stringify(artifacts.abi, null, 2);
        }
        
        if (artifacts?.bytecode) {
          files['artifacts/bytecode.txt'] = artifacts.bytecode;
        }
        
        // Add common Foundry files
        files['foundry.toml'] = `[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.20"

[profile.default.optimizer]
enabled = true
runs = 200

[profile.default.fuzz]
runs = 1000

[profile.default.invariant]
runs = 256
depth = 15
fail_on_revert = false
`;

        files['remappings.txt'] = `@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
forge-std/=lib/forge-std/src/
`;

        files['README.md'] = `# Smart Contract

This is a smart contract generated by Cobentt.

## Contract Details
- **Name**: ${artifacts?.contractName || 'Token'}
- **Type**: ${artifacts?.contractType || 'ERC20'}

## Files
- \`src/${artifacts?.contractName || 'Token'}.sol\` - Main contract source code
- \`artifacts/abi.json\` - Contract ABI
- \`artifacts/bytecode.txt\` - Contract bytecode

## Usage
This contract was generated using Foundry. You can compile and test it using:

\`\`\`bash
forge build
forge test
\`\`\`
`;

        console.log('📁 Recreated file structure from build job artifacts');
      }
      
    } catch (error) {
      console.error('❌ Error reading files from sandbox:', error);
      return NextResponse.json(
        { error: 'Failed to read files from sandbox' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully fetched files:', Object.keys(files));
    
    return NextResponse.json({
      success: true,
      files: files,
      sandboxId: sandboxId,
      fileCount: Object.keys(files).length
    });

  } catch (error) {
    console.error('❌ Error fetching project files:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch project files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
