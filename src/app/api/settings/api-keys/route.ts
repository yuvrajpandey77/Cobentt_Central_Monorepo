import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { encryptApiKey, maskKey } from "@/lib/api-key-crypto";
import { validateProviderKey } from "@/lib/provider-validation";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";

const createKeySchema = z.object({
  provider: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  apiKey: z.string().min(10).max(500),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`api-keys:create:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { provider, name, apiKey } = parsed.data;

  const validation = validateProviderKey(provider, apiKey);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const existingCount = await prisma.apiKey.count({
    where: { clerkUserId: session.userId, provider, isActive: true },
  });
  if (existingCount >= 3) {
    return NextResponse.json(
      { error: `Maximum 3 active keys per provider` },
      { status: 400 }
    );
  }

  const { encrypted, iv, authTag } = encryptApiKey(apiKey);
  const { prefix, suffix } = maskKey(apiKey);

  const key = await prisma.apiKey.create({
    data: {
      clerkUserId: session.userId,
      provider,
      name,
      encryptedKey: encrypted,
      keyPrefix: prefix,
      keySuffix: suffix,
      iv,
      authTag,
    },
    select: {
      id: true,
      provider: true,
      name: true,
      keyPrefix: true,
      keySuffix: true,
      isActive: true,
      createdAt: true,
    },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "api_key.created",
    details: { provider, name, keyId: key.id },
  });

  return NextResponse.json({ key }, { status: 201 });
}
