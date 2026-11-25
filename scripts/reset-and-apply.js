const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');
const path = require('path');

const adapter = new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function resetAndApply() {
  try {
    console.log('Resetting test database...');
    await prisma.$connect();

    // Drop all tables in reverse dependency order
    const dropTables = [
      'PaymentAllocation', 'Payment', 'ReceiptEvent', 'ReceiptSequence',
      'DuesPeriod', 'ContributionPlan', 'PlanAmountHistory',
      'CollectionEventAssignment', 'CollectionEvent', 'CollectionDefinition',
      'BaseCategorySubcategory', 'Subcategory', 'BaseCategory',
      'ContributionCategory',
      'Member', 'MasjidUser', 'MemberSequence', 'User',
      'Masjid', 'Expense', 'ExpenseCategory', 'ExpenseSequence',
      'AuditLog', 'Subscription', 'NotificationLog', 'MasjidNotificationSettings',
      'Reversal'
    ];

    for (const table of dropTables) {
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

    console.log('\nRe-applying all migrations from scratch...');

    // Re-apply all migrations in order
    const migrationDirs = [
      '20261022000000_postgres_baseline',
      '20261022170257_add_expense_sequence',
      '20261023000000_add_expense_sequence',
      '20261025000000_add_idempotency_keys',
      '20261026000000_add_masjid_id_to_collection_event_assignment',
      '20261026000001_phase5_business_rules',
      '20261027090706_add_subscription_enforcement',
      '20261028171926_add_member_email',
      '20261030000000_audit_retention',
      '20261031132618_fix_auditlog_cascade_to_restrict',
      '20261102171523_add_user_phone_unique',
      '20261103061650_add_notification_read_tracking',
      '20261103084215_add_prayer_times',
      '20261103163304_add_prayer_times_updated_at',
      '20261106000000_phase2a_collection_architecture'
    ];

    for (const dir of migrationDirs) {
      const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', dir, 'migration.sql');
      if (!fs.existsSync(migrationPath)) {
        console.log(`Skipping ${dir} - no migration.sql`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');
      const statements = sql.split(';').filter(s => s.trim().length > 0);

      console.log(`\nApplying ${dir}...`);
      for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (trimmed.length === 0) continue;
        if (trimmed.startsWith('--')) continue;

        try {
          await prisma.$executeRawUnsafe(trimmed + ';');
        } catch (e) {
          if (e.message.includes('already exists') || e.message.includes('duplicate') || e.message.includes('does not exist')) {
            // Ignore expected errors
          } else {
            console.error('Error in', dir, ':', e.message.substring(0, 100));
            console.error('Statement:', trimmed.substring(0, 200));
          }
        }
      }

      // Record migration
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
          VALUES (gen_random_uuid()::text, '${dir}', NOW(), '${dir}', '', NULL, NOW(), 1)
        `);
      } catch (e) {
        // Ignore if already exists
      }
    }

    // Verify final state
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('\n=== Final Tables ===');
    console.log(tables.map(t => t.table_name).join(', '));

    // Verify new tables exist
    const expectedNew = ['BaseCategory', 'Subcategory', 'BaseCategorySubcategory', 'CollectionDefinition'];
    for (const t of expectedNew) {
      const exists = tables.some(tbl => tbl.table_name === t);
      console.log(`${exists ? '✓' : '✗'} ${t}`);
    }

    // Verify ContributionCategory is gone
    const hasOld = tables.some(tbl => tbl.table_name === 'ContributionCategory');
    console.log(`${!hasOld ? '✓' : '✗'} ContributionCategory removed`);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndApply();