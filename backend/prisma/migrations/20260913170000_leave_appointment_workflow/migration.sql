-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "approvedAt" TIMESTAMPTZ(6),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "decisionNote" TEXT,
ADD COLUMN     "deniedAt" TIMESTAMPTZ(6),
ADD COLUMN     "deniedBy" TEXT;