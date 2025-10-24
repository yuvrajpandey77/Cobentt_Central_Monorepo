import { inngest } from "./client";
import { openai, createAgent, createTool, createNetwork, AnyZodType, Tool, Message, createState } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { z } from "zod";
import prisma from "@/lib/db";
import { SANDBOX_TIMEOUT } from "./types";
// Screenshot capture deps loaded dynamically to avoid type and runtime issues when unavailable


interface CogerphereAgentResult {
  summary: string;
  files: { [path: string]: string };

}

export const CogerphereAgent = inngest.createFunction(
  { id: "COGERPHERE" },
  { event: "Cogerphereai/runAgent" },
  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("cogerphereailabsbeta1");
      await sandbox.setTimeout(SANDBOX_TIMEOUT);
      return sandbox.sandboxId;
    });

    const previousMessages = await step.run("get-previous-messages", async () => {
      const formattedMessages: Message[] = [];

      const messages = await prisma.message.findMany({
        where: {
          projectId: event.data.projectId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 6,
      });

      for (const message of messages) {
        formattedMessages.push({
          type: "text",
          role: message.role === "ASSISTANT"
            ? "assistant"
            : "user",
          content: message.content,
        });
      }
      return formattedMessages.reverse();
    });

    const state = createState<CogerphereAgentResult>({
      summary: "",
      files: {},
    },
      {
        messages: previousMessages,
      }
    );

    const CogerphereCodeAgent = createAgent<CogerphereAgentResult>({
      name: "Coding-Agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: openai({
        model: "gpt-5-mini",
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }) as unknown as AnyZodType,
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffer = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffer.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffer.stderr += data;
                  },
                });
                return result.stdout;
              } catch (error) {
                console.error(
                  `Command failed: ${error} \nstdout: ${buffer.stdout} \nstderr: ${buffer.stderr}`,
                );
                return `Command failed: ${error} \nstdout: ${buffer.stdout} \nstderr: ${buffer.stderr}`;
              }
            });
          },

        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "create or update files in the sandbox",
          parameters: z.object({
            files: z.array(z.object({
              path: z.string(),
              content: z.string(),
            })),
          }) as unknown as AnyZodType,
          handler: async ({ files }, { step, network }: Tool.Options<CogerphereAgentResult>) => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }
                return updatedFiles;
              } catch (error) {
                return "error :" + error;
              }
            });
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          }
        }),
        createTool({
          name: "readFiles",
          description: "read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }) as unknown as AnyZodType,
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                return "error :" + error;
              }
            })
          }
        }),
      ],

      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantMessageText;
            }
          }
          return result;
        }
      }

    });



    const network = createNetwork<CogerphereAgentResult>({
      name: "coding-agent-network",
      agents: [CogerphereCodeAgent],
      maxIter: 30,
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return CogerphereCodeAgent;
      },
    });

    const result = await network.run(event.data.value, {state: state});

    const fragmentTitleGenerator = createAgent({
      name:"fragment-title-generator",
      description:"A agent that generates a title for a code fragment",
      system:FRAGMENT_TITLE_PROMPT,
      model:openai({
        model:"gpt-4o",
      }),
    });
    const responseGenerator = createAgent({
      name:"response-generator",
      description:"A agent that generates a response for a code fragment",
      system:RESPONSE_PROMPT,
      model:openai({
        model:"gpt-4o",
      }),
    });

    const {output: fragmentTitleOutput} = await fragmentTitleGenerator.run(result.state.data.summary);
    const {output: responseOutput} = await responseGenerator.run(result.state.data.summary);

    const generateFragmentTitle = () => {
      if(fragmentTitleOutput[0].type !== "text") {
        return "Fragment";
      } 
      if(Array.isArray(fragmentTitleOutput[0].content)) {
        return fragmentTitleOutput[0].content.map((txt) => txt).join("")
      }else{
        return fragmentTitleOutput[0].content;
      }
    }

    const generateResponse = () => {
      if(responseOutput[0].type !== "text") {
        return "and here you go ";
      } 
      if(Array.isArray(responseOutput[0].content)) {
        return responseOutput[0].content.map((txt) => txt).join("")
      }else{
        return responseOutput[0].content;
      }
    }

    const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("save-result", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: "Something went wrong , please try again",
            role: "ASSISTANT",
            type: "ERROR",
          }
        })
      }
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: generateResponse(),
          role: "ASSISTANT",
          type: "RESULT",
          fragments: {
            create: {
              sandboxUrl: sandboxUrl,
              title: generateFragmentTitle(),
              files: result.state.data.files,
            }
          }
        }
      })
    });

    // Fire-and-forget screenshot creation after fragment with sandboxUrl exists
    await step.run("enqueue-screenshot", async () => {
      try {
        // capture and store thumbnail directly here to reduce complexity
        const { chromium } = await import("playwright");
        const sharp = (await import("sharp")).default;
        const browser = await chromium.launch({ args: ["--no-sandbox"] });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        try {
          await page.goto(sandboxUrl, { waitUntil: "networkidle", timeout: 60000 });
          await page.waitForTimeout(1500);
          const raw = await page.screenshot({ fullPage: true, type: "png" });
          const jpeg = await sharp(raw).resize({ width: 1200 }).jpeg({ quality: 70 }).toBuffer();
          await prisma.project.update({
            where: { id: event.data.projectId },
            // Cast to any because Prisma types may not include new fields until client is regenerated
            data: { screenshot: jpeg, screenshotMime: "image/jpeg" } as any,
          });
        } finally {
          await page.close();
          await browser.close();
        }
      } catch (_err) {
        // Ignore failures; UI will fallback
      }
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
    };
  },
);

