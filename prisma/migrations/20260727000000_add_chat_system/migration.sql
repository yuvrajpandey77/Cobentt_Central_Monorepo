-- Baseline: schema already applied via prisma db push
-- Create MessageStatus enum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETE', 'ERROR', 'CANCELLED');

-- Create conversations table
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- Alter Message table
ALTER TABLE "Message" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Message" ADD COLUMN "conversationId" TEXT;
ALTER TABLE "Message" ADD COLUMN "parentMessageId" TEXT;
ALTER TABLE "Message" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'COMPLETE';
ALTER TABLE "Message" ADD COLUMN "modelUsed" TEXT;
ALTER TABLE "Message" ADD COLUMN "tokenCount" INTEGER;
ALTER TABLE "Message" ADD COLUMN "feedbackValue" INTEGER;

-- Add isPinned to Project (might already exist)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS "conversations_userId_updatedAt_idx" ON "conversations"("userId", "updatedAt");

-- Add foreign keys
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
