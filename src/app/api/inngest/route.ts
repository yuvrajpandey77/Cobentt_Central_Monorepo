import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { CobenttAgent, generateContract, verifyContract, testContract } from "@/inngest/functions";
import { runPersonalTask } from "@/inngest/personal-tasks";

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

// Create an API that serves all Inngest functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    CobenttAgent,
    generateContract,
    verifyContract,
    testContract,
    runPersonalTask,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});