// Helper function to update build progress
async function updateBuildProgress(buildJobId: string, progress: number, currentStep: string, log?: string) {
  const existingJob = await prisma.buildJob.findUnique({ where: { id: buildJobId } });
  let logs: string[] = [];
  
  if (existingJob?.logs) {
    try {
      logs = JSON.parse(existingJob.logs);
    } catch {
      logs = [];
    }
  }
  
  if (log) {
    const timestamp = new Date().toLocaleTimeString();
    logs.push(`[${timestamp}] ${log}`);
  }
  
  await prisma.buildJob.update({
    where: { id: buildJobId },
    data: {
      progress,
      currentStep,
      logs: JSON.stringify(logs),
    },
  });
}

// Helper function to validate contract syntax before compilation
function validateContractSyntax(contractCode: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for SPDX license identifier
  if (!contractCode.includes('// SPDX-License-Identifier:')) {
    errors.push('Missing SPDX license identifier');
  }
  
  // Check for pragma statement
  if (!contractCode.match(/pragma\s+solidity\s+[\^~]?[\d.]+;/)) {
    errors.push('Missing or invalid pragma statement');
  }
  
  // Check for contract declaration
  if (!contractCode.match(/contract\s+\w+/)) {
    errors.push('Missing contract declaration');
  }
  
  // Check for basic syntax issues
  const lines = contractCode.split('\n');
  const openBraces = (contractCode.match(/{/g) || []).length;
  const closeBraces = (contractCode.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push(`Mismatched braces: ${openBraces} opening, ${closeBraces} closing`);
  }
  
  // Check for unclosed parentheses
  const openParens = (contractCode.match(/\(/g) || []).length;
  const closeParens = (contractCode.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    errors.push(`Mismatched parentheses: ${openParens} opening, ${closeParens} closing`);
  }
  
  // Check for import statements are properly formatted
  const imports = contractCode.match(/import\s+"[^"]+";/g) || [];
  const invalidImports = contractCode.match(/import\s+[^";]+$/gm) || [];
  
  if (invalidImports.length > 0) {
    errors.push('Invalid import statement(s) detected');
  }
  
  // Check for constructor syntax (OpenZeppelin v5 requires msg.sender for Ownable)
  if (contractCode.includes('Ownable') && contractCode.includes('constructor')) {
    const constructorStart = contractCode.indexOf('constructor');
    const constructorBodyStart = contractCode.indexOf('{', constructorStart);
    // Find the matching closing brace for the constructor body
    let braceCount = 1;
    let constructorEnd = constructorBodyStart + 1;
    while (braceCount > 0 && constructorEnd < contractCode.length) {
      if (contractCode[constructorEnd] === '{') braceCount++;
      if (contractCode[constructorEnd] === '}') braceCount--;
      constructorEnd++;
    }
    
    const constructorSection = contractCode.substring(constructorStart, constructorEnd);
    
    // If using Ownable, should have Ownable(msg.sender) or Ownable(initialOwner)
    // Check for Ownable initialization in the full contract since it might be on initialization list
    if (!constructorSection.includes('Ownable(') && !contractCode.includes('Ownable(msg.sender)') && !contractCode.includes('Ownable(initialOwner)')) {
      errors.push('Ownable contract requires explicit owner initialization in constructor');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Contract Generation Function
export const generateContract = inngest.createFunction(
  { id: "generate-contract" },
  { event: "contract/generate" },
  async ({ event, step }) => {
    console.log('🎯 generateContract function called with event:', event);
    const { buildJobId, contractType, tokenName, tokenSymbol, tokenSupply, decimals, features } = event.data;
    
    // Check if this build job is already being processed
    const existingJob = await prisma.buildJob.findUnique({ where: { id: buildJobId } });
    if (existingJob?.status === 'RUNNING' && existingJob.currentStep?.includes('Testing contract compilation')) {
      console.log('Build job already running, skipping duplicate event');
      return { buildJobId, artifacts: null, contractCode: null };
    }

    // Update build job status
    await step.run("update-build-job-status", async () => {
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: { status: 'RUNNING' },
      });
      await updateBuildProgress(buildJobId, 5, 'Starting contract generation...', 'Build job initiated');
    });

    // Generate contract code based on type
    const contractCode = await step.run("generate-contract-code", async () => {
      await updateBuildProgress(buildJobId, 10, 'Generating contract from template...', `Creating ${contractType} contract`);
      
      let code: string;
      switch (contractType) {
        case 'ERC20':
          code = generateERC20Contract(tokenName, tokenSymbol, tokenSupply, decimals, features);
          break;
        case 'ERC721':
          code = generateERC721Contract(tokenName, tokenSymbol, features);
          break;
        case 'ERC1155':
          code = generateERC1155Contract(tokenName, features);
          break;
        case 'PAYMENT_SPLITTER':
          code = generatePaymentSplitterContract();
          break;
        case 'CUSTOM':
          // For custom contracts, generate a basic ERC20 template as starting point
          await updateBuildProgress(buildJobId, 12, 'Custom contract requested', 'Generating basic template');
          code = generateERC20Contract(tokenName || 'CustomToken', tokenSymbol || 'CUSTOM', tokenSupply || '1000000', decimals || '18', features);
          break;
        default:
          throw new Error(`Unsupported contract type: ${contractType}. Supported types: ERC20, ERC721, ERC1155, PAYMENT_SPLITTER, CUSTOM`);
      }
      
      await updateBuildProgress(buildJobId, 15, 'Contract generated, validating...', `Generated ${code.split('\n').length} lines of Solidity code`);
      
      // Validate contract syntax before compilation
      const validation = validateContractSyntax(code);
      if (!validation.valid) {
        const errorMsg = `Contract validation failed:\n${validation.errors.join('\n')}`;
        console.error('Contract validation errors:', validation.errors);
        await updateBuildProgress(buildJobId, 0, 'Contract validation failed', errorMsg);
        
        await prisma.buildJob.update({
          where: { id: buildJobId },
          data: {
            status: 'FAILED',
            progress: 0,
            currentStep: 'Contract validation failed',
            artifacts: {
              error: errorMsg,
              validationErrors: validation.errors,
              contractCode: code,
            },
          },
        });
        
        throw new Error(errorMsg);
      }
      
      await updateBuildProgress(buildJobId, 20, 'Contract validated successfully', '✓ Syntax check passed');
      return code;
    });

    // Show contract code to user immediately (save to database for UI display)
    await step.run("save-contract-preview", async () => {
      await updateBuildProgress(buildJobId, 25, 'Contract ready for review', '📄 Generated contract code available');
      
      // Save the contract code so user can see it in the UI immediately
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'RUNNING',
          progress: 25,
          currentStep: 'Contract generated - ready for compilation',
          artifacts: {
            sourceCode: contractCode, // Use sourceCode for consistency with build page
            contractCode: contractCode, // Keep both for backward compatibility
            contractName: tokenName?.replace(/\s+/g, '') || 'Token',
            contractType: contractType,
            preview: true, // Mark as preview - not yet compiled
          },
        },
      });
    });

    // Create E2B sandbox
    const sandboxId = await step.run("create-e2b-sandbox", async () => {
      await updateBuildProgress(buildJobId, 30, 'Creating E2B sandbox...', 'Initializing Foundry environment');
      
      try {
        const sandbox = await Sandbox.create("solidity-foundry-template");
        await updateBuildProgress(buildJobId, 40, 'Sandbox created', 'E2B sandbox ready with Foundry');
        return sandbox.sandboxId;
      } catch (error) {
        throw new Error(`Failed to create E2B sandbox: ${error instanceof Error ? error.message : 'Check E2B_API_KEY'}`);
      }
    });

    // Verify environment setup
    await step.run("verify-environment", async () => {
      await updateBuildProgress(buildJobId, 45, 'Verifying environment...', 'Checking Foundry and OpenZeppelin');
      
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        
        // Verify OpenZeppelin installation using absolute path
        console.log('🔍 Verifying OpenZeppelin installation...');
        const openzeppelinCheck = await sandbox.commands.run("export PATH=\"$PATH:$HOME/.foundry/bin\" && ls -la /home/user/hello_template/lib/openzeppelin-contracts/contracts/ | head -5");
        console.log('OpenZeppelin check result:', { exitCode: openzeppelinCheck.exitCode, stdout: openzeppelinCheck.stdout, stderr: openzeppelinCheck.stderr });
        
        if (openzeppelinCheck.exitCode !== 0) {
          throw new Error(`OpenZeppelin verification failed: ${openzeppelinCheck.stderr}`);
        }
        
        // Verify remappings using absolute path
        console.log('🔍 Verifying remappings...');
        const remappingsCheck = await sandbox.commands.run("export PATH=\"$PATH:$HOME/.foundry/bin\" && cat /home/user/hello_template/remappings.txt");
        console.log('Remappings check result:', { exitCode: remappingsCheck.exitCode, stdout: remappingsCheck.stdout, stderr: remappingsCheck.stderr });
        
        if (remappingsCheck.exitCode !== 0) {
          throw new Error(`Remappings verification failed: ${remappingsCheck.stderr}`);
        }
        
        await updateBuildProgress(buildJobId, 50, 'Environment verified', 'Foundry and OpenZeppelin ready');
      } catch (error) {
        console.error('Environment verification failed:', error);
        throw new Error(`Environment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Write contract to file
    await step.run("write-contract-file", async () => {
      await updateBuildProgress(buildJobId, 55, 'Writing contract to file...', 'Saving contract code');
      
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        const contractName = tokenName?.replace(/\s+/g, '') || 'Token';
        console.log('Writing contract:', contractName);
        
        // Log the contract code for debugging
        console.log('=== CONTRACT CODE TO COMPILE ===');
        console.log(contractCode);
        console.log('=== END CONTRACT CODE ===');
        
        // Write to absolute path
        await sandbox.files.write(`/home/user/hello_template/src/${contractName}.sol`, contractCode);
        
        // Verify the contract was written correctly
        try {
          const writtenContract = await sandbox.files.read(`/home/user/hello_template/src/${contractName}.sol`);
          console.log('Contract verification - first 200 chars:', writtenContract.substring(0, 200));
          if (writtenContract !== contractCode) {
            console.error('Contract file mismatch! Written contract differs from generated contract.');
          } else {
            console.log('✅ Contract file written correctly');
          }
        } catch (verifyError) {
          console.error('Failed to verify contract file:', verifyError);
        }
        
        await updateBuildProgress(buildJobId, 60, 'Contract file written', 'Contract saved to sandbox');
      } catch (error) {
        console.error('Failed to write contract file:', error);
        throw new Error(`Failed to write contract file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Compile with forge
    await step.run("compile-with-forge", async () => {
      await updateBuildProgress(buildJobId, 65, 'Compiling with forge...', 'Running forge build');
      
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        
        // Compile with forge using absolute path
        console.log('Compiling with forge...');
        const forgeBuild = await sandbox.commands.run("export PATH=\"$PATH:$HOME/.foundry/bin\" && cd /home/user/hello_template && forge build");
        console.log('Forge build result:', { 
          exitCode: forgeBuild.exitCode, 
          stdout: forgeBuild.stdout.substring(0, 1000), 
          stderr: forgeBuild.stderr.substring(0, 1000) 
        });
        
        if (forgeBuild.exitCode !== 0) {
          console.error('Forge compilation failed:');
          console.error('STDOUT:', forgeBuild.stdout);
          console.error('STDERR:', forgeBuild.stderr);
          throw new Error(`Forge compilation failed: ${forgeBuild.stderr}`);
        }
        
        await updateBuildProgress(buildJobId, 80, 'Compilation successful', 'Forge build completed');
      } catch (error) {
        console.error('Forge compilation error:', error);
        throw error;
      }
    });

    // Extract artifacts
    const compilationResult = await step.run("extract-artifacts", async () => {
      await updateBuildProgress(buildJobId, 85, 'Extracting artifacts...', 'Reading ABI and bytecode');
      
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        
        // Read Foundry artifacts
        console.log('Reading Foundry artifacts...');
        let abi = [];
        let bytecode = '';
        
        // Check what files exist in the out directory using absolute path
        console.log('Checking out directory structure...');
        const outDirContents = await sandbox.commands.run("find /home/user/hello_template/out -name '*.json' -type f");
        console.log('Found artifact files:', outDirContents.stdout);
        
        const contractName = tokenName?.replace(/\s+/g, '') || 'Token';
        
        // Try multiple possible artifact paths using absolute paths
        const possiblePaths = [
          `/home/user/hello_template/out/${contractName}.sol/${contractName}.json`,
          `/home/user/hello_template/out/${contractName}.json`,
          `/home/user/hello_template/out/src/${contractName}.sol/${contractName}.json`,
          `/home/user/hello_template/out/${contractName}.sol/${contractName}.sol/${contractName}.json`,
        ];
        
        let artifactContent = null;
        let artifactPath = null;
        
        for (const path of possiblePaths) {
          try {
            console.log(`Trying artifact path: ${path}`);
            artifactContent = await sandbox.files.read(path);
            artifactPath = path;
            console.log(`Successfully read artifact from: ${path}`);
            break;
          } catch (pathError) {
            console.log(`Path ${path} not found, trying next...`);
          }
        }
        
        if (!artifactContent) {
          throw new Error('No Foundry artifact file found in any expected location');
        }
        
        const artifact = JSON.parse(artifactContent);
        console.log('Foundry artifact structure:', JSON.stringify(artifact, null, 2).substring(0, 1000));
        
        // Extract ABI - try multiple possible locations
        abi = artifact.abi || artifact.contracts?.[`${contractName}.sol:${contractName}`]?.abi || [];
        
        // Extract bytecode - try multiple possible locations and formats
        bytecode = '';
        if (artifact.bytecode?.object) {
          bytecode = artifact.bytecode.object.startsWith('0x') ? artifact.bytecode.object : '0x' + artifact.bytecode.object;
        } else if (artifact.bytecode) {
          bytecode = artifact.bytecode.startsWith('0x') ? artifact.bytecode : '0x' + artifact.bytecode;
        } else if (artifact.contracts?.[`${contractName}.sol:${contractName}`]?.bytecode?.object) {
          bytecode = artifact.contracts[`${contractName}.sol:${contractName}`].bytecode.object.startsWith('0x') 
            ? artifact.contracts[`${contractName}.sol:${contractName}`].bytecode.object 
            : '0x' + artifact.contracts[`${contractName}.sol:${contractName}`].bytecode.object;
        } else if (artifact.contracts?.[`${contractName}.sol:${contractName}`]?.bytecode) {
          bytecode = artifact.contracts[`${contractName}.sol:${contractName}`].bytecode.startsWith('0x') 
            ? artifact.contracts[`${contractName}.sol:${contractName}`].bytecode 
            : '0x' + artifact.contracts[`${contractName}.sol:${contractName}`].bytecode;
        }
        
        console.log(`Extracted ABI length: ${abi.length}, Bytecode length: ${bytecode.length}`);
        
        if (!abi.length || !bytecode) {
          throw new Error(`No valid Foundry artifacts found - ABI: ${abi.length} items, Bytecode: ${bytecode.length} chars`);
        }
        
        await updateBuildProgress(buildJobId, 90, 'Artifacts extracted successfully', 'ABI and bytecode ready');
        
        return { abi, bytecode, contractName };
        
      } catch (error) {
        console.error('Failed to extract artifacts:', error);
        
        // Save error but keep contract code visible
        await prisma.buildJob.update({
          where: { id: buildJobId },
          data: {
            status: 'FAILED',
            progress: 0,
            currentStep: 'Compilation failed - check contract code',
            artifacts: {
              error: error instanceof Error ? error.message : 'Unknown error',
              sourceCode: contractCode, // Use sourceCode for consistency with build page
              contractCode: contractCode, // Keep both for backward compatibility
              contractName: tokenName?.replace(/\s+/g, '') || 'Token',
              contractType: contractType,
              compilationFailed: true,
            },
          },
        });
        
        throw error;
      }
    });

    // Cleanup sandbox
    await step.run("cleanup-sandbox", async () => {
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        await sandbox.kill();
        console.log('✅ Sandbox cleaned up successfully');
      } catch (error) {
        console.error('Failed to cleanup sandbox:', error);
        // Don't throw error for cleanup failure
      }
    });

    // Save successful compilation results
    await step.run("save-successful-build", async () => {
      console.log('💾 Saving compilation results to database...');
      console.log('📦 Compilation result:', {
        abiLength: compilationResult.abi?.length || 0,
        bytecodeLength: compilationResult.bytecode?.length || 0,
        contractName: compilationResult.contractName,
        hasABI: !!compilationResult.abi,
        hasBytecode: !!compilationResult.bytecode
      });
      
      const artifactsToSave = {
        abi: compilationResult.abi,
        bytecode: compilationResult.bytecode,
        sourceCode: contractCode,
        contractName: compilationResult.contractName,
        contractType: contractType,
        tool: 'foundry',
        compilationSuccessful: true,
        // Remove preview flag since compilation succeeded
        preview: false,
      };
      
      console.log('💾 Artifacts to save:', {
        abiLength: artifactsToSave.abi?.length || 0,
        bytecodeLength: artifactsToSave.bytecode?.length || 0,
        contractName: artifactsToSave.contractName,
        contractType: artifactsToSave.contractType
      });
      
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Build complete! Ready to deploy.',
          artifacts: artifactsToSave,
        },
      });
      
      console.log('✅ Successfully saved artifacts to database');
      await updateBuildProgress(buildJobId, 100, 'Build complete! Ready to deploy.', '✅ Contract compiled successfully with ABI and bytecode extracted');
    });

    return {
      buildJobId,
      artifacts: compilationResult,
      contractCode,
    };
  },
);

