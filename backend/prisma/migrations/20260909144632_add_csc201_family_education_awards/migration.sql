-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "birthDate" DATE,
    "occupation" TEXT,
    "isDependent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT,
    "fromDate" DATE,
    "toDate" DATE,
    "unitsEarned" DOUBLE PRECISION,
    "yearGraduated" INTEGER,
    "scholarships" TEXT,
    "honors" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "dateGiven" DATE,
    "remarks" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationRecord" ADD CONSTRAINT "EducationRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
