-- Idempotent. Equivalent to `prisma db push` for these changes (this repo's migrations folder does not cover every table).
ALTER TABLE "payment_records" ADD COLUMN IF NOT EXISTS "product" TEXT;
ALTER TABLE "allowed_users" ADD COLUMN IF NOT EXISTS "planKey" TEXT;

CREATE TABLE IF NOT EXISTS "token_wallets" (
  "clerkUserId"   TEXT PRIMARY KEY,
  "planST"        BIGINT NOT NULL DEFAULT 0 CHECK ("planST" >= 0),
  "planExpiresAt" TIMESTAMP(3),
  "paygST"        BIGINT NOT NULL DEFAULT 0 CHECK ("paygST" >= 0),
  "paygExpiresAt" TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "token_ledger" (
  "id"               TEXT PRIMARY KEY,
  "clerkUserId"      TEXT NOT NULL,
  "kind"             TEXT NOT NULL,
  "deltaST"          BIGINT NOT NULL,
  "fromPlan"         BIGINT NOT NULL DEFAULT 0,
  "fromPayg"         BIGINT NOT NULL DEFAULT 0,
  "refId"            TEXT NOT NULL,
  "model"            TEXT,
  "promptTokens"     INTEGER,
  "completionTokens" INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "token_ledger_refId_key" ON "token_ledger"("refId");
CREATE INDEX IF NOT EXISTS "token_ledger_clerkUserId_createdAt_idx" ON "token_ledger"("clerkUserId", "createdAt");
