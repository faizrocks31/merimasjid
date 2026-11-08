-- Phase 2B Schema Alignment Migration
-- Removes legacy ContributionCategory architecture (replaced by CollectionDefinition in Phase 2A)
-- Safe for fresh databases and existing test databases with manual corrections

-- 1. First remove dependent foreign key and column from PaymentAllocation
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT IF EXISTS "PaymentAllocation_categoryId_fkey";
ALTER TABLE "PaymentAllocation" DROP COLUMN IF EXISTS "categoryId";

-- 2. Then drop ContributionCategory table (if it exists)
DROP TABLE IF EXISTS "ContributionCategory";

-- Note: ContributionCategory is removed from Masjid relations in schema.prisma
-- This migration ensures fresh DB matches approved Prisma schema exactly