// Contract Verification Function
export const verifyContract = inngest.createFunction(
  { id: "verify-contract" },
  { event: "contract/verify" },
  async ({ event, step }) => {
    const { buildJobId, contractAddress } = event.data;

    // Update build job status
    await step.run("update-verification-status", async () => {
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: { status: 'RUNNING' },
      });
    });

    // Get contract artifacts
    const buildJob = await step.run("get-build-job", async () => {
      return await prisma.buildJob.findUnique({
        where: { id: buildJobId },
      });
    });

    if (!buildJob?.artifacts) {
      throw new Error("No artifacts found for verification");
    }

    // Verify contract on Etherscan/Sourcify
    const verificationResult = await step.run("verify-contract", async () => {
      try {
        const artifacts = buildJob.artifacts as any;
        const sourceCode = artifacts.sourceCode || '';
        
        // Get project details for network info
        const project = await prisma.project.findUnique({
          where: { id: buildJob.projectId },
        });

        if (!project) {
          throw new Error("Project not found");
        }

        // Determine which API to use based on blockchain and network
        const apiUrls: Record<string, string> = {
          'ETHEREUM-TESTNET': 'https://api-sepolia.etherscan.io/api',
          'ETHEREUM-MAINNET': 'https://api.etherscan.io/api',
          'POLYGON-TESTNET': 'https://api-testnet.polygonscan.com/api',
          'POLYGON-MAINNET': 'https://api.polygonscan.com/api',
          'ARBITRUM-TESTNET': 'https://api-sepolia.arbiscan.io/api',
          'ARBITRUM-MAINNET': 'https://api.arbiscan.io/api',
          'OPTIMISM-TESTNET': 'https://api-sepolia-optimistic.etherscan.io/api',
          'OPTIMISM-MAINNET': 'https://api-optimistic.etherscan.io/api',
        };

        const apiKeys: Record<string, string | undefined> = {
          'ETHEREUM': process.env.ETHERSCAN_API_KEY,
          'POLYGON': process.env.POLYGONSCAN_API_KEY,
          'ARBITRUM': process.env.ARBISCAN_API_KEY,
          'OPTIMISM': process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
        };

        const networkKey = `${project.blockchain}-${project.network}`;
        const apiUrl = apiUrls[networkKey];
        const apiKey = apiKeys[project.blockchain || 'ETHEREUM'];

        if (!apiUrl) {
          console.warn('Unsupported network for verification:', networkKey);
          return {
            verified: false,
            error: 'Unsupported network',
            verificationUrl: `https://etherscan.io/address/${contractAddress}`,
          };
        }

        if (!apiKey) {
          console.warn('No API key found for', project.blockchain);
          return {
            verified: false,
            error: 'No API key configured. Add ETHERSCAN_API_KEY to .env',
            verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
          };
        }

        // Submit for verification
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            apikey: apiKey,
            module: 'contract',
            action: 'verifysourcecode',
            contractaddress: contractAddress,
            sourceCode: sourceCode,
            codeformat: 'solidity-single-file',
            contractname: project.tokenName || 'Token',
            compilerversion: 'v0.8.20+commit.a1b79de6',
            optimizationUsed: '1',
            runs: '200',
          }).toString(),
        });

        const result = await response.json();

        if (result.status === '1') {
          console.log('Verification submitted successfully');
          return {
            verified: true,
            guid: result.result,
            verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}#code`,
          };
        } else {
          console.error('Verification failed:', result.message);
          return {
            verified: false,
            error: result.result || result.message,
            verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
          };
        }
      } catch (error) {
        console.error('Error verifying contract:', error);
        return {
          verified: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          verificationUrl: `https://etherscan.io/address/${contractAddress}`,
        };
      }
    });

    // Update build job with verification result
    await step.run("save-verification-result", async () => {
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'COMPLETED',
          artifacts: {
            ...(buildJob.artifacts as any),
            verification: verificationResult,
          },
        },
      });
    });

    return verificationResult;
  },
);

