-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "forkedFromId" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Project_isPublic_idx" ON "public"."Project"("isPublic");

-- CreateIndex
CREATE INDEX "Project_userId_isPublic_idx" ON "public"."Project"("userId", "isPublic");

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "public"."Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
