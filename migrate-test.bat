@echo off
SET TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/masjid_collection_test
npx prisma migrate deploy