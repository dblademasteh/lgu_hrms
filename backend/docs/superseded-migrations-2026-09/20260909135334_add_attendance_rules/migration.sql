-- CreateTable
CREATE TABLE "AttendanceRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tardinessMin" INTEGER NOT NULL,
    "deductionRate" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AttendanceRule_pkey" PRIMARY KEY ("id")
);
