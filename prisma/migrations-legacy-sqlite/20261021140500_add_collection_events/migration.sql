-- CreateCollectionEventTable
CREATE TABLE "CollectionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "masjidId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "dueDate" DATETIME NOT NULL,
    "expectedAmountPaise" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "applicableMonth" INTEGER,
    "applicableYear" INTEGER,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ContributionCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionEvent_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateCollectionEventAssignmentTable
CREATE TABLE "CollectionEventAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "expectedAmountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollectionEventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CollectionEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionEventAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add columns to ContributionCategory
ALTER TABLE "ContributionCategory" ADD COLUMN "description" TEXT;
ALTER TABLE "ContributionCategory" ADD COLUMN "defaultAmountPaise" INTEGER;
ALTER TABLE "ContributionCategory" ADD COLUMN "frequency" TEXT;
ALTER TABLE "ContributionCategory" ADD COLUMN "collectionMode" TEXT;
ALTER TABLE "ContributionCategory" ADD COLUMN "schedulingRules" TEXT;
ALTER TABLE "ContributionCategory" ADD COLUMN "defaultDueDay" INTEGER;
ALTER TABLE "ContributionCategory" ADD COLUMN "defaultGraceDays" INTEGER NOT NULL DEFAULT 0;

-- Add column to PaymentAllocation
ALTER TABLE "PaymentAllocation" ADD COLUMN "collectionEventId" TEXT;

-- Create indexes
CREATE INDEX "CollectionEvent_masjidId_categoryId_status_idx" ON "CollectionEvent"("masjidId", "categoryId", "status");
CREATE INDEX "CollectionEvent_masjidId_dueDate_idx" ON "CollectionEvent"("masjidId", "dueDate");
CREATE UNIQUE INDEX "CollectionEventAssignment_eventId_memberId_key" ON "CollectionEventAssignment"("eventId", "memberId");
CREATE INDEX "CollectionEventAssignment_memberId_status_idx" ON "CollectionEventAssignment"("memberId", "status");
CREATE INDEX "PaymentAllocation_collectionEventId_idx" ON "PaymentAllocation"("collectionEventId");

-- Update Masjid table to add relation (implicit via FK)
-- No column needed

-- Update Member table to add relation (implicit via FK)
-- No column needed