// Helper functions for contract generation
function generateERC20Contract(name: string, symbol: string, supply: string, decimals: string, features: string[]) {
  const mintable = features.includes('mintable');
  const burnable = features.includes('burnable');
  const pausable = features.includes('pausable');
  const accessControl = features.includes('access-control');
  const permit = features.includes('permit');

  // Build imports
  const imports = [
    'import "@openzeppelin/contracts/token/ERC20/ERC20.sol";'
  ];
  
  if (burnable) imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";');
  if (pausable) imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";');
  if (permit) imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";');
  if (accessControl || mintable) imports.push('import "@openzeppelin/contracts/access/Ownable.sol";');

  // Build inheritance
  const inheritance = ['ERC20'];
  if (burnable) inheritance.push('ERC20Burnable');
  if (pausable) inheritance.push('ERC20Pausable');
  if (permit) inheritance.push('ERC20Permit');
  if (accessControl || mintable) inheritance.push('Ownable');

  // Build constructor (OpenZeppelin v5 syntax)
  const constructorParams = permit ? `ERC20Permit("${name}")` : '';
  const constructorBody = `
        _mint(msg.sender, ${supply} * 10**${decimals});
    `;

  // Build additional functions
  let additionalFunctions = '';
  
  if (mintable) {
    additionalFunctions += `
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }`;
  }
  
  if (pausable) {
    additionalFunctions += `
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`;
  }

  // Override _update if pausable (required for Pausable in OZ v5)
  const updateOverride = pausable
    ? `
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20${pausable ? ', ERC20Pausable' : ''})
    {
        super._update(from, to, value);
    }` : '';

  // Build constructor initialization (OpenZeppelin v5 syntax)
  const constructorInit = [];
  constructorInit.push(`ERC20("${name}", "${symbol}")`);
  if (accessControl || mintable) constructorInit.push('Ownable(msg.sender)');
  if (permit) constructorInit.push(`ERC20Permit("${name}")`);

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports.join('\n')}

