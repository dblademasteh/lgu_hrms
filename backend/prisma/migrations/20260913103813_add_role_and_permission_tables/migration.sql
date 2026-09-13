/*
  Warnings:

  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
ALTER TYPE "ApplicantStatus" ADD VALUE 'NEW';

-- DropForeignKey
ALTER TABLE "Applicant" DROP CONSTRAINT "Applicant_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceRule" DROP CONSTRAINT "AttendanceRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Award" DROP CONSTRAINT "Award_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Bonus" DROP CONSTRAINT "Bonus_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Competency" DROP CONSTRAINT "Competency_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ContributionRule" DROP CONSTRAINT "ContributionRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Delegation" DROP CONSTRAINT "Delegation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "DesignationOrder" DROP CONSTRAINT "DesignationOrder_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Disqualification" DROP CONSTRAINT "Disqualification_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EducationRecord" DROP CONSTRAINT "EducationRecord_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Eligibility" DROP CONSTRAINT "Eligibility_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EmploymentHistory" DROP CONSTRAINT "EmploymentHistory_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "FamilyMember" DROP CONSTRAINT "FamilyMember_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "IDP" DROP CONSTRAINT "IDP_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Interview" DROP CONSTRAINT "Interview_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveCredit" DROP CONSTRAINT "LeaveCredit_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRuleConfig" DROP CONSTRAINT "LeaveRuleConfig_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LoanAmortization" DROP CONSTRAINT "LoanAmortization_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LoginEvent" DROP CONSTRAINT "LoginEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollDeductionLine" DROP CONSTRAINT "PayrollDeductionLine_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollItem" DROP CONSTRAINT "PayrollItem_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollPeriod" DROP CONSTRAINT "PayrollPeriod_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PayrollRun" DROP CONSTRAINT "PayrollRun_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payslip" DROP CONSTRAINT "Payslip_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceReview" DROP CONSTRAINT "PerformanceReview_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PlantillaItem" DROP CONSTRAINT "PlantillaItem_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Position" DROP CONSTRAINT "Position_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TaxBracket" DROP CONSTRAINT "TaxBracket_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingEnrollment" DROP CONSTRAINT "TrainingEnrollment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TrainingProgram" DROP CONSTRAINT "TrainingProgram_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "UserSession" DROP CONSTRAINT "UserSession_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Vacancy" DROP CONSTRAINT "Vacancy_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "VacancyPublication" DROP CONSTRAINT "VacancyPublication_tenantId_fkey";

-- DropIndex
DROP INDEX "Applicant_tenantId_idx";

-- DropIndex
DROP INDEX "Appointment_tenantId_idx";

-- DropIndex
DROP INDEX "Attendance_tenantId_idx";

-- DropIndex
DROP INDEX "AttendanceRule_tenantId_idx";

-- DropIndex
DROP INDEX "AuditLog_tenantId_idx";

-- DropIndex
DROP INDEX "Award_tenantId_idx";

-- DropIndex
DROP INDEX "Bonus_tenantId_idx";

-- DropIndex
DROP INDEX "Competency_tenantId_idx";

-- DropIndex
DROP INDEX "ContributionRule_tenantId_idx";

-- DropIndex
DROP INDEX "Delegation_tenantId_idx";

-- DropIndex
DROP INDEX "DesignationOrder_tenantId_idx";

-- DropIndex
DROP INDEX "Disqualification_tenantId_idx";

-- DropIndex
DROP INDEX "EducationRecord_tenantId_idx";

-- DropIndex
DROP INDEX "Eligibility_tenantId_idx";

-- DropIndex
DROP INDEX "EmploymentHistory_tenantId_idx";

-- DropIndex
DROP INDEX "FamilyMember_tenantId_idx";

-- DropIndex
DROP INDEX "IDP_tenantId_idx";

-- DropIndex
DROP INDEX "Interview_tenantId_idx";

-- DropIndex
DROP INDEX "LeaveCredit_tenantId_idx";

-- DropIndex
DROP INDEX "LeaveRequest_tenantId_idx";

-- DropIndex
DROP INDEX "LeaveRuleConfig_tenantId_idx";

-- DropIndex
DROP INDEX "LedgerEntry_tenantId_idx";

-- DropIndex
DROP INDEX "Loan_tenantId_idx";

-- DropIndex
DROP INDEX "LoanAmortization_tenantId_idx";

-- DropIndex
DROP INDEX "LoginEvent_tenantId_idx";

-- DropIndex
DROP INDEX "PayrollDeductionLine_tenantId_idx";

-- DropIndex
DROP INDEX "PayrollItem_tenantId_idx";

-- DropIndex
DROP INDEX "PayrollRun_tenantId_idx";

-- DropIndex
DROP INDEX "Payslip_tenantId_idx";

-- DropIndex
DROP INDEX "PerformanceReview_tenantId_idx";

-- DropIndex
DROP INDEX "PlantillaItem_tenantId_idx";

-- DropIndex
DROP INDEX "Position_tenantId_idx";

-- DropIndex
DROP INDEX "TaxBracket_tenantId_idx";

-- DropIndex
DROP INDEX "TrainingEnrollment_tenantId_idx";

-- DropIndex
DROP INDEX "TrainingProgram_tenantId_idx";

-- DropIndex
DROP INDEX "User_externalId_idx";

-- DropIndex
DROP INDEX "User_idpProvider_idx";

-- DropIndex
DROP INDEX "UserSession_tenantId_idx";

-- DropIndex
DROP INDEX "Vacancy_tenantId_idx";

-- DropIndex
DROP INDEX "VacancyPublication_tenantId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Role";

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
CREATE TABLE "PerformanceCompetency" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "reviewId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PerformanceCompetency_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "Role"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_key_key" ON "RolePermission"("roleId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricCredential_credentialId_key" ON "BiometricCredential"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceCompetency_reviewId_competencyId_key" ON "PerformanceCompetency"("reviewId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ExternalSystem_tenantId_idx" ON "ExternalSystem"("tenantId");

-- CreateIndex
CREATE INDEX "SyncRequest_tenantId_idx" ON "SyncRequest"("tenantId");

-- CreateIndex
CREATE INDEX "SyncRequest_status_idx" ON "SyncRequest"("status");

-- CreateIndex
CREATE INDEX "Attendance_tenantId_employeeId_date_idx" ON "Attendance"("tenantId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRule_tenantId_active_idx" ON "AttendanceRule"("tenantId", "active");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "ContributionRule_tenantId_effectiveFrom_idx" ON "ContributionRule"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Employee_tenantId_status_idx" ON "Employee"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_tenantId_runId_idx" ON "LedgerEntry"("tenantId", "runId");

-- CreateIndex
CREATE INDEX "Loan_tenantId_status_idx" ON "Loan"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoanAmortization_tenantId_paid_dueDate_idx" ON "LoanAmortization"("tenantId", "paid", "dueDate");

-- CreateIndex
CREATE INDEX "PayrollDeductionLine_tenantId_payrollItemId_idx" ON "PayrollDeductionLine"("tenantId", "payrollItemId");

-- CreateIndex
CREATE INDEX "PayrollItem_tenantId_runId_idx" ON "PayrollItem"("tenantId", "runId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_periodId_idx" ON "PayrollRun"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_createdAt_idx" ON "PayrollRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_payrollItemId_idx" ON "Payslip"("tenantId", "payrollItemId");

-- CreateIndex
CREATE INDEX "TaxBracket_tenantId_minIncome_idx" ON "TaxBracket"("tenantId", "minIncome");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationRecord" ADD CONSTRAINT "EducationRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollItem" ADD CONSTRAINT "PayrollItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollDeductionLine" ADD CONSTRAINT "PayrollDeductionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveCredit" ADD CONSTRAINT "LeaveCredit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyPublication" ADD CONSTRAINT "VacancyPublication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingEnrollment" ADD CONSTRAINT "TrainingEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eligibility" ADD CONSTRAINT "Eligibility_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContributionRule" ADD CONSTRAINT "ContributionRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRuleConfig" ADD CONSTRAINT "LeaveRuleConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bonus" ADD CONSTRAINT "Bonus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceCompetency" ADD CONSTRAINT "PerformanceCompetency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDP" ADD CONSTRAINT "IDP_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSystem" ADD CONSTRAINT "ExternalSystem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRequest" ADD CONSTRAINT "SyncRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
