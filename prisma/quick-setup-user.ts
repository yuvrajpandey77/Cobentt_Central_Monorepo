import { PrismaClient } from "../src/generated/prisma";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  console.log("🚀 Cogerphere User Setup\n");

  const clerkUserId = await question("Enter your Clerk User ID: ");

  if (!clerkUserId || clerkUserId.trim() === "") {
    console.error("❌ Error: Clerk User ID is required");
    process.exit(1);
  }

  const email = await question("Enter your email (or press Enter for default): ");
  const name = await question("Enter your display name (or press Enter for default): ");

  console.log("\n🔄 Setting up user...");

  try {
    // Check if user already exists
    const existing = await prisma.allowedUser.findUnique({
      where: { clerkUserId: clerkUserId.trim() },
    });

    if (existing) {
      console.log(`\n✅ User already exists!`);
      console.log(`- Email: ${existing.email}`);
      console.log(`- Status: ${existing.status}`);
      console.log(`- Daily Requests: ${existing.maxDailyRequests}`);
      console.log(`- Daily Tokens: ${existing.maxDailyTokens.toLocaleString()}`);

      if (existing.status !== "APPROVED") {
        const approve = await question("\nUser is not approved. Approve now? (y/n): ");
        if (approve.toLowerCase() === "y") {
          await prisma.allowedUser.update({
            where: { clerkUserId: clerkUserId.trim() },
            data: {
              status: "APPROVED",
              approvedAt: new Date(),
            },
          });
          console.log("✅ User approved!");
        }
      }
    } else {
      // Create new user
      const newUser = await prisma.allowedUser.create({
        data: {
          clerkUserId: clerkUserId.trim(),
          email: email.trim() || "user@cogerphere.local",
          status: "APPROVED",
          approvedAt: new Date(),
          maxDailyRequests: 100,
          maxDailyTokens: 500000,
          graceTokens: 50000,
        },
      });

      console.log("\n✅ User created successfully!");
      console.log(`- Clerk ID: ${newUser.clerkUserId}`);
      console.log(`- Email: ${newUser.email}`);
      console.log(`- Status: ${newUser.status}`);
      console.log(`- Daily Requests: ${newUser.maxDailyRequests}`);
      console.log(`- Daily Tokens: ${newUser.maxDailyTokens.toLocaleString()}`);
      console.log(`- Grace Tokens: ${newUser.graceTokens.toLocaleString()}`);
    }

    // Ensure UserUsage record exists
    const usage = await prisma.userUsage.findUnique({
      where: { userId: clerkUserId.trim() },
    });

    if (!usage) {
      await prisma.userUsage.create({
        data: {
          userId: clerkUserId.trim(),
          dailyRequests: 0,
          dailyTokens: 0,
          totalRequests: 0,
          totalTokens: 0,
          lastResetAt: new Date(),
        },
      });
      console.log("✅ User usage tracking initialized");
    }

    console.log("\n🎉 Setup complete! You can now use the application.");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

