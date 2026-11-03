-- Upgrade test-masjid to STARTER plan
-- This updates both the Subscription and denormalized Masjid fields

BEGIN;

-- Update subscription record
UPDATE "Subscription"
SET "planCode" = 'STARTER',
    "status" = 'ACTIVE',
    "endsAt" = NOW() + INTERVAL '1 month'
WHERE "masjidId" = (SELECT id FROM "Masjid" WHERE slug = 'test-masjid');

-- Update denormalized Masjid fields
UPDATE "Masjid"
SET "subscriptionStatus" = 'ACTIVE',
    "subscriptionEndsAt" = NOW() + INTERVAL '1 month',
    "maxMembers" = 500,
    "maxStaff" = 5,
    "maxCategories" = 20
WHERE slug = 'test-masjid';

COMMIT;