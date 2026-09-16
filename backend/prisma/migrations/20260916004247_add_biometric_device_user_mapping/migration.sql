-- CreateTable
CREATE TABLE "BiometricDeviceUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "deviceId" TEXT NOT NULL,
    "deviceUserId" VARCHAR(120) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BiometricDeviceUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricDeviceUser_tenantId_deviceId_idx" ON "BiometricDeviceUser"("tenantId", "deviceId");

-- CreateIndex
CREATE INDEX "BiometricDeviceUser_tenantId_employeeId_idx" ON "BiometricDeviceUser"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDeviceUser_deviceId_deviceUserId_key" ON "BiometricDeviceUser"("deviceId", "deviceUserId");

-- AddForeignKey
ALTER TABLE "BiometricDeviceUser" ADD CONSTRAINT "BiometricDeviceUser_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDeviceUser" ADD CONSTRAINT "BiometricDeviceUser_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
