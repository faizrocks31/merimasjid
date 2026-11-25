// Apply migrations to test database
import { execSync } from 'child_process';
import 'dotenv/config';

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('TEST_DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('Running prisma migrate deploy on test database...');

try {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Migration applied successfully');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  // Check if it's because migration already applied
  if (error.message.includes('already exists')) {
    console.log('Migration may already be applied. Checking status...');
    try {
      execSync('npx prisma migrate status', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (e) {
      console.error('Status check also failed:', e.message);
    }
  }
  process.exit(1);
}