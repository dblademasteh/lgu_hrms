-- Payroll CSC/DBM compliance pass:
--  - OvertimeRequest model (CSC-DBM JC 2 s.2015)
--  - LeaveRequest.monetizedDays for yearly-cap accounting (CSC MC 2 s.2016)
--  - PayrollDeductionLine.quantity for VL-debit/OT-hour units settled at POST

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "monetizedDays" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PayrollDeductionLine" ADD COLUMN     "quantity" DECIMAL(8,2);

-- CreateEnum (if not already present)
DO $$ BEGIN
  CREATE TYPE "OvertimeType" AS ENUM ('WORKDAY', 'REST_DAY', 'HOLIDAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OvertimeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- CreateIndex
CREATE INDEX "OvertimeRequest_tenantId_status_idx" ON "OvertimeRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "OvertimeRequest_tenantId_employeeId_date_idx" ON "OvertimeRequest"("tenantId", "employeeId", "date");

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;