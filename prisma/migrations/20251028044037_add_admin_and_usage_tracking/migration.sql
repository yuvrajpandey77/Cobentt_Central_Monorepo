-- CreateEnum
CREATE TYPE "public"."AllowedUserStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "clerkUserId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."allowed_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "clerkUserId" TEXT,
    "status" "public"."AllowedUserStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "maxDailyRequests" INTEGER NOT NULL DEFAULT 6,
    "maxDailyTokens" INTEGER NOT NULL DEFAULT 200000,
    "totalRequestsAllowed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "allowed_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyRequests" INTEGER NOT NULL DEFAULT 0,
    "dailyTokens" INTEGER NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "lastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_action_logs" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetEmail" TEXT,
    "changes" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "public"."admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_users_email_key" ON "public"."allowed_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_usage_userId_key" ON "public"."user_usage"("userId");

-- CreateIndex
CREATE INDEX "admin_action_logs_adminEmail_timestamp_idx" ON "public"."admin_action_logs"("adminEmail", "timestamp");
