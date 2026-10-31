-- CreateTable
CREATE TABLE "MemberSequence" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MemberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberSequence_masjidId_key" ON "MemberSequence"("masjidId");

-- AddForeignKey
ALTER TABLE "MemberSequence" ADD CONSTRAINT "MemberSequence_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
