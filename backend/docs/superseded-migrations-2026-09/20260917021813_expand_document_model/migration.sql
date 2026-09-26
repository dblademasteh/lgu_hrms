-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'RESOLUTION';
ALTER TYPE "DocumentType" ADD VALUE 'MEMO';
ALTER TYPE "DocumentType" ADD VALUE 'AGREEMENT_MOA';
ALTER TYPE "DocumentType" ADD VALUE 'SERVICE_RECORD';
ALTER TYPE "DocumentType" ADD VALUE 'PAYSLIP';

-- DropForeignKey
ALTER TABLE "TrainingEvaluation" DROP CONSTRAINT "TrainingEvaluation_enrollmentId_fkey";

-- DropIndex
DROP INDEX "Disqualification_applicantId_idx";

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "description" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMPTZ(6),
ADD COLUMN     "relatedEmployeeId" TEXT,
ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LdPlan" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MSBMinutes" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "attendees" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StepIncrementRule" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrainingEvaluation" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TrainingNeedsAssessment" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Document_tenantId_relatedEmployeeId_idx" ON "Document"("tenantId", "relatedEmployeeId");

-- AddForeignKey
ALTER TABLE "TrainingNeedsAssessment" ADD CONSTRAINT "TrainingNeedsAssessment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvaluation" ADD CONSTRAINT "TrainingEvaluation_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_relatedEmployeeId_fkey" FOREIGN KEY ("relatedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
