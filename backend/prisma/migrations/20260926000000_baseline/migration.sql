-- BASELINE MIGRATION (replaces 61 superseded migrations)
--
-- Provenance:
--   The 61 migrations this replaces (see backend/docs/superseded-migrations-2026-09/)
--   were never applied to any database. The schema was created with
--   'prisma db push', so _prisma_migrations did not exist and every
--   migration showed as pending. That chain was also internally broken:
--   both 20260909021032_init and 20260909063419_init issued
--   'CREATE TYPE "Role"', so it could not replay on an empty database.
--
-- This baseline is generated from the authoritative prisma/schema.prisma:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
--
-- It reproduces the exact 64-table live schema, so existing databases are
-- stamped rather than rebuilt:
--   npx prisma migrate resolve --applied 20260926000000_baseline
--
-- Do not edit by hand. Add future changes as new migrations after this one.

-- CreateEnum
CREATE TYPE "DisqualificationType" AS ENUM ('VIOLATION_OF_CSC_RULES', 'CRIMINAL_CONVICTION', 'MORAL_TURPITUDE', 'FRAUD', 'MISCONDUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "DisqualificationReason" AS ENUM ('GROSS_MISCONDUCT', 'HARRASSMENT', 'EMBEZZLEMENT', 'FRAUDULENT_MISREPRESENTATION', 'SUBSTANCE_ABUSE', 'POLITICAL_PARTISANISM', 'OTHER_GROUNDS');

-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('THIRTEENTH_MONTH', 'CASH_GIFT', 'YEAR_END_BONUS');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('APPLIED', 'SCREENED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'HIRED', 'REJECTED', 'NEW', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'APPROVED', 'VERIFIED', 'ISSUED', 'EFFECTIVE', 'ENDED', 'SEPARATED');

-- CreateEnum
CREATE TYPE "DesignationStatus" AS ENUM ('DRAFT', 'RECOMMENDED', 'APPROVED', 'ISSUED', 'EFFECTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EligibilityType" AS ENUM ('CSC', 'PRC', 'BAR', 'OTHER');

-- CreateEnum
CREATE TYPE "PlantillaItemType" AS ENUM ('OLD_STYLE', 'NEW_STYLE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlantillaStatus" AS ENUM ('VACANT', 'FILLED', 'FROZEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED', 'DRAFT', 'PUBLISHED', 'FILLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PLANNING', 'MONITORING', 'REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutputGroup" AS ENUM ('CORE', 'STRATEGIC', 'SUPPORT');

-- CreateEnum
CREATE TYPE "AdjectivalRating" AS ENUM ('OUTSTANDING', 'VERY_SATISFACTORY', 'SATISFACTORY', 'UNSATISFACTORY', 'POOR');

-- CreateEnum
CREATE TYPE "DepartmentUnitType" AS ENUM ('DEPARTMENT', 'DIVISION', 'SECTION');

-- CreateEnum
CREATE TYPE "LguLevel" AS ENUM ('PROVINCIAL', 'CITY', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "LguOfficeCategory" AS ENUM ('EXECUTIVE', 'LEGISLATIVE', 'LINE_OFFICE', 'SUPPORT_OFFICE');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESIGNED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED');

-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollSource" AS ENUM ('LOCAL', 'LGU_PAYROLL');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('PAY', 'DEDUCTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('VACATION', 'SICK', 'SPECIAL_PRIVILEGE', 'MATERNITY', 'PATERNITY', 'SOLO_PARENT', 'SPECIAL_WOMEN', 'COMPENSATORY');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'RECOMMENDED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'CASUAL', 'CONTRACTUAL', 'JOB_ORDER', 'COS', 'COTERMINOUS');

-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('SALARY_ADVANCE', 'CASH_LOAN', 'HOUSING_LOAN', 'EDUCATION_LOAN');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('PENDING', 'APPROVED', 'DISBURSED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OvertimeType" AS ENUM ('WORKDAY', 'REST_DAY', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('OFFICE_ORDER', 'POLICY', 'MSB_CONSTITUTION', 'LD_PLAN', 'MINUTES', 'OTHER', 'RESOLUTION', 'MEMO', 'AGREEMENT_MOA', 'SERVICE_RECORD', 'PAYSLIP');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('VIEWED', 'DOWNLOADED', 'PRINTED', 'EXPORTED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "lguLevel" "LguLevel" NOT NULL DEFAULT 'PROVINCIAL',
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "departmentId" TEXT,
    "externalId" TEXT,
    "passwordChangedAt" TIMESTAMPTZ(6),
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "displayPrefs" JSONB,
    "avatarPath" TEXT,
    "signaturePath" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "contactNumber" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "emergencyContact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pinHash" TEXT,
    "tenantId" TEXT,
    "idpProvider" TEXT,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "unitType" "DepartmentUnitType" NOT NULL DEFAULT 'DEPARTMENT',
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isHrmOffice" BOOLEAN NOT NULL DEFAULT false,
    "headTitle" TEXT,
    "sanggunianConcurrence" BOOLEAN NOT NULL DEFAULT false,
    "concurrenceDate" DATE,
    "concurrenceResolution" TEXT,
    "cscSubmissionDate" DATE,
    "remarks" TEXT,
    "lguOfficeCategory" "LguOfficeCategory",

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "salaryGrade" INTEGER NOT NULL,
    "step" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "parentheticalTitle" TEXT,
    "iosLguCode" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isCoterminous" BOOLEAN NOT NULL DEFAULT false,
    "qualificationStandards" TEXT,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepIncrementRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "salaryGrade" INTEGER NOT NULL,
    "fromStep" INTEGER NOT NULL,
    "toStep" INTEGER NOT NULL,
    "incrementAmount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepIncrementRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthDate" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "civilStatus" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT,
    "email" TEXT,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "departmentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "hiredDate" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    "tenantId" TEXT,
    "monthlySalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "keyPosition" TEXT,
    "sssNumber" TEXT,
    "philhealthNumber" TEXT,
    "pagibigNumber" TEXT,
    "tinNumber" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthDate" DATE,
    "occupation" TEXT,
    "isDependent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT,
    "fromDate" DATE,
    "toDate" DATE,
    "unitsEarned" DOUBLE PRECISION,
    "yearGraduated" INTEGER,
    "scholarships" TEXT,
    "honors" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "EducationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "dateGiven" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentHistory" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "EmploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "externalId" TEXT,
    "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "runDate" DATE NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "generatedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollItem" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "basicPay" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL,
    "deductions" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "externalId" TEXT,
    "source" "PayrollSource" NOT NULL DEFAULT 'LOCAL',

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollDeductionLine" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "employeeShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tenantId" TEXT,
    "quantity" DECIMAL(8,2),

    CONSTRAINT "PayrollDeductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT,
    "tenantId" TEXT,
    "externalId" TEXT,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "lastActive" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "delegateeId" TEXT NOT NULL,
    "scope" TEXT,
    "reason" TEXT,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "tenantId" TEXT,
    "approvedAt" TIMESTAMPTZ(6),
    "approvedBy" TEXT,
    "decisionNote" TEXT,
    "deniedAt" TIMESTAMPTZ(6),
    "deniedBy" TEXT,
    "advanceNoticed" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" TEXT,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "isLwop" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "recommendedAt" TIMESTAMPTZ(6),
    "recommendedBy" TEXT,
    "studyBondMonths" INTEGER,
    "monetized" BOOLEAN NOT NULL DEFAULT false,
    "monetizedAmount" DECIMAL(12,2),
    "monetizedAt" TIMESTAMPTZ(6),
    "monetizedDays" DOUBLE PRECISION,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveCredit" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "LeaveCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeIn" TIMESTAMPTZ(6),
    "timeOut" TIMESTAMPTZ(6),
    "hours" DOUBLE PRECISION,
    "remark" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "deviceRef" TEXT,
    "source" TEXT DEFAULT 'MANUAL',

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "protocol" TEXT NOT NULL DEFAULT 'ZK_TCP',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "serial" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalMs" INTEGER NOT NULL DEFAULT 30000,
    "lastConnectedAt" TIMESTAMPTZ(6),
    "lastSyncAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDeviceLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "deviceId" TEXT NOT NULL,
    "deviceLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "punchedAt" TIMESTAMPTZ(6) NOT NULL,
    "verification" TEXT,
    "employeeId" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricDeviceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDeviceUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "deviceId" TEXT NOT NULL,
    "deviceUserId" VARCHAR(120) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BiometricDeviceUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dept" TEXT,
    "position" TEXT,
    "name" TEXT,
    "tenantId" TEXT,
    "deletedAt" TIMESTAMPTZ(6),
    "plantillaItemId" TEXT,
    "signedBy" TEXT,
    "issuedBy" TEXT,
    "approvedBy" TEXT,
    "verifiedBy" TEXT,
    "documentUrl" TEXT,
    "oraohraReference" TEXT,
    "cscFormNo" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewYear" INTEGER NOT NULL,
    "reviewType" TEXT NOT NULL,
    "rating" DECIMAL(3,2),
    "comments" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PLANNING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "tenantId" TEXT,
    "adjectivalRating" "AdjectivalRating",
    "approvedAt" TIMESTAMPTZ(6),
    "approvedBy" TEXT,
    "competencyWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "coreWeight" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "officeRatingCap" DECIMAL(3,2),
    "periodEnd" TIMESTAMPTZ(6),
    "periodStart" TIMESTAMPTZ(6),
    "planningDate" TIMESTAMPTZ(6),
    "strategicWeight" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "supportWeight" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "parentReviewId" TEXT,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "PlantillaItem" (
    "id" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "PlantillaStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "itemType" "PlantillaItemType" NOT NULL DEFAULT 'OLD_STYLE',
    "salaryGrade" TEXT,
    "step" TEXT,
    "sourceOfFund" TEXT,
    "appropriationCode" TEXT,
    "authorizedSalary" DECIMAL(12,2),
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlantillaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "plantillaItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "qualifications" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(6),
    "closesAt" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "eligibilityRequirements" TEXT,
    "screeningCriteria" TEXT,
    "approvedBy" TEXT,
    "publishedBy" TEXT,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyPublication" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "link" TEXT,
    "tenantId" TEXT,
    "publishedBy" TEXT,

    CONSTRAINT "VacancyPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignationOrder" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "vacancyId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "issuedDate" DATE NOT NULL,
    "signedBy" TEXT,
    "status" "DesignationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,
    "effectiveDate" DATE,
    "expirationDate" DATE,
    "documentUrl" TEXT,
    "remarks" TEXT,
    "approvedBy" TEXT,
    "recommendedBy" TEXT,

    CONSTRAINT "DesignationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationHours" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEnrollment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "enrolledAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),
    "tenantId" TEXT,

    CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eligibility" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eligibilityType" "EligibilityType" NOT NULL,
    "rating" TEXT,
    "examDate" DATE,
    "validUntil" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "Eligibility_pkey" PRIMARY KEY ("id")
);

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
    "tenantId" TEXT,
    "applicantId" TEXT,

    CONSTRAINT "Disqualification_pkey" PRIMARY KEY ("id")
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
    "tenantId" TEXT,
    "vacancyId" TEXT,
    "eligibilityScore" INTEGER,
    "screeningScore" INTEGER,
    "interviewScore" INTEGER,
    "selectionBoardNotes" TEXT,
    "hiredEmployeeId" TEXT,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContributionRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeRate" DECIMAL(5,4) NOT NULL,
    "employerRate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "ContributionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "minIncome" DECIMAL(12,2) NOT NULL,
    "maxIncome" DECIMAL(12,2),
    "rate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowanceRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRuleConfig" (
    "id" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "accrualPerMonth" DECIMAL(4,2) NOT NULL,
    "maxCarryOver" DECIMAL(6,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "LeaveRuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bonus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "BonusType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "Bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanAmortization" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "tenantId" TEXT,

    CONSTRAINT "LoanAmortization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tardinessMin" INTEGER NOT NULL,
    "deductionRate" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "lunchEndMins" INTEGER NOT NULL DEFAULT 780,
    "lunchStartMins" INTEGER NOT NULL DEFAULT 720,
    "workEndMins" INTEGER NOT NULL DEFAULT 1020,
    "workStartMins" INTEGER NOT NULL DEFAULT 480,

    CONSTRAINT "AttendanceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricCredential" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "employeeId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "deviceName" TEXT,
    "enrolledAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(6),

    CONSTRAINT "BiometricCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tenantId" TEXT,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceCompetency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "reviewId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "score" DECIMAL(3,2),
    "maxScore" DECIMAL(3,2) NOT NULL DEFAULT 5,
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 10,

    CONSTRAINT "PerformanceCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDP" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "goals" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT,

    CONSTRAINT "IDP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingNeedsAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "answers" JSONB,
    "submittedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingNeedsAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LdPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "year" INTEGER NOT NULL,
    "programs" JSONB,
    "budget" DECIMAL(12,2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LdPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingEvaluation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "enrollmentId" TEXT NOT NULL,
    "reaction" INTEGER,
    "learning" INTEGER,
    "behavior" INTEGER,
    "results" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "tenantId" TEXT,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MSBMinutes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "interviewId" TEXT NOT NULL,
    "deliberationDate" DATE NOT NULL,
    "minutes" TEXT,
    "resolution" TEXT,
    "attendees" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MSBMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSystem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "headers" TEXT,
    "syncDirection" TEXT NOT NULL DEFAULT 'pull',
    "attendanceMode" TEXT,
    "attendancePollInterval" INTEGER,
    "deviceId" TEXT,
    "punchKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExternalSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'IMS',
    "target" TEXT NOT NULL DEFAULT 'HRMS',
    "imsApiKey" TEXT,
    "datasets" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "SyncRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMins" INTEGER NOT NULL DEFAULT 0,
    "endMins" INTEGER NOT NULL DEFAULT 0,
    "hours" DECIMAL(12,2) NOT NULL,
    "type" "OvertimeType" NOT NULL DEFAULT 'WORKDAY',
    "status" "OvertimeStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "url" TEXT,
    "version" TEXT,
    "effectiveDate" DATE,
    "publishedBy" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMPTZ(6),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMPTZ(6),
    "archivedBy" TEXT,
    "archivedAt" TIMESTAMPTZ(6),
    "creatorId" TEXT,
    "retentionClass" TEXT,
    "seriesCode" TEXT,
    "relatedEmployeeId" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "documentId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "DocumentAccessAction" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE INDEX "StepIncrementRule_tenantId_salaryGrade_idx" ON "StepIncrementRule"("tenantId", "salaryGrade");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_status_idx" ON "Employee"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_idx" ON "PayrollPeriod"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_externalId_idx" ON "PayrollPeriod"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_source_idx" ON "PayrollPeriod"("tenantId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_tenantId_name_key" ON "PayrollPeriod"("tenantId", "name");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_periodId_idx" ON "PayrollRun"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_createdAt_idx" ON "PayrollRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_externalId_idx" ON "PayrollRun"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_source_idx" ON "PayrollRun"("tenantId", "source");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_runId_idx" ON "PayrollItem"("tenantId", "runId");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_externalId_idx" ON "PayrollItem"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_source_idx" ON "PayrollItem"("tenantId", "source");

-- CreateIndex
CREATE INDEX "PayrollDeductionLine_tenantId_payrollItemId_idx" ON "PayrollDeductionLine"("tenantId", "payrollItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollItemId_key" ON "Payslip"("payrollItemId");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_payrollItemId_idx" ON "Payslip"("tenantId", "payrollItemId");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_externalId_idx" ON "Payslip"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "LedgerEntry_tenantId_runId_idx" ON "LedgerEntry"("tenantId", "runId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveCredit_tenantId_employeeId_type_year_key" ON "LeaveCredit"("tenantId", "employeeId", "type", "year");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_employeeId_date_idx" ON "Attendance"("tenantId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "BiometricDevice_tenantId_active_idx" ON "BiometricDevice"("tenantId", "active");

-- CreateIndex
CREATE INDEX "BiometricDeviceLog_tenantId_deviceId_punchedAt_idx" ON "BiometricDeviceLog"("tenantId", "deviceId", "punchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDeviceLog_deviceId_deviceLogId_key" ON "BiometricDeviceLog"("deviceId", "deviceLogId");

-- CreateIndex
CREATE INDEX "BiometricDeviceUser_tenantId_deviceId_idx" ON "BiometricDeviceUser"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "BiometricDeviceUser_tenantId_employeeId_idx" ON "BiometricDeviceUser"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDeviceUser_deviceId_deviceUserId_key" ON "BiometricDeviceUser"("deviceId", "deviceUserId");

-- CreateIndex
CREATE INDEX "PerformanceReview_tenantId_reviewYear_status_idx" ON "PerformanceReview"("tenantId", "reviewYear", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReview_tenantId_employeeId_reviewYear_reviewType_key" ON "PerformanceReview"("tenantId", "employeeId", "reviewYear", "reviewType");

-- CreateIndex
CREATE INDEX "PerformanceTarget_tenantId_reviewId_idx" ON "PerformanceTarget"("tenantId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaItem_itemNumber_key" ON "PlantillaItem"("itemNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationOrder_orderNumber_key" ON "DesignationOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgram_code_key" ON "TrainingProgram"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_tenantId_programId_employeeId_key" ON "TrainingEnrollment"("tenantId", "programId", "employeeId");

-- CreateIndex
CREATE INDEX "ContributionRule_tenantId_effectiveFrom_idx" ON "ContributionRule"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxBracket_tenantId_minIncome_idx" ON "TaxBracket"("tenantId", "minIncome");

-- CreateIndex
CREATE INDEX "AllowanceRule_tenantId_effectiveFrom_idx" ON "AllowanceRule"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "Role"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_key_key" ON "RolePermission"("roleId", "key");

-- CreateIndex
CREATE INDEX "Loan_tenantId_status_idx" ON "Loan"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoanAmortization_tenantId_paid_dueDate_idx" ON "LoanAmortization"("tenantId", "paid", "dueDate");

-- CreateIndex
CREATE INDEX "AttendanceRule_tenantId_active_idx" ON "AttendanceRule"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricCredential_credentialId_key" ON "BiometricCredential"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_tenantId_code_key" ON "Competency"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PerformanceCompetency_tenantId_reviewId_idx" ON "PerformanceCompetency"("tenantId", "reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceCompetency_reviewId_competencyId_key" ON "PerformanceCompetency"("reviewId", "competencyId");

-- CreateIndex
CREATE INDEX "TrainingNeedsAssessment_tenantId_employeeId_year_idx" ON "TrainingNeedsAssessment"("tenantId", "employeeId", "year");

-- CreateIndex
CREATE INDEX "LdPlan_tenantId_year_idx" ON "LdPlan"("tenantId", "year");

-- CreateIndex
CREATE INDEX "TrainingEvaluation_tenantId_enrollmentId_idx" ON "TrainingEvaluation"("tenantId", "enrollmentId");

-- CreateIndex
CREATE INDEX "MSBMinutes_tenantId_interviewId_idx" ON "MSBMinutes"("tenantId", "interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ExternalSystem_tenantId_idx" ON "ExternalSystem"("tenantId");

-- CreateIndex
CREATE INDEX "SyncRequest_tenantId_idx" ON "SyncRequest"("tenantId");

-- CreateIndex
CREATE INDEX "SyncRequest_status_idx" ON "SyncRequest"("status");

-- CreateIndex
CREATE INDEX "OvertimeRequest_tenantId_status_idx" ON "OvertimeRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OvertimeRequest_tenantId_employeeId_date_idx" ON "OvertimeRequest"("tenantId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "Document_tenantId_type_idx" ON "Document"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Document_tenantId_relatedEmployeeId_idx" ON "Document"("tenantId", "relatedEmployeeId");

-- CreateIndex
CREATE INDEX "Document_tenantId_seriesCode_idx" ON "Document"("tenantId", "seriesCode");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_documentId_createdAt_idx" ON "DocumentAccessLog"("tenantId", "documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_userId_createdAt_idx" ON "DocumentAccessLog"("tenantId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_tenantId_action_createdAt_idx" ON "DocumentAccessLog"("tenantId", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_externalId_fkey" FOREIGN KEY ("externalId") REFERENCES "Employee"("employeeNumber") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepIncrementRule" ADD CONSTRAINT "StepIncrementRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationRecord" ADD CONSTRAINT "EducationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationRecord" ADD CONSTRAINT "EducationRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeductionLine" ADD CONSTRAINT "PayrollDeductionLine_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeductionLine" ADD CONSTRAINT "PayrollDeductionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateeId_fkey" FOREIGN KEY ("delegateeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCredit" ADD CONSTRAINT "LeaveCredit_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCredit" ADD CONSTRAINT "LeaveCredit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDeviceLog" ADD CONSTRAINT "BiometricDeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDeviceUser" ADD CONSTRAINT "BiometricDeviceUser_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDeviceUser" ADD CONSTRAINT "BiometricDeviceUser_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_plantillaItemId_fkey" FOREIGN KEY ("plantillaItemId") REFERENCES "PlantillaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_parentReviewId_fkey" FOREIGN KEY ("parentReviewId") REFERENCES "PerformanceReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceTarget" ADD CONSTRAINT "PerformanceTarget_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_plantillaItemId_fkey" FOREIGN KEY ("plantillaItemId") REFERENCES "PlantillaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyPublication" ADD CONSTRAINT "VacancyPublication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyPublication" ADD CONSTRAINT "VacancyPublication_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eligibility" ADD CONSTRAINT "Eligibility_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eligibility" ADD CONSTRAINT "Eligibility_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_appliedDepartmentId_fkey" FOREIGN KEY ("appliedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_appliedPositionId_fkey" FOREIGN KEY ("appliedPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionRule" ADD CONSTRAINT "ContributionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowanceRule" ADD CONSTRAINT "AllowanceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRuleConfig" ADD CONSTRAINT "LeaveRuleConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAmortization" ADD CONSTRAINT "LoanAmortization_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanAmortization" ADD CONSTRAINT "LoanAmortization_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRule" ADD CONSTRAINT "AttendanceRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricCredential" ADD CONSTRAINT "BiometricCredential_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricCredential" ADD CONSTRAINT "BiometricCredential_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDP" ADD CONSTRAINT "IDP_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDP" ADD CONSTRAINT "IDP_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingNeedsAssessment" ADD CONSTRAINT "TrainingNeedsAssessment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingNeedsAssessment" ADD CONSTRAINT "TrainingNeedsAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LdPlan" ADD CONSTRAINT "LdPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvaluation" ADD CONSTRAINT "TrainingEvaluation_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEvaluation" ADD CONSTRAINT "TrainingEvaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MSBMinutes" ADD CONSTRAINT "MSBMinutes_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MSBMinutes" ADD CONSTRAINT "MSBMinutes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSystem" ADD CONSTRAINT "ExternalSystem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRequest" ADD CONSTRAINT "SyncRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_relatedEmployeeId_fkey" FOREIGN KEY ("relatedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

