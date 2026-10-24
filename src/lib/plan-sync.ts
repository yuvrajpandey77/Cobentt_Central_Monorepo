import prisma from "@/lib/db";

/**
 * Writes the user's plan into Clerk public metadata. The Rust API and the mobile app read this, so it is what makes a
 * purchase on the website unlock Cloud in the app. Failure is logged and reported, never silently ignored.
 */
export async function syncPlanMetadata(clerkUserId: string): Promise<boolean> {
  try {
    const u = await prisma.allowedUser.findUnique({
      where: { clerkUserId },
      select: { plan: true, planKey: true, subscriptionStatus: true, currentPeriodEnd: true },
    });
    if (!u) return false;
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: {
        plan: u.plan,
        planKey: u.planKey,
        subscriptionStatus: u.subscriptionStatus,
        currentPeriodEnd: u.currentPeriodEnd ? u.currentPeriodEnd.toISOString() : null,
      },
    });
    return true;
  } catch (err) {
    console.error("[plan-sync] Clerk metadata sync failed:", err);
    return false;
  }
}
