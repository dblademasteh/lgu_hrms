-- CreateTable
CREATE TABLE "ContributionRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeRate" DECIMAL(5,4) NOT NULL,
    "employerRate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxBracket" (
    "id" TEXT NOT NULL,
    "minIncome" DECIMAL(12,2) NOT NULL,
    "maxIncome" DECIMAL(12,2),
    "rate" DECIMAL(5,4) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRuleConfig" (
    "id" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "accrualPerMonth" DECIMAL(4,2) NOT NULL,
    "maxCarryOver" DECIMAL(6,2),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRuleConfig_pkey" PRIMARY KEY ("id")
);
