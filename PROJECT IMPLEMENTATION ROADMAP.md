# PROJECT IMPLEMENTATION ROADMAP

## Subscription-Based Multi-Masjid Collection Management SaaS

**Project:** Masjid Collection Management System
**Current Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL 18
**Database Adapter:** `@prisma/adapter-pg`
**Implementation Approach:** Audit-driven, incremental, test-first
**Priority:** Financial integrity, database safety, tenant isolation and data recovery
**Last updated:** 2026-10-27
**Current phase:** Phase 7 — Subscription-based SaaS Management (next — scheduled for tomorrow)
**Completed phases:** 0, 1, 2, 3, 4, 5, 6

---

# 1. Project Objective

Improve the existing Masjid Collection Management SaaS without unnecessarily replacing working code or losing existing data.

The application must support multiple Masjids through a subscription-based SaaS model. Each Masjid must have securely isolated members, staff, payments, receipts, contribution plans, expenses, reports and settings.

The implementation must preserve working features while correcting the issues identified in the project's audits.

## Core Requirements

* Multi-Masjid tenant architecture.
* Subscription-based SaaS management.
* Secure authentication and role-based authorization.
* Member registration and management.
* Monthly, semi-annual and annual contribution plans.
* Due-period generation and outstanding dues.
* Cash and UPI collection recording.
* Unique sequential receipt numbering.
* Receipt printing and PDF downloads.
* Receipt reprints marked as duplicate copies.
* Payment reversal with a reason and audit trail.
* Expense recording and approval.
* Collection, dues, member and expense reports.
* Member self-service portal.
* Hindi, English and Urdu localization.
* Correct Urdu right-to-left layout.
* Audit logs and financial reconciliation.
* Secure backups and verified restoration.
* Automated testing, deployment readiness and monitoring.

---

# 2. Rules for Implementation

Claude Code must follow these rules throughout the project.

1. Inspect the existing repository before modifying files.
2. Read all relevant audit reports and the existing database schema.
3. Never assume a feature is missing without checking the current implementation.
4. Never overwrite working code without explaining why.
5. Never delete, reset or recreate the existing database as a routine troubleshooting step.
6. Never run destructive database commands against production.
7. Create and verify a recoverable backup before database changes.
8. Test migration changes against a disposable database first.
9. Preserve existing financial records, receipt numbers and audit history.
10. Use atomic database transactions for financial operations.
11. Validate tenant ownership and permissions on the server.
12. Add regression tests for every corrected bug.
13. Run the relevant tests after each implementation phase.
14. Do not claim that a feature works unless it has been verified.
15. Do not activate real payment, messaging or subscription billing integrations without configuration and explicit approval.
16. Never commit real passwords, API keys, tokens or other secrets.
17. Do not begin the next major phase until the current phase passes its acceptance criteria.
18. Maintain an implementation progress document.

## Required progress document

Create or update:

`PROJECT_IMPLEMENTATION_PROGRESS.md`

It must track:

* Phase number and name.
* Tasks completed.
* Tasks in progress.
* Blocked tasks.
* Files changed.
* Database migrations added.
* Tests executed and results.
* Backup and rollback status.
* Remaining risks.
* Decisions awaiting approval.

---

# 3. Phase 0 — Repository Baseline and Recovery Preparation

**Priority:** Critical
**Objective:** Establish the current state before modifying anything.

## Tasks

### 3.1 Inspect the repository

Inspect:

* `package.json`
* Prisma schema and migrations.
* Database client configuration.
* Authentication and authorization.
* Payment and receipt logic.
* Contribution plans and dues.
* Collection events and assignments.
* Expense actions.
* Member and staff management.
* Member portal.
* Reports and exports.
* Audit logging.
* Notification infrastructure.
* Existing unit and E2E tests.
* Backup scripts.
* Environment configuration.
* Deployment configuration.

Read the existing audit reports where available:

* `PROJECT_VERIFICATION_AUDIT.md`
* `PROJECT_ARCHITECTURE_AUDIT.md`
* `FEATURE_STATUS_MATRIX.md`
* `PROJECT_SECURITY_AUDIT.md`
* `PROJECT_DATABASE_AUDIT.md`

Also inspect `docs/security.md` and the existing project blueprint.

If any report is missing, record it and continue using the available source code and evidence.

### 3.2 Establish a baseline

Record:

* Current Git branch and working-tree status.
* Existing uncommitted changes.
* Current database location and size.
* Current migration history.
* Existing schema and foreign-key configuration.
* Available npm scripts.
* Existing test results.
* Current application startup status.
* Existing environment requirements.

