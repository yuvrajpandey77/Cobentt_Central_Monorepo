import { inngest } from "./client";
import { openai , createAgent} from "@inngest/agent-kit";

export const CogerphereAgent = inngest.createFunction(
  { id: "COGERPHERE" },
  { event: "test/Cogerphereai" },
  async ({ event }) => {
    const CogerphereAgent = createAgent ({
      name:"Coding-Agent",
      system: "You are an expert Developer. You write readable, maintainable code. You write simple Next.js & React snippets",
      model: openai({model: "gpt-4o" })
    })
    const {output} = await CogerphereAgent.run(
      `Write the following sinppet: ${event.data.value}`,
    );
    
    console.log(output);
    return {output};
  },
);