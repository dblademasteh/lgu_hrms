-- Multi-tenancy scaffold: add tenantId to remaining business tables
-- Pattern: NULLABLE tenantId + FK to Tenant(id) ON DELETE SET NULL + index
-- NULLABLE so existing rows remain visible during rollout; backfill +
-- withTenant() scoping in repositories enforce isolation per-tenant.

-- Employee
ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Employee"
  ADD CONSTRAINT "Employee_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id")
  ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Employee_tenantId_idx" ON "Employee" ("tenantId");

-- FamilyMember
ALTER TABLE "FamilyMember"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "FamilyMember"
  ADD CONSTRAINT "FamilyMember_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "FamilyMember_tenantId_idx" ON "FamilyMember" ("tenantId");

-- EducationRecord
ALTER TABLE "EducationRecord"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EducationRecord"
  ADD CONSTRAINT "EducationRecord_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "EducationRecord_tenantId_idx" ON "EducationRecord" ("tenantId");

-- Award
ALTER TABLE "Award"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Award"
  ADD CONSTRAINT "Award_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Award_tenantId_idx" ON "Award" ("tenantId");

-- EmploymentHistory
ALTER TABLE "EmploymentHistory"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "EmploymentHistory"
  ADD CONSTRAINT "EmploymentHistory_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "EmploymentHistory_tenantId_idx" ON "EmploymentHistory" ("tenantId");

-- PayrollPeriod
ALTER TABLE "PayrollPeriod"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PayrollPeriod"
  ADD CONSTRAINT "PayrollPeriod_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PayrollPeriod_tenantId_idx" ON "PayrollPeriod" ("tenantId");

-- PayrollRun
ALTER TABLE "PayrollRun"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PayrollRun"
  ADD CONSTRAINT "PayrollRun_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PayrollRun_tenantId_idx" ON "PayrollRun" ("tenantId");

-- PayrollItem
ALTER TABLE "PayrollItem"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PayrollItem"
  ADD CONSTRAINT "PayrollItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PayrollItem_tenantId_idx" ON "PayrollItem" ("tenantId");

-- PayrollDeductionLine
ALTER TABLE "PayrollDeductionLine"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PayrollDeductionLine"
  ADD CONSTRAINT "PayrollDeductionLine_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PayrollDeductionLine_tenantId_idx" ON "PayrollDeductionLine" ("tenantId");

-- Payslip
ALTER TABLE "Payslip"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Payslip"
  ADD CONSTRAINT "Payslip_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Payslip_tenantId_idx" ON "Payslip" ("tenantId");

-- LedgerEntry
ALTER TABLE "LedgerEntry"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LedgerEntry"
  ADD CONSTRAINT "LedgerEntry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LedgerEntry_tenantId_idx" ON "LedgerEntry" ("tenantId");

-- AuditLog
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_idx" ON "AuditLog" ("tenantId");

-- UserSession
ALTER TABLE "UserSession"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "UserSession"
  ADD CONSTRAINT "UserSession_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "UserSession_tenantId_idx" ON "UserSession" ("tenantId");

-- LoginEvent
ALTER TABLE "LoginEvent"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LoginEvent"
  ADD CONSTRAINT "LoginEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LoginEvent_tenantId_idx" ON "LoginEvent" ("tenantId");

-- Delegation
ALTER TABLE "Delegation"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Delegation"
  ADD CONSTRAINT "Delegation_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Delegation_tenantId_idx" ON "Delegation" ("tenantId");

-- LeaveRequest
ALTER TABLE "LeaveRequest"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LeaveRequest"
  ADD CONSTRAINT "LeaveRequest_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LeaveRequest_tenantId_idx" ON "LeaveRequest" ("tenantId");

-- LeaveCredit
ALTER TABLE "LeaveCredit"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LeaveCredit"
  ADD CONSTRAINT "LeaveCredit_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LeaveCredit_tenantId_idx" ON "LeaveCredit" ("tenantId");

-- Attendance
ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Attendance_tenantId_idx" ON "Attendance" ("tenantId");

-- Appointment
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_idx" ON "Appointment" ("tenantId");

