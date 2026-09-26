-- CreateEnum
CREATE TYPE "OutputGroup" AS ENUM ('CORE', 'STRATEGIC', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AdjectivalRating" AS ENUM ('OUTSTANDING', 'VERY_SATISFACTORY', 'SATISFACTORY', 'UNSATISFACTORY', 'POOR');

-- AlterEnum
BEGIN;
CREATE TYPE "ReviewStatus_new" AS ENUM ('PLANNING', 'MONITORING', 'REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" TYPE "ReviewStatus_new" USING ("status"::text::"ReviewStatus_new");
ALTER TYPE "ReviewStatus" RENAME TO "ReviewStatus_old";
ALTER TYPE "ReviewStatus_new" RENAME TO "ReviewStatus";
DROP TYPE "ReviewStatus_old";
ALTER TABLE "PerformanceReview" ALTER COLUMN "status" SET DEFAULT 'PLANNING';
COMMIT;

-- DropIndex
DROP INDEX "Competency_code_key";

-- AlterTable
ALTER TABLE "PerformanceCompetency" ADD COLUMN     "weight" DECIMAL(5,2) NOT NULL DEFAULT 10,
ALTER COLUMN "score" DROP NOT NULL,
ALTER COLUMN "score" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "maxScore" SET DEFAULT 5,
ALTER COLUMN "maxScore" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "PerformanceReview" ADD COLUMN     "adjectivalRating" "AdjectivalRating",
ADD COLUMN     "approvedAt" TIMESTAMPTZ(6),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "competencyWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
ADD COLUMN     "coreWeight" DECIMAL(5,2) NOT NULL DEFAULT 50,
ADD COLUMN     "officeRatingCap" DECIMAL(3,2),
ADD COLUMN     "periodEnd" TIMESTAMPTZ(6),
ADD COLUMN     "periodStart" TIMESTAMPTZ(6),
ADD COLUMN     "planningDate" TIMESTAMPTZ(6),
ADD COLUMN     "strategicWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
ADD COLUMN     "supportWeight" DECIMAL(5,2) NOT NULL DEFAULT 20,
ALTER COLUMN "rating" SET DATA TYPE DECIMAL(3,2),
ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- CreateTable
CREATE TABLE "PerformanceTarget" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "reviewId" TEXT NOT NULL,
    "kra" TEXT NOT NULL,
    "successIndicator" TEXT NOT NULL,
    "outputGroup" "OutputGroup" NOT NULL DEFAULT 'CORE',
    "weight" DECIMAL(5,2) NOT NULL,
    "targetQuantity" DECIMAL(12,2),
    "targetUnit" TEXT,
    "q1Actual" TEXT,
    "q2Actual" TEXT,
    "q3Actual" TEXT,
    "q4Actual" TEXT,
    "annualActual" TEXT,
    "qualityScore" DECIMAL(3,2),
    "efficiencyScore" DECIMAL(3,2),
    "timelinessScore" DECIMAL(3,2),
    "averageScore" DECIMAL(3,2),
    "actualPercent" DECIMAL(5,2),
    "meansOfVerification" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PerformanceTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceTarget_tenantId_reviewId_idx" ON "PerformanceTarget"("tenantId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_tenantId_code_key" ON "Competency"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PerformanceCompetency_tenantId_reviewId_idx" ON "PerformanceCompetency"("tenantId", "reviewId");

-- CreateIndex
CREATE INDEX "PerformanceReview_tenantId_reviewYear_status_idx" ON "PerformanceReview"("tenantId", "reviewYear", "status");

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