contract ${name.replace(/\s+/g, '')} is ${inheritance.join(', ')} {
    constructor()
        ${constructorInit.join('\n        ')}
    {${constructorBody}
    }${additionalFunctions}${updateOverride}
}`;
}

function generateERC721Contract(name: string, symbol: string, features: string[]) {
  const mintable = features.includes('mintable');
  const burnable = features.includes('burnable');
  const pausable = features.includes('pausable');
  const accessControl = features.includes('access-control');

  // Build imports
  const imports = [
    'import "@openzeppelin/contracts/token/ERC721/ERC721.sol";',
    'import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";'
  ];
  
  if (burnable) imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";');
  if (pausable) imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";');
  if (accessControl || mintable) imports.push('import "@openzeppelin/contracts/access/Ownable.sol";');

  // Build inheritance
  const inheritance = ['ERC721', 'ERC721URIStorage'];
  if (burnable) inheritance.push('ERC721Burnable');
  if (pausable) inheritance.push('ERC721Pausable');
  if (accessControl || mintable) inheritance.push('Ownable');

  // Build additional functions
  let additionalFunctions = '';
  
  if (mintable) {
    additionalFunctions += `
    uint256 private _nextTokenId;
    
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }`;
  }
  
  if (pausable) {
    additionalFunctions += `
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`;
  }

  // Required overrides for OpenZeppelin v5
  const overrides = pausable ? `
    
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721${pausable ? ', ERC721Pausable' : ''})
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }
    
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721${pausable ? ', ERC721Pausable' : ''})
    {
        super._increaseBalance(account, value);
    }` : '';

  // Build constructor initialization
  const constructorInit721 = [];
  constructorInit721.push(`ERC721("${name}", "${symbol}")`);
  if (accessControl || mintable) constructorInit721.push('Ownable(msg.sender)');

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports.join('\n')}

contract ${name.replace(/\s+/g, '')} is ${inheritance.join(', ')} {
    constructor()
        ${constructorInit721.join('\n        ')}
    {}${additionalFunctions}
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }${overrides}
}`;
}

