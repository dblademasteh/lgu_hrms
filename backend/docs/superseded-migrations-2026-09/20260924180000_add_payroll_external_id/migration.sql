-- Add externalId to PayrollPeriod
ALTER TABLE "PayrollPeriod" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollPeriod_externalId_idx" ON "PayrollPeriod"("tenantId", "externalId");

-- Add externalId to PayrollRun
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollRun_externalId_idx" ON "PayrollRun"("tenantId", "externalId");

-- Add externalId to PayrollItem
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollItem_externalId_idx" ON "PayrollItem"("tenantId", "externalId");

-- Add externalId to Payslip
ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "Payslip_externalId_idx" ON "Payslip"("tenantId", "externalId");
