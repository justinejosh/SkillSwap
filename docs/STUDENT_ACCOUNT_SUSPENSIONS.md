# Temporary student suspensions — local implementation

November 26, 2026 · `dev-justine` · not deployed or applied to any protected database.

## Implemented locally

- Student Management and Reports share one suspension dialog. It requires a supported reason, one of 24 hours / 3 / 7 / 14 / 30 days, a student-facing explanation, and an additional explanation for Other. Private notes are optional. Cancel preserves entered values. Loading, recoverable errors and duplicate-submit protection use existing components.
- A version-2 server-issued confirmation binds the administrator, active session, target and all normalized fields for two minutes. Preview returns `reviewedAt` and the proof, **not a suspension start/expiration**; it does not suspend or revoke. After locking/revalidating both accounts and the live administrator session, final confirmation captures one server timestamp. The full selected duration starts there. That same UTC timestamp is used for suspension start/creation/update, the SUSPENDED audit and session revocation. Expiration equals start plus the selected number of 24-hour days. Proof validity is rechecked inside the transaction after lock waits. Changed/expired/version-1 proofs require fresh review; proofs cannot authenticate to protected APIs. The preview states when suspension begins, and the success message displays exact backend-returned start/expiration dates.
- The confirmed operation rechecks the current ADMIN identity/session under account locks, rejects ADMIN targets and existing restrictions, writes history and audit, sets `isSuspended` and the ownership pointer, increments token version once and revokes active sessions in one transaction. An audit failure rolls back the entire operation.
- Both `POST /api/admin/users/:id/suspensions` and the compatibility `DELETE /api/admin/users/:id` require the same validated fields and server confirmation. The old empty DELETE no longer suspends anyone. Preview: `POST .../suspensions/preview`. History: ADMIN-only `GET .../suspensions?page=1` (10 records/page). No manual restoration, extension, permanent-ban or suspension-history deletion endpoint was added.
- Student Management has paginated history with original reasons/explanations/private notes, responsible administrator, interval, stored status, expiry/reactivation timestamps and administrator/system audit events. It distinguishes active temporary restrictions, expired history and legacy restrictions. Opening history focuses and scrolls to its region; closing returns focus to its trigger.

## Authentication, privacy and expiry

- Password login still verifies the password before obtaining suspension details. Linked Google login still requires signed-token, institutional/hosted-domain, browser-proof and nonce checks. Failed identity proof retains ordinary generic errors; no suspension details or normal session are returned. Successful identity proof for a restricted account returns HTTP 403 with an explicitly limited notice DTO, not a JWT/session.
- Login and Google signup/sign-in render the same suspension screen. It shows only the reason, student-facing explanations and dates, or an honest legacy-review notice when no supported expiration exists. It never receives private notes, administrator IDs or reporter/evidence records. Notice data stays in React memory, is lost on refresh/navigation and clears after five minutes; no special proof token or suspension information is persisted in storage or URLs. The screen focuses its heading and retains keyboard-accessible return navigation.
- Dates are stored in UTC and formatted using the browser's local timezone, with Asia/Manila as fallback. A browser timer does not grant access or decide expiration.
- Expiration reconciles on authoritative server requests: verified password/Google login, applicable existing-session checks, email verification/recovery eligibility, administrator directories/recent accounts and suspension history. It needs no continuously awake worker. Administrative directory reconciliation uses bounded keyset batches.
- The stable User row serializes expiration and suspension. Expiry releases only the exact suspension owned by `activeSuspensionId`, for the correct USER and unchanged enforcement token version. It records one system expiry event and never un-revokes sessions or reduces token version. A fresh login is required. A separately changed restriction/version is retained and recorded as `EXPIRED_RESTRICTION_RETAINED`.
- Legacy `isSuspended=true` accounts without a managed pointer remain restricted. No historical reason, consent or deadline is invented. No automatic restoration of legacy restrictions is offered.
- Public profile DTOs, peer data, leaderboards, review/scoring rules and assessment grading remain unchanged. Suspension does not cancel exchanges or edit skills, messages, schedules, confirmations, reviews, consent or attempts. Discovery continues using the existing `isSuspended` eligibility flag; passive reconciliation clears it when due accounts are checked, including before fresh login or admin directory results.

## Schema and migration

Prepared additive release migration:

`knoxite-backend/prisma/release/migrations/20261126000000_temporary_student_suspensions/migration.sql`

SHA-256: `87c090e12f74a45d6a820eebbcbd9e96b42a2d37e64483ace72af51f716e5f21` (canonical LF bytes).

