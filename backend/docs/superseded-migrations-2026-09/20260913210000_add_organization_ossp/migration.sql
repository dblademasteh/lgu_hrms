-- Create DepartmentUnitType enum
CREATE TYPE "DepartmentUnitType" AS ENUM ('DEPARTMENT', 'DIVISION', 'SECTION');

-- Add OSSP fields to Department
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "unitType" "DepartmentUnitType" NOT NULL DEFAULT 'DEPARTMENT';
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "isMandatory" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "isOptional" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "isHrmOffice" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "headTitle" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "sanggunianConcurrence" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "concurrenceDate" DATE;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "concurrenceResolution" TEXT;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "cscSubmissionDate" DATE;
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Add IOS-LGU fields to Position
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "parentheticalTitle" TEXT;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "iosLguCode" TEXT;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "isMandatory" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "isCoterminous" Boolean NOT NULL DEFAULT false;
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "qualificationStandards" TEXT;

-- Add mandatory/optional flags to PlantillaItem
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "isMandatory" Boolean NOT NULL DEFAULT false;
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "isOptional" Boolean NOT NULL DEFAULT false;
