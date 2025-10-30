-- AlterTable
ALTER TABLE "public"."BuildJob" ADD COLUMN     "currentStep" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;
