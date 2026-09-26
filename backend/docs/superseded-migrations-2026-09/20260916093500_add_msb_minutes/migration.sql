-- CreateTable
CREATE TABLE "MSBMinutes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT,
    "interviewId" TEXT NOT NULL,
    "deliberationDate" DATE NOT NULL,
    "minutes" TEXT,
    "resolution" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "MSBMinutes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MSBMinutes_tenantId_interviewId_idx" ON "MSBMinutes"("tenantId", "interviewId");

-- AddForeignKey
ALTER TABLE "MSBMinutes" ADD CONSTRAINT "MSBMinutes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MSBMinutes" ADD CONSTRAINT "MSBMinutes_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
