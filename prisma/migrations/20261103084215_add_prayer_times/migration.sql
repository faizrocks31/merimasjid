-- AlterTable
ALTER TABLE "Masjid" ADD COLUMN     "asrTime" TEXT DEFAULT '16:00',
ADD COLUMN     "dhuhrTime" TEXT DEFAULT '12:30',
ADD COLUMN     "fajrTime" TEXT DEFAULT '05:30',
ADD COLUMN     "ishaTime" TEXT DEFAULT '19:45',
ADD COLUMN     "jummahTime" TEXT DEFAULT '13:00',
ADD COLUMN     "maghribTime" TEXT DEFAULT '18:15',
ADD COLUMN     "sunriseTime" TEXT DEFAULT '06:45';