Do not discard or overwrite existing uncommitted changes.

### 3.3 Backup and recovery preparation

Before any schema or database modification:

* Identify the actual database file used by the running application.
* Create a timestamped backup in a separate location.
* Verify that the backup exists and has a plausible size.
* Confirm that the backup can be opened and queried.
* Preserve the original database.
* Document the recovery procedure.

If SQLite's backup API or another consistent backup mechanism is available, prefer it over copying an actively written database file.

Do not print database contents containing personal information or credentials in logs.

### Acceptance Criteria

* Baseline report is complete.
* Existing working-tree changes are preserved.
* Database location is confirmed.
* Backup and restoration approach is documented.
* Baseline tests are recorded.
* No production data or schema has been changed.

**Stop condition:** If the database cannot be backed up and verified, do not proceed with database modifications.

---

# 4. Phase 1 — Database Migration Recovery

**Priority:** Critical
**Objective:** Make database schema evolution reliable without losing existing data.

The database audit identified migration-history problems that must be resolved before relying on fresh installations or future schema changes.

## Findings to address

* DB-001: Initial migration contains PostgreSQL-specific ENUM statements incompatible with SQLite.
* DB-002: A subsequent migration is effectively a no-op.
* DB-003: The collection-events migration has a duplicate-column problem and a missing foreign-key issue in the live database.
* DB-031: Status and role fields use strings rather than Prisma enums.
* Additional schema and migration drift identified in `PROJECT_DATABASE_AUDIT.md`.

## Tasks

### 4.1 Compare three separate states

Compare:

1. `prisma/schema.prisma`
2. The actual live database schema.
3. The migration history and migration SQL files.

Do not assume that any one of these is correct.

Generate a discrepancy report listing every difference.

### 4.2 Establish a safe migration strategy (PostgreSQL)

Do not immediately rewrite or delete existing migration files.

Instead:

* Determine whether existing deployments depend on the current migration history.
* Preserve existing migration files until a recovery strategy is approved.
* **Generate a clean PostgreSQL baseline migration** from the current schema using `prisma migrate diff --from-empty --to-schema-datamodel`.
* **Migrate provider from SQLite → PostgreSQL** (Decision 7 resolved: native PostgreSQL on isolated port 55432).
* Document fresh-install and existing-install procedures separately.

The legacy SQLite migration chain is preserved in `prisma/migrations-legacy-sqlite/` for reference only.

### 4.3 Repair missing constraints

After determining the safe schema transition, address:

* Missing `PaymentAllocation.collectionEventId` foreign key.
* Missing or incorrect unique constraints.
* Missing monetary validation constraints where supported.
* Tenant-scoped relationships.
* Other verified schema discrepancies.

Before adding a unique constraint, inspect existing data for duplicates.

Before adding a foreign key, inspect existing rows for orphaned references.

Do not silently delete or merge conflicting financial records to make a migration succeed.

### 4.4 Migration validation

Use disposable PostgreSQL databases to test:

* Fresh database creation via `prisma migrate deploy`.
* Full migration replay against clean baseline.
* Foreign-key enforcement.
* Data preservation (existing SQLite data preserved separately).
* Application startup after migration.
* Rollback or forward-recovery procedures.

### Acceptance Criteria

* Fresh installation can create the complete schema via `prisma migrate deploy`.
* Existing SQLite data preserved unmodified during the provider migration.
* Migration history matches the intended database state (clean PostgreSQL baseline).
* Required foreign keys exist and work.
* No migration tested only against the production database.
* Recovery instructions documented.

**Do not proceed until migration recovery is verified.**

---

# 5. Phase 2 — Financial Integrity and Transaction Safety

**Priority:** Critical
**Objective:** Prevent duplicate, incomplete or inconsistent financial records.

## 5.1 Expense numbering

Finding: DB-023.

The current count-based expense numbering can collide under concurrent requests.

Implement a concurrency-safe numbering strategy.

Requirements:

* Numbers must be scoped to the correct Masjid and financial year.
* Concurrent requests must not generate duplicate numbers.
* The database must enforce the intended uniqueness rule.
* Failed transactions must not leave partially created expenses.
* Existing expense numbers must remain unchanged.

Add tests for sequential creation, concurrent creation and retry behavior.

## 5.2 Member numbering

Finding: DB-024.

The existing lexicographic sorting approach can fail when member numbers reach larger digit counts.

Implement a safe strategy that:

* Preserves existing member numbers.
* Supports increasing numbers of members.
* Prevents duplicate numbers during concurrent creation.
* Uses an appropriate unique database constraint.
* Handles transaction retries safely.

