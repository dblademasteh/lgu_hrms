-- CreateTable
CREATE TABLE "PayrollDeductionLine" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "employeeShare" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employerShare" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "PayrollDeductionLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollItemId" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdfUrl" TEXT,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollItemId_key" ON "Payslip"("payrollItemId");

-- AddForeignKey
ALTER TABLE "PayrollDeductionLine" ADD CONSTRAINT "PayrollDeductionLine_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "PayrollItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
