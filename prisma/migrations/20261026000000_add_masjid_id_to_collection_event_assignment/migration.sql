-- Add masjidId to CollectionEventAssignment for explicit tenant scoping
-- This enables direct tenant ownership verification without joining through CollectionEvent

-- Add the column with a default (will be backfilled)
ALTER TABLE "CollectionEventAssignment" ADD COLUMN "masjidId" TEXT;

-- Backfill from CollectionEvent relationship
UPDATE "CollectionEventAssignment" cea
SET "masjidId" = ce."masjidId"
FROM "CollectionEvent" ce
WHERE cea."eventId" = ce.id;

-- Make it NOT NULL after backfill
ALTER TABLE "CollectionEventAssignment" ALTER COLUMN "masjidId" SET NOT NULL;

-- Add foreign key to Masjid
ALTER TABLE "CollectionEventAssignment" ADD CONSTRAINT "CollectionEventAssignment_masjidId_fkey"
  FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE;

-- Add index for tenant-scoped queries
CREATE INDEX "CollectionEventAssignment_masjidId_idx" ON "CollectionEventAssignment"("masjidId");

-- Add composite index for common query patterns
CREATE INDEX "CollectionEventAssignment_masjidId_eventId_idx" ON "CollectionEventAssignment"("masjidId", "eventId");
CREATE INDEX "CollectionEventAssignment_masjidId_memberId_idx" ON "CollectionEventAssignment"("masjidId", "memberId");