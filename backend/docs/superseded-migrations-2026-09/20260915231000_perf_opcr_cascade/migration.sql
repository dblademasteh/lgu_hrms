-- AlterTable
ALTER TABLE "PerformanceReview" ADD COLUMN     "parentReviewId" TEXT;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_parentReviewId_fkey" FOREIGN KEY ("parentReviewId") REFERENCES "PerformanceReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
