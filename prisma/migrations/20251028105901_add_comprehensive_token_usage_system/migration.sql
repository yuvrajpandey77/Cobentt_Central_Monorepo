/*
  Warnings:

  - A unique constraint covering the columns `[clerkUserId]` on the table `allowed_users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."UserPlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."AIProvider" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateEnum
CREATE TYPE "public"."WebhookEventType" AS ENUM ('QUOTA_WARNING_90', 'QUOTA_WARNING_100', 'QUOTA_EXCEEDED', 'LIMIT_CHANGED', 'PLAN_UPGRADED', 'PLAN_DOWNGRADED');

-- AlterTable
ALTER TABLE "public"."allowed_users" ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "graceResetAt" TIMESTAMP(3),
ADD COLUMN     "graceTokens" INTEGER NOT NULL DEFAULT 20000,
ADD COLUMN     "graceUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan" "public"."UserPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "webhookEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "webhookSecret" TEXT,
ADD COLUMN     "webhookUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."user_usage" ADD COLUMN     "alert100Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alert90Sent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCostUsd" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."token_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "messageId" TEXT,
    "provider" "public"."AIProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,6) NOT NULL,
    "endpoint" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "public"."WebhookEventType" NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "percentUsed" INTEGER NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "tokenLimit" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "usage_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "token_usage_userId_createdAt_idx" ON "public"."token_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "token_usage_projectId_createdAt_idx" ON "public"."token_usage"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_userId_createdAt_idx" ON "public"."webhook_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_success_nextRetryAt_idx" ON "public"."webhook_logs"("success", "nextRetryAt");

-- CreateIndex
CREATE INDEX "usage_alerts_userId_sentAt_idx" ON "public"."usage_alerts"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "admin_action_logs_targetEmail_timestamp_idx" ON "public"."admin_action_logs"("targetEmail", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_users_clerkUserId_key" ON "public"."allowed_users"("clerkUserId");

-- CreateIndex
CREATE INDEX "allowed_users_clerkUserId_idx" ON "public"."allowed_users"("clerkUserId");

-- AddForeignKey
ALTER TABLE "public"."token_usage" ADD CONSTRAINT "token_usage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."token_usage" ADD CONSTRAINT "token_usage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."token_usage" ADD CONSTRAINT "token_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_usage"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
