-- Phase 2A Collection Architecture Migration (Fixed v2)
-- Generated from Prisma schema changes

-- 1. Create new enums FIRST (before tables that use them)
CREATE TYPE "CollectionFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'EVENT_BASED', 'ONE_TIME');
CREATE TYPE "AmountType" AS ENUM ('FIXED', 'VARIABLE');
CREATE TYPE "DonorEligibility" AS ENUM ('MEMBERS_ONLY', 'WALKIN_ONLY', 'BOTH');
CREATE TYPE "MemberAssignment" AS ENUM ('ALL_ELIGIBLE', 'SELECTED');
CREATE TYPE "DueGeneration" AS ENUM ('ADMIN', 'AUTOMATIC');
CREATE TYPE "SettlementPolicy" AS ENUM ('OLDEST_FIRST', 'ANY_PENDING_PERIOD');

-- 2. Create system taxonomy tables (global, non-masjid-scoped)
CREATE TABLE "BaseCategory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "BaseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BaseCategory_code_key" ON "BaseCategory"("code");

CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subcategory_code_key" ON "Subcategory"("code");

CREATE TABLE "BaseCategorySubcategory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "baseCategoryId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    CONSTRAINT "BaseCategorySubcategory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BaseCategorySubcategory_baseCategoryId_fkey" FOREIGN KEY ("baseCategoryId") REFERENCES "BaseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BaseCategorySubcategory_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BaseCategorySubcategory_baseCategoryId_subcategoryId_key" ON "BaseCategorySubcategory"("baseCategoryId", "subcategoryId");

-- 3. Create CollectionDefinition table
CREATE TABLE "CollectionDefinition" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "masjidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCategoryId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "CollectionFrequency" NOT NULL,
    "amountType" "AmountType" NOT NULL,
    "defaultAmountPaise" INTEGER,
    "donorEligibility" "DonorEligibility" NOT NULL,
    "memberAssignment" "MemberAssignment" NOT NULL,
    "dueGeneration" "DueGeneration" NOT NULL,
    "settlementPolicy" "SettlementPolicy" NOT NULL,
    CONSTRAINT "CollectionDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollectionDefinition_masjidId_name_key" ON "CollectionDefinition"("masjidId", "name");
CREATE INDEX "CollectionDefinition_masjidId_active_idx" ON "CollectionDefinition"("masjidId", "active");
ALTER TABLE "CollectionDefinition" ADD CONSTRAINT "CollectionDefinition_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionDefinition" ADD CONSTRAINT "CollectionDefinition_baseCategoryId_fkey" FOREIGN KEY ("baseCategoryId") REFERENCES "BaseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollectionDefinition" ADD CONSTRAINT "CollectionDefinition_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Update CollectionEvent table - replace categoryId with collectionDefinitionId
ALTER TABLE "CollectionEvent" ADD COLUMN "collectionDefinitionId" TEXT NOT NULL DEFAULT '';
UPDATE "CollectionEvent" SET "collectionDefinitionId" = (SELECT "id" FROM "CollectionDefinition" LIMIT 1);
ALTER TABLE "CollectionEvent" ALTER COLUMN "collectionDefinitionId" DROP DEFAULT;
ALTER TABLE "CollectionEvent" ADD CONSTRAINT "CollectionEvent_collectionDefinitionId_fkey" FOREIGN KEY ("collectionDefinitionId") REFERENCES "CollectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CollectionEvent_masjidId_collectionDefinitionId_status_idx" ON "CollectionEvent"("masjidId", "collectionDefinitionId", "status");
-- Drop old categoryId column
ALTER TABLE "CollectionEvent" DROP COLUMN "categoryId";

-- 5. Update ContributionPlan table - replace categoryId with collectionDefinitionId
ALTER TABLE "ContributionPlan" ADD COLUMN "collectionDefinitionId" TEXT NOT NULL DEFAULT '';
UPDATE "ContributionPlan" SET "collectionDefinitionId" = (SELECT "id" FROM "CollectionDefinition" LIMIT 1);
ALTER TABLE "ContributionPlan" ALTER COLUMN "collectionDefinitionId" DROP DEFAULT;
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_collectionDefinitionId_fkey" FOREIGN KEY ("collectionDefinitionId") REFERENCES "CollectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Update unique constraint
DROP INDEX IF EXISTS "ContributionPlan_masjidId_memberId_categoryId_key";
CREATE UNIQUE INDEX "plan_unique_active" ON "ContributionPlan"("masjidId", "memberId", "collectionDefinitionId") WHERE "status" = 'ACTIVE';
ALTER TABLE "ContributionPlan" DROP COLUMN "categoryId";

