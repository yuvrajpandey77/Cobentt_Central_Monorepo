-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "aiConfiguration" JSONB,
ADD COLUMN     "gasOptimizations" TEXT[],
ADD COLUMN     "securityNotes" TEXT[];