function generateERC1155Contract(name: string, features: string[]) {
  const mintable = features.includes('mintable');
  const burnable = features.includes('burnable');
  const pausable = features.includes('pausable');
  const accessControl = features.includes('access-control');

  // Build imports
  const imports = [
    'import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";'
  ];
  
  if (burnable) imports.push('import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";');
  if (pausable) imports.push('import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";');
  if (accessControl || mintable) imports.push('import "@openzeppelin/contracts/access/Ownable.sol";');

  // Build inheritance
  const inheritance = ['ERC1155'];
  if (burnable) inheritance.push('ERC1155Burnable');
  if (pausable) inheritance.push('ERC1155Pausable');
  if (accessControl || mintable) inheritance.push('Ownable');

  // Build additional functions
  let additionalFunctions = '';
  
  if (mintable) {
    additionalFunctions += `
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data) public onlyOwner {
        _mint(to, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }`;
  }
  
  if (pausable) {
    additionalFunctions += `
    
    function pause() public onlyOwner {
        _pause();
    }
    
    function unpause() public onlyOwner {
        _unpause();
    }`;
  }

  // Required overrides for OpenZeppelin v5
  const overrides = pausable ? `
    
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155${pausable ? ', ERC1155Pausable' : ''})
    {
        super._update(from, to, ids, values);
    }` : '';

  // Build constructor initialization
  const constructorInit1155 = [];
  constructorInit1155.push('ERC1155("https://api.example.com/metadata/{id}.json")');
  if (accessControl || mintable) constructorInit1155.push('Ownable(msg.sender)');

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${imports.join('\n')}

contract ${name.replace(/\s+/g, '')} is ${inheritance.join(', ')} {
    constructor()
        ${constructorInit1155.join('\n        ')}
    {}${additionalFunctions}${overrides}
}`;
}

function generatePaymentSplitterContract() {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

contract PaymentSplitterContract is PaymentSplitter {
    constructor(address[] memory payees, uint256[] memory shares_)
        PaymentSplitter(payees, shares_)
    {}
}`;
}

