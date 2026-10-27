/**
 * Order of an account purge. Pure, so the ordering is unit-tested without a database or Razorpay.
 * Billing is cancelled first: if that fails, nothing is deleted, so the user can retry and no subscription is left running.
 */
export type PurgeSteps = {
  cancelSubscription: (clerkUserId: string) => Promise<unknown>;
  deleteAccountRows: (clerkUserId: string) => Promise<void>;
};

export async function runAccountPurge(clerkUserId: string, steps: PurgeSteps): Promise<void> {
  if (!clerkUserId) throw new Error("clerkUserId is required");
  await steps.cancelSubscription(clerkUserId);
  await steps.deleteAccountRows(clerkUserId);
}
