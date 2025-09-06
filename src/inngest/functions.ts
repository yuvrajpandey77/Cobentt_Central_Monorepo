import { inngest } from "./client";
import { openai , createAgent} from "@inngest/agent-kit";
import {Sandbox} from "@e2b/code-interpreter";
import { stepsSchemas } from "inngest/api/schema";
import { getSandbox } from "./utils";


export const CogerphereAgent = inngest.createFunction(
  { id: "COGERPHERE" },
  { event: "test/Cogerphereai" },
  async ({ event,step }) => {
    

    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("cogerphereailabsbeta1");
      return sandbox.sandboxId;
    })
    
    const CogerphereAgent = createAgent ({
      name:"Coding-Agent",
      system: "You are an expert Developer. You write readable, maintainable code. You write simple Next.js & React snippets",
      model: openai({
        model: "gpt-4o",
       })
    })
    const {output} = await CogerphereAgent.run(
      `Write the following sinppet: ${event.data.value}`,
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host =  sandbox.getHost(3000);
      return `https://${host}`;
    })
    
    console.log(output);
    return {output, sandboxUrl};
  },
);