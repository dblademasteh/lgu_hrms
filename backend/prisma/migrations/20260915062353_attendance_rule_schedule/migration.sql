-- AlterEnum
ALTER TYPE "PlantillaStatus" ADD VALUE 'ARCHIVED';

-- DropIndex
DROP INDEX "Applicant_vacancyId_idx";

-- DropIndex
DROP INDEX "Appointment_plantillaItemId_idx";

-- AlterTable
ALTER TABLE "AttendanceRule" ADD COLUMN     "lunchEndMins" INTEGER NOT NULL DEFAULT 780,
ADD COLUMN     "lunchStartMins" INTEGER NOT NULL DEFAULT 720,
ADD COLUMN     "workEndMins" INTEGER NOT NULL DEFAULT 1020,
ADD COLUMN     "workStartMins" INTEGER NOT NULL DEFAULT 480;

-- AlterTable
ALTER TABLE "Vacancy" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
