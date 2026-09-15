-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "deviceRef" TEXT,
ADD COLUMN     "source" TEXT DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "protocol" TEXT NOT NULL DEFAULT 'ZK_TCP',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 4370,
    "serial" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalMs" INTEGER NOT NULL DEFAULT 30000,
    "lastConnectedAt" TIMESTAMPTZ(6),
    "lastSyncAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDeviceLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "deviceId" TEXT NOT NULL,
    "deviceLogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "punchedAt" TIMESTAMPTZ(6) NOT NULL,
    "verification" TEXT,
    "employeeId" TEXT,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricDeviceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BiometricDevice_tenantId_active_idx" ON "BiometricDevice"("tenantId", "active");

-- CreateIndex
CREATE INDEX "BiometricDeviceLog_tenantId_deviceId_punchedAt_idx" ON "BiometricDeviceLog"("tenantId", "deviceId", "punchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDeviceLog_deviceId_deviceLogId_key" ON "BiometricDeviceLog"("deviceId", "deviceLogId");

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDeviceLog" ADD CONSTRAINT "BiometricDeviceLog_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "BiometricDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
