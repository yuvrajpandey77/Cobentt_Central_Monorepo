import { inngest } from "./client";
import { createAgent, createTool, createNetwork, AnyZodType, Tool, Message, createState } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { agentModel } from "@/lib/ai/agent-model";
import { z } from "zod";
import prisma from "@/lib/db";
import { SANDBOX_TIMEOUT } from "./types";
import { EnhancedContractConfig } from '@/types/contract-config';
import { 
  generateContractWithIteration, 
  ContractGenerationResult,
  refineContractWithForgeErrors,
  parseForgeOutput
} from './ai-contract-generator';
import { recordTokenUsage } from "@/lib/token-usage";
// Screenshot capture deps loaded dynamically to avoid type and runtime issues when unavailable


interface CobenttAgentResult {
  summary: string;
  files: { [path: string]: string };

}

interface AgentTokenUsage {
  input_tokens?: number;
  prompt_tokens?: number;
  output_tokens?: number;
  completion_tokens?: number;
}

interface AgentResultWithUsage {
  usage?: AgentTokenUsage;
}

interface BuildJobArtifactsJson {
  sourceCode?: string;
  contractCode?: string;
  contractName?: string;
  contractType?: string;
  abi?: unknown;
  bytecode?: unknown;
  [key: string]: unknown;
}

interface ForgeCommandError extends Error {
  stdout?: string;
  stderr?: string;
}

interface ContractTestDetail {
  name: string;
  success: boolean;
  gas: number;
}

interface ForgeTestCaseResult {
  success: boolean;
  gas_used?: number;
}

