-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE INDEX "Member_masjidId_email_idx" ON "Member"("masjidId", "email");
