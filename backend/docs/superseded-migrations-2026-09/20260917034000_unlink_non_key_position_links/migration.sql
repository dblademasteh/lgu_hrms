-- Unlink user accounts whose linked employee is not tagged to a key position.
-- Only touches externalIds that actually resolve to an Employee.employeeNumber
-- (OIDC `sub` values and other non-employee identifiers are left alone).
UPDATE "User" AS u
SET "externalId" = NULL
WHERE EXISTS (
  SELECT 1
  FROM "Employee" AS e
  WHERE e."employeeNumber" = u."externalId"
    AND (e."keyPosition" IS NULL OR btrim(e."keyPosition") = '')
);

-- Clear the legacy deactivation sentinel (previously written by /account/deactivate).
UPDATE "User"
SET "externalId" = NULL
WHERE "externalId" = 'DEACTIVATED';
