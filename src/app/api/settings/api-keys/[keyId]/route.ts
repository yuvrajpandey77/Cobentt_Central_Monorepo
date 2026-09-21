import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logUserAuditEvent } from "@/lib/user-audit";
import { encryptApiKey, maskKey } from "@/lib/api-key-crypto";
import { validateProviderKey } from "@/lib/provider-validation";

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

const rotateKeySchema = z.object({
  keyId: z.string().uuid(),
  // New raw key material — validated, encrypted, then dropped. Never logged.
  apiKey: z.string().min(10).max(500),
});

/** Rotate (update) a saved key's secret without changing its id/name. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`api-keys:update:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = rotateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const record = await prisma.apiKey.findFirst({
    where: { id: parsed.data.keyId, clerkUserId: session.userId, isActive: true },
  });
  if (!record) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  const validation = validateProviderKey(record.provider, parsed.data.apiKey);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { encrypted, iv, authTag } = encryptApiKey(parsed.data.apiKey);
  const { prefix, suffix } = maskKey(parsed.data.apiKey);

  const updated = await prisma.apiKey.update({
    where: { id: record.id },
    data: { encryptedKey: encrypted, iv, authTag, keyPrefix: prefix, keySuffix: suffix, lastUsedAt: null },
    select: {
      id: true,
      provider: true,
      name: true,
      keyPrefix: true,
      keySuffix: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "api_key.rotated",
    details: { provider: record.provider, keyId: record.id },
  });

  return NextResponse.json({ key: updated });
}
