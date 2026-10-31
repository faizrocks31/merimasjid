-- Change AuditLog.masjidId FK from CASCADE to SET NULL to preserve audit trail on masjid deletion
-- This prevents ordinary tenant deletion from destroying the financial audit trail

ALTER TABLE "AuditLog"
  DROP CONSTRAINT IF EXISTS "AuditLog_masjidId_fkey";

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_masjidId_fkey"
  FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id")
  ON DELETE SET NULL;