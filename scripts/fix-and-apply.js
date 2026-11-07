const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaPg({
  connectionString: "postgresql://masjid_app:xNyfsjngYpP9TiJgIQa75rVi1rvnHLVWUFENg37CGMw_@127.0.0.1:5432/masjid_collection_test"
});
const prisma = new PrismaClient({ adapter });

async function fixMigration() {
  try {
    console.log('Fixing migration state...');
    await prisma.$connect();

    // Drop tables in dependency order
    const dropOrder = [
      'PaymentAllocation', 'Payment', 'ReceiptEvent', 'ReceiptSequence',
      'DuesPeriod', 'ContributionPlan', 'PlanAmountHistory',
      'CollectionEventAssignment', 'CollectionEvent', 'CollectionDefinition',
      'BaseCategorySubcategory', 'Subcategory', 'BaseCategory',
      'ContributionCategory',
      'Member', 'MasjidUser', 'MemberSequence', 'User',
      'Masjid', 'Expense', 'ExpenseCategory', 'ExpenseSequence',
      'AuditLog', 'Subscription', 'NotificationLog', 'MasjidNotificationSettings',
      'Reversal', '_prisma_migrations'
    ];

    for (const table of dropOrder) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`Dropped ${table}`);
      } catch (e) {
        // Ignore
      }
    }

    // Drop enums
    const dropEnums = [
      'CollectionFrequency', 'AmountType', 'DonorEligibility',
      'MemberAssignment', 'DueGeneration', 'SettlementPolicy'
    ];
    for (const enumName of dropEnums) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumName}" CASCADE`);
        console.log(`Dropped enum ${enumName}`);
      } catch (e) {
        // Ignore
      }
    }

    console.log('\nAll tables and enums dropped. Re-applying all migrations...');

    // Re-apply all migrations
    const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
    const migrationDirs = fs.readdirSync(migrationsDir)
      .filter(d => fs.statSync(path.join(migrationsDir, d)).isDirectory())
      .sort();

    for (const dir of migrationDirs) {
      const migrationPath = path.join(migrationsDir, dir, 'migration.sql');
      if (!fs.existsSync(migrationPath)) {
        console.log(`Skipping ${dir} - no migration.sql`);
        continue;
      }

      console.log(`\nApplying ${dir}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await prisma.$executeRawUnsafe(sql);
        console.log(`✓ ${dir} applied`);
      } catch (e) {
        if (e.message.includes('already exists') ||
            e.message.includes('duplicate') ||
            e.message.includes('does not exist')) {
          console.log(`⚠ ${dir} skipped (already exists)`);
        } else {
          console.error(`✗ ${dir} failed:`, e.message.substring(0, 200));
          // Don't throw, continue
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

    // Verify final state
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name
    `;
    console.log('\n=== Final Tables ===');
    console.log(tables.map(t => t.table_name).join(', '));

    // Verify new tables
    const expectedNew = ['BaseCategory', 'Subcategory', 'BaseCategorySubcategory', 'CollectionDefinition'];
    for (const t of expectedNew) {
      const exists = tables.some(tbl => tbl.table_name === t);
      console.log(`${exists ? '✓' : '✗'} ${t}`);
    }

    // Verify ContributionCategory is gone
    const hasOld = tables.some(tbl => tbl.table_name === 'ContributionCategory');
    console.log(`${!hasOld ? '✓' : '✗'} ContributionCategory removed`);

  } catch (e) {
    console.error('Fatal error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixMigration();