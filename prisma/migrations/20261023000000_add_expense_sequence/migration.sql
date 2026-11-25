-- CreateTable
CREATE TABLE "ExpenseSequence" (
    "id" TEXT NOT NULL,
    "masjidId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExpenseSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSequence_masjidId_financialYear_key" ON "ExpenseSequence"("masjidId", "financialYear");

-- AddForeignKey
ALTER TABLE "ExpenseSequence" ADD CONSTRAINT "ExpenseSequence_masjidId_fkey" FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE CASCADE ON UPDATE CASCADE;