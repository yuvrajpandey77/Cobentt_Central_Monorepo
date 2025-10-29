import "dotenv/config";
import { recordTokenUsage } from "../src/lib/token-usage";
import prisma from "../src/lib/db";

async function main() {
  // Try to pick an existing approved/any allowed user or fallback to the latest user_usage row
  const anyUsage = await prisma.userUsage.findFirst({ orderBy: { updatedAt: "desc" } as any });
  const userId = anyUsage?.userId;
  if (!userId) {
    throw new Error("No userId found in user_usage. Create a project/message once, then re-run.");
  }
  console.log("Using userId:", userId);

  await recordTokenUsage({
    userId,
    provider: "OPENAI" as any,
    model: "gpt-4o-mini",
    promptTokens: 15,
    completionTokens: 25,
    endpoint: "/scripts/test-record-usage",
  });

  console.log("Recorded a test token usage row.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});


