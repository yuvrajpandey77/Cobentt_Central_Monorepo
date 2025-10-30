-- CreateEnum
CREATE TYPE "public"."ProjectType" AS ENUM ('WEBSITE', 'DAPP', 'SMART_CONTRACT');

-- CreateEnum
CREATE TYPE "public"."Blockchain" AS ENUM ('ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'SOLANA');

-- CreateEnum
CREATE TYPE "public"."ContractType" AS ENUM ('ERC20', 'ERC721', 'ERC1155', 'PAYMENT_SPLITTER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."Network" AS ENUM ('MAINNET', 'TESTNET');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('GENERATE', 'COMPILE', 'DEPLOY', 'VERIFY');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "blockchain" "public"."Blockchain",
ADD COLUMN     "contractAddress" TEXT,
ADD COLUMN     "contractType" "public"."ContractType",
ADD COLUMN     "decimals" TEXT,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "network" "public"."Network",
ADD COLUMN     "projectType" "public"."ProjectType" NOT NULL DEFAULT 'WEBSITE',
ADD COLUMN     "tokenName" TEXT,
ADD COLUMN     "tokenSupply" TEXT,
ADD COLUMN     "tokenSymbol" TEXT;

-- CreateTable
CREATE TABLE "public"."BuildJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL,
    "logs" TEXT,
    "artifacts" JSONB,
    "contractAddress" TEXT,
    "transactionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuildJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BuildJob" ADD CONSTRAINT "BuildJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