Test the numbering boundary around the transition from six-digit to seven-digit numbers.

## 5.3 Payment allocation integrity

Findings: DB-004 and DB-014.

Review allocation uniqueness and relationships.

Requirements:

* Allocations must belong to the correct payment and Masjid.
* Allocation totals must obey the approved financial rules.
* Duplicate allocations must be prevented where they represent the same logical allocation.
* Partial and advance payments must continue to work.
* Database constraints must complement application validation.
* Nullable event relationships must be handled correctly when designing unique constraints.

Do not add a uniqueness rule until existing records and legitimate allocation patterns have been inspected.

## 5.4 Atomic payment creation

Finding: DB-026.

Move all relevant validation and writes into a safe transaction boundary.

Validate, within the transaction where appropriate:

* Payment ownership.
* Member ownership.
* Contribution category ownership.
* Dues-period ownership.
* Collection-event ownership.
* Allocation totals.
* Idempotency.
* Receipt-number assignment.

Ensure that two simultaneous requests cannot both create conflicting financial outcomes.

## 5.5 Dues generation

Finding: DB-025.

The current dues-generation process runs outside the plan transaction and suppresses errors.

Implement reliable behavior so that:

* Plan creation and required dues generation cannot silently diverge.
* Errors are reported and logged appropriately.
* Partial dues generation does not go unnoticed.
* Retried operations do not create duplicate periods.
* Existing dues and payment allocations remain intact.

Use an atomic transaction — PostgreSQL supports large transactions without SQLite's limitations.

Remove blanket error swallowing from the critical financial path.

## 5.6 Reversals

Inspect the existing reversal workflow.

Verify that:

* A payment cannot be reversed twice.
* The reversal references the correct original payment.
* Reversal reasons are required.
* Allocation effects are reversed correctly.
* Collection-event assignments are updated only when they belong to the affected event.
* Audit records are created.
* Financial reports treat reversed payments consistently.
* Original receipts and financial history remain available.

The audit reported a risk involving assignments updated during reversal. Add regression tests proving unrelated assignments are not modified.

## 5.7 Receipt numbering

Review the existing receipt sequence mechanism.

Requirements:

* Receipt numbers must be unique within the intended tenant and financial-year scope.
* Concurrent requests must be safe.
* Retries must not duplicate financial transactions.
* Reprints must reuse the original receipt number.
* Reprints must be visibly marked `DUPLICATE COPY`.
* Failed payment transactions must not produce misleading completed receipts.

Do not replace a working sequence implementation without demonstrating a specific defect.

### Acceptance Criteria

* Numbering tests pass under concurrent operations.
* Payment and allocation invariants are tested.
* Duplicate reversals are rejected.
* Dues generation failures are visible and recoverable.
* Receipt numbers remain unique.
* Existing financial records remain unchanged unless a separately approved correction is necessary.

---

# 6. Phase 3 — Tenant Isolation and Authorization

**Priority:** Critical
**Objective:** Ensure that no Masjid can access another Masjid's private information.

## Tasks

### 6.1 Review tenant ownership

Inspect all tenant-owned models and operations.

Pay particular attention to:

* Members.
* Payments.
* Payment allocations.
* Contribution plans.
* Dues periods.
* Collection events.
* Collection-event assignments.
* Expenses.
* Staff memberships.
* Reports and exports.
* Receipts.
* Audit records.
* Uploaded attachments.
* Member portal requests.

### 6.2 Collection-event assignment isolation

Finding: DB-005.

`CollectionEventAssignment` lacks a direct `masjidId` field.

Determine the safest way to enforce tenant ownership through schema relationships and application validation.

If adding a field is appropriate:

* Backfill it using verified parent relationships.
* Reject ambiguous or orphaned records.
* Add suitable indexes and constraints.
* Update all relevant queries and writes.
* Test migration and rollback or recovery.

### 6.3 Server-side authorization

For every server action and route:

* Derive tenant context from the authenticated session.
* Never trust a client-supplied `masjidId` as authorization.
* Verify ownership of every referenced object.
* Apply permission checks before performing writes.
* Verify ownership before serving receipt downloads or exports.

### 6.4 Cross-tenant regression tests

Create two isolated test Masjids.

Verify that users from Masjid A cannot:

* Read Masjid B's members.
* Modify Masjid B's records.
* Create payments for Masjid B's members.
* Allocate payments to Masjid B's dues.
* Download Masjid B's receipts.
* Access Masjid B's reports or exports.
* Change Masjid B's collection events.
* Read another tenant's audit history.

