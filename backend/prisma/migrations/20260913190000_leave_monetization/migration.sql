-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "monetized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monetizedAmount" DECIMAL(12,2),
ADD COLUMN     "monetizedAt" TIMESTAMPTZ(6);