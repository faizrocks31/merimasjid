// Check migration status
import { execSync } from 'child_process';
import 'dotenv/config';

const testDbUrl = process.env.TEST_DATABASE_URL;

if (!testDbUrl) {
  console.error('TEST_DATABASE_URL not found in environment');
  process.exit(1);
}

console.log('Checking migration status...');

try {
  execSync('npx prisma migrate status', {
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Migration status checked');
} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}