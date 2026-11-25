-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN     "body" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "NotificationLog_masjidId_recipient_channel_readAt_idx" ON "NotificationLog"("masjidId", "recipient", "channel", "readAt");
