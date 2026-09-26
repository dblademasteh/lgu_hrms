-- Payroll is authoritative in lgu-payroll; HRMS mirrors it.
-- Tag every payroll row with its origin so a mirrored row is never
-- mistaken for one HRMS computed itself.

CREATE TYPE "PayrollSource" AS ENUM ('LOCAL', 'LGU_PAYROLL');

ALTER TABLE "PayrollPeriod" ADD COLUMN IF NOT EXISTS "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "PayrollItem" ADD COLUMN IF NOT EXISTS "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL';

-- Rows carrying an externalId were written by payrollAdapter, not locally.
UPDATE "PayrollPeriod" SET "source" = 'LGU_PAYROLL' WHERE "externalId" IS NOT NULL;
UPDATE "PayrollRun" SET "source" = 'LGU_PAYROLL' WHERE "externalId" IS NOT NULL;
UPDATE "PayrollItem" SET "source" = 'LGU_PAYROLL' WHERE "externalId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "PayrollPeriod_source_idx" ON "PayrollPeriod"("tenantId", "source");
CREATE INDEX IF NOT EXISTS "PayrollRun_source_idx" ON "PayrollRun"("tenantId", "source");
CREATE INDEX IF NOT EXISTS "PayrollItem_source_idx" ON "PayrollItem"("tenantId", "source");
