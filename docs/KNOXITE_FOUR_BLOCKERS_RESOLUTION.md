# Four production blockers — local resolution

**Historical policy note — 2026-11-22:** Scheduled-end confirmation checks in
this report describe the earlier implementation/test baseline. The current local
rules allow explicit actual-completion logging for early or unscheduled sessions,
with a non-future time after bilateral agreement approval. Independent participant
confirmations, sequential limits, closed-exchange protections and bilateral reviews
remain required. See [current behavior and migration dependencies](FLEXIBLE_SESSION_AGREEMENTS.md).
Earlier test counts are retained as historical evidence, not fresh validation of
the current rules. No hosted schema or deployment change is implied.

2026-11-16 · `dev-justine` · supplements `KNOXITE_PRODUCTION_READINESS.md`

**Not a production release or production-readiness certification.** No protected database, local approval file, hosting service, real identity or mailbox was used for these tests. No commit, push, merge or deployment occurred.

## Status

| Blocker | Classification | Result / outstanding condition |
|---|---|---|
| Reconstructable migration path | **FIXED AND VERIFIED LOCALLY** | Separate fresh-install migration successfully reconstructs the release schema on MySQL 8.4 with pinned Prisma 6.19.3. Old migration files/checksums remain unchanged. Unknown existing installations still require an exact restored-clone reconciliation. |
| Production-capable session timeouts | **FIXED AND VERIFIED LOCALLY** | Explicit production activation supported; disabling timeouts in production or missing schema refuses startup. Real rollout, backup and operator authorization remain outstanding. |
| Premature confirmations | **FIXED AND VERIFIED LOCALLY** | New acknowledgements require the matching elapsed schedule, authoritative agreed duration and existing bilateral/integrity/participant/sequential checks. Shared Tracking/Calendar eligibility; old confirmations retained. |
| Consent and enrollment | **IMPLEMENTED BUT AWAITING APPROVAL** | Both signup methods enforce and atomically record versioned consent; tested locally. Final notice/retention approval and the participation-eligibility policy remain human decisions. No enrollment policy was activated. |

## 1. Migration strategy and evidence

The old chronological chain assumes missing intermediate structures, notably `Swap`, `User.role` and changed review relationships. Editing applied SQL or pretending those migrations ran would endanger existing installations. That chain remains untouched.

**Fresh path:** `knoxite-backend/prisma/release/schema.prisma` and its own `migrations/20261117000000_current_release/migration.sql`. This schema contains the current shared model plus nullable `AuthSession.lastInteractiveAt` and additive `RegistrationConsent`. It deliberately has no generator: existing runtime queries retain the shared Prisma Client so recovery-1's unmigrated schema and the local OAuth launcher's schema fingerprint remain compatible. New fields use bound SQL.

**Known legacy path:** `prisma/release/upgrade-from-shared.sql` only adds the session column, consent table, unique constraint and user foreign key. The disposable upgrader refuses anything that is not exactly the shared schema; after applying, it requires an exact release-schema diff. It does not resolve or replace old migration history. This artifact is **not** a universal upgrade script: installations with older structures, an already-added session column (including the protected OAuth database), or divergent history require a separately reviewed exact-state diff and restore rehearsal. No protected installation was inspected or upgraded here.

Disposable verification used newly owned, randomly named MySQL 8.4 containers with ownership labels, random loopback ports excluding 3306/3309/3311/3319, tmpfs storage and private credentials outside Git. Application tests used a DML-only account; DDL used separate disposable credentials.

- Fresh initialization: **31 tables including Prisma history**, 47 foreign keys, 24 UNIQUE constraints and 28 primary-key constraints. Release schema diff exit code **0**.
- Second deploy: no additional migration; checksum/history unchanged. Unknown/nonempty legacy target refuses fresh initialization.
- Shared Prisma Client reads, 13 academic programs and the existing first-year-only restrictions passed. Seeding occurred only inside the new disposable fixture; no mapping validation was invented.
- Actual compiled backend starts and serves academic options with ready production-shaped schema. With required schema absent, it exits before listening.
- Independently created legacy-schema fixture: additive upgrade and repeated readiness check passed; synthetic user ID/role/password-hash record and existing session count preserved; legacy activity stays NULL and consent remains empty. An unknown extra-table layout is refused rather than reset.
- No `db push`, reset, migration resolution, history rewrite or protected target was used. MySQL DDL is not an atomic rollback transaction.

The separate release schema must stay synchronized with future shared-model changes. A future typed-client consolidation needs its own coordinated recovery-1 migration authorization; it was deliberately not performed here.

