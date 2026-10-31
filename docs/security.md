# Security and financial controls

The system holds donor identities, phone numbers and a complete financial
ledger. The controls below are the ones actually implemented in the code; where
a control is out of scope for a local-only deployment it says so explicitly
rather than implying coverage.

---

## 1. Threat model

| Asset | Threat | Control |
|---|---|---|
| Donor PII (names, phones, addresses) | cross-tenant read, member reading another member | session-derived `masjidId`, object-level ownership checks, no public listing |
| Financial records | silent edit/delete, forged totals | immutable payments, reversal workflow, server-side aggregates |
| Receipts | duplicate numbers, forged reprints | transactional sequence, unique constraint, reprint event log |
| Accounts | credential stuffing, role escalation | bcrypt, throttling, DB-revalidated role, server-side permission matrix |
| Exports | bulk data exfiltration | `export:data` permission, audit row per export |
| Database file | loss, tampering | single-file backup, filesystem permissions (operator responsibility) |

Out of scope by decision: public internet exposure, payment-gateway fraud, and
multi-datacenter availability.

---

## 2. Authentication

- **Hashing:** bcrypt, cost 12 (`src/lib/auth.ts`). Passwords are never logged,
  never returned by any query used in rendering, and never stored in the session.
- **Session:** HS256 JWT signed with `AUTH_SECRET`. `secretKey()` throws if the
  secret is missing or shorter than 32 characters, so the app refuses to start
  a login flow with a weak configuration.
- **Cookie:** `masjid_session`, `httpOnly` (not readable from JavaScript),
  `sameSite=lax` (blocks cross-site POST form submission), `secure` when
  `NODE_ENV=production`, `path=/`, 12-hour `maxAge`.
- **Revalidation:** `getCurrentUser()` reloads the user, `status`, memberships
  and role from the database on every request. A stale cookie cannot preserve a
  revoked role, and a disabled user is rejected immediately.
- **Login enumeration:** the action always runs a bcrypt comparison, using a
  fixed dummy hash for unknown emails, and returns one generic message.
- **Throttling:** 8 failed attempts per email per 10 minutes (in memory). This
  is a brute-force speed bump for a single local server, not a distributed
  rate-limiter. Restarting the process clears it.
- **Sign-out** deletes the cookie.

### Password policy

Minimum 8 characters (Zod, `staffSchema` / `portalPassword`). There is no
forced rotation and no complexity rule beyond length. The seed warns when the
default password is still in use.

---

## 3. Authorization

Three layers, each independently sufficient:

1. **Route gate.** `(dashboard)/layout.tsx` requires a session and redirects
   members to `/portal`; `(portal)/layout.tsx` requires a `MEMBER` role.
2. **Action gate.** Every Server Action and route handler begins with
   `requireStaff()` / `requirePortalMember()` then `assertCan(role, permission)`.
   A collector calling a reversal action directly gets `FORBIDDEN`; the UI hiding
   the button is irrelevant.
   File handlers have no layout to redirect for them, so they use
   `authorizeFileRequest()` (`src/lib/api-auth.ts`): a signed-out visitor gets
   **307 → /login**, a signed-in account without the permission gets **403**,
   and a suspended tenant gets **403**. They must not let a throw escape and
   surface as a generic 500.
3. **Object gate.** Every id arriving from a request is re-fetched scoped to the
   session's Masjid. Not found in this tenant → "not found", never a leak of
   existence.

Member portal ownership: `loadReceipt()` requires
`payment.donorMemberId === user.memberId` for `MEMBER` accounts. `requirePortalMember()`
derives the member id from `user.memberId`, never from the URL, so there is no
id to tamper with.

The role → permission matrix lives in one file (`src/lib/permissions.ts`) and is
the only place permissions are defined.

---

## 4. Tenant isolation

- `masjidId` is written into the session at login from the database membership
  and re-derived from the database on every request.
- No query takes `masjidId` from `searchParams`, `formData` or a header.
- Composite unique keys are always `[masjidId, …]`, so two Masjids may hold the
  same `MAS-000001` or the same receipt number without collision — and a query
  missing the tenant column would return the wrong row rather than silently
  succeeding.
- Cross-tenant references inside a payment (member, category, due period) are
  validated before the transaction opens.
- Verified by `tests/allocations.test.ts` ("scopes every tenant query by
  masjidId") and by the scripted smoke test that requests another tenant's ids.

---

## 5. Input validation

- Every mutation validates with a Zod schema in `src/lib/validation.ts` on the
  **server**; the client form is a convenience only.
- Types are constrained: amounts must be positive integers (paise), dates must
  match `YYYY-MM-DD`, enums are closed sets, strings are trimmed and length
  bounded.
- Prisma parameterizes all SQL; no string-concatenated queries exist.
- React escapes rendered strings, so stored names/notes cannot inject markup.
- CSV export quotes cells containing `"`, `,` or newlines and prefixes the file
  with a BOM; it emits plain values with no formula prefix, so a cell beginning
  with `=` is written as text by Excel's CSV import (no formula execution path
  is created).

---

## 6. Financial controls