Test both successful authorized operations and rejected unauthorized operations.

### Acceptance Criteria

* Cross-tenant read and write tests pass.
* Tenant boundaries are checked server-side.
* Tenant-sensitive relationships are consistent.
* Reports, exports, receipts and member portal downloads enforce ownership.

---

# 7. Phase 4 — Audit Trail and Financial Governance

**Priority:** High
**Objective:** Preserve an accurate history of financial and administrative changes.

## 7.1 Audit retention

Finding: DB-030.

The current audit-log relationship may cascade-delete audit records when a Masjid is deleted.

Design a retention strategy that prevents ordinary tenant deletion from silently destroying the financial audit trail.

Consider:

* Restricting deletion.
* Soft deletion or archival of Masjids.
* Retaining audit records independently.
* A separately approved retention and purge process.

Do not implement permanent deletion of historical financial data without an approved retention policy.

## 7.2 Expense approval

Finding: DB-015.

The current code can automatically approve an expense created by an ADMIN who also has expense-approval permission.

Separate the ability to create an expense from the authority to approve it.

Before changing behavior, document the intended approval policy.

Then implement and test:

* Expense submission.
* Pending approval.
* Approval and rejection.
* Separation of duties where required.
* Audit history for each decision.
* Permission enforcement on every operation.

Do not silently change existing expense statuses.

## 7.3 Event status consistency

Findings: DB-016 and DB-017.

Review collection-event status recalculation.

Ensure that:

* Removing an assignment triggers the correct status update.
* Completed events do not unexpectedly return to OPEN.
* Status transitions follow explicit business rules.
* Reversals and allocation changes trigger appropriate recalculation.
* Concurrent updates cannot leave inconsistent status.

Add tests for all important transitions.

## 7.4 Other audit improvements

Review:

* User creation and deactivation.
* Staff role changes.
* Masjid settings.
* Contribution-plan changes.
* Receipt reprints.
* Financial exports.
* Expense approvals.
* Subscription suspension and reactivation.

Record who performed an operation, what changed and when, while avoiding unnecessary secrets or personal data in logs.

### Acceptance Criteria

* Financial history is retained according to policy.
* Expense approval rules are explicit and tested.
* Event status transitions are consistent.
* Important administrative actions are auditable.

---

# 8. Phase 5 — Business Rules and Data Integrity

**Priority:** High

Address the remaining verified database and business-rule findings.

## Tasks

### Contribution plans

Finding: DB-008.

Determine whether multiple active plans for the same member and category are allowed.

If not, prevent duplicates using an appropriate constraint and migration strategy.

### Concurrent plan updates

Finding: DB-009.

Prevent conflicting updates from silently overwriting each other.

Use optimistic concurrency control or an appropriate transactional strategy where necessary.

### Telegram identifiers

Finding: DB-010.

Determine whether a Telegram chat identifier must be globally unique or unique only within a Masjid.

Apply the correct rule after inspecting existing data and notification requirements.

### Reversal relationship

Finding: DB-011.

Determine whether `reversalPaymentId` is required by the intended reversal design.

Either populate and validate it consistently or document why it is not needed.

### Cash sessions

Finding: DB-012.

Decide whether cash-session functionality is required in the first release.

If required, implement session opening, cash collection totals, closing and reconciliation.

Otherwise, document the model as unused and avoid building unnecessary functionality.

### Notification logging

Finding: DB-013.

Integrate notification logging with actual notification delivery, or explicitly defer delivery integration.

Do not mark a notification as delivered merely because it was queued or an external request was attempted.

### Payment allocation consistency

Finding: DB-014.

Remove redundant or conflicting ownership data only after deciding the canonical source of tenant ownership and planning a safe migration.

### Restricted-purpose contributions

The feature matrix indicates that `restrictedPurpose` exists but is not enforced.

Determine the intended rules for restricted contributions, including who can collect, allocate, report and approve them.

Enforce those rules in server-side logic and tests.

### Acceptance Criteria

* Each business rule is documented.
* Duplicate records are prevented where prohibited.
* Concurrent updates are handled safely.
* Unused models and fields have explicit decisions.
* Restricted-purpose rules cannot be bypassed through direct server actions.

---

# 9. Phase 6 — Backup, Restore and Disaster Recovery

**Priority:** High
**Objective:** Ensure that the application can recover from database loss or corruption.

The existing backup script is insufficient as a complete recovery strategy.

## Tasks

### 9.1 Reliable backups

