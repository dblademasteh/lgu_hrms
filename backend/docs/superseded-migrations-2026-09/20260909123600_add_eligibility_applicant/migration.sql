-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('APPLIED', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED');

-- CreateTable
CREATE TABLE "Eligibility" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eligibilityType" TEXT NOT NULL,
    "rating" TEXT,
    "examDate" DATE,
    "validUntil" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'APPLIED',
    "appliedPositionId" TEXT,
    "appliedDepartmentId" TEXT,
    "resumeUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Eligibility" ADD CONSTRAINT "Eligibility_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_appliedPositionId_fkey" FOREIGN KEY ("appliedPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_appliedDepartmentId_fkey" FOREIGN KEY ("appliedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
