-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'RECOMMENDED';

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "advanceNoticed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "isForced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLwop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTerminal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recommendedAt" TIMESTAMPTZ(6),
ADD COLUMN     "recommendedBy" TEXT,
ADD COLUMN     "studyBondMonths" INTEGER;