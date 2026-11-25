# Disaster Recovery Runbook

**Version:** 1.0
**Last Updated:** 2026-10-26
**Owner:** Platform Engineering Team
**Classification:** Internal — Operational Procedures

---

## 1. Quick Reference

| Metric | Target | Notes |
|--------|--------|-------|
| **RPO (Recovery Point Objective)** | ≤ 1 backup interval | Default: daily backup → max 24h data loss |
| **RTO (Recovery Time Objective)** | ≤ 30 minutes | Restore + verification + switch |
| **Backup Frequency** | Daily (configurable) | Via `npm run backup` (cron/scheduler) |
| **Backup Retention** | 14 backups (default) | Configurable via `BACKUP_RETENTION_COUNT` |
| **Test Frequency** | Weekly | `npm run dr:rehearsal` |

---

## 2. Roles & Responsibilities

| Role | Responsibility | Contact |
|------|----------------|---------|
| **Incident Commander** | Authorizes restore, communicates with stakeholders | Platform Lead |
| **Database Operator** | Executes restore commands, verifies integrity | DevOps Engineer |
| **Application Owner** | Validates application-level consistency post-restore | Backend Lead |
| **Communications** | Notifies users, management, support | Engineering Manager |

**Escalation:** If RTO exceeds 30 min → page Platform Lead + Engineering Manager

---

## 3. Backup Overview

### 3.1 What Gets Backed Up
- **Full PostgreSQL logical dump** (`pg_dump --format=plain`)
- **Schema + all data** for the masjid_collection database
- **Excludes:** roles, privileges, ownership (via `--no-owner --no-privileges`)

### 3.2 Backup Artifacts
```
backups/
├── masjid-2026-10-26-12-00-00.sql       # Plain SQL dump
├── masjid-2026-10-26-12-00-00.sql.sha256 # SHA-256 checksum
├── masjid-2026-10-25-12-00-00.sql
├── masjid-2026-10-25-12-00-00.sql.sha256
└── ... (newest 14 retained by default)
```

### 3.3 Backup Schedule
- **Automated:** Configure cron/systemd timer to run `npm run backup` daily
- **Manual:** `npm run backup` (or `npm run backup -- --compress=6` for compression)
- **Retention:** Set `BACKUP_RETENTION_COUNT=30` for longer retention

---

## 4. Restore Procedures

### 4.1 Scenario A: Full Database Loss / Corruption (Production)

**⚠️ CRITICAL: Never restore directly into production without verification.**

#### Step 1: Assess & Communicate (5 min)
- [ ] Confirm database is unreachable or corrupted
- [ ] Alert Incident Commander
- [ ] Post status to #incidents channel
- [ ] Notify stakeholders: "Database incident in progress, investigating"

#### Step 2: Prepare Restore Target (5 min)
```bash
# Create a NEW disposable database for restore verification
# NEVER use the production DATABASE_URL directly
export TARGET_DATABASE_URL="postgresql://user:pass@host:5432/masjid_restore_$(date +%s)"
```

#### Step 3: Restore & Verify (10 min)
```bash
# Option A: Latest backup
npm run restore -- --latest --target="$TARGET_DATABASE_URL"

# Option B: Specific backup
npm run restore -- --file=backups/masjid-2026-10-26-12-00-00.sql --target="$TARGET_DATABASE_URL"
```

#### Step 4: Application-Level Validation (5 min)
```bash
# Run critical tests against restored database
DATABASE_URL="$TARGET_DATABASE_URL" npm test -- tests/tenant-isolation.test.ts tests/payment-reversal.test.ts
```

#### Step 5: Financial Consistency Checks (3 min)
```bash
# Verify key financial invariants
DATABASE_URL="$TARGET_DATABASE_URL" node -e "
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const payments = await prisma.payment.count();
  const allocations = await prisma.paymentAllocation.count();
  const receipts = await prisma.receiptSequence.findMany();
  console.log('Payments:', payments, 'Allocations:', allocations, 'Receipt sequences:', receipts.length);
  // Add more checks: allocation sums = payment amounts, no duplicate receipts, etc.
}
check().finally(() => prisma.\$disconnect());
"
```

#### Step 6: Production Switch (2 min)
**Only after ALL validations pass:**
1. Stop application: `pm2 stop all` / `systemctl stop masjid-app`
2. Rename production DB: `ALTER DATABASE masjid_collection RENAME TO masjid_collection_corrupted_$(date +%s);`
3. Rename restored DB: `ALTER DATABASE masjid_restore_<timestamp> RENAME TO masjid_collection;`
4. Start application: `pm2 start all` / `systemctl start masjid-app`
5. Verify app health: `curl -f https://app.example.invalid/api/health`

#### Step 7: Post-Restore (5 min)
- [ ] Smoke test critical user flows
- [ ] Monitor error rates for 15 min
- [ ] Update incident timeline
- [ ] Schedule post-incident review

---

