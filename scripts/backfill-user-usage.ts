import "dotenv/config";
import prisma from "../src/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

async function main() {
  const users = await prisma.allowedUser.findMany({
    where: { status: "APPROVED" },
    select: { clerkUserId: true },
  });

  for (const u of users) {
    if (!u.clerkUserId) continue;
    const existing = await prisma.userUsage.findUnique({
      where: { userId: u.clerkUserId },
    });
    if (existing) continue;

    await prisma.userUsage.create({
      data: {
        userId: u.clerkUserId,
        dailyRequests: 0,
        dailyTokens: 0,
        totalRequests: 0,
        totalTokens: 0,
        totalCostUsd: new Decimal(0),
        lastResetAt: new Date(),
        alert90Sent: false,
        alert100Sent: false,
      },
    });
    console.log("Backfilled user_usage for", u.clerkUserId);
  }
}

main().catch((err) => {
  console.error("Backfill failed", err);
  process.exit(1);
});