-- 6. Update DuesPeriod table - add collectionDefinitionId, make planId nullable, add new unique constraints
ALTER TABLE "DuesPeriod" ADD COLUMN "collectionDefinitionId" TEXT NOT NULL DEFAULT '';
UPDATE "DuesPeriod" SET "collectionDefinitionId" = (SELECT "id" FROM "CollectionDefinition" LIMIT 1);
ALTER TABLE "DuesPeriod" ALTER COLUMN "collectionDefinitionId" DROP DEFAULT;
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_collectionDefinitionId_fkey" FOREIGN KEY ("collectionDefinitionId") REFERENCES "CollectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Make planId nullable
ALTER TABLE "DuesPeriod" ALTER COLUMN "planId" DROP NOT NULL;
-- Drop old unique constraint
DROP INDEX IF EXISTS "DuesPeriod_planId_periodStart_periodEnd_key";
-- Add new unique constraints
CREATE UNIQUE INDEX "DuesPeriod_collectionDefinitionId_memberId_periodStart_periodEnd_key" ON "DuesPeriod"("collectionDefinitionId", "memberId", "periodStart", "periodEnd");
CREATE UNIQUE INDEX "DuesPeriod_plan_period_key" ON "DuesPeriod"("planId", "periodStart", "periodEnd") WHERE "planId" IS NOT NULL;
CREATE INDEX "DuesPeriod_collectionDefinitionId_dueDate_idx" ON "DuesPeriod"("collectionDefinitionId", "dueDate");

-- 7. Update PaymentAllocation table - add collectionDefinitionId, DROP old categoryId FK, change FK behaviors to RESTRICT
ALTER TABLE "PaymentAllocation" ADD COLUMN "collectionDefinitionId" TEXT NOT NULL DEFAULT '';
UPDATE "PaymentAllocation" SET "collectionDefinitionId" = (SELECT "id" FROM "CollectionDefinition" LIMIT 1);
ALTER TABLE "PaymentAllocation" ALTER COLUMN "collectionDefinitionId" DROP DEFAULT;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_collectionDefinitionId_fkey" FOREIGN KEY ("collectionDefinitionId") REFERENCES "CollectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PaymentAllocation_collectionDefinitionId_idx" ON "PaymentAllocation"("collectionDefinitionId");

-- DROP the old categoryId FK and column
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT IF EXISTS "PaymentAllocation_categoryId_fkey";
ALTER TABLE "PaymentAllocation" DROP COLUMN IF EXISTS "categoryId";

-- Change masjid and payment FK to RESTRICT
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT IF EXISTS "PaymentAllocation_masjidId_fkey";
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT IF EXISTS "PaymentAllocation_paymentId_fkey";
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Update Masjid relations FK behaviors to RESTRICT for financial tables
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_masjidId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_donorMemberId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_donorMemberId_fkey" FOREIGN KEY ("donorMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_enteredBy_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enteredBy_fkey" FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Member" DROP CONSTRAINT IF EXISTS "Member_masjidId_fkey";
ALTER TABLE "Member" ADD CONSTRAINT "Member_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DuesPeriod" DROP CONSTRAINT IF EXISTS "DuesPeriod_masjidId_fkey";
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DuesPeriod" DROP CONSTRAINT IF EXISTS "DuesPeriod_memberId_fkey";
ALTER TABLE "DuesPeriod" ADD CONSTRAINT "DuesPeriod_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContributionPlan" DROP CONSTRAINT IF EXISTS "ContributionPlan_masjidId_fkey";
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContributionPlan" DROP CONSTRAINT IF EXISTS "ContributionPlan_memberId_fkey";
ALTER TABLE "ContributionPlan" ADD CONSTRAINT "ContributionPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 9. Update CollectionEvent to use the new status default (OPEN)
ALTER TABLE "CollectionEvent" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- 10. Drop ContributionCategory table (after removing all FKs)
-- Drop indexes on ContributionCategory
DROP INDEX IF EXISTS "ContributionCategory_masjidId_code_key";
-- Drop the table
DROP TABLE IF EXISTS "ContributionCategory";

-- Note: This migration assumes a clean database start where old data doesn't need migration.