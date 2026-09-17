-- CreateIndex
CREATE UNIQUE INDEX "PerformanceReview_tenantId_employeeId_reviewYear_reviewType_key" ON "PerformanceReview"("tenantId", "employeeId", "reviewYear", "reviewType");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingEnrollment_tenantId_programId_employeeId_key" ON "TrainingEnrollment"("tenantId", "programId", "employeeId");