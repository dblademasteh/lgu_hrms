-- CreateIndex
CREATE INDEX "Attendance_tenantId_employeeId_date_idx" ON "Attendance"("tenantId", "employeeId", "date");

-- CreateIndex
CREATE INDEX "AttendanceRule_tenantId_active_idx" ON "AttendanceRule"("tenantId", "active");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "ContributionRule_tenantId_effectiveFrom_idx" ON "ContributionRule"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

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
CREATE INDEX "PayrollPeriod_tenantId_idx" ON "PayrollPeriod"("tenantId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_periodId_idx" ON "PayrollRun"("tenantId", "periodId");

-- CreateIndex
CREATE INDEX "PayrollRun_tenantId_createdAt_idx" ON "PayrollRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Payslip_tenantId_payrollItemId_idx" ON "Payslip"("tenantId", "payrollItemId");

-- CreateIndex
CREATE INDEX "TaxBracket_tenantId_minIncome_idx" ON "TaxBracket"("tenantId", "minIncome");