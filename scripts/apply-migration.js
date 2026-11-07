const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function applyMigration() {
  try {
    console.log('Applying Phase 2A migration...');
    await prisma.$connect();

    // Read migration SQL
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20261106000000_phase2a_collection_architecture', 'migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split into statements and execute
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length === 0) continue;

      try {
        await prisma.$executeRawUnsafe(trimmed + ';');
        console.log('✓ Executed:', trimmed.substring(0, 80) + '...');
      } catch (e) {
        // Some statements may fail if already applied (e.g., enum creation)
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('⚠ Skipped (already exists):', trimmed.substring(0, 80) + '...');
        } else {
          console.error('✗ Error:', e.message);
          console.error('Statement:', trimmed.substring(0, 200));
        }
      }
    }

    // Verify new tables
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('\nTables after migration:', tables.map(t => t.table_name));

    // Record migration in _prisma_migrations
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      VALUES (gen_random_uuid()::text, 'phase2a', NOW(), '20261106000000_phase2a_collection_architecture', '', NULL, NOW(), 1)
    `);
    console.log('\n✓ Migration recorded in _prisma_migrations');

  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();