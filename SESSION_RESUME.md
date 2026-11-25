# Masjid Collection — Session Resume Cheat Sheet
# Date: 2026-11-10 | Branch: master | Last commit: 3fae3be (pushed to faizrocks31/merimasjid)

## PHASE 8 STATUS: ✅ COMPLETE & PUSHED

## 1. Start the dev server (do this FIRST, in a separate terminal)
cd "C:\Users\hp\Documents\Claude Project\Masjid Collection"
npm run dev
# Runs preflight + Prisma migrations. Wait for "Ready" then open http://localhost:3000
# Login: seeded admin → check prisma/seed.ts for credentials

## 2. Resume the Claude Code session in THIS project (loads context automatically)
claude --resume
# claude-code-cli resumes the most recent session in this folder automatically.
# If it offers a list, pick the one titled "Masjid Collection" / Phase 8 Monthly Chanda.

## 3. Run the E2E verification (needs dev server running on :3000 + DB up)
npx playwright test e2e/monthly-chanda-payment-flow.spec.ts --reporter=list
# auth-state.json is regenerated automatically by e2e/global-setup.ts — no manual login needed

## 4. Run unit/integration tests
npm test
# Expect: 233 tests passed across 22 files

## 5. Typecheck
npm run typecheck
# Expect: clean (no errors)

## 6. What's already done (all committed & pushed):
- ✅ Phase 8: Monthly Chanda E2E — 2 members, 12 months dues, ₹300 FIFO allocation (2 months settled)
- ✅ Timezone fix: dues-generation.ts compares IST-midnight periods vs UTC dates properly
- ✅ Payment Received page loads DuesPeriod via new collectionDefinitionId FK (not legacy plan)
- ✅ i18n duplicate keys cleaned up (en/hi/ur)
- ✅ Admin role now has collection:write + collection:read (src/lib/permissions.ts)
- ✅ Full jumma module: src/modules/jumma/, src/app/(dashboard)/collections/jumma/, src/app/api/jumma/
- ✅ Phase 2C jumma migration: prisma/migrations/20261108090000_phase2c_jumma_collection/
- ✅ Tests: tests/e2e/monthly-chanda-payment-flow.spec.ts, e2e/monthly-chanda-payment-flow.spec.ts, tests/phase2c.test.ts

## 7. What's next / pending:
- [ ] Phase 8 next: Consider auto-generating Monthly Chanda dues on a schedule (currently manual via /collections/generate wizard)
- [ ] Optional: Add validation to prevent generating dues for past months
- [ ] Check PROJECT_IMPLEMENTATION_PROGRESS.md and "PROJECT IMPLEMENTATION ROADMAP.md" for full roadmap status

## 8. Useful files to read when resuming:
- chat-history/chat-2026-11-10.md   ← Full Phase 8 session log I just saved
- PROJECT_IMPLEMENTATION_PROGRESS.md
- "PROJECT IMPLEMENTATION ROADMAP.md"
- AGENTS.md                          ← Next.js version warning, read before writing code

## 9. Quick status commands
git log --oneline -5          # Confirm 3fae3be is at top
git status                    # Should be clean
npm run db:status             # Check migration state
npx prisma migrate status     # Alternative check
