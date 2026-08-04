import { clerkClient } from "@clerk/nextjs/server";

/**
 * Update user metadata in Clerk.
 *
 * This is used to sync subscription status, plan, and other
 * application-specific data to the Clerk user record.
 *
 * @see https://clerk.com/docs/references/backend/user/update-user-metadata
 */
export async function updateUserMetadata(
  userId: string,
  metadata: {
    publicMetadata?: Record<string, unknown>;
    privateMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, metadata);
    return true;
  } catch (error) {
    console.error(`Failed to update Clerk metadata for user ${userId}:`, error);
    return false;
  }
}

/**
 * Get user from Clerk by ID.
 */
export async function getClerkUser(userId: string) {
  try {
    const client = await clerkClient();
    return await client.users.getUser(userId);
  } catch (error) {
    console.error(`Failed to get Clerk user ${userId}:`, error);
    return null;
  }
}

/**
 * Get user's email addresses from Clerk.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const user = await getClerkUser(userId);
    if (!user) return null;
    return user.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}
