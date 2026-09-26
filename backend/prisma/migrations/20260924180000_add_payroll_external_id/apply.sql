-- Apply migration
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollRun_externalId_idx" ON "PayrollRun"("tenantId", "externalId");

ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "PayrollItem_externalId_idx" ON "PayrollItem"("tenantId", "externalId");

ALTER TABLE "Payslip" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
CREATE INDEX IF NOT EXISTS "Payslip_externalId_idx" ON "Payslip"("tenantId", "externalId");

-- Mark as applied
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES ('manual-payroll-external-id', 'manual', NOW(), '20260924180000_add_payroll_external_id', NULL, NULL, NOW(), 1)
ON CONFLICT ("migration_name") DO NOTHING;
