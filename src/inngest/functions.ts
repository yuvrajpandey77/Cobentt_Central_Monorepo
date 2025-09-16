import { inngest } from "./client";
import { openai, createAgent, createTool, createNetwork , AnyZodType, Tool } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { PROMPT } from "@/prompt";
import { z } from "zod";
import prisma from "@/lib/db";


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
      return sandbox.sandboxId;
    });

    const CogerphereCodeAgent = createAgent<CogerphereAgentResult>({
      name: "Coding-Agent",
      description: "An expert coding agent",
      system: PROMPT,
      model: openai({ 
        model:  "gpt-4.1",
      
       }),    
      tools: [
        createTool({
          name: "terminal",
          description: "use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          })as unknown as AnyZodType ,
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
          })as unknown as AnyZodType ,
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
          })as unknown as AnyZodType ,
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
          const lastAssistantMessageText  = 
          lastAssistantTextMessageContent(result);
          if (lastAssistantMessageText && network) {
            if(lastAssistantMessageText.includes("<task_summary>")) {
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
      maxIter: 15,
      router: async ({  network }) => {
        const summary = network.state.data.summary;
          if (summary) {
            return;
          } 
          return CogerphereCodeAgent; 
        },
    });

    const result = await network.run(event.data.value);
     
    const isError = !result.state.data.summary || Object.keys(result.state.data.files|| {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });
    
    await step.run("save-result", async () => {
      if(isError) {
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
          content: result.state.data.summary,
          role: "ASSISTANT",
          type: "RESULT",
          fragments: {
            create: {
              sandboxUrl: sandboxUrl,
              title: "Fragment",
              files: result.state.data.files,
            }
          }
        }
      })
    });
       
    return { 
      url: sandboxUrl,  
      title: "Fragment",
      files: result.state.data.files,
      summary: result.state.data.summary,
     };
  },
);             