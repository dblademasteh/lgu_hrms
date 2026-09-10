-- CreateEnum
CREATE TYPE "DisqualificationType" AS ENUM ('VIOLATION_OF_CSC_RULES', 'CRIMINAL_CONVICTION', 'MORAL_TURPITUDE', 'FRAUD', 'MISCONDUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "DisqualificationReason" AS ENUM ('GROSS_MISCONDUCT', 'HARRASSMENT', 'EMBEZZLEMENT', 'FRAUDULENT_MISREPRESENTATION', 'SUBSTANCE_ABUSE', 'POLITICAL_PARTISANISM', 'OTHER_GROUNDS');

-- CreateTable
CREATE TABLE "Disqualification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "DisqualificationType" NOT NULL,
    "reason" "DisqualificationReason" NOT NULL,
    "date" DATE NOT NULL,
    "validity" DATE,
    "remarks" TEXT,
    "evidenceDocument" TEXT,
    "isBarred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "Disqualification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
