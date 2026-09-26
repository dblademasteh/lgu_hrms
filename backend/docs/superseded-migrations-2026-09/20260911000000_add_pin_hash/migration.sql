-- AlterTable
ALTER TABLE "User" ADD COLUMN "pinHash" TEXT;

-- Backfill: existing accounts start a fresh 30-day password window.
UPDATE "User" SET "passwordChangedAt" = NOW() WHERE "passwordChangedAt" IS NULL;
