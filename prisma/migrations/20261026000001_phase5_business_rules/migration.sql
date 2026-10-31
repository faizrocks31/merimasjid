-- Phase 5: Business Rules and Data Integrity
-- 1. Unique constraint on active ContributionPlan per member+category per masjid
-- 2. Drop unused CashSession model/table
-- 3. Reversal.reversalPaymentId already exists in schema - populated via code in reversePaymentAction

-- 1. Add partial unique index for active contribution plans
-- Prevents duplicate active plans for same member+category in same masjid
CREATE UNIQUE INDEX IF NOT EXISTS "ContributionPlan_masjid_member_category_active_key"
ON "ContributionPlan" ("masjidId", "memberId", "categoryId")
WHERE "status" = 'ACTIVE';

-- 2. Drop CashSession table (unused - 0 rows, no code references)
DROP TABLE IF EXISTS "CashSession";

-- 3. Member.telegramChatId already has global unique index (@@unique in schema)
-- No action needed

-- 4. Reversal.reversalPaymentId column already exists in schema
-- Now populated in reversePaymentAction when creating reversal payment