### 4.2 Scenario B: Point-in-Time Recovery (Accidental Data Deletion)

If only specific data was deleted (e.g., wrong `DELETE` query):

```bash
# 1. Restore latest backup to disposable DB
export TARGET_DATABASE_URL="postgresql://user:pass@host:5432/masjid_pitr_$(date +%s)"
npm run restore -- --latest --target="$TARGET_DATABASE_URL"

# 2. Extract missing data from restored DB
pg_dump --data-only --table=Payment --where="id IN (...)" "$TARGET_DATABASE_URL" > missing_payments.sql

# 3. Import into production
psql "$DATABASE_URL" < missing_payments.sql
```

---

### 4.3 Scenario C: Schema Migration Gone Wrong

```bash
# 1. Restore pre-migration backup
npm run restore -- --file=backups/masjid-2026-10-25-12-00-00.sql --target="$TARGET_DATABASE_URL"

# 2. Verify schema state
DATABASE_URL="$TARGET_DATABASE_URL" npx prisma migrate status

# 3. Follow Scenario A steps 4-7
```

---

## 5. Verification Checklists

### 5.1 Backup Verification (Run Weekly)
```bash
npm run backup:verify -- --latest
```
Expected: ✅ Checksum OK, ✅ Syntax valid, ✅ Tables > 20, ✅ Row counts reasonable

### 5.2 Restore Test (Run Weekly - DR Rehearsal)
```bash
npm run dr:rehearsal
```
Expected: Full cycle completes in <10 min, all critical tests pass

### 5.3 Post-Restore Validation (Every Restore)
- [ ] `prisma migrate status` → "Database schema is up to date!"
- [ ] `npm test` → 0 failures (or run critical subset)
- [ ] Payment count matches expectation
- [ ] Allocation sum = Payment sum per payment
- [ ] No duplicate receipt numbers
- [ ] Audit log integrity (row count, no gaps)
- [ ] Member counts per masjid reasonable

---

## 6. Monitoring & Alerting

### 6.1 Backup Success Monitoring
Add to your monitoring (Prometheus/Datadog/etc.):
```bash
# Backup script exits 0 on success, non-zero on failure
# Parse JSON output (add --json flag to backup.mjs for structured logs)
```

### 6.2 Alert Rules
| Alert | Condition | Severity |
|-------|-----------|----------|
| BackupFailed | `npm run backup` exit code ≠ 0 | Critical |
| BackupStale | Latest backup > 36 hours old | Warning |
| BackupVerificationFailed | `npm run backup:verify` fails | Critical |
| RestoreTestFailed | `npm run dr:rehearsal` fails | Critical |

---

## 7. Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|------------|
| `pg_dump: not found` | PostgreSQL client tools not installed | `apt-get install postgresql-client-18` / add to PATH |
| `pg_dump: authentication failed` | Wrong credentials in DATABASE_URL | Verify `.env` has correct password |
| `psql: could not connect` | Target DB doesn't exist / wrong host | Check `TARGET_DATABASE_URL`, ensure DB exists |
| Checksum mismatch | Backup file corrupted or tampered | Try previous backup; investigate storage integrity |
| Restore hangs | Large DB, long-running transaction | Increase `statement_timeout`; use `--single-transaction` |
| FK errors after restore | Backup from incompatible schema version | Use matching Prisma schema; run `prisma migrate deploy` |

---

## 8. Communication Templates

### 8.1 Incident Start
```
🚨 INCIDENT: Database issue detected
Impact: [Read-only / Write failures / Complete outage]
Status: Investigating
ETA for update: 15 minutes
```

### 8.2 Restore in Progress
```
🔄 RESTORE IN PROGRESS
Backup: masjid-2026-10-26-12-00-00.sql
Target: masjid_restore_<timestamp>
Phase: Restore / Verification / Switch
ETA: 20 minutes
```

### 8.3 Restore Complete
```
✅ RESTORE COMPLETE
Database: masjid_collection (restored from 2026-10-26 12:00)
Validation: All checks passed
Impact: [Data loss: X hours / None]
Next: Post-incident review scheduled
```

---

## 9. Appendix: Command Reference

```bash
# Create backup (with compression)
npm run backup -- --compress=6

# Create backup with custom retention
BACKUP_RETENTION_COUNT=30 npm run backup

# Verify latest backup
npm run backup:verify -- --latest

# Verify specific backup
npm run backup:verify -- --file=backups/masjid-2026-10-26-12-00-00.sql

# Restore latest to disposable DB
npm run restore -- --latest --target="postgresql://..."

# Restore specific backup
npm run restore -- --file=backups/masjid-2026-10-26-12-00-00.sql --target="postgresql://..."

# Full DR rehearsal (backup + restore test)
npm run dr:rehearsal

# Run tests against restored DB
DATABASE_URL="postgresql://..." npm test -- tests/tenant-isolation.test.ts
```

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-26 | Platform Team | Initial version |

---

**End of Document**