-- CreateEnum
CREATE TYPE "PlantillaStatus" AS ENUM ('VACANT', 'FILLED', 'FROZEN');

-- CreateEnum
CREATE TYPE "VacancyStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PlantillaItem" (
    "id" TEXT NOT NULL,
    "itemNumber" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "PlantillaStatus" NOT NULL DEFAULT 'VACANT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlantillaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "plantillaItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "qualifications" TEXT,
    "status" "VacancyStatus" NOT NULL DEFAULT 'OPEN',
    "publishedAt" TIMESTAMPTZ(6),
    "closesAt" DATE,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyPublication" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "link" TEXT,

    CONSTRAINT "VacancyPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignationOrder" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "vacancyId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "issuedDate" DATE NOT NULL,
    "signedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlantillaItem_itemNumber_key" ON "PlantillaItem"("itemNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationOrder_orderNumber_key" ON "DesignationOrder"("orderNumber");

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaItem" ADD CONSTRAINT "PlantillaItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_plantillaItemId_fkey" FOREIGN KEY ("plantillaItemId") REFERENCES "PlantillaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyPublication" ADD CONSTRAINT "VacancyPublication_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignationOrder" ADD CONSTRAINT "DesignationOrder_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
