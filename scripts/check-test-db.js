const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkDB() {
  try {
    console.log('Testing connection to test database...');
    await prisma.$connect();
    console.log('Connected successfully!');

    // Check existing tables
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('Existing tables:', tables);

    // Check migrations table
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at
        FROM _prisma_migrations
        ORDER BY finished_at
      `;
      console.log('Applied migrations:', migrations);
    } catch (e) {
      console.log('Migrations table does not exist yet');
    }

  } catch (e) {
    console.error('Connection error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();