## 2. Session rollout

`SESSION_TIMEOUTS_ENABLED=true` is now allowed in ordinary reviewed configuration. Production requires it explicitly; it cannot fall back to seven-day sessions. Startup inspects the nullable datetime activity column and, when enabled, consent storage and constraints. Startup never migrates or backfills.

Existing policy is unchanged: STUDENT (`USER`) 30-minute idle / eight-hour absolute; ADMIN 15-minute idle / four-hour absolute; five-minute warning. Explicit activity can renew idle time only. Polling and schema checks do not renew sessions. Revocable session IDs, role claims, password-reset/unlink/suspension controls remain in the existing architecture.

**Deterministic legacy handling:** retain old session rows and NULL activity values. Tokens without current policy/role claims or usable activity are rejected and require a fresh login; do not manufacture past activity or extend old tokens. This intentionally signs legacy clients out at rollout. No UPDATE backfill was executed or supplied. Local OAuth receipts and pilot approvals are neither required nor copied into the production path. Synthetic mode still rejects timeout activation on its unmigrated schema.

## 3. New session-confirmation policy

`POST /api/swaps/:id/log-session` now calls `confirmationEligibility` inside the existing exchange transaction/lock before inserting a **new** confirmation. It checks active confirmed/integrity state, participant, next agreed session number, both recorded approvals, positive agreement version, correct `(swapId, sessionNumber)` schedule, valid start after approval and server time at/after start plus the authoritative integer hours/session.

An existing confirmation by the same participant returns the prior idempotent result, including after closure; this does **not** add a signature, confirmation or count. New acknowledgements on closed exchanges are rejected. Concurrent scheduling uses the same exchange lock. Attendance is not independently proven by elapsed time.

`GET /api/swaps/:id` and `GET /api/sessions` expose the same reason/end-time eligibility contract. Tracking fails closed without it and refreshes through existing polling/focus logic. Calendar refreshes read-only eligibility every 15 seconds while visible and on focus/visibility changes. Neither read renews idle sessions. There is no UI redesign.

**Historical handling:** no confirmations, reviews, swap counters or metrics were rewritten. An active unconfirmed legacy session with no usable schedule must be reviewed by an administrator: inspect approval/schedule/history; participants may schedule a genuine future session through the existing workflow when permitted. A pre-approval/invalid schedule may need legitimate rescheduling. If an existing acknowledgement locks a problematic schedule, record the issue for an explicitly approved repair procedure; do not fabricate a schedule, delete an acknowledgement, reopen a closed swap or retroactively certify attendance. No new repair endpoint was added.

## 4. Consent implementation and eligibility decision

Both password `/api/auth/register` and Google `/api/auth/google/onboard` require `termsAccepted: true` and the currently displayed `noticeVersion`. Missing/false acceptance returns 422; mismatched version 409; disabled/unavailable storage fails closed. Timestamp and role injection are rejected by existing strict DTO allowlists.

Account creation and consent insert share a transaction. Storage failure rolls back the new identity/account; no orphan Google link is created. Evidence consists only of random record ID, user ID, server-selected notice version and server time. `(userId, noticeVersion)` is unique; user foreign key is RESTRICT. No IP, device fingerprint or extra personal data is added. Login/linking does not invent consent for historical accounts. Notice identifiers must refer to an archived immutable Terms/Privacy pair; there is no new public consent-history API.

Configuration: `REGISTRATION_CONSENT_ENABLED`, `REGISTRATION_NOTICE_VERSION`, `REGISTRATION_NOTICE_APPROVED`. Production requires enabled consent and an approved non-placeholder version. Flags are operator assertions, **not evidence of legal or institutional review**. Development draft identifiers are disclosed as drafts. `/api/auth/academic-options` provides the current notice metadata; signup and Google onboarding submit it and disable new-account creation when unavailable.

**Compatibility consequence:** existing accounts can continue signing in under their existing environment settings. New registrations in an unmigrated/unconfigured protected environment will be unavailable until separately authorized consent storage and notice configuration are present. No protected launcher/settings were changed or restarted, so the new guard is not claimed to be active in those running processes. Do not weaken consent merely to restore old signup behavior. Existing synthetic setup helpers/legacy sandbox registration fixtures also need a release-schema test target and the new consent DTO/configuration before reuse; they were not run against protected databases. The new independent integration suite verifies the changed workflows.

