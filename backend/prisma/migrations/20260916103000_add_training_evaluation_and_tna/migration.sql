-- CreateTable
CREATE TABLE "TrainingNeedsAssessment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "answers" JSONB,
    "submittedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "TrainingNeedsAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingNeedsAssessment_tenantId_employeeId_year_idx" ON "TrainingNeedsAssessment"("tenantId", "employeeId", "year");

-- AddForeignKey
ALTER TABLE "TrainingNeedsAssessment" ADD CONSTRAINT "TrainingNeedsAssessment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LdPlan" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "year" INTEGER NOT NULL,
    "programs" JSONB,
    "budget" DECIMAL(12,2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "LdPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LdPlan_tenantId_year_idx" ON "LdPlan"("tenantId", "year");

-- AddForeignKey
ALTER TABLE "LdPlan" ADD CONSTRAINT "LdPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TrainingEvaluation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "enrollmentId" TEXT NOT NULL,
    "reaction" INTEGER,
    "learning" INTEGER,
    "behavior" INTEGER,
    "results" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "TrainingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingEvaluation_tenantId_enrollmentId_idx" ON "TrainingEvaluation"("tenantId", "enrollmentId");

-- AddForeignKey
ALTER TABLE "TrainingEvaluation" ADD CONSTRAINT "TrainingEvaluation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingEvaluation" ADD CONSTRAINT "TrainingEvaluation_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "TrainingEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
