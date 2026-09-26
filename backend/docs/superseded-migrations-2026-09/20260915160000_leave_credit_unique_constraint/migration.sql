-- Deduplicate LeaveCredit: keep the row with the smallest id per (tenantId, employeeId, type, year)
DELETE FROM "LeaveCredit"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "LeaveCredit"
  GROUP BY "tenantId", "employeeId", "type", "year"
);

-- Add compound unique constraint (PostgreSQL treats NULLs as distinct, so NULL tenantId rows are safe)
CREATE UNIQUE INDEX "LeaveCredit_tenantId_employeeId_type_year_key"
  ON "LeaveCredit"("tenantId", "employeeId", "type", "year");