**Enrollment proposal — not implemented:** retain automatic eligible institutional authentication and public STUDENT-only registration; keep Google identity verification separate from participation authorization. For a small controlled thesis cohort, the smallest first step is a documented researcher-reviewed cohort/enrollment roster outside the application, with review before participation and a dated audit record. This is an operational proposal, not an enforced software barrier. If ongoing in-app restrictions are required, approve a minimal per-student decision record (status, scope/term, reviewer/time, expiry and private evidence reference) and common participation guard as a separate schema/policy task. No uploads, university data integration, new restrictions or eligibility fields were introduced here.

Decide before public participation:

- Responsible eligibility reviewer and appeal/correction contact.
- Accepted enrollment evidence and minimum storage/access/retention; avoid unnecessary document copies.
- Approved cohort versus current-semester eligibility; whether explicitly accepted institutional-email-only residual risk is sufficient for a restricted pilot.
- Pending/rejected access to matching, requests and existing exchanges; grandfathering and review of ongoing exchanges.
- Semester expiry, re-review, graduation/leave/change handling and correction/appeal process.
- Final Terms/Privacy versions, archived notice content, consent evidence retention/deletion and accountable privacy contact. Existing users have **no fabricated acceptance**; any future re-consent requirement needs an approved policy.

## 5. Fresh verification results

| Check | Actual result |
|---|---|
| Focused backend tests: Google-memory, rules, session policy, production preparation, scheduling, confirmation eligibility | **60 passed, 0 failed, 0 skipped** |
| Independently disposable real MySQL integration | **7 passed, 0 failed, 0 skipped** |
| Chrome desktop/mobile auth, warning/renewal, fixed absolute expiry, polling, multi-tab logout, assessment recovery and stale Tracking state | **24 passed** |
| Additional desktop/mobile unavailable-consent, Calendar eligibility refresh and light/dark scheduling regressions | **8 passed** |
| Backend TypeScript build | Passed; existing Prisma Client matched without regeneration |
| Frontend typecheck and production build | Passed; existing large-chunk advisory remains |

**99 focused tests**, not a new whole-project total. Google token delivery was mocked; no real Google login or email delivery was performed. The two-student real-MySQL lifecycle covers new registration/verification, reciprocal skills, request/acceptance, bilateral approval, missing/future/in-progress/end-minus-one/exact-end confirmation, independent acknowledgements, duplicate idempotency, review gating and completion only after both reviews. Closed/cancelled/sequential/invalid schedules also have focused helper/route tests.

Initial diagnostic runs caught an invalid activity test payload and attempts to reuse an already-populated disposable fixture; corrected before the final clean run. The initial browser invocation could not launch a missing bundled Chromium; installed Chrome was used for the successful runs. No failed run is represented as a pass. Legacy protected-DB sandbox suites were intentionally not executed.

## 6. Exact task files

Existing files changed (prior unrelated uncommitted edits retained):

- `knoxite-backend/lib/config.ts`: explicit production policy/consent configuration, retained local guards.
- `knoxite-backend/index.ts`: schema-readiness check before listening; safe startup refusal.
- `knoxite-backend/routes/auth.ts`, `routes/google.ts`: consent DTO and atomic account/evidence creation; public notice metadata.
- `knoxite-backend/routes/swaps.ts`, `routes/sessions.ts`: confirmation guard and authoritative eligibility DTOs.
- `knoxite-backend/lib/scheduling.ts`: update prepared-guard comment to reflect activation; duration calculation unchanged.
- `src/app/pages/SignupPage.tsx`, `src/app/components/GoogleSignIn.tsx`: current notice version and unavailable-registration state.
- `src/app/pages/SwapDetailsPage.tsx`, `src/app/pages/CalendarPage.tsx`: server eligibility, reason/end-time display and read-only refresh.
- `knoxite-backend/tests/googleFixture.ts`, `tests/google-memory.test.ts`, `tests/rules.test.ts`, `tests/session-policy.test.ts`, `tests/production-preparation.test.ts`: consent/configuration fixtures and rollback regression.
- `tests/browser/google-auth.spec.ts`, `tests/browser/surface-scheduling.spec.ts`: consent and confirmation regressions.
- `docs/deployment/backend.env.example`: nonworking production worksheet updated; no private/live environment changed.

New files:

