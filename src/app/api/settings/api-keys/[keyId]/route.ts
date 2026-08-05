import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";

const deleteKeySchema = z.object({
  keyId: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`api-keys:delete:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = deleteKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const key = await prisma.apiKey.findFirst({
    where: { id: parsed.data.keyId, clerkUserId: session.userId },
  });

  if (!key) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  await prisma.apiKey.delete({
    where: { id: parsed.data.keyId },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "api_key.deleted",
    details: { provider: key.provider, keyId: key.id },
  });

  return NextResponse.json({ success: true });
}
