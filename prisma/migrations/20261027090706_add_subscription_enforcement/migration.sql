-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_masjidId_fkey";

-- DropForeignKey
ALTER TABLE "CollectionEventAssignment" DROP CONSTRAINT "CollectionEventAssignment_masjidId_fkey";

-- AlterTable
ALTER TABLE "Masjid" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "maxCategories" INTEGER,
ADD COLUMN     "maxMembers" INTEGER,
ADD COLUMN     "maxStaff" INTEGER,
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateIndex
CREATE INDEX "Masjid_subscriptionStatus_idx" ON "Masjid"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Masjid_deletedAt_idx" ON "Masjid"("deletedAt");

-- AddForeignKey
ALTER TABLE "CollectionEventAssignment" ADD CONSTRAINT "CollectionEventAssignment_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