-- PerformanceReview
ALTER TABLE "PerformanceReview"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PerformanceReview"
  ADD CONSTRAINT "PerformanceReview_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PerformanceReview_tenantId_idx" ON "PerformanceReview" ("tenantId");

-- PlantillaItem
ALTER TABLE "PlantillaItem"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "PlantillaItem"
  ADD CONSTRAINT "PlantillaItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "PlantillaItem_tenantId_idx" ON "PlantillaItem" ("tenantId");

-- Position
ALTER TABLE "Position"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Position"
  ADD CONSTRAINT "Position_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Position_tenantId_idx" ON "Position" ("tenantId");

-- VacancyPublication
ALTER TABLE "VacancyPublication"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "VacancyPublication"
  ADD CONSTRAINT "VacancyPublication_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "VacancyPublication_tenantId_idx" ON "VacancyPublication" ("tenantId");

-- DesignationOrder
ALTER TABLE "DesignationOrder"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DesignationOrder"
  ADD CONSTRAINT "DesignationOrder_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "DesignationOrder_tenantId_idx" ON "DesignationOrder" ("tenantId");

-- TrainingProgram
ALTER TABLE "TrainingProgram"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TrainingProgram"
  ADD CONSTRAINT "TrainingProgram_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "TrainingProgram_tenantId_idx" ON "TrainingProgram" ("tenantId");

-- TrainingEnrollment
ALTER TABLE "TrainingEnrollment"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TrainingEnrollment"
  ADD CONSTRAINT "TrainingEnrollment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "TrainingEnrollment_tenantId_idx" ON "TrainingEnrollment" ("tenantId");

-- Eligibility
ALTER TABLE "Eligibility"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Eligibility"
  ADD CONSTRAINT "Eligibility_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Eligibility_tenantId_idx" ON "Eligibility" ("tenantId");

-- Disqualification
ALTER TABLE "Disqualification"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Disqualification"
  ADD CONSTRAINT "Disqualification_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Disqualification_tenantId_idx" ON "Disqualification" ("tenantId");

-- Applicant
ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Applicant"
  ADD CONSTRAINT "Applicant_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Applicant_tenantId_idx" ON "Applicant" ("tenantId");

-- Interview
ALTER TABLE "Interview"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Interview"
  ADD CONSTRAINT "Interview_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Interview_tenantId_idx" ON "Interview" ("tenantId");

-- ContributionRule
ALTER TABLE "ContributionRule"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ContributionRule"
  ADD CONSTRAINT "ContributionRule_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "ContributionRule_tenantId_idx" ON "ContributionRule" ("tenantId");

-- TaxBracket
ALTER TABLE "TaxBracket"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaxBracket"
  ADD CONSTRAINT "TaxBracket_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "TaxBracket_tenantId_idx" ON "TaxBracket" ("tenantId");

-- LeaveRuleConfig
ALTER TABLE "LeaveRuleConfig"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LeaveRuleConfig"
  ADD CONSTRAINT "LeaveRuleConfig_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LeaveRuleConfig_tenantId_idx" ON "LeaveRuleConfig" ("tenantId");

-- Bonus
ALTER TABLE "Bonus"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Bonus"
  ADD CONSTRAINT "Bonus_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Bonus_tenantId_idx" ON "Bonus" ("tenantId");

-- IDP
ALTER TABLE "IDP"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "IDP"
  ADD CONSTRAINT "IDP_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "IDP_tenantId_idx" ON "IDP" ("tenantId");

-- Competency
ALTER TABLE "Competency"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Competency"
  ADD CONSTRAINT "Competency_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Competency_tenantId_idx" ON "Competency" ("tenantId");

-- Loan
ALTER TABLE "Loan"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Loan"
  ADD CONSTRAINT "Loan_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "Loan_tenantId_idx" ON "Loan" ("tenantId");

-- LoanAmortization
ALTER TABLE "LoanAmortization"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "LoanAmortization"
  ADD CONSTRAINT "LoanAmortization_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "LoanAmortization_tenantId_idx" ON "LoanAmortization" ("tenantId");

-- AttendanceRule
ALTER TABLE "AttendanceRule"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "AttendanceRule"
  ADD CONSTRAINT "AttendanceRule_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "AttendanceRule_tenantId_idx" ON "AttendanceRule" ("tenantId");
