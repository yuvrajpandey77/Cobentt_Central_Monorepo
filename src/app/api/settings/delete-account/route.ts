import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { purgeAccount } from "@/lib/account-purge";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  confirm: z.literal("DELETE MY ACCOUNT"),
});

/**
 * Deletes the account now: cancels billing, removes the website rows, then the sign-in account.
 * Immediate, like the mobile app. Re-running after a partial failure is safe.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`account:delete:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type "DELETE MY ACCOUNT" to confirm' }, { status: 400 });
  }

  try {
    await purgeAccount(session.userId);
  } catch (err) {
    console.error("[account] purge failed:", err);
    return NextResponse.json({ error: "Could not cancel billing, so your account was not deleted. Try again." }, { status: 503 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(session.userId);
  } catch (err) {
    // Billing and website rows are already gone. Retrying this route finishes the job.
    console.error("[account] clerk delete failed:", err);
    return NextResponse.json({ error: "Your data was removed, but the sign-in account could not be deleted. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