- Adds nullable, unique `User.activeSuspensionId`; legacy rows retain NULL and their existing `isSuspended` value.
- Adds `StudentSuspension`: student/administrator references, supported reason and Other explanation, student explanation, private notes, duration, UTC interval, ACTIVE/EXPIRED status, enforcement token version, expiry/reactivation timestamps and creation/update timestamps.
- Adds `SuspensionAudit`: suspension reference, action, optional administrator actor and timestamp. System expiry has no fabricated administrator actor. Unique `(suspensionId, action)` prevents duplicate events. Restrictive foreign keys preserve history; no application audit-delete/update operation exists.
- Existing `AdminAudit` remains unchanged so forum moderation and evidence-access records retain their original contracts.
- Development/client and release schemas contain the same new models. The approved **separate release migration path** remains the fresh-install/current-release upgrade path. The incomplete historical development migration chain was not rewritten or re-baselined. No historical migration checksum changed.
- Startup refuses missing suspension tables/ownership storage. Release and disposable-CI preflights recognize the fifth checksum-verified migration while still accepting known prefixes and rejecting unknown/tampered histories. There is no startup migration or backfill.

## Exact changed files

Backend/schema/runtime:

- `.gitattributes` (LF rule for the new migration only)
- `knoxite-backend/prisma/schema.prisma`
- `knoxite-backend/prisma/release/schema.prisma`
- `knoxite-backend/prisma/release/migrations/20261126000000_temporary_student_suspensions/migration.sql` (new)
- `knoxite-backend/services/studentSuspensions.ts` (new)
- `knoxite-backend/services/authSessions.ts`
- `knoxite-backend/services/schemaReadiness.ts`
- `knoxite-backend/middleware/authMiddleware.ts`
- `knoxite-backend/routes/admin.ts`
- `knoxite-backend/routes/auth.ts`
- `knoxite-backend/routes/google.ts`
- `knoxite-backend/app.ts`
- `knoxite-backend/scripts/release-preflight.ts`
- `knoxite-backend/development/fourBlockersEnvironment.cjs`

Frontend:

- `src/app/components/admin/SuspendStudentDialog.tsx` (new)
- `src/app/components/admin/SuspensionHistory.tsx` (new)
- `src/app/components/admin/AdminWorkspaces.tsx`
- `src/app/components/admin/AdminReports.tsx`
- `src/app/components/AccountSuspensionNotice.tsx` (new)
- `src/app/lib/suspensionNotice.ts` (new)
- `src/app/components/GoogleSignIn.tsx`
- `src/app/pages/LoginPage.tsx`
- `src/app/pages/SignupPage.tsx`

Tests/report:

- `knoxite-backend/tests/student-suspensions.test.ts` (new)
- `knoxite-backend/tests/integration/student-suspensions.test.ts` (new)
- `knoxite-backend/tests/admin-readiness.test.ts`
- `knoxite-backend/tests/flexible-sessions.test.ts`
- `knoxite-backend/tests/integration/api.test.ts`
- `knoxite-backend/tests/integration/four-blockers.test.ts`
- `tests/browser/student-suspensions.spec.ts` (new)
- `docs/STUDENT_ACCOUNT_SUSPENSIONS.md` (this report)

Pre-existing untracked operator files were preserved. No package/dependency, authentication configuration, legal notice content/version or hosted setting changed.

## Previous implementation validation (retained evidence, not all rerun for the timing refinement)

