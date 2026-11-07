const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaPg({
  connectionString: "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test"
});
const prisma = new PrismaClient({ adapter });

async function runMigrations() {
  try {
    console.log('Connecting to test database...');
    await prisma.$connect();

    // Read and apply all migrations in order
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    const migrationDirs = fs.readdirSync(migrationsDir)
      .filter(d => fs.statSync(path.join(migrationsDir, d)).isDirectory())
      .sort();

    for (const dir of migrationDirs) {
      const migrationPath = path.join(migrationsDir, dir, 'migration.sql');
      if (!fs.existsSync(migrationPath)) continue;

      console.log(`\nApplying ${dir}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Execute the whole SQL file at once (PostgreSQL handles multiple statements)
      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`✓ ${dir} applied`);
      } catch (e) {
        // Check if it's a "already exists" error
        if (e.message.includes('already exists') ||
            e.message.includes('duplicate') ||
            e.message.includes('does not exist')) {
          console.log(`⚠ ${dir} skipped (already applied or similar)`);
        } else {
          console.error(`✗ ${dir} failed:`, e.message.substring(0, 200));
          throw e;
        }
      }

      // Record migration
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
          VALUES (gen_random_uuid()::text, '${dir}', NOW(), '${dir}', '', NULL, NOW(), 1)
          ON CONFLICT DO NOTHING
        `);
      } catch (e) {
        // Ignore
      }
    }

    // Verify
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('\n=== Final Tables ===');
    console.log(tables.map(t => t.table_name).join(', '));

  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

runMigrations();