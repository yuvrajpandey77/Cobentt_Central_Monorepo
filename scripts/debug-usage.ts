import "dotenv/config";
import prisma from "../src/lib/db";

async function main() {
  console.log("=== Debug Usage Snapshot ===");

  const total = await prisma.tokenUsage.count();
  console.log("token_usage total:", total);

  const last5 = await prisma.tokenUsage.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      userId: true,
      projectId: true,
      provider: true,
      model: true,
      totalTokens: true,
      endpoint: true,
      createdAt: true,
    },
  });
  console.log("last 5 token_usage:");
  for (const row of last5) {
    console.log(row);
  }

  const usageCount = await prisma.userUsage.count();
  console.log("user_usage total rows:", usageCount);

  const someUsage = await prisma.userUsage.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  console.log("top 5 user_usage by updatedAt:");
  for (const u of someUsage) {
    console.log({
      userId: u.userId,
      dailyRequests: u.dailyRequests,
      dailyTokens: u.dailyTokens,
      totalRequests: u.totalRequests,
      totalTokens: u.totalTokens,
      totalCostUsd: u.totalCostUsd?.toString?.() ?? String(u.totalCostUsd),
      lastResetAt: u.lastResetAt,
      updatedAt: u.updatedAt,
    });
  }

  console.log("=== End Debug ===");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