| Control | Implementation |
|---|---|
| **No silent edits** | `Payment` has no update path other than `status → REVERSED` inside `reversePaymentAction`. No delete action exists for payments, allocations, receipts, expenses or audit rows. |
| **No silent deletes** | Same. Members can be marked INACTIVE; their history remains. |
| **Reversal with reason** | `reversalSchema` requires a non-empty reason (≤ 500 chars). The reversal writes `Reversal`, a `CANCELLED` receipt event and an audit row with before/after. |
| **Receipt numbers** | Allocated inside the payment transaction; unique per Masjid; sequence only increases; a rollback does not burn a number. |
| **Duplicate submission** | Client idempotency key + unique `(masjidId, idempotencyKey)`; a repeat returns the original payment. |
| **Atomic posting** | Payment, allocations, period status, receipt event and audit commit in one interactive transaction. |
| **Derived totals** | Dashboard and report numbers come from server aggregates over the same rows the register lists. Gross includes reversed rows so `gross − reversals = net`. |
| **Approval separation** | Collector-entered expenses are `PENDING`; only roles with `expense:approve` can approve them. Only `APPROVED` expenses count. |
| **Reprint tracking** | Every reprint writes a `REPRINTED` event and an audit row; the number never changes. |
| **Export tracking** | CSV export requires `export:data` and writes `export.transactions` with row count and filters. |
| **Suspension** | A `SUSPENDED` Masjid is read-only for new payments; records remain readable. |

---

## 7. Audit trail

`AuditLog` is append-only by construction: the only writer is `writeAudit`, which
performs `create`. There is no update or delete call for it anywhere in `src/`.

Each row captures actor, action, entity type/id, before/after JSON, metadata and
timestamp, and is written **inside** the same transaction as the change, so a
rolled-back change leaves no audit row and a committed change cannot lack one.

Logged actions are listed in `docs/requirements.md` §3.11. The audit page is
paginated and available to `ADMIN`, `SUPER_ADMIN` and `AUDITOR`.

---

## 8. Sensitive data handling

- Donor lists and amounts are never public: every route requires a session, and
  the landing page contains no data.
- Member portal responses are scoped to the signed-in member.
- Receipt PDFs are served with `Cache-Control: private, no-store` and are
  authenticated and ownership-checked on every request; a URL alone is not
  sufficient.
- CSV exports are authenticated, permission-gated and audited.
- `.env` and `data/` are git-ignored; `.env.example` contains placeholders only.
- No secrets are read in client components; all configuration access is
  server-side.
- No card data, UPI PIN or provider secret is ever collected or stored.

---

## 9. Transport and host

The application does not terminate TLS. For a local-only deployment on
`localhost`, that is acceptable. If the server is reachable from other devices
on the LAN:

- put a reverse proxy with TLS in front of it;
- set `NODE_ENV=production` so session cookies are `Secure`;
- restrict the listening interface / firewall to the intended network;
- do not expose it to the public internet without a fresh security review
  (the blueprint's production checklist assumes HTTPS and managed secrets).

The SQLite file should be readable only by the account running the server. Back
up by copying it while the server is stopped (see `README.md`).

---

## 10. Staff deactivation controls

Staff access is managed per-Masjid via the `MasjidUser.status` column (`ACTIVE` /
`INACTIVE`). The following server-side guards are enforced in
`src/modules/staff/actions.ts` (`setStaffStatusAction`) and
`src/modules/settings/actions.ts` (`updateStaffRoleAction`):

| Guard | Rule |
|---|---|
| **Self-guard** | A user may never deactivate themselves (`membership.userId === user.id`). |
| **SUPER_ADMIN protection** | Only a `SUPER_ADMIN` actor may deactivate or change the role of another `SUPER_ADMIN` membership. |
| **Last-admin guard** | An `ACTIVE` `ADMIN` or `SUPER_ADMIN` membership may not be deactivated or demoted if it is the last active admin in that Masjid. |
| **Tenant scoping** | Every lookup is scoped to `user.masjidId!`; a membership from another Masjid is simply "not found". |

Deactivation is **soft**: the membership row remains, all past payments, receipts
and allocations keep their attribution, and the user retains access to any
other Masjid they belong to. A deactivated membership is excluded from
authentication (`getCurrentUser()`, `loginAction()`) and from staff UPI
lookups used in payment review, so access ends on the very next request.

The UI hides the buttons (self, SUPER_ADMIN, last-admin), but the server
guards are the actual control — hiding a button is irrelevant (see §3).

---

## 11. Known gaps

| Gap | Impact | Mitigation |
|---|---|---|
| No password reset / forgot-password flow | staff and members must be given a new password by an admin | documented in `README.md` |
| No MFA | admin accounts rely on password strength | keep the server off untrusted networks |
| Login throttle is per-process, in memory | resets on restart | acceptable for one local server |
| No CSRF token beyond `SameSite=Lax` + Server Action origin checks | standard Next.js protection applies | do not weaken `sameSite` |
| No file upload for logos/attachments | schema fields unused | upload only from a trusted local file when implemented |
| Audit rows have no integrity hash/chain | a DBA with file access could alter them | keep filesystem access restricted; back up regularly |