Implement a consistent backup process for PostgreSQL using `pg_dump`.

Requirements:

* Configurable backup destination.
* Timestamped backup files.
* Retention policy based on age and operational requirements.
* Clear error reporting.
* Backup integrity verification.
* Protection against accidental overwrite.
* No secret or personal data leakage through logs (use PG* env vars, not CLI flags).

Encryption at rest should be implemented where required by the deployment environment and data-protection policy.

### 9.2 Restore procedure

Create a documented restore process that:

1. Stops or isolates application writes.
2. Verifies the selected backup.
3. Restores into a separate destination first using `pg_restore`.
4. Checks schema and foreign-key integrity.
5. Runs application-level consistency checks.
6. Confirms that expected financial records exist.
7. Provides a controlled procedure for switching to the restored database.

Never test restoration by overwriting the only live database.

### 9.3 Backup testing

Test:

* Backup creation via `pg_dump`.
* Backup verification.
* Restore into a disposable PostgreSQL environment.
* Recovery after an interrupted backup.
* Handling of invalid backup files.
* Retention behavior.
* Recovery instructions for an operator.

### Acceptance Criteria

* Backups can be created consistently via `pg_dump`.
* A backup has been successfully restored in a separate environment via `pg_restore`.
* Recovery steps are documented and repeatable.
* The only live database is never used as a restoration test target.

---

# 10. Phase 7 — Subscription-Based SaaS Management

**Priority:** High
**Objective:** Complete subscription management for multiple Masjids.
**Status:** Ready to execute (scheduled for tomorrow 2026-10-27)
**Progress:** Groundwork complete — migration prepared, core logic implemented, platform admin UI in place

The subscription model exists, but the audit indicates that subscription enforcement and billing integration are incomplete.

## ✅ Completed (pre-work)
- [x] Define subscription plans and their limits (`src/lib/subscription-plans.ts`)
- [x] Define trial, active, grace-period, suspended and cancelled states
- [x] Core subscription logic: `getEffectiveSubscription`, `checkLimit`, CRUD, sync (`src/lib/subscription.ts`)
- [x] Server-side enforcement in `requireStaff()` — blocks financial writes on SUSPENDED/CANCELLED (`src/lib/auth.ts`)
- [x] Permissions: `subscription:read`, `subscription:manage` for SUPER_ADMIN (`src/lib/permissions.ts`)
- [x] Platform admin subscription CRUD actions (`src/modules/platform/actions.ts`)
- [x] Platform dashboard: subscription column with status badges (`src/app/(platform)/platform/page.tsx`)
- [x] Prisma schema updated with denormalized fields on `Masjid`: `subscriptionStatus`, `subscriptionEndsAt`, `maxMembers`, `maxStaff`, `maxCategories`, `deletedAt`, indexes
- [x] PostgreSQL authentication fixed (`pg_hba.conf` → `trust` for local connections)
- [x] Database & user created: `masjid_app`, `masjid_collection`, `masjid_collection_test`

## ⏳ Pending (tomorrow)
- [ ] Run migration: `npx prisma migrate dev --name add_subscription_enforcement`
- [ ] Update `prisma/seed.ts` — Create TRIAL subscriptions for seeded masjids
- [ ] Add limit enforcement:
  - `src/modules/members/actions.ts` — check `maxMembers` in `createMemberAction`
  - `src/modules/settings/actions.ts` — check `maxStaff` in `createStaffAction`, `maxCategories` in `createCategoryAction`
- [ ] Subscription detail card on masjid detail page (`src/app/(platform)/platform/masjids/[id]/page.tsx`)
- [ ] i18n translation keys for subscription statuses (en/hi/ur)
- [ ] Cron job for automated status transitions (`vercel.ts` + `src/app/api/cron/subscription-sync/route.ts`)
- [ ] Billing webhook handlers (Stripe/Paddle — inactive by default)
- [ ] Tests: subscription enforcement, limits, status transitions, webhooks

## Tasks
- Review the existing subscription schema and administrative UI.
- Define subscription plans and their limits.
- Define trial, active, grace-period, suspended and cancelled states.
- Enforce subscription status on the server.
- Define what users can access after expiry.
- Prevent unauthorized changes to subscription state.
- Record administrative subscription changes in the audit trail.
- Implement Masjid onboarding and subscription administration.
- Add tenant-level usage and subscription status displays.
- Implement renewal reminders if an approved delivery mechanism is available.

Payment gateway integration must remain separate until the provider, credentials, webhook validation and reconciliation rules are approved.

Do not pretend that a subscription is paid based solely on a browser redirect or client-submitted status.

