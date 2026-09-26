-- Add workflow audit fields
ALTER TABLE "Document" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Document" ADD COLUMN "approvedAt" TIMESTAMPTZ(6);
ALTER TABLE "Document" ADD COLUMN "rejectedBy" TEXT;
ALTER TABLE "Document" ADD COLUMN "rejectedAt" TIMESTAMPTZ(6);
ALTER TABLE "Document" ADD COLUMN "archivedBy" TEXT;
ALTER TABLE "Document" ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
ALTER TABLE "Document" ADD COLUMN "creatorId" TEXT;
ALTER TABLE "Document" ADD COLUMN "retentionClass" TEXT;
ALTER TABLE "Document" ADD COLUMN "seriesCode" TEXT;

-- Index for M1 taxonomy filtering
CREATE INDEX "Document_tenantId_seriesCode_idx" ON "Document"("tenantId", "seriesCode");