export const CobenttAgent = inngest.createFunction(
  { id: "COBENTT" },
  { event: "Cobentt/runAgent" },
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
          // SECURITY: Only fetch messages belonging to the requesting user
          ...(event.data.userId ? { project: { userId: event.data.userId } } : {}),
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

    const state = createState<CobenttAgentResult>({
      summary: "",
      files: {},
    },
      {
        messages: previousMessages,
      }
    );

    const CobenttCodeAgent = createAgent<CobenttAgentResult>({
      name: "Coding-Agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: agentModel(event.data.model || "openai/gpt-4o-mini"),
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
          handler: async ({ files }, { step, network }: Tool.Options<CobenttAgentResult>) => {
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



    const network = createNetwork<CobenttAgentResult>({
      name: "coding-agent-network",
      agents: [CobenttCodeAgent],
      maxIter: 30,
      defaultState: state,
      router: async ({ network }) => {
        const summary = network.state.data.summary;
        if (summary) {
          return;
        }
        return CobenttCodeAgent;
      },
    });

    const result = await network.run(event.data.value, {state: state});

    // Track token usage from main agent
    await step.run("record-main-agent-tokens", async () => {
      try {
        // Agent-kit stores usage in result.usage (type assertion needed)
        const resultWithUsage = result as unknown as AgentResultWithUsage;
        if (resultWithUsage.usage) {
          const usage = resultWithUsage.usage;
          const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
          const completionTokens = usage.output_tokens || usage.completion_tokens || 0;
          
          if (!event.data.userId) {
            console.warn("[usage] Missing userId in event; cannot record token usage");
            return;
          }

          if (promptTokens > 0 || completionTokens > 0) {
            await recordTokenUsage({
              userId: event.data.userId,
              projectId: event.data.projectId,
              messageId: event.data.messageId,
              provider: 'OPENAI',
              model: 'gpt-5',
              promptTokens,
              completionTokens,
              endpoint: '/inngest/main-agent',
            });
          }
        }
      } catch (error) {
        console.error('Failed to record token usage for main agent:', error);
        // Don't fail the function if token tracking fails
      }
    });

    const fragmentTitleGenerator = createAgent({
      name:"fragment-title-generator",
      description:"A agent that generates a title for a code fragment",
      system:FRAGMENT_TITLE_PROMPT,
      model: agentModel("gpt-5"),
    });
    const responseGenerator = createAgent({
      name:"response-generator",
      description:"A agent that generates a response for a code fragment",
      system:RESPONSE_PROMPT,
      model: agentModel("gpt-5"),
    });

    const fragmentTitleResult = await fragmentTitleGenerator.run(result.state.data.summary);
    const responseGeneratorResult = await responseGenerator.run(result.state.data.summary);
    
    const {output: fragmentTitleOutput} = fragmentTitleResult;
    const {output: responseOutput} = responseGeneratorResult;

    // Track token usage from fragment title generator
    await step.run("record-title-generator-tokens", async () => {
      try {
        const titleResultWithUsage = fragmentTitleResult as unknown as AgentResultWithUsage;
        if (titleResultWithUsage.usage) {
          const usage = titleResultWithUsage.usage;
          const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
          const completionTokens = usage.output_tokens || usage.completion_tokens || 0;
          
          if (!event.data.userId) {
            console.warn("[usage] Missing userId in event; cannot record token usage");
            return;
          }

          if (promptTokens > 0 || completionTokens > 0) {
            await recordTokenUsage({
              userId: event.data.userId,
              projectId: event.data.projectId,
              messageId: event.data.messageId,
              provider: 'OPENAI',
              model: 'gpt-5',
              promptTokens,
              completionTokens,
              endpoint: '/inngest/title-generator',
            });
          }
        }
      } catch (error) {
        console.error('Failed to record token usage for title generator:', error);
      }
    });

    // Track token usage from response generator
    await step.run("record-response-generator-tokens", async () => {
      try {
        const responseResultWithUsage = responseGeneratorResult as unknown as AgentResultWithUsage;
        if (responseResultWithUsage.usage) {
          const usage = responseResultWithUsage.usage;
          const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
          const completionTokens = usage.output_tokens || usage.completion_tokens || 0;
          
          if (!event.data.userId) {
            console.warn("[usage] Missing userId in event; cannot record token usage");
            return;
          }

          if (promptTokens > 0 || completionTokens > 0) {
            await recordTokenUsage({
              userId: event.data.userId,
              projectId: event.data.projectId,
              messageId: event.data.messageId,
              provider: 'OPENAI',
              model: 'gpt-5',
              promptTokens,
              completionTokens,
              endpoint: '/inngest/response-generator',
            });
          }
        }
      } catch (error) {
        console.error('Failed to record token usage for response generator:', error);
      }
    });

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
            data: { screenshot: jpeg, screenshotMime: "image/jpeg" },
          });
        } finally {
          await page.close();
          await browser.close();
        }
      } catch {
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
  
  // Safety check: Don't update if already completed/failed or if this progress is lower than current
  if (!existingJob) {
    console.warn('Build job not found:', buildJobId);
    return;
  }
  
  if (existingJob.status === 'COMPLETED' || existingJob.status === 'FAILED') {
    console.warn(`Skipping progress update for ${existingJob.status} job: ${progress}%`);
    return;
  }
  
  // Don't update with a lower progress value
  if (existingJob.progress > progress) {
    console.warn(`Skipping progress update - current ${existingJob.progress}% > new ${progress}%`);
    return;
  }
  
  let logs: string[] = [];
  
  if (existingJob.logs) {
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

// AI-Only Contract Generation Function
export const generateContract = inngest.createFunction(
  { 
    id: "generate-contract",
    timeouts: {
      finish: "15m", // 15-minute timeout for entire function
    },
  },
  { event: "contract/generate" },
  async ({ event, step }) => {
    console.log('🎯 AI Contract Generator called with event:', event);
    const { buildJobId, contractType, tokenName, tokenSymbol, features } = event.data;
    
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
      await updateBuildProgress(buildJobId, 5, 'Starting AI contract generation...', 'Build job initiated');
    });

    // Parse enhanced configuration
    const enhancedConfig = await step.run("parse-configuration", async () => {
      await updateBuildProgress(buildJobId, 10, 'Parsing configuration...', 'Analyzing user requirements');
      
      let config: EnhancedContractConfig | null = null;
      try {
        console.log('🔍 Checking for enhanced configuration...');
        console.log('Event data keys:', Object.keys(event.data));
        console.log('aiConfiguration present:', !!event.data.aiConfiguration);
        
        if (event.data.aiConfiguration) {
          config = event.data.aiConfiguration as EnhancedContractConfig;
          console.log('Enhanced configuration present:', { type: config.contractType, blockchain: config.blockchain });
        } else {
          console.log('❌ No enhanced configuration found, creating default config');
          // Create default config from basic parameters
          config = {
            contractType: contractType.toLowerCase() as EnhancedContractConfig["contractType"],
            tokenName: tokenName || 'Token',
            tokenSymbol: tokenSymbol || 'TKN',
            blockchain: 'ethereum',
            network: 'testnet',
            features: features || [],
            customRequirements: {},
            gasOptimizations: [],
            securityRecommendations: [],
            reasoning: 'Generated using AI-only approach'
          };
        }
      } catch (error) {
        console.log('❌ Error parsing enhanced configuration:', error);
        throw new Error(`Configuration parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return config;
    });

    // Update progress before AI generation
    await step.run("update-progress-before-ai", async () => {
      await updateBuildProgress(buildJobId, 15, 'Generating contract with GPT-4.1...', 'Using AI-only generation approach');
    });

    // Generate contract with AI using iterative refinement (outside step to avoid nesting)
    const userPrompt = event.data.userPrompt || `Create a ${contractType} token called ${tokenName} with symbol ${tokenSymbol}`;
      
      console.log('📋 CONTRACT PARAMETERS:');
      console.log('- contractType:', contractType);
      console.log('- tokenName:', tokenName);
      console.log('- tokenSymbol:', tokenSymbol);
      console.log('- features:', features);
      console.log('- userPrompt length:', userPrompt.length);
      
    let generationResult: ContractGenerationResult;
    try {
      generationResult = await generateContractWithIteration(
        userPrompt,
        enhancedConfig,
        3, // max iterations
        [] // examples (can be expanded later)
      );
      
      console.log('🎉 Contract generation successful!');
      console.log('📊 Generation method:', generationResult.generationMethod);
      console.log('🔄 Iterations used:', generationResult.iteration);
      console.log('📈 Validation score:', generationResult.validationScore);
      
      await step.run("update-progress-after-ai", async () => {
        await updateBuildProgress(buildJobId, 25, 'Contract generated successfully', `Generated using ${generationResult.generationMethod} (${generationResult.iteration} iterations, score: ${generationResult.validationScore}/100)`);
      });

      // Track token usage for contract generation
      // Estimate based on contract code length and iterations
      await step.run("record-contract-generation-tokens", async () => {
        try {
          const contractLength = generationResult.contractCode.length;
          // Rough estimate: ~4 chars per token for code
          const estimatedOutputTokens = Math.ceil(contractLength / 4);
          // Estimate input tokens based on prompt size and iterations
          const estimatedInputTokens = Math.ceil(estimatedOutputTokens * 1.5 * generationResult.iteration);
          
          if (event.data.userId) {
            await recordTokenUsage({
              userId: event.data.userId,
              projectId: event.data.projectId,
              provider: 'OPENAI',
              model: 'gpt-4.1',
              promptTokens: estimatedInputTokens,
              completionTokens: estimatedOutputTokens,
              endpoint: '/inngest/contract-generation',
            });
          }
        } catch (error) {
          console.error('Failed to record contract generation token usage:', error);
        }
      });
      
    } catch (error) {
      console.error('❌ AI contract generation failed:', error);
      
      await step.run("handle-ai-generation-error", async () => {
        await updateBuildProgress(buildJobId, 0, 'Contract generation failed', error instanceof Error ? error.message : 'Unknown error');
          
          await prisma.buildJob.update({
            where: { id: buildJobId },
            data: {
              status: 'FAILED',
              progress: 0,
            currentStep: 'AI contract generation failed',
              artifacts: {
              error: error instanceof Error ? error.message : 'Unknown error',
              contractCode: '',
              contractName: tokenName?.replace(/\s+/g, '') || 'Token',
              contractType: contractType,
              generationFailed: true,
            }
          }
        });
      });
      
      throw error;
    }

    const contractCode = generationResult.contractCode;

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

    // Verify sandbox health before compilation
    await step.run("verify-sandbox-health", async () => {
      await updateBuildProgress(buildJobId, 63, 'Verifying sandbox...', 'Checking sandbox health');
      
      try {
        const sandbox = await Sandbox.connect(sandboxId);
        const healthCheck = await sandbox.commands.run("echo 'healthy' && which forge");
        
        if (healthCheck.exitCode !== 0) {
          throw new Error('Sandbox health check failed - forge not found');
        }
        
        console.log('✅ Sandbox is healthy and ready');
        console.log('Forge location:', healthCheck.stdout);
        await updateBuildProgress(buildJobId, 64, 'Sandbox verified', 'Environment ready for compilation');
      } catch (error) {
        console.error('❌ Sandbox health check failed:', error);
        throw new Error(`Sandbox not responding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Compile with forge (with retry loop for compilation failures)
    let refinedContractCode = contractCode;
    let compilationAttempts = 0;
    const maxCompilationAttempts = 3;
    interface ForgeBuildResult {
      stdout: string;
      stderr: string;
      exitCode: number;
    }
    let lastForgeResult: ForgeBuildResult | null = null;
    
    await updateBuildProgress(buildJobId, 65, 'Compiling with forge...', 'Running forge build');
    
    const contractName = tokenName?.replace(/\s+/g, '') || 'Token';
    
    while (compilationAttempts < maxCompilationAttempts) {
      compilationAttempts++;
      console.log(`\n🔄 Compilation Attempt ${compilationAttempts}/${maxCompilationAttempts}`);
      
      // Update progress at start of each attempt
      await updateBuildProgress(
        buildJobId, 
        66 + (compilationAttempts * 2), 
        `Compilation attempt ${compilationAttempts}/${maxCompilationAttempts}`, 
        'Starting compilation cycle'
      );
      
      try {
        // Write the current contract code to the sandbox
        await step.run(`write-contract-${compilationAttempts}`, async () => {
        const sandbox = await Sandbox.connect(sandboxId);
          await sandbox.files.write(`/home/user/hello_template/src/${contractName}.sol`, refinedContractCode);
          console.log('✅ Contract file written/updated in sandbox');
        });
        
        // Compile with forge
        const stepResult = await step.run(`compile-attempt-${compilationAttempts}`, async () => {
          const sandbox = await Sandbox.connect(sandboxId);
          console.log('⚙️ Compiling with forge...');
          
          // Update progress before starting compilation
          await updateBuildProgress(
            buildJobId, 
            68 + (compilationAttempts * 2), 
            `Compiling with Forge (attempt ${compilationAttempts})...`, 
            'Running forge build command'
          );
          
          let forgeBuild: ForgeBuildResult | null = null;
          
          try {
            const result = await sandbox.commands.run("export PATH=\"$PATH:$HOME/.foundry/bin\" && cd /home/user/hello_template && forge build");
            forgeBuild = {
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr
            };
          } catch (error) {
            // CommandExitError when forge fails - this is expected!
            if (error instanceof Error && 'stdout' in error) {
              forgeBuild = {
                exitCode: 1,
                stdout: (error as ForgeCommandError).stdout || '',
                stderr: (error as ForgeCommandError).stderr || ''
              };
            } else {
              throw error;
            }
          }
          
          if (!forgeBuild) {
            throw new Error('Failed to get Forge build result');
          }
          
          console.log('Forge build result:', { 
          exitCode: forgeBuild.exitCode, 
            stdout: forgeBuild.stdout.substring(0, 500), 
            stderr: forgeBuild.stderr.substring(0, 500) 
          });
          
          if (forgeBuild.exitCode === 0) {
            // ✅ SUCCESS!
            console.log('✅ Forge compilation successful!');
            await updateBuildProgress(buildJobId, 80, 'Compilation successful', `Forge build completed on attempt ${compilationAttempts}`);
          } else {
            // Update progress if compilation failed but will retry
            await updateBuildProgress(
              buildJobId, 
              70, 
              `Compilation failed (attempt ${compilationAttempts})`, 
              'Parsing errors for AI refinement'
            );
          }
          
          return forgeBuild;
        });
        
        lastForgeResult = stepResult;
        
        // Check if last compilation was successful
        if (lastForgeResult) {
          if (lastForgeResult.exitCode === 0) {
            break; // Success!
          }
          
          // FAILURE - Parse errors and refine OUTSIDE the step
          console.error(`❌ Forge compilation failed on attempt ${compilationAttempts}`);
          console.error('STDOUT:', lastForgeResult.stdout);
          console.error('STDERR:', lastForgeResult.stderr);
          
          const forgeErrors = parseForgeOutput(lastForgeResult.stdout, lastForgeResult.stderr, lastForgeResult.exitCode);
          console.log('📋 Parsed Forge errors:', forgeErrors.errors);
          
          if (compilationAttempts >= maxCompilationAttempts) {
            // Out of retries
            console.error('❌ Max compilation attempts reached');
            throw new Error(`Forge compilation failed after ${maxCompilationAttempts} attempts: ${forgeErrors.errors.join(', ')}`);
          }
          
          // Refine the contract based on Forge errors (wrapped in step for tracking)
          console.log('🔧 Refining contract based on Forge errors...');
          
          refinedContractCode = await step.run(`refine-contract-attempt-${compilationAttempts}`, async () => {
            // Update progress - AI refinement starting
            await updateBuildProgress(
              buildJobId, 
              67 + (compilationAttempts * 3), 
              'AI analyzing errors...', 
              `Attempt ${compilationAttempts}: Sending errors to GPT-4.1 for analysis`
            );
            
            console.log('🤖 Calling GPT-4.1 to refine contract...');
            const refined = await refineContractWithForgeErrors(
              refinedContractCode,
              forgeErrors,
              userPrompt,
              enhancedConfig
            );
            
            // Update progress - AI refinement complete
            await updateBuildProgress(
              buildJobId, 
              70 + (compilationAttempts * 3), 
              'Contract refined, retrying...', 
              `Attempt ${compilationAttempts}: AI generated improved contract`
            );
            
            console.log('✅ Contract refined. Ready to retry compilation...');
            return refined;
          });
        }
      } catch (error) {
        console.error(`Compilation attempt ${compilationAttempts} error:`, error);
        
        // Update progress with error info
        await updateBuildProgress(
          buildJobId, 
          65 + (compilationAttempts * 5), 
          'Compilation attempt failed', 
          `Attempt ${compilationAttempts}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        
        if (compilationAttempts >= maxCompilationAttempts) {
          // Final failure - update build job to FAILED
          console.error('❌ All compilation attempts exhausted');
          await prisma.buildJob.update({
            where: { id: buildJobId },
            data: {
              status: 'FAILED',
              progress: 0,
              currentStep: 'Build failed after 3 compilation attempts',
              artifacts: {
                error: error instanceof Error ? error.message : 'Unknown error',
                lastGeneratedCode: refinedContractCode,
                totalAttempts: compilationAttempts,
                compilationFailed: true,
              },
            },
          });
        throw error;
      }
        
        // Retry with exponential backoff
        const backoffMs = Math.min(1000 * Math.pow(2, compilationAttempts - 1), 10000);
        console.log(`⏳ Waiting ${backoffMs}ms before retry attempt ${compilationAttempts + 1}...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        
        console.log(`🔄 Continuing to attempt ${compilationAttempts + 1}...`);
      }
    }

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
        
        for (const path of possiblePaths) {
          try {
            console.log(`Trying artifact path: ${path}`);
            artifactContent = await sandbox.files.read(path);
            console.log(`Successfully read artifact from: ${path}`);
            break;
          } catch {
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
      
      // Get existing logs before final update
      const existingJob = await prisma.buildJob.findUnique({ where: { id: buildJobId } });
      let finalLogs: string[] = [];
      
      if (existingJob?.logs) {
        try {
          finalLogs = JSON.parse(existingJob.logs);
        } catch {
          finalLogs = [];
        }
      }
      
      // Add final log entry
      const timestamp = new Date().toLocaleTimeString();
      finalLogs.push(`[${timestamp}] ✅ Contract compiled successfully with ABI and bytecode extracted`);
      
      await prisma.buildJob.update({
        where: { id: buildJobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Build complete! Ready to deploy.',
          artifacts: artifactsToSave,
          logs: JSON.stringify(finalLogs),
        },
      });
      
      console.log('✅ Successfully saved artifacts to database with 100% progress');
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
        const artifacts = buildJob.artifacts as unknown as BuildJobArtifactsJson;
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
            ...(buildJob.artifacts as unknown as Record<string, unknown>),
            verification: verificationResult,
          },
        },
      });
    });

    return verificationResult;
  },
);

// All template generation functions removed - using AI-only generation

// Helper functions for contract generation - REMOVED (using AI-only generation)
// All template generation functions have been replaced with AI generation

// Test Contract Function
export const testContract = inngest.createFunction(
  { id: 'test-contract' },
  { event: 'test-contract' },
  async ({ event, step }) => {
    const { buildJobId, contractCode, contractName, contractType } = event.data;

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
          details: [] as ContractTestDetail[],
        };

        if (forgeTest.exitCode === 0) {
          try {
            const testOutput = JSON.parse(forgeTest.stdout);
            if (testOutput.test_results) {
              for (const [testName, result] of Object.entries(testOutput.test_results)) {
                const testResult = result as ForgeTestCaseResult;
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

// Subscription expiry checker — runs daily at midnight UTC
export const checkExpiredSubscriptions = inngest.createFunction(
  { id: "check-expired-subscriptions" },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const now = new Date();

    const expiredUsers = await step.run("find-expired", async () => {
      return prisma.allowedUser.findMany({
        where: {
          subscriptionStatus: "ACTIVE",
          currentPeriodEnd: { lt: now },
          plan: { not: "FREE" },
        },
        select: { clerkUserId: true, plan: true, currentPeriodEnd: true },
      });
    });

    if (expiredUsers.length === 0) {
      return { downgraded: 0 };
    }

    const results = await step.run("downgrade-expired", async () => {
      let count = 0;
      for (const user of expiredUsers) {
        if (!user.clerkUserId) continue;

        await prisma.allowedUser.updateMany({
          where: { clerkUserId: user.clerkUserId },
          data: {
            plan: "FREE",
            status: "APPROVED",
            maxDailyTokens: 200_000,
            maxDailyRequests: 6,
            graceTokens: 20_000,
            subscriptionStatus: "EXPIRED",
            currentPeriodEnd: null,
          },
        });

        try {
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          await client.users.updateUserMetadata(user.clerkUserId, {
            publicMetadata: { plan: "FREE", subscriptionStatus: "EXPIRED" },
          });
        } catch (clerkErr) {
          console.error(`[cron] Failed to sync Clerk for ${user.clerkUserId}:`, clerkErr);
        }

        count++;
      }
      return count;
    });

    return { downgraded: results };
  }
);