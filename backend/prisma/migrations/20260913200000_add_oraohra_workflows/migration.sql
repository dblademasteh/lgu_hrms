-- Create new enums
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'APPROVED', 'VERIFIED', 'ISSUED', 'EFFECTIVE', 'ENDED', 'SEPARATED');
CREATE TYPE "DesignationStatus" AS ENUM ('DRAFT', 'RECOMMENDED', 'APPROVED', 'ISSUED', 'EFFECTIVE', 'REVOKED');
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "EligibilityType" AS ENUM ('CSC', 'PRC', 'BAR', 'OTHER');
CREATE TYPE "PlantillaItemType" AS ENUM ('OLD_STYLE', 'NEW_STYLE');

-- Update Appointment status column
ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER COLUMN "status" TYPE "AppointmentStatus" USING CASE "status"
  WHEN 'ACTIVE' THEN 'EFFECTIVE'::"AppointmentStatus"
  WHEN 'ENDED' THEN 'ENDED'::"AppointmentStatus"
  ELSE 'PENDING'::"AppointmentStatus"
END;
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Update DesignationOrder status column
ALTER TABLE "DesignationOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DesignationOrder" ALTER COLUMN "status" TYPE "DesignationStatus" USING CASE "status"
  WHEN 'ACTIVE' THEN 'EFFECTIVE'::"DesignationStatus"
  WHEN 'SUSPENDED' THEN 'REVOKED'::"DesignationStatus"
  ELSE 'DRAFT'::"DesignationStatus"
END;
ALTER TABLE "DesignationOrder" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Update Vacancy status column (map to existing enum values first)
ALTER TABLE "Vacancy" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vacancy" ALTER COLUMN "status" TYPE "VacancyStatus" USING CASE "status"
  WHEN 'OPEN' THEN 'OPEN'::"VacancyStatus"
  WHEN 'CLOSED' THEN 'CLOSED'::"VacancyStatus"
  WHEN 'CANCELLED' THEN 'CANCELLED'::"VacancyStatus"
  ELSE 'OPEN'::"VacancyStatus"
END;
ALTER TABLE "Vacancy" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Update Interview status column
ALTER TABLE "Interview" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Interview" ALTER COLUMN "status" TYPE "InterviewStatus" USING CASE "status"
  WHEN 'SCHEDULED' THEN 'SCHEDULED'::"InterviewStatus"
  WHEN 'COMPLETED' THEN 'COMPLETED'::"InterviewStatus"
  WHEN 'CANCELLED' THEN 'CANCELLED'::"InterviewStatus"
  ELSE 'SCHEDULED'::"InterviewStatus"
END;
ALTER TABLE "Interview" ALTER COLUMN "status" SET DEFAULT 'SCHEDULED';

-- Update Eligibility eligibilityType column
ALTER TABLE "Eligibility" ALTER COLUMN "eligibilityType" TYPE "EligibilityType" USING CASE "eligibilityType"
  WHEN 'CSC' THEN 'CSC'::"EligibilityType"
  WHEN 'PRC' THEN 'PRC'::"EligibilityType"
  WHEN 'BAR' THEN 'BAR'::"EligibilityType"
  ELSE 'OTHER'::"EligibilityType"
END;

-- Add new columns to Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "plantillaItemId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "signedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "issuedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "oraohraReference" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cscFormNo" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Add foreign key for Appointment.plantillaItemId
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_plantillaItemId_fkey" FOREIGN KEY ("plantillaItemId") REFERENCES "PlantillaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new columns to PlantillaItem
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "itemType" "PlantillaItemType" NOT NULL DEFAULT 'OLD_STYLE';
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "salaryGrade" TEXT;
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "step" TEXT;
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "sourceOfFund" TEXT;
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "appropriationCode" TEXT;
ALTER TABLE "PlantillaItem" ADD COLUMN IF NOT EXISTS "authorizedSalary" NUMERIC(12,2);

-- Add new columns to Vacancy
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "eligibilityRequirements" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "screeningCriteria" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "publishedBy" TEXT;

-- Add new columns to VacancyPublication
ALTER TABLE "VacancyPublication" ADD COLUMN IF NOT EXISTS "publishedBy" TEXT;

-- Add new columns to DesignationOrder
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "effectiveDate" DATE;
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "expirationDate" DATE;
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Add new columns to Applicant
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "vacancyId" TEXT;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "eligibilityScore" Int;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "screeningScore" Int;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "interviewScore" Int;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "selectionBoardNotes" TEXT;
ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "hiredEmployeeId" TEXT;

-- Add foreign key for Applicant.vacancyId
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Appointment_plantillaItemId_idx" ON "Appointment"("plantillaItemId");
CREATE INDEX IF NOT EXISTS "Applicant_vacancyId_idx" ON "Applicant"("vacancyId");
