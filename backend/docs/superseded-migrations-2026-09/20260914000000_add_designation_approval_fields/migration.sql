-- Fix schema drift: DesignationOrder.approvedBy and recommendedBy existed in
-- schema.prisma without a covering migration, crashing every designation read
-- with P2022 (column does not exist).
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "DesignationOrder" ADD COLUMN IF NOT EXISTS "recommendedBy" TEXT;
