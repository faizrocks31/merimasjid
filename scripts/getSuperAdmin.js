import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, ROLES } from '../src/lib/constants';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL || 'platform-admin@example.invalid';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('Super admin user not found');
    process.exit(1);
  }
  console.log(JSON.stringify({ id: user.id, email: user.email }));
}

main().finally(() => prisma.$disconnect());