- Backend TypeScript check and production build: passed, pinned Prisma 6.19.3.
- Focused backend unit/security suite: **93 passed, 0 failed/skipped** across student-suspensions, session-policy, login-throttle, google-memory, admin-readiness, flexible-sessions, rules, partner-integrity, leaderboard-eligibility, local-password-admin, google-auth, reports-security and report-evidence.
- Disposable MySQL integration: **48 passed, 0 failed/skipped** as counted by Node (44 leaf scenarios plus four parent tests): student-suspensions 10, API 10, Google authentication 12, four-blockers 9, password recovery 7. Covers duplicate/concurrent requests, actor/role checks, changed confirmations, credential privacy, revoked sessions, password/Google expiry login, old session rejection, exact boundaries, expiry-versus-replacement races, retained separate/legacy restrictions, and a real transaction rollback when the audit insert is deliberately failed.
- Migration rehearsal installed the previous four migrations in another independently verified disposable schema, seeded synthetic historical records, applied the fifth migration, compared every previous table/column fingerprint, confirmed unchanged first-four migration records/checksums, checked foreign keys/unique indexes, verified the complete schema diff and repeated deployment without changes. Legacy restriction remained true with no fabricated history. Application preservation tests also fingerprinted skills/account fields, exchanges, messages, schedules, confirmations, reviews, consent and assessment attempts across suspension/expiry.
- Final frontend TypeScript check and production build: passed after the accessibility/privacy refinements. `git diff --check` also passed.
- Browser checks: **200 passed, 0 failed/skipped**: 184 existing admin, Google/consent, account-recovery, session-navigation/security/timeout configurations, plus 16 final suspension configurations. Includes both themes, 320/375/390/430/1280-pixel notice layouts, mobile/desktop confirmation and cancellation at their original viewports, guarded Reports actions, duplicate-submit prevention, history loading/error/retry/empty/expired/legacy/pagination, long-name wrapping and focus restoration. Screenshots were inspected. A retry focus-loss issue found in the new history interface was corrected; switching students now also clears previous history immediately. The final 16 configurations passed after those refinements.
- Early fixture mistakes (submit-label case and confirmation participant-column name) were corrected. The prior empty DELETE success expectation was replaced with a rejection assertion plus a successful fully reviewed suspension. No security assertions were removed, disabled or skipped.
- Browser fixtures intercept APIs and provider scripts; backend integration uses independently labelled, loopback-only disposable MySQL containers. Docker Desktop's local Linux engine was started for this rehearsal. No real student registration, external email or Google call occurred.
- Existing Vite large-bundle advisory and Node MockTimers warnings remain; they are not failed checks. No new dependencies were added. Physical Android hardware and hosted CI were not tested.

## Before a separately authorized staging release

1. Review this implementation, including final-confirmation timing, creation opt-in and compatible recovery. Follow `docs/SUSPENSION_RECOVERY_ROLLBACK.md`. No release is authorized by local tests.
2. Research/operations owners must establish the appeal/support contact and handling process, review legacy restrictions individually in a separate authorized workflow, and approve retention/access governance for suspension records/private notes. Review coverage of these records in the approved privacy notice; any substantive notice revision needs its own version/approval, not silent reuse of the current identifier. No contact, policy approval or retention period was invented here.
3. Obtain separate approval for a staging-only maintenance, preservation/backup and migration plan. Reconfirm strict target/TLS/identity and current four-migration checksum history using the established safeguards. Do not reuse a fresh baseline over an existing database.
4. Once authorized and independently verified, apply only the new release migration with the approved migration principal. Check schema diff, foreign keys, indexes, legacy flags and preservation baselines. Verify the application principal can access the two new tables; do not grant it migration privileges.
5. Coordinate backend then frontend rollout while writes/administrative actions are held. Deploy the complete compatible backend in recovery mode first, with creation off; record its verified recoverable artifact before enabling the full audited workflow. The new backend requires the migration; the new dialog requires the new backend endpoints. Old empty-DELETE clients fail closed rather than creating undocumented suspensions.
6. Smoke-test only explicitly authorized staging test identities: ADMIN preview/cancel/confirm, USER denial, generic wrong-password behavior, private proved-identity notice, session revocation, history visibility and controlled expiry. Do not generate synthetic disciplinary records for unrelated real students.
7. Rollback retains the additive tables/audit/history. Do not drop history or undo token revocations. **Block legacy backend rollback after managed suspensions exist.** Use the complete protocol-2 recovery build, which forces creation off while preserving authoritative expiry and authentication. An environment flag cannot retrofit these guarantees into an old binary. Never automatically release legacy or separately retained restrictions. The recovery runbook records scenarios A–F, Render rollback configuration behavior and the pending hosted artifact/deploy-ID gate.

No Railway, production or recovery database was connected to or changed. No protected migration, backup, restore, commit, push, hosting change or deployment was performed. Image evidence remains default-off.

## Focused timing and recovery refinement — November 26, 2026

The earlier preview-anchored interval described by the prior implementation has been replaced; it is historical behavior only. Preview now binds terms, while final confirmation starts the full duration. Cancel, duplicate submission, signature/field tampering, expired review and transaction failure retain their protections. Old version-1 previews are intentionally invalidated and require a fresh review.

Creation defaults off through the implemented `SUSPENSION_CREATION_ENABLED` control; invalid values fail startup. Only explicit true enables the complete audited normal workflow. The recovery launcher forces false even after dotenv loading. It reuses the same schema checks, account restrictions, ownership-aware expiry, audit and session controls. No migration or dependency change is required for this refinement. The previously prepared suspension migration checksum above is unchanged.

