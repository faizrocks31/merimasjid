// Apply migrations to test database using env file
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import 'dotenv/config';

console.log('Applying migrations to test database...');

// Use the TEST_DATABASE_URL from environment (loaded from .env by Next.js)
const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('TEST_DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('TEST_DATABASE_URL found, running prisma migrate deploy...');

try {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Migration applied successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}