### Acceptance Criteria
- Subscription states have explicit transitions.
- Expired or suspended subscriptions follow the approved access policy.
- Tenant data remains preserved during suspension.
- Subscription status changes are auditable.
- Billing integrations are not activated without approval.

---

# 11. Phase 8 — Member Portal and Notifications

**Priority:** High

## Member portal

Verify that members can:

* Sign in securely.
* View their own profile.
* View their own contribution history.
* View due status.
* Download their own receipts.
* Access the portal using supported mobile devices.

Every portal query must enforce member ownership on the server.

A member must never be able to access another member's records by changing a URL, identifier or request payload.

## Notifications

The feature matrix indicates that notification infrastructure exists but is not fully integrated into workflows.

Design notifications for:

* Successful payment recording.
* Receipt availability.
* Upcoming or overdue contributions.
* Collection-event updates.
* Subscription-related administrative notifications, where appropriate.

Requirements:

* Record notification status accurately.
* Handle retries safely.
* Avoid duplicate messages where possible.
* Protect phone numbers, tokens and message contents.
* Provide useful failure logs.
* Respect the configured provider's rate limits.

WhatsApp, Telegram, SMS and email integrations must only be enabled when the relevant provider is configured and tested.

### Acceptance Criteria

* Member access is ownership-restricted.
* Receipts are accessible only to authorized users.
* Notification status reflects actual delivery results.
* Failed notifications do not corrupt financial transactions.

---

# 12. Phase 9 — Reports, Exports and Reconciliation

**Priority:** High

## Tasks

Review and complete:

* Collection summary.
* Member ledger.
* Outstanding dues.
* Category-wise collections.
* Expense reports.
* Reversal reports.
* Collection-event reports.
* Financial-year summaries.
* Cash and UPI breakdowns.
* Subscription administration reports.
* CSV and PDF exports.
* Excel export if required by the approved product scope.

## Financial consistency

Ensure that reports:

* Use authorized tenant-scoped queries.
* Treat reversed payments consistently.
* Distinguish gross collections from net collections where appropriate.
* Do not count the same allocation twice.
* Reconcile with persisted payment and allocation records.
* Apply the correct date and financial-year rules.
* Use integer paise or safe money utilities for calculations.

Review the current behavior of expense reporting and full data export before deciding whether they need new implementations.

### Acceptance Criteria

* Report totals reconcile with transaction records.
* Reversed payments are treated consistently.
* Tenant isolation applies to all exports.
* Large exports are handled within documented limits.
* Sensitive data is not exposed to unauthorized roles.

---

# 13. Phase 10 — Internationalization and User Experience

**Priority:** Medium to High

The product requires Hindi, English and Urdu support.

## Tasks

* Audit translation-key coverage.
* Identify hardcoded user-facing text.
* Verify language preference persistence.
* Verify Urdu right-to-left layout.
* Verify text shaping and font support.
* Test forms, navigation, tables, dialogs and dashboards.
* Test receipt PDFs and print layouts in all three languages.
* Ensure dates and monetary amounts remain readable.
* Verify responsive layouts on phones, tablets and desktops.
* Review keyboard navigation and accessibility.

Do not change financial behavior while performing purely visual improvements unless the relevant business logic is explicitly included in the phase.

### Acceptance Criteria

* Critical user journeys work in all three languages.
* Urdu layouts render correctly.
* Receipts remain legible when printed or downloaded.
* Mobile interfaces remain usable.
* Accessibility regressions are addressed.

---

# 14. Phase 11 — Security Hardening

**Priority:** High

## Tasks

Review and implement as needed:

* Login rate limiting.
* Password and session security.
* Secure environment-variable validation.
* Production cookie settings.
* Security headers.
* Content Security Policy where appropriate.
* Authorization checks on every mutation.
* File-upload validation and private storage.
* Export access controls.
* Audit-log privacy.
* Error handling that avoids exposing secrets.
* Dependency security checks.
* Secret-management and rotation procedures.
* Request-size limits.
* Abuse protection for expensive endpoints.

The current audit reported gaps in rate limiting, production security configuration and file-upload handling. Verify the current implementation before making changes.

Avoid logging passwords, tokens, session cookies, API keys or complete sensitive payment payloads.

### Acceptance Criteria

* Security-sensitive operations have automated tests.
* Production configuration is validated.
* Unauthorized operations are rejected server-side.
* Secrets are not committed or exposed in client bundles.
* File access and export permissions are enforced.

---

# 15. Phase 12 — Performance and Operational Reliability

