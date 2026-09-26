-- Multi-tenancy scaffold: Tenant model + tenant link on User/Department.
-- tenantId is NULLABLE so existing single-LGU data keeps working: NULL rows
-- are visible to legacy (tenant-less) sessions and adoptable by backfill.
-- Full per-table rollout adds tenantId to every business model in a later
-- migration; repositories already scope via withTenant(req).

-- CreateEnum (SUPER_ADMIN platform operator)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_code_key" ON "Tenant"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_domain_key" ON "Tenant"("domain");

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed: default tenant for the existing single-LGU deployment.
-- NOTE: updatedAt has no DB default (Prisma manages it), so set both stamps.
INSERT INTO "Tenant" ("id", "code", "name", "domain", "isActive", "createdAt", "updatedAt")
VALUES ('tenant-default', 'DEFAULT', 'Default LGU', NULL, true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
