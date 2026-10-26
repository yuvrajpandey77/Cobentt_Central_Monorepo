import prisma from "@/lib/db";
import { cancelSubscriptionForDeletion } from "@/lib/razorpay-subscriptions";
import { runAccountPurge } from "@/lib/account-purge-core";

/** Replaces the Clerk id on payment rows kept for tax records, so they no longer point at a person. */
export const ERASED_PAYMENT_OWNER = "erased";

/** Cancels billing, then removes this account's rows from the website database. Safe to run again. */
export async function purgeAccount(clerkUserId: string): Promise<void> {
  await runAccountPurge(clerkUserId, {
    cancelSubscription: cancelSubscriptionForDeletion,
    deleteAccountRows: deleteAccountRows,
  });
}

async function deleteAccountRows(clerkUserId: string): Promise<void> {
  await prisma.$transaction([
    prisma.tokenLedger.deleteMany({ where: { clerkUserId } }),
    prisma.tokenWallet.deleteMany({ where: { clerkUserId } }),
    prisma.apiKey.deleteMany({ where: { clerkUserId } }),
    prisma.userProfile.deleteMany({ where: { clerkUserId } }),
    prisma.userAuditLog.deleteMany({ where: { clerkUserId } }),
    prisma.paymentAuditLog.updateMany({ where: { clerkUserId }, data: { clerkUserId: null } }),
    prisma.paymentRecord.updateMany({
      where: { clerkUserId },
      data: { clerkUserId: ERASED_PAYMENT_OWNER, allowedUserId: null },
    }),
    prisma.allowedUser.deleteMany({ where: { clerkUserId } }),
    prisma.accountDeletionRequest.deleteMany({ where: { clerkUserId } }),
  ]);
}