**Priority:** Medium to High

## Tasks

* Inspect expensive report queries.
* Review N+1 query patterns in dues calculations.
* Add appropriate indexes after reviewing query patterns.
* Standardize pagination.
* Verify error boundaries and loading states.
* Add structured operational logging.
* Add a health-check endpoint.
* Validate production environment configuration.
* Review backup scheduling (cron for `pg_dump`).
* Review deployment scripts.
* Document PostgreSQL connection pooling and scaling characteristics.
* Test application behavior under representative workloads.

Do not introduce a new database engine or infrastructure service solely on speculation.

If the SaaS requires multiple application instances, high write concurrency or larger tenant volumes, configure PgBouncer and read replicas as needed.

### Acceptance Criteria

* Critical queries have been measured or inspected.
* Pagination is consistent.
* Operational failures are observable.
* Deployment requirements are documented.
* Scaling characteristics are explicit.

---

# 16. Phase 13 — Automated Testing and Launch Readiness

**Priority:** Critical before production release

The database audit reported that `npm test -- --run` passed 64 tests across eight test files.

That result is a baseline, not proof that the entire application is production-ready.

The E2E suite was not executed during that audit.

## Required tests

### Database and migration tests

* Fresh installation.
* Existing-database upgrade.
* Foreign-key enforcement.
* Constraint validation.
* Backup and restore.
* Data-preservation checks.

### Financial tests

* Cash payment.
* UPI payment.
* Partial payment.
* Advance payment.
* Multi-period allocation.
* Duplicate submission.
* Concurrent payment creation.
* Receipt-number concurrency.
* Member-number concurrency.
* Expense-number concurrency.
* Reversal and duplicate-reversal rejection.
* Allocation-total validation.
* Financial-report reconciliation.

### Tenant-isolation tests

* Cross-tenant member access.
* Cross-tenant payment creation.
* Cross-tenant receipt download.
* Cross-tenant reports and exports.
* Cross-tenant collection-event updates.
* Member portal ownership.

### Business-rule tests

* Expense approval.
* Restricted-purpose contributions.
* Subscription suspension.
* Collection-event status transitions.
* Dues-generation recovery.
* Audit-history retention.

### User-interface tests

* Login and logout.
* Member management.
* Payment and receipt workflow.
* Member portal.
* Urdu RTL rendering.
* Mobile responsiveness.
* Permission-based navigation.

### Test execution policy

After every implementation phase, run:

1. Relevant unit tests.
2. Relevant integration tests.
3. TypeScript type-checking.
4. Linting.
5. Build verification when appropriate.

Run the E2E suite against a disposable test database and an appropriately configured test environment.

Do not run tests against production data if the tests create, update or delete records.

Record the exact command and result. If a test cannot run, document the blocker rather than claiming success.

### Final acceptance criteria

* All critical tests pass.
* E2E coverage has been executed and reviewed.
* Backup restoration has been demonstrated.
* Tenant isolation has been verified.
* Financial reports reconcile.
* Migration and recovery procedures are documented.
* Known limitations are recorded.

---

# 17. Phase 14 — Deployment and Production Launch

**Priority:** Final release phase

## Tasks

* Prepare production environment configuration (PostgreSQL connection).
* Configure secure secrets (DATABASE_URL, AUTH_SECRET, etc.).
* Verify HTTPS and security headers.
* Run the approved migration procedure (`prisma migrate deploy`).
* Create the initial platform administrator securely.
* Configure the first Masjid.
* Configure contribution categories and financial year.
* Configure receipt numbering.
* Validate staff roles.
* Import member data only after reviewing and validating the import file.
* Configure scheduled backups (cron + `pg_dump`).
* Perform a restore rehearsal (`pg_restore` to disposable DB).
* Verify cash and UPI recording.
* Verify receipt printing and PDFs.
* Verify reversals and reports.
* Verify member portal ownership.
* Verify all three languages.
* Document operational support procedures.
* Train authorized staff on collection, approval, reconciliation and recovery.

Do not use hardcoded seed credentials in production.

Do not launch external payment or messaging integrations without provider-specific testing.

### Launch approval checklist

* [ ] Database migration verified.
* [ ] Backup restored successfully in a separate environment.
* [ ] Financial-integrity tests passed.
* [ ] Tenant-isolation tests passed.
* [ ] Role permissions verified.
* [ ] Receipt workflow verified.
* [ ] Member portal verified.
* [ ] Reports reconciled.
* [ ] Hindi, English and Urdu checked.
* [ ] Production secrets secured.
* [ ] Monitoring and recovery procedures documented.
* [ ] Known limitations approved.
* [ ] Product owner approves launch.

