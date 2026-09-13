-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "monthlySalary" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PayrollPeriod" ADD COLUMN     "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN     "generatedAt" TIMESTAMP(3),
ADD COLUMN     "postedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_tenantId_name_key" ON "PayrollPeriod"("tenantId", "name");