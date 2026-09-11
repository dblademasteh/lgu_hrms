-- Tenancy scaffold: Vacancy.model
-- tenantId is NULLABLE so existing rows are visible to legacy sessions
-- and adoptable by backfill. See §Tenant model + tenantContext in middleware/tenant.js.

ALTER TABLE "Vacancy"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "Vacancy"
  ADD CONSTRAINT "Vacancy_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "Vacancy_tenantId_idx" ON "Vacancy" ("tenantId");
