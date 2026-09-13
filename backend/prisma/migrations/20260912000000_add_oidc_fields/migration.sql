-- OIDC / SSO: identity-provider linkage on User.
-- externalId already exists (User.externalId, used by the UserEmployeeLink
-- relation on employeeNumber). SSO stores the IdP `sub` there only when the
-- row is NOT linked to an employee; idpProvider records which IdP issued it.
-- Nullable + indexed: existing password/PIN users are untouched.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "idpProvider" TEXT;
CREATE INDEX IF NOT EXISTS "User_idpProvider_idx" ON "User" ("idpProvider");
CREATE INDEX IF NOT EXISTS "User_externalId_idx" ON "User" ("externalId");
