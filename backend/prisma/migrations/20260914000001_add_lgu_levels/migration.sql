-- LGU level classification for tenants and offices
CREATE TYPE "LguLevel" AS ENUM ('PROVINCIAL', 'CITY', 'MUNICIPAL');
CREATE TYPE "LguOfficeCategory" AS ENUM ('EXECUTIVE', 'LEGISLATIVE', 'LINE_OFFICE', 'SUPPORT_OFFICE');

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "lguLevel" "LguLevel" NOT NULL DEFAULT 'PROVINCIAL';
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "lguOfficeCategory" "LguOfficeCategory";
