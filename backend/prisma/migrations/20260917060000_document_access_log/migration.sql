-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('VIEWED', 'DOWNLOADED', 'PRINTED', 'EXPORTED');

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "DocumentAccessAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_documentId_createdAt_idx" ON "DocumentAccessLog"("tenantId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_userId_createdAt_idx" ON "DocumentAccessLog"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_action_createdAt_idx" ON "DocumentAccessLog"("tenantId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalize legacy document URLs (strip leading slash) so storage paths are relative
UPDATE "Document" SET "url" = regexp_replace("url", '^/+', '') WHERE "url" LIKE '/%';
