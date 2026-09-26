-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OFFICE_ORDER', 'POLICY', 'MSB_CONSTITUTION', 'LD_PLAN', 'MINUTES', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT,
    "version" TEXT,
    "effectiveDate" DATE,
    "publishedBy" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_tenantId_type_idx" ON "Document"("tenantId", "type");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
