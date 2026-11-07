ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "purposeCode" TEXT;
ALTER TABLE "CollectionDefinition" ADD COLUMN IF NOT EXISTS "showInPaymentReceived" BOOLEAN NOT NULL DEFAULT true;