function extractABI(output: string): any[] {
  // Simple ABI extraction - in production, use proper JSON parsing
  try {
    const lines = output.split('\n');
    const abiLine = lines.find(line => line.includes('"abi"'));
    if (abiLine) {
      return JSON.parse(abiLine.split('"abi":')[1]?.trim());
    }
  } catch (error) {
    console.error('Error extracting ABI:', error);
  }
  return [];
}

function extractBytecode(output: string): string {
  // Simple bytecode extraction - in production, use proper JSON parsing
  try {
    const lines = output.split('\n');
    const bytecodeLine = lines.find(line => line.includes('"bytecode"'));
    if (bytecodeLine) {
      return bytecodeLine.split('"bytecode":')[1]?.trim().replace(/"/g, '');
    }
  } catch (error) {
    console.error('Error extracting bytecode:', error);
  }
  return '';
}             

// Test Contract Function
export const testContract = inngest.createFunction(
  { id: 'test-contract' },
  { event: 'test-contract' },
  async ({ event, step }) => {
    const { buildJobId, projectId, contractCode, contractName, contractType } = event.data;

    // Update build progress
    const updateTestProgress = async (progress: number, step: string, log: string) => {
      const existingJob = await prisma.buildJob.findUnique({ where: { id: buildJobId } });
      let logs: string[] = [];
      
      if (existingJob?.logs) {
        try {
          logs = JSON.parse(existingJob.logs);
        } catch {
          logs = [];
        }
      }
      
      const timestamp = new Date().toLocaleTimeString();
      logs.push(`[${timestamp}] ${log}`);
      
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          progress,
          currentStep: step,
          logs: JSON.stringify(logs),
        },
      });
    };

    // Run tests in E2B sandbox
    const testResult = await step.run("run-contract-tests", async () => {
      await updateTestProgress(10, 'Setting up test environment...', 'Creating E2B sandbox for testing');
      
      let sandbox;
      try {
        sandbox = await Sandbox.create("solidity-foundry-template");
        await updateTestProgress(20, 'Sandbox ready', 'Using pre-configured Foundry environment for testing');
      } catch (error) {
        throw new Error(`Failed to create E2B sandbox: ${error instanceof Error ? error.message : 'Check E2B_API_KEY'}`);
      }

      try {
        // Navigate to hello_template project (pre-configured with Foundry and OpenZeppelin)
        console.log('📦 Using pre-configured hello_template project for testing...');
        await sandbox.commands.run("cd /home/user/hello_template");

        // Write contract to src/ directory
        await sandbox.files.write(`src/${contractName}.sol`, contractCode);

        await updateTestProgress(40, 'Contract written', 'Creating test file');

        // Create test file
        const testCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {${contractName}} from "../src/${contractName}.sol";

contract ${contractName}Test is Test {
    ${contractName} public token;
    
    function setUp() public {
        token = new ${contractName}();
    }
    
    function test_Deployment() public {
        assertEq(token.name(), "${contractName}");
        assertEq(token.symbol(), "${contractName.substring(0, 3).toUpperCase()}");
        assertEq(token.totalSupply(), 1000000 * 10**18);
    }
    
    function test_Mint() public {
        address to = address(0x123);
        uint256 amount = 1000 * 10**18;
        
        token.mint(to, amount);
        assertEq(token.balanceOf(to), amount);
    }
    
    function test_Transfer() public {
        address from = address(this);
        address to = address(0x456);
        uint256 amount = 100 * 10**18;
        
        token.transfer(to, amount);
        assertEq(token.balanceOf(to), amount);
        assertEq(token.balanceOf(from), token.totalSupply() - amount);
    }
    
    function test_Burn() public {
        uint256 initialBalance = token.balanceOf(address(this));
        uint256 burnAmount = 100 * 10**18;
        
        token.burn(burnAmount);
        assertEq(token.balanceOf(address(this)), initialBalance - burnAmount);
    }
}`;

        await sandbox.files.write(`test/${contractName}.t.sol`, testCode);

        await updateTestProgress(50, 'Test file created', 'Running tests');

        // Run tests
        console.log('Running tests...');
        const forgeTest = await sandbox.commands.run("export PATH=\"$PATH:$HOME/.foundry/bin\" && forge test --json");
          console.log('Forge test result:', { exitCode: forgeTest.exitCode, stdout: forgeTest.stdout.substring(0, 500), stderr: forgeTest.stderr.substring(0, 500) });

        await updateTestProgress(80, 'Tests completed', 'Parsing results');

        // Parse test results
        let testResults = {
          passed: 0,
          failed: 0,
          total: 0,
          details: [] as any[],
        };

        if (forgeTest.exitCode === 0) {
          try {
            const testOutput = JSON.parse(forgeTest.stdout);
            if (testOutput.test_results) {
              for (const [testName, result] of Object.entries(testOutput.test_results)) {
                const testResult = result as any;
                testResults.total++;
                if (testResult.success) {
                  testResults.passed++;
                } else {
                  testResults.failed++;
                }
                testResults.details.push({
                  name: testName,
                  success: testResult.success,
                  gas: testResult.gas_used || 0,
                });
              }
            }
          } catch (parseError) {
            console.error('Failed to parse test results:', parseError);
            testResults = {
              passed: 0,
              failed: 1,
              total: 1,
              details: [{ name: 'Test execution', success: false, gas: 0 }],
            };
          }
        } else {
          testResults = {
            passed: 0,
            failed: 1,
            total: 1,
            details: [{ name: 'Test execution', success: false, gas: 0 }],
          };
        }

        await updateTestProgress(100, 'Test suite complete', `Tests completed: ${testResults.passed}/${testResults.total} passed`);

        return testResults;

      } catch (error) {
        console.error('Test error:', error);
        
        // Save error but keep test attempt
        await prisma.buildJob.update({
          where: { id: buildJobId },
          data: {
            status: 'FAILED',
            progress: 0,
            currentStep: 'Test execution failed',
            artifacts: {
              error: error instanceof Error ? error.message : 'Unknown error',
              contractCode,
              contractName,
              contractType,
              testMode: true,
              testFailed: true,
            },
          },
        });
        
        throw error;
      }
    });

    // Save test results
    await step.run("save-test-results", async () => {
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Test suite completed',
          artifacts: {
            contractCode,
            contractName,
            contractType,
            testMode: true,
            testResults: testResult,
            testSummary: `${testResult.passed}/${testResult.total} tests passed`,
          },
        },
      });
    });

    return { testResults: testResult };
  }
);             