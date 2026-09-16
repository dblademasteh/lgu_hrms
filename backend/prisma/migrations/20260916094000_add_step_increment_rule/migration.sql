-- CreateTable
CREATE TABLE "StepIncrementRule" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "salaryGrade" INTEGER NOT NULL,
    "fromStep" INTEGER NOT NULL,
    "toStep" INTEGER NOT NULL,
    "incrementAmount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "StepIncrementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StepIncrementRule_tenantId_salaryGrade_idx" ON "StepIncrementRule"("tenantId", "salaryGrade");

-- AddForeignKey
ALTER TABLE "StepIncrementRule" ADD CONSTRAINT "StepIncrementRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
