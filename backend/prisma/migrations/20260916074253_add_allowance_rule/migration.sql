-- CreateTable
CREATE TABLE "AllowanceRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AllowanceRule_tenantId_effectiveFrom_idx" ON "AllowanceRule"("tenantId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "AllowanceRule" ADD CONSTRAINT "AllowanceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
