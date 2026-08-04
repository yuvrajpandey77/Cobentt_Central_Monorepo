import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";

/**
 * Admin authorization helpers.
 *
 * Provides centralized admin access control with logging.
 */

export interface AdminUser {
  id: string;
  clerkUserId: string | null;
  email: string;
  role: string;
}

/**
 * Verify that a user is an admin. Throws FORBIDDEN if not.
 *
 * @param userId - The Clerk user ID to check
 * @returns The admin record if authorized
 */
export async function requireAdmin(userId: string): Promise<AdminUser> {
  const admin = await prisma.adminUser.findFirst({
    where: { clerkUserId: userId },
  });

  if (!admin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return admin;
}

/**
 * Check if a user is an admin (non-throwing).
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = await prisma.adminUser.findFirst({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  return !!admin;
}

/**
 * Get admin user by Clerk ID (non-throwing).
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  return prisma.adminUser.findFirst({
    where: { clerkUserId: userId },
  });
}