- `knoxite-backend/services/registrationConsent.ts`, `services/schemaReadiness.ts`, `services/sessionConfirmationEligibility.ts`.
- `knoxite-backend/prisma/release/schema.prisma`, `prisma/release/migrations/migration_lock.toml`, `prisma/release/migrations/20261117000000_current_release/migration.sql`, `prisma/release/upgrade-from-shared.sql`.
- `knoxite-backend/scripts/release-preflight.ts`: explicit-target read-only fresh-path preflight; no dotenv target fallback or writes.
- `knoxite-backend/development/fourBlockersEnvironment.cjs`: ownership-verified disposable-only infrastructure helper.
- `knoxite-backend/tests/confirmation-eligibility.test.ts`, `tests/integration/four-blockers.test.ts`.
- This report.

Compared with the task-start hash inventory: 19 pre-existing files changed, none deleted; shared Prisma schema, historical migrations, catalog/content, scoring and academic configuration unchanged. No dependency or private environment change. Protected ports/volumes were never migration targets. Both newly created disposable tmpfs containers were removed after ownership verification; no pre-existing container or volume was removed. Private test evidence remains outside the repository.

## 7. Reproduce safely; later authorized rollout

### Disposable local verification only

From `C:\KNOXITE\SkillSwap\knoxite-backend`, build, then run `node development/fourBlockersEnvironment.cjs`. It creates a new empty, owned tmpfs MySQL fixture and prints **only** its private manifest path. Set `KNOXITE_FOUR_BLOCKERS_MANIFEST` privately to that returned path; run:

```powershell
npm run build
node --test --test-concurrency=1 dist/tests/integration/four-blockers.test.js
```

Use a **new fixture per complete suite run**; the legacy test deliberately leaves an unknown-layout table to prove refusal. Repeat-deploy behavior is tested inside the suite. Do not point this at recovery-1, OAuth or any pre-existing MySQL. The helper's `remove(open(manifestPath))` verifies recorded container ID, ownership, image, port and tmpfs before deleting only that newly created disposable container. Credentials stay in the private manifest, never source/CLI URLs/reports.

### Later rollout — requires separate authorization, not executed here

1. Identify actual provider, DB name/owner/TLS/network settings, code artifact and maintenance window. Take encrypted backup and successfully restore an independent staging clone; capture counts, constraints and data-preservation fingerprints. Review notices/enrollment, Google, operator/admin and privacy requirements. Do not turn public registration on merely because tests pass.
2. Choose **one** path. For a genuinely empty new target, inject its separately approved migration `DATABASE_URL` privately (never paste it), build, set `KNOXITE_RELEASE_PREFLIGHT_APPROVED=true`, then run `node dist/scripts/release-preflight.js`. Require EMPTY (or the exact known completed release history for repeat deploy). Run the pinned CLI:

```powershell
node node_modules/prisma/build/index.js migrate deploy --schema prisma/release/schema.prisma
node node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/release/schema.prisma --exit-code
```

3. On a populated legacy target, **do not run the fresh migration directory**. Compare the restored clone with both schemas using the pinned diff tool. Only an exact shared schema qualifies for `upgrade-from-shared.sql`; inspect/approve its SQL before `db execute --file prisma/release/upgrade-from-shared.sql --schema prisma/schema.prisma`. Any other layout (including session-column-only variants) needs a separately generated/reviewed additive diff. Maintain the existing migration history; keep a reviewed external upgrade ledger. Never `migrate resolve` merely to silence the broken chain. Verify complete release diff, constraints and old-record fingerprints after rehearsal before authorizing a real migration.
4. Fresh installs require separately authorized academic/catalog initialization through existing idempotent services, followed by genuine mapping-evidence validation. This test used those services only on disposable data. Do not copy local accounts, assessments, approvals or receipts into production. Existing installations retain their records and restrictions.
5. Configure separate least-privilege app credentials, explicit timeouts and genuinely reviewed consent version/approval. Reauthenticate legacy sessions; do not backfill fictitious activity/consent. Verify startup refusal on missing schema and smoke-test both roles, Google/password login, logout/revocation, scheduling/end-time guards and consent on staging first. No protected process was restarted by this task.
6. Retain additive columns/table during code rollback; stop new registration if rollback code cannot preserve consent, and never roll back to a production build/config that restores seven-day sessions or premature confirmations. Prefer forward correction. MySQL DDL is not transactionally reversible; destructive schema rollback or backup restoration requires a separately approved maintenance/restore plan and handling of any writes since backup. Do not drop consent evidence or session/history records as an automatic rollback.

Remaining external prerequisites include actual domain/origins, authorized real verification/recovery sender, production JWT-secret rotation, Google/eligibility/security decisions, final notices/retention, production administrator bootstrap, provider/backup/restore evidence and a separately authorized deployment. Domain/sender placeholders remain nonworking; no real delivery was attempted.
