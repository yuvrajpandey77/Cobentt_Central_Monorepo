import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Get the Clerk User ID from command line argument
  const clerkUserId = process.argv[2];

  if (!clerkUserId) {
    console.error("❌ Error: Please provide your Clerk User ID");
    console.log("\nUsage: npx tsx prisma/seed-current-user.ts <YOUR_CLERK_USER_ID>");
    console.log("\nTo find your Clerk User ID:");
    console.log("1. Open your browser console on the app");
    console.log("2. Run: localStorage.getItem('clerk-db-jwt')");
    console.log("3. Or check the Clerk Dashboard -> Users");
    process.exit(1);
  }

  console.log(`🔄 Adding user ${clerkUserId} to allowed users...`);

  try {
    // Check if user already exists
    const existing = await prisma.allowedUser.findUnique({
      where: { clerkUserId },
    });

    if (existing) {
      console.log(`✅ User already exists with status: ${existing.status}`);
      
      // Update to ensure they're approved
      if (existing.status !== "APPROVED") {
        await prisma.allowedUser.update({
          where: { clerkUserId },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });
        console.log("✅ User status updated to APPROVED");
      }
    } else {
      // Create new allowed user with generous limits for development
      const newUser = await prisma.allowedUser.create({
        data: {
          clerkUserId,
          email: "dev@cogerphere.local", // Can be updated later
          status: "APPROVED",
          approvedAt: new Date(),
          maxDailyRequests: 100, // Increased for development
          maxDailyTokens: 500000, // 500k tokens per day
          graceTokens: 50000, // 50k grace tokens
        },
      });

      console.log("✅ User added successfully!");
      console.log(`\nUser Details:`);
      console.log(`- Clerk ID: ${newUser.clerkUserId}`);
      console.log(`- Email: ${newUser.email}`);
      console.log(`- Status: ${newUser.status}`);
      console.log(`- Daily Requests: ${newUser.maxDailyRequests}`);
      console.log(`- Daily Tokens: ${newUser.maxDailyTokens.toLocaleString()}`);
      console.log(`- Grace Tokens: ${newUser.graceTokens.toLocaleString()}`);
    }

    // Also ensure UserUsage record exists
    const usage = await prisma.userUsage.findUnique({
      where: { userId: clerkUserId },
    });

    if (!usage) {
      await prisma.userUsage.create({
        data: {
          userId: clerkUserId,
          dailyRequests: 0,
          dailyTokens: 0,
          totalRequests: 0,
          totalTokens: 0,
          lastResetAt: new Date(),
        },
      });
      console.log("✅ User usage record created");
    }

    console.log("\n🎉 Setup complete! You can now use the application.");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
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