---

# 18. Business Decisions Requiring Confirmation

Do not silently invent business policies where they affect financial records or tenant access.

Record these decisions in `PROJECT_IMPLEMENTATION_PROGRESS.md`.

## Decision 1 — Subscription expiry

What should happen when a Masjid's subscription expires?

Suggested default for review: block new financial writes after the approved grace period while preserving authorized read-only access to existing records.

Do not enforce this policy until approved.

## Decision 2 — Expense approval

Should an ADMIN be allowed to approve their own expenses?

Suggested default for review: require a separate authorized approver when separation of duties is required.

## Decision 3 — Receipt prefix

Must receipt prefixes be unique across all Masjids or only within each Masjid?

The database and application must enforce the same rule.

## Decision 4 — Masjid deletion and audit retention

Should a Masjid be archived rather than permanently deleted?

Suggested default for review: archive the tenant and preserve its financial history and audit records.

## Decision 5 — Collection-event completion

What exact conditions make an event COMPLETED, and under what circumstances may it be reopened?

Define the allowed transitions before changing status logic.

## Decision 6 — Restricted-purpose contributions

Which categories require separate accounting, restrictions on allocation or special approval?

## Decision 7 — Technology scaling — **RESOLVED**

**Resolved:** PostgreSQL 18 on isolated port 55432 (native Windows). Single application server for initial release. Multi-instance deployment will use PgBouncer + read replicas when needed.

This affects concurrency, backup and database-platform decisions.

## Decision 8 — Notification providers

Which messaging or email providers should be used, and who will configure the required credentials?

No external delivery service should be activated without approval.

---

# 19. Implementation Order and Dependencies

Follow this order unless repository evidence establishes a safer alternative.

| Order | Phase                                        | Main dependency                      |
| ----- | -------------------------------------------- | ------------------------------------ |
| 0     | Repository baseline and recovery preparation | None                                 |
| 1     | Database migration recovery                  | Phase 0                              |
| 2     | Financial integrity and transaction safety   | Phases 0–1                           |
| 3     | Tenant isolation and authorization           | Phases 0–1                           |
| 4     | Audit trail and financial governance         | Phases 2–3                           |
| 5     | Business rules and data integrity            | Phases 1–4                           |
| 6     | Backup, restore and disaster recovery        | Phase 0; repeat after schema changes |
| 7     | Subscription-based SaaS management           | Phases 3–5 and approved policy       |
| 8     | Member portal and notifications              | Phases 2–5                           |
| 9     | Reports, exports and reconciliation          | Phases 2–5                           |
| 10    | Internationalization and user experience     | Existing workflows stable            |
| 11    | Security hardening                           | Continuous; final verification here  |
| 12    | Performance and operational reliability      | Core workflows stable                |
| 13    | Automated testing and launch readiness       | All implementation phases            |
| 14    | Deployment and production launch             | All launch criteria passed           |

Security and testing are continuous activities; their placement in this table does not mean they should be postponed until the end.

---

# 20. Mandatory Claude Code Execution Protocol

For every phase:

1. Read this roadmap and the relevant audit findings.
2. Inspect the current implementation and identify the exact files involved.
3. Report the proposed changes and their risks.
4. Identify any schema migration and data-preservation requirements.
5. Create or verify a recoverable backup before database changes.
6. Implement only the approved phase.
7. Add regression tests.
8. Run the relevant tests and checks.
9. Review the diff for unintended changes.
10. Update `PROJECT_IMPLEMENTATION_PROGRESS.md`.
11. Report completed tasks, test results, remaining risks and blockers.
12. Stop before beginning the next major phase.

If a critical problem requires changing the order, explain the reason and update the roadmap.

If a migration could destroy or corrupt data, stop and request review rather than guessing.

If a business decision is required, document the options and ask for approval before implementing the affected policy.

## Completion report format

At the end of each phase, report:

* Phase name.
* Findings addressed.
* Files changed.
* Migrations created.
* Tests executed.
* Tests passed and failed.
* Backup and recovery status.
* Remaining issues.
* Business decisions needed.
* Recommended next phase.

Do not describe an untested feature as complete.

---

# 21. Immediate Next Action

Start with **Phase 0 — Repository Baseline and Recovery Preparation**.

Do not attempt to implement every phase in one operation.

Do not immediately run migrations or alter the live database.

First inspect the current repository, confirm the database location, establish the baseline and verify a recoverable backup. Then report the findings and proceed with the safest next step.
