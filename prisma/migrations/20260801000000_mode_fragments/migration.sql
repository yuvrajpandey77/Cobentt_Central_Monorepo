-- AlterTable
ALTER TABLE "public"."conversations" ADD COLUMN "template" TEXT;

-- AlterTable
ALTER TABLE "public"."Fragment" ADD COLUMN "mode" TEXT,
ADD COLUMN "meta" JSONB,
ALTER COLUMN "sandboxUrl" DROP NOT NULL;
