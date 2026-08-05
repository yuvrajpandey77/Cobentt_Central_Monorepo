import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({
  confirm: z.literal("DELETE MY ACCOUNT"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`account:delete:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Type "DELETE MY ACCOUNT" to confirm' },
      { status: 400 }
    );
  }

  const existing = await prisma.accountDeletionRequest.findUnique({
    where: { clerkUserId: session.userId },
  });

  if (existing && existing.status === "PENDING") {
    return NextResponse.json(
      { error: "Deletion already scheduled", executeAt: existing.executeAt },
      { status: 409 }
    );
  }

  const executeAt = new Date();
  executeAt.setDate(executeAt.getDate() + 30);

  const request = await prisma.accountDeletionRequest.create({
    data: {
      clerkUserId: session.userId,
      executeAt,
    },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "account.deletion_requested",
    details: { executeAt: executeAt.toISOString(), requestId: request.id },
  });

  return NextResponse.json({
    success: true,
    message: "Account deletion scheduled. You have 30 days to cancel.",
    executeAt,
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.accountDeletionRequest.findUnique({
    where: { clerkUserId: session.userId },
  });

  if (!existing || existing.status !== "PENDING") {
    return NextResponse.json({ error: "No pending deletion" }, { status: 404 });
  }

  await prisma.accountDeletionRequest.update({
    where: { clerkUserId: session.userId },
    data: { status: "CANCELLED" },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "account.deletion_cancelled",
  });

  return NextResponse.json({ success: true });
}
