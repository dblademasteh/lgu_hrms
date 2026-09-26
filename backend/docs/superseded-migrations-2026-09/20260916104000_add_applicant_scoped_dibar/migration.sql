-- AddColumn
ALTER TABLE "Disqualification" ADD COLUMN "applicantId" TEXT;

-- AddForeignKey
ALTER TABLE "Disqualification" ADD CONSTRAINT "Disqualification_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Disqualification_applicantId_idx" ON "Disqualification"("applicantId");
