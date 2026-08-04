import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { logUserAuditEvent } from "@/lib/user-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { clerkUserId: session.userId },
    select: {
      bio: true,
      company: true,
      website: true,
      location: true,
      timezone: true,
      socialLinks: true,
    },
  });

  return NextResponse.json(profile || { bio: null, company: null, website: null, location: null, timezone: null, socialLinks: null });
}

const updateProfileSchema = z.object({
  bio: z.string().max(500).optional(),
  company: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  location: z.string().max(100).optional(),
  timezone: z.string().optional(),
  socialLinks: z
    .object({
      github: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
    })
    .optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`profile:update:${session.userId}`);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { bio, company, website, location, timezone, socialLinks } = parsed.data;

  await prisma.userProfile.upsert({
    where: { clerkUserId: session.userId },
    create: {
      clerkUserId: session.userId,
      bio,
      company,
      website: website || null,
      location,
      timezone,
      socialLinks,
    },
    update: {
      bio,
      company,
      website: website || null,
      location,
      timezone,
      socialLinks,
    },
  });

  await logUserAuditEvent({
    clerkUserId: session.userId,
    event: "profile.updated",
  });

  return NextResponse.json({ success: true });
}