Current-refinement files (separate from the preserved earlier feature's file list):

- `knoxite-backend/services/studentSuspensions.ts`
- `knoxite-backend/lib/config.ts`
- `knoxite-backend/routes/admin.ts`
- `knoxite-backend/scripts/start-suspension-recovery.cjs` (new)
- `src/app/components/admin/SuspendStudentDialog.tsx`
- `src/app/components/admin/AdminWorkspaces.tsx`
- `knoxite-backend/tests/student-suspensions.test.ts`
- `knoxite-backend/tests/integration/student-suspensions.test.ts`
- `knoxite-backend/tests/integration/api.test.ts` (explicit creation opt-in in the positive fixture)
- `knoxite-backend/tests/integration/suspension-recovery.test.ts` (new)
- `knoxite-backend/tests/fixtures/legacy-suspension-guard.ts` (new, test-only frozen historical predicate)
- `tests/browser/student-suspensions.spec.ts`
- `docs/deployment/staging-render.env.example` (template only)
- `docs/deployment/suspension-recovery-inspection.sql` (new, read-only operator preparation)
- `docs/SUSPENSION_RECOVERY_ROLLBACK.md` (new)
- `docs/STUDENT_ACCOUNT_SUSPENSIONS.md`

Focused verification:

- Backend unit/security regressions: **98 passed**, zero failed/skipped, including all 12 suspension unit tests plus session policy, login throttling, Google security, ADMIN readiness, flexible sessions, WRMR/rules/partner integrity/leaderboard, reports/evidence and peer evaluation checks.
- Disposable MySQL integration: **44 passed**, zero failed/skipped (39 leaf scenarios plus five parent tests): suspension recovery 8, student suspensions/migration 10, API 10, Google authentication 12 and peer evaluations 4. A controlled 60-second review delay persists confirmation-time start, full duration and identical creation/update/audit/revocation timestamps. Concurrent confirmations yield one success/one conflict. Audit failure rolls back all changes. The unchanged additive migration is rehearsed and prior schema/history preserved.
- Recovery is tested through the real compiled server entry point and launcher, production-shaped synthetic configuration and independently verified loopback-only disposable databases. It boots with migrated zero history, blocks all new/compatibility suspension actions despite an inherited true flag, preserves private ADMIN history, handles process replacement, reconciles an elapsed synthetic restriction during runtime, retains legacy/independent restrictions and rejects revoked JWTs. Missing schema, weak JWT secret or disabled required production session/email security refuse startup. Only synthetic fixture deadlines are changed for expiry tests.
- The frozen actual legacy authentication predicate from commit `b5c1bcead1590e6290ba1c93a0adffe64d688d10` rejects the captured expired managed-account snapshot. This demonstrates the legacy expiry problem without claiming a full historical deployment was run.
- Frontend `npm run typecheck`, backend `npm run typecheck`, and both `npm run build` commands: **passed**, with Prisma Client 6.19.3. Final `git diff --check`: **passed**; index remains unstaged. An initial new-test TypeScript inference error was corrected with an explicit override-map type. A parallel Prisma regeneration hit Windows' loaded-engine DLL lock; generation/typecheck passed when rerun after the disposable processes exited. Neither required weakening assertions or modifying application security.
- Browser regression: **88 passed, zero failed/skipped** in desktop and mobile configurations: 18 suspension, 54 admin-console and 16 session-security tests. Covers both themes, correct backend-returned success dates, preview without fixed dates, cancellation/editing, duplicate-submit prevention, notices after password/Google proof, history states, recovery-disabled creation and recoverable Reports errors, focus, responsive controls and existing reports/peer evaluations. Desktop dark and mobile light confirmation screenshots were inspected. Real Android hardware and hosted CI/deployment rollback were not tested.
- Existing Vite bundle-size, Node MockTimers and Playwright color-environment warnings remain non-failing. No dependency was added. All database integration and migration rehearsal used owned disposable local MySQL; no protected target was contacted.

Hosted rollout/recovery is **not verified or authorized**. The approved future recovery commit/artifact/deployment ID is still pending. See the recovery runbook for scenarios A–F, unsafe legacy versions, exact build/start commands, separate backup/migration approvals, backend-first recovery-mode rollout, frontend compatibility and final creation opt-in. Privacy retention/access governance, appeal contact/process and notice coverage remain owner decisions.
