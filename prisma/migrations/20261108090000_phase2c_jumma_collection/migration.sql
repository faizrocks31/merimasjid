-- Phase 2C: Jumma aggregate collection + correction history + purposeNote on PaymentAllocation
-- Creates JummaCollection and JummaCorrection tables
-- Converts collectionDate to PostgreSQL DATE safely
-- Uses ON DELETE RESTRICT for FKs to prevent orphaned records

-- 1. Create JummaCollection table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'JummaCollection'
    ) THEN
        CREATE TABLE "JummaCollection" (
            "id" TEXT NOT NULL,
            "masjidId" TEXT NOT NULL,
            "collectionDefinitionId" TEXT NOT NULL,
            "collectionDate" DATE NOT NULL,
            "totalAmountPaise" INTEGER NOT NULL DEFAULT 0,
            "participantCount" INTEGER NOT NULL DEFAULT 0,
            "notes" TEXT,
            "recordedBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "updatedBy" TEXT,

            CONSTRAINT "JummaCollection_pkey" PRIMARY KEY ("id")
        );
    END IF;
END
$$;

-- 2. Safely convert collectionDate column to DATE if it's currently TIMESTAMP
-- This handles existing databases where the column was created as TIMESTAMP
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'JummaCollection'
          AND column_name = 'collectionDate'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE "JummaCollection" ALTER COLUMN "collectionDate" TYPE DATE USING "collectionDate"::DATE;
    END IF;
END
$$;

-- 3. Add purposeNote field to PaymentAllocation (set default if not already set)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'PaymentAllocation'
          AND column_name = 'purposeNote'
    ) THEN
        ALTER TABLE "PaymentAllocation" ADD COLUMN "purposeNote" TEXT DEFAULT '';
    ELSE
        ALTER TABLE "PaymentAllocation" ALTER COLUMN "purposeNote" SET DEFAULT '';
    END IF;
END
$$;

-- 4. Create unique constraint: one JummaCollection per masjid + date + collection definition
-- Check for duplicate dates before applying uniqueness
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT "masjidId", "collectionDate", "collectionDefinitionId"
        FROM "JummaCollection"
        GROUP BY "masjidId", "collectionDate", "collectionDefinitionId"
        HAVING COUNT(*) > 1
    ) AS duplicates;

    IF dup_count = 0 THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = 'JummaCollection_masjidId_collectionDate_collectionDefinitionId_key'
        ) THEN
            CREATE UNIQUE INDEX "JummaCollection_masjidId_collectionDate_collectionDefinitionId_key"
            ON "JummaCollection"("masjidId", "collectionDate", "collectionDefinitionId");
        END IF;
    ELSE
        RAISE NOTICE 'JummaCollection has % duplicate date(s); uniqueness constraint not applied. Manual deduplication required.', dup_count;
    END IF;
END
$$;

-- 5. Create index for date-based queries
CREATE INDEX IF NOT EXISTS "JummaCollection_masjidId_collectionDate_idx" ON "JummaCollection"("masjidId", "collectionDate");

-- 6. Add foreign keys (skip if already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCollection_masjidId_fkey'
    ) THEN
        ALTER TABLE "JummaCollection" ADD CONSTRAINT "JummaCollection_masjidId_fkey"
        FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCollection_collectionDefinitionId_fkey'
    ) THEN
        ALTER TABLE "JummaCollection" ADD CONSTRAINT "JummaCollection_collectionDefinitionId_fkey"
        FOREIGN KEY ("collectionDefinitionId") REFERENCES "CollectionDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCollection_recordedBy_fkey'
    ) THEN
        ALTER TABLE "JummaCollection" ADD CONSTRAINT "JummaCollection_recordedBy_fkey"
        FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCollection_updatedBy_fkey'
    ) THEN
        ALTER TABLE "JummaCollection" ADD CONSTRAINT "JummaCollection_updatedBy_fkey"
        FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- 7. Create JummaCorrection table for audit history
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'JummaCorrection'
    ) THEN
        CREATE TABLE "JummaCorrection" (
            "id" TEXT NOT NULL,
            "masjidId" TEXT NOT NULL,
            "jummaCollectionId" TEXT NOT NULL,
            "previousAmountPaise" INTEGER NOT NULL,
            "newAmountPaise" INTEGER NOT NULL,
            "reason" TEXT NOT NULL,
            "correctedBy" TEXT NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "JummaCorrection_pkey" PRIMARY KEY ("id")
        );
    END IF;
END
$$;

-- 8. Create indexes for JummaCorrection
CREATE INDEX IF NOT EXISTS "JummaCorrection_masjidId_createdAt_idx" ON "JummaCorrection"("masjidId", "createdAt");
CREATE INDEX IF NOT EXISTS "JummaCorrection_jummaCollectionId_idx" ON "JummaCorrection"("jummaCollectionId");

-- 9. Add foreign keys for JummaCorrection
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCorrection_masjidId_fkey'
    ) THEN
        ALTER TABLE "JummaCorrection" ADD CONSTRAINT "JummaCorrection_masjidId_fkey"
        FOREIGN KEY ("masjidId") REFERENCES "Masjid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCorrection_jummaCollectionId_fkey'
    ) THEN
        ALTER TABLE "JummaCorrection" ADD CONSTRAINT "JummaCorrection_jummaCollectionId_fkey"
        FOREIGN KEY ("jummaCollectionId") REFERENCES "JummaCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'JummaCorrection_correctedBy_fkey'
    ) THEN
        ALTER TABLE "JummaCorrection" ADD CONSTRAINT "JummaCorrection_correctedBy_fkey"
        FOREIGN KEY ("correctedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
