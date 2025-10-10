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
        model: "gpt-4o-mini",
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