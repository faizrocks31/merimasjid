-- Phase 2B Schema Alignment Migration
-- Removes legacy ContributionCategory architecture, aligns with approved CollectionDefinition architecture
-- Safe for fresh databases and existing test database with manual corrections

-- 1. Drop dependent foreign key first (PaymentAllocation -> ContributionCategory)
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT IF EXISTS "PaymentAllocation_categoryId_fkey";

-- 2. Drop dependent column
ALTER TABLE "PaymentAllocation" DROP COLUMN IF EXISTS "categoryId";

-- 3. Drop ContributionCategory table (if exists)
DROP TABLE IF EXISTS "ContributionCategory";

-- 4. Remove any remaining indexes on PaymentAllocation.categoryId (if they exist)
DROP INDEX IF EXISTS "PaymentAllocation_categoryId_idx";