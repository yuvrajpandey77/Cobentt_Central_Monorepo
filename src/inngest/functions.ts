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
    const constructorSection = contractCode.substring(
      contractCode.indexOf('constructor'),
      contractCode.indexOf('}', contractCode.indexOf('constructor'))
    );
    
    // If using Ownable, should have Ownable(msg.sender) or Ownable(initialOwner)
    if (!constructorSection.includes('Ownable(')) {
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

    // Simple compilation test in E2B
    const compilationResult = await step.run("compile-contract", async () => {
      await updateBuildProgress(buildJobId, 30, 'Testing contract compilation...', 'Setting up E2B sandbox');
      
      let sandbox;
      try {
        sandbox = await Sandbox.create("cogerphereailabsbeta1");
        await updateBuildProgress(buildJobId, 40, 'Sandbox ready', 'Installing Foundry');
      } catch (error) {
        throw new Error(`Failed to create E2B sandbox: ${error instanceof Error ? error.message : 'Check E2B_API_KEY'}`);
      }
      
      try {
        // Install Foundry with comprehensive error handling
        console.log('Installing Foundry...');
        let foundryInstall;
        
        try {
          foundryInstall = await sandbox.commands.run("curl -L https://foundry.paradigm.xyz | bash");
          console.log('Foundry install result:', { exitCode: foundryInstall.exitCode, stdout: foundryInstall.stdout.substring(0, 200), stderr: foundryInstall.stderr.substring(0, 200) });
        } catch (error) {
          console.log('Foundry installation failed, trying alternative approach...');
          // Try alternative installation method
          foundryInstall = await sandbox.commands.run("bash -c 'curl -L https://foundry.paradigm.xyz | bash'");
          console.log('Foundry install (alternative) result:', { exitCode: foundryInstall.exitCode, stdout: foundryInstall.stdout.substring(0, 200), stderr: foundryInstall.stderr.substring(0, 200) });
        }
        
        // Check what was actually installed
        console.log('Checking Foundry installation...');
        const checkFoundryDir = await sandbox.commands.run("ls -la ~/.foundry/bin/ 2>/dev/null || echo 'Foundry bin directory not found'");
        console.log('Foundry bin directory:', { exitCode: checkFoundryDir.exitCode, stdout: checkFoundryDir.stdout, stderr: checkFoundryDir.stderr });
        
        // Check if forge exists (more reliable than foundryup)
        const checkForge = await sandbox.commands.run("ls -la ~/.foundry/bin/forge 2>/dev/null || echo 'forge not found'");
        console.log('Forge check result:', { exitCode: checkForge.exitCode, stdout: checkForge.stdout, stderr: checkForge.stderr });
        
        // If forge doesn't exist, try to install it manually
        if (checkForge.exitCode !== 0 || checkForge.stdout.includes('not found')) {
          console.log('Forge not found, attempting manual installation...');
          try {
            // Try to run foundryup if it exists
            const foundryupCheck = await sandbox.commands.run("ls -la ~/.foundry/bin/foundryup 2>/dev/null || echo 'foundryup not found'");
            if (!foundryupCheck.stdout.includes('not found')) {
              console.log('Running foundryup...');
              const foundryup = await sandbox.commands.run("bash -c 'export PATH=$PATH:~/.foundry/bin && ~/.foundry/bin/foundryup'");
              console.log('Foundryup result:', { exitCode: foundryup.exitCode, stdout: foundryup.stdout.substring(0, 200), stderr: foundryup.stderr.substring(0, 200) });
            }
          } catch (error) {
            console.log('Foundryup failed, continuing without it...');
          }
        }
        
        // Final check for forge
        const finalForgeCheck = await sandbox.commands.run("ls -la ~/.foundry/bin/forge 2>/dev/null || echo 'forge still not found'");
        console.log('Final forge check:', { exitCode: finalForgeCheck.exitCode, stdout: finalForgeCheck.stdout, stderr: finalForgeCheck.stderr });
        
        if (finalForgeCheck.stdout.includes('still not found')) {
          console.log('Forge installation failed, but continuing with compilation attempt...');
        }
        
        await updateBuildProgress(buildJobId, 50, 'Foundry installed', 'Creating project');
        
        // Create simple project
        console.log('Creating project...');
        const mkdirResult = await sandbox.commands.run("mkdir -p test_project/src");
        console.log('Mkdir result:', { exitCode: mkdirResult.exitCode, stdout: mkdirResult.stdout, stderr: mkdirResult.stderr });
        
        await updateBuildProgress(buildJobId, 60, 'Project created', 'Installing dependencies');
        
        // Install OpenZeppelin via npm (simpler)
        console.log('Installing OpenZeppelin...');
        const npmInit = await sandbox.commands.run("bash -c 'cd test_project && npm init -y'");
        console.log('NPM init result:', { exitCode: npmInit.exitCode, stdout: npmInit.stdout.substring(0, 200), stderr: npmInit.stderr.substring(0, 200) });
        
        const npmInstall = await sandbox.commands.run("bash -c 'cd test_project && npm install @openzeppelin/contracts@^5.0.0'");
        console.log('NPM install result:', { exitCode: npmInstall.exitCode, stdout: npmInstall.stdout.substring(0, 200), stderr: npmInstall.stderr.substring(0, 200) });
        
        if (npmInstall.exitCode !== 0) {
          throw new Error(`OpenZeppelin installation failed: ${npmInstall.stderr || npmInstall.stdout}`);
        }
        
        // Write remappings
        console.log('Writing remappings...');
        await sandbox.files.write("test_project/remappings.txt", "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/");
        
        // Write contract
        const contractName = tokenName?.replace(/\s+/g, '') || 'Token';
        console.log('Writing contract:', contractName);
        await sandbox.files.write(`test_project/src/${contractName}.sol`, contractCode);
        await updateBuildProgress(buildJobId, 70, 'Contract written', 'Compiling...');
        
        // Compile with multiple forge path attempts
        console.log('Compiling with forge...');
        let forgeBuild;
        
        // Try different forge paths
        const forgePaths = [
          '~/.foundry/bin/forge',
          '/home/user/.foundry/bin/forge',
          'forge', // In case it's in PATH
        ];
        
        let forgePath = forgePaths[0]; // Default to first path
        
        for (const path of forgePaths) {
          try {
            const checkForge = await sandbox.commands.run(`bash -c 'test -f ${path} && echo "found" || echo "not found"'`);
            if (checkForge.stdout.includes('found')) {
              forgePath = path;
              console.log(`Found forge at: ${path}`);
              break;
            }
          } catch (error) {
            console.log(`Path ${path} not accessible, trying next...`);
          }
        }
        
        try {
          forgeBuild = await sandbox.commands.run(`bash -c 'cd test_project && ${forgePath} build'`);
          console.log('Forge build result:', { exitCode: forgeBuild.exitCode, stdout: forgeBuild.stdout.substring(0, 500), stderr: forgeBuild.stderr.substring(0, 500) });
        } catch (error) {
          console.log('Forge build failed, trying alternative approach...');
          try {
            // Try with explicit PATH
            forgeBuild = await sandbox.commands.run(`bash -c 'cd test_project && export PATH=$PATH:~/.foundry/bin && forge build'`);
            console.log('Forge build (alternative) result:', { exitCode: forgeBuild.exitCode, stdout: forgeBuild.stdout.substring(0, 500), stderr: forgeBuild.stderr.substring(0, 500) });
          } catch (altError) {
            console.log('Alternative forge build also failed, will try solc fallback...');
            // Create a dummy result to continue to solc fallback
            forgeBuild = { exitCode: 1, stdout: '', stderr: 'Forge not available' };
          }
        }
        
        if (forgeBuild.exitCode !== 0) {
          console.error('Compilation failed:', forgeBuild.stderr);
          // Don't throw error immediately, try to continue with what we have
          console.log('Forge compilation failed, but continuing to check if artifacts exist...');
        }
        
        await updateBuildProgress(buildJobId, 80, 'Compilation successful', 'Extracting artifacts');
        
        // Try to read artifact, fallback to solc if forge failed
        console.log('Reading artifact...');
        let abi = [];
        let bytecode = '';
        
        try {
          const artifactPath = `test_project/out/${contractName}.sol/${contractName}.json`;
          const artifactContent = await sandbox.files.read(artifactPath);
          const artifact = JSON.parse(artifactContent);
          
          abi = artifact.abi || [];
          bytecode = artifact.bytecode?.object ? '0x' + artifact.bytecode.object : '';
          
          if (!abi.length || !bytecode) {
            throw new Error('No valid artifacts found');
          }
        } catch (error) {
          console.log('Forge artifacts not found, trying solc fallback...');
          
          // Fallback to solc compilation
          try {
            console.log('Installing solc...');
            const solcInstall = await sandbox.commands.run("bash -c 'cd test_project && npm install solc@0.8.20'");
            console.log('Solc install result:', { exitCode: solcInstall.exitCode, stdout: solcInstall.stdout.substring(0, 200), stderr: solcInstall.stderr.substring(0, 200) });
            
            console.log('Compiling with solc...');
            const solcCompile = await sandbox.commands.run(`bash -c 'cd test_project && npx solc --abi --bin --optimize --base-path . --include-path node_modules src/${contractName}.sol'`);
            console.log('Solc compile result:', { exitCode: solcCompile.exitCode, stdout: solcCompile.stdout.substring(0, 500), stderr: solcCompile.stderr.substring(0, 500) });
            
            if (solcCompile.exitCode === 0) {
              // Parse solc output
              const output = solcCompile.stdout;
              const abiMatch = output.match(/"abi":\s*(\[.*?\])/);
              const bytecodeMatch = output.match(/"bytecode":\s*"([^"]+)"/);
              
              if (abiMatch && bytecodeMatch) {
            abi = JSON.parse(abiMatch[1]);
                bytecode = '0x' + bytecodeMatch[1];
                console.log('Solc compilation successful');
              } else {
                console.error('Failed to parse solc output:', output);
                throw new Error('Failed to parse solc output');
          }
        } else {
              console.error('Solc compilation failed:', solcCompile.stderr);
              throw new Error('Solc compilation failed');
            }
          } catch (solcError) {
            console.error('Solc fallback also failed:', solcError);
            // Don't throw error, just log and continue with empty artifacts
            console.log('All compilation methods failed, but contract code is still available for review');
            abi = [];
            bytecode = '';
          }
        }
        
        // If compilation failed but we have contract code, save it anyway for user review
        if (!abi.length || !bytecode) {
          console.log('Compilation failed, but saving contract code for user review...');
          // Save the contract code even if compilation failed
          await prisma.buildJob.update({
            where: { id: buildJobId },
            data: {
              status: 'FAILED',
              progress: 0,
              currentStep: 'Compilation failed - contract code available for review',
              artifacts: {
                error: 'Compilation failed - Foundry and solc both unavailable',
                sourceCode: contractCode,
                contractCode: contractCode,
                contractName: tokenName?.replace(/\s+/g, '') || 'Token',
                contractType: contractType,
                compilationFailed: true,
                compilationError: 'Both Foundry and solc compilation failed in E2B environment',
              },
            },
          });
          
          // Don't throw error, return empty artifacts but keep contract code
          return { abi: [], bytecode: '', contractName: tokenName?.replace(/\s+/g, '') || 'Token' };
        }
        
        await updateBuildProgress(buildJobId, 90, 'Artifacts extracted', 'Compilation complete');
        
        return { abi, bytecode, contractName };
        
      } catch (error) {
        console.error('Compilation error:', error);
        
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

    // Save successful compilation results
    await step.run("save-successful-build", async () => {
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Build complete! Ready to deploy.',
          artifacts: {
            abi: compilationResult.abi,
            bytecode: compilationResult.bytecode,
            sourceCode: contractCode,
            contractName: compilationResult.contractName,
            contractType: contractType,
            tool: 'foundry',
            compilationSuccessful: true,
            // Remove preview flag since compilation succeeded
            preview: false,
          },
        },
      });
      await updateBuildProgress(buildJobId, 100, 'Build complete! Ready to deploy.', '✅ Contract compiled successfully and ready for deployment');
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

  // Build constructor
  const constructorParams = permit ? `ERC20Permit("${name}")` : '';
  const constructorBody = `
        _mint(msg.sender, ${supply} * 10**${decimals});`;

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
  const updateOverride = pausable ? `
    
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20${pausable ? ', ERC20Pausable' : ''})
    {
        super._update(from, to, value);
    }` : '';

  // Build constructor initialization
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
        sandbox = await Sandbox.create("cogerphereailabsbeta1");
        await updateTestProgress(20, 'Sandbox ready', 'Installing Foundry for testing');
      } catch (error) {
        throw new Error(`Failed to create E2B sandbox: ${error instanceof Error ? error.message : 'Check E2B_API_KEY'}`);
      }

      try {
        // Install Foundry
        console.log('Installing Foundry for testing...');
        const foundryInstall = await sandbox.commands.run("bash -c 'curl -L https://foundry.paradigm.xyz | bash'");
        console.log('Foundry install result:', { exitCode: foundryInstall.exitCode, stdout: foundryInstall.stdout.substring(0, 200), stderr: foundryInstall.stderr.substring(0, 200) });

        await updateTestProgress(30, 'Foundry installed', 'Creating test project');

        // Create test project
        console.log('Creating test project...');
        await sandbox.commands.run("mkdir -p test_project/src test_project/test");
        await sandbox.commands.run("bash -c 'cd test_project && npm init -y'");
        await sandbox.commands.run("bash -c 'cd test_project && npm install @openzeppelin/contracts@^5.0.0'");

        // Write remappings
        await sandbox.files.write("test_project/remappings.txt", "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/");

        // Write contract
        await sandbox.files.write(`test_project/src/${contractName}.sol`, contractCode);

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

        await sandbox.files.write(`test_project/test/${contractName}.t.sol`, testCode);

        await updateTestProgress(50, 'Test file created', 'Running tests');

        // Run tests
        console.log('Running tests...');
        let forgeTest;
        
        try {
          forgeTest = await sandbox.commands.run("bash -c 'cd test_project && ~/.foundry/bin/forge test --json'");
          console.log('Forge test result:', { exitCode: forgeTest.exitCode, stdout: forgeTest.stdout.substring(0, 500), stderr: forgeTest.stderr.substring(0, 500) });
        } catch (error) {
          console.log('Forge test failed, trying alternative approach...');
          try {
            forgeTest = await sandbox.commands.run("bash -c 'cd test_project && export PATH=$PATH:~/.foundry/bin && forge test --json'");
            console.log('Forge test (alternative) result:', { exitCode: forgeTest.exitCode, stdout: forgeTest.stdout.substring(0, 500), stderr: forgeTest.stderr.substring(0, 500) });
          } catch (altError) {
            console.log('Alternative forge test also failed...');
            forgeTest = { exitCode: 1, stdout: '', stderr: 'Forge test not available' };
          }
        }

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