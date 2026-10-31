-- Add idempotencyKey columns and unique constraints
-- Member table
ALTER TABLE "Member" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Member_masjidId_idempotencyKey_key" ON "Member"("masjidId", "idempotencyKey");

-- ContributionPlan table
ALTER TABLE "ContributionPlan" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "ContributionPlan_masjidId_idempotencyKey_key" ON "ContributionPlan"("masjidId", "idempotencyKey");

-- Expense table
ALTER TABLE "Expense" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Expense_masjidId_idempotencyKey_key" ON "Expense"("masjidId", "idempotencyKey");