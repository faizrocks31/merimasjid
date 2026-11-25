-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_masjidId_fkey";

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
