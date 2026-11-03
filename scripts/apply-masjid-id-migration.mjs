import 'dotenv/config';
import { execSync } from 'child_process';

// Apply the migration to the test database
execSync('npx prisma migrate dev --name add-user-phone-unique --schema=./prisma/schema.prisma --preview-feature', { stdio: 'inherit' });