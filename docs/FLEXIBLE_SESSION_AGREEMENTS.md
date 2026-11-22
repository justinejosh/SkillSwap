# Flexible session agreements — local implementation

**2026-11-22 scope update:** the original implementation/rehearsal evidence below
is retained as history. The owner's attached Additional Functional Requirements
explicitly supersede the scheduled-end restriction for NEW completion logging.
The current local implementation records an actual completion timestamp and
requires a separately reviewed additive migration; that new migration has NOT
been executed or rehearsed against MySQL in this UI task. No backup or hosted
service operations are part of this task.

## Current UI/workflow consistency pass — 2026-11-22

Changes are local on `dev-justine`, layered over the existing uncommitted work.
The attachment explicitly authorizes early/unscheduled actual completion logging
and owner forum deletion; it supersedes the earlier scheduled-end confirmation
rule. No other exchange, WRMR, leaderboard, consent or authentication policy is changed.

- New agreements still require only 1–30 total sessions, with no fixed-hours or
  date/time payload. Confirmed agreements offer Schedule Sessions / Schedule Later.
  Historical fixed-hour values remain visible and unchanged. Calendar forms start
  blank, accept individual start/end ranges and retain existing scheduling and
  post-confirmation rescheduling restrictions. Missing/invalid dates render safely.
- Actual participation now requires an explicit, valid, timezone-qualified
  completion timestamp, not in the future or before final bilateral approval.
  Scheduling is reference information and is not required for confirmation.
  Server `confirmedAt` remains the audit time; nullable `actualCompletedAt` stores
  the separately reported time. Old records are not backfilled. Both participants
  still confirm independently in sequence; duplicate requests do not add counts,
  outsiders/admins cannot log student sessions, and both reviews remain necessary.
- Forum deletion now permits the authenticated author or ADMIN, rejects forged
  ownership fields, and retains the existing comment cascade. The current schema
  has no stored forum likes/attachments/notification relations. The UI uses the
  server-verified identity, not a matching display name or decoded local token.
  Confirmation, failure/retry and success feedback use existing UI components.
- Both signup methods already use the same shared Terms and Privacy readers.
  Those texts and notice version were not changed. Opening/closing a reader does
  not accept consent. Existing Google accounts sign in without new-account consent
  prompts; new Google identities require academics and explicit consent, without
  a Knoxite password. Password signup retains mailbox verification and shows the
  actual server delivery result inline, then links to sign-in. No email was sent.
- Google academic-option failure/malformed responses now have an in-place retry
  without discarding identity. Verification pages now handle same-route token
  changes, cancel stale requests, preserve router history state and show clear
  missing-link/error/success states. No token contents are displayed.
- Existing shared/reduced-motion skeletons were reused. The forum retains its
  header during loading and distinguishes fetch errors from an empty feed. Post
  details reject stale route responses and provide retry instead of silent errors.

### Exact files touched in this pass

Frontend:
`src/app/components/AuthGuard.tsx`, `DateTimeText.tsx` (new),
`ExchangeSummary.tsx`, `GoogleSignIn.tsx`;
`src/app/pages/CalendarPage.tsx`, `CommunityForumPage.tsx`,
`PostDetailsPage.tsx`, `SignupPage.tsx`, `SwapAgreementPage.tsx`,
`SwapDetailsPage.tsx`, `VerifyEmailPage.tsx`.

Backend:
`knoxite-backend/routes/forum.ts`, `routes/swaps.ts`,
`services/sessionConfirmationEligibility.ts`, `services/schemaReadiness.ts`,
`scripts/release-preflight.ts`, `prisma/schema.prisma`,
`prisma/release/schema.prisma`, and new
`prisma/release/migrations/20261122000000_actual_session_completion/migration.sql`.

Tests:
`knoxite-backend/tests/confirmation-eligibility.test.ts`,
`flexible-sessions.test.ts`, `forum-ownership.test.ts` (new),
`integration/api.test.ts`, `integration/four-blockers.test.ts`,
`integration/student-flow.test.ts`;
`tests/browser/flexible-sessions.spec.ts`, `google-auth.spec.ts`,
`surface-scheduling.spec.ts`, `student-workflow-consistency.spec.ts` (new).
Documentation: this file. Existing legal-content and skeleton sources are reused,
not rewritten. Other pre-existing dirty files are not attributed to this pass.

### Current validation, not historical totals

- 52 distinct focused backend cases passed across runs: 36 session/scheduling/
  Google/leaderboard/lifecycle cases, 14 mocked auth/consent cases, plus two new
  schema/migration-artifact cases. The final affected subset rerun passed 14;
  these overlap the 52 and are not counted again. No real DB was used.
- The initial 118-case browser run passed 114. Four failures were one initial
  navigation timeout, the same-route verification-token bug and two outdated
  scheduled-confirmation assertions. After corrections, all 12 targeted reruns
  passed, covering every failed case in desktop/mobile projects plus the changed
  academic retry, flexible scheduling and missing-date cases. The full 118-case
  suite was not repeated. Viewports 320/375/390/430/1280 and both themes are covered;
  Android checks use Chromium/Pixel emulation, not a physical device.
- Prisma Client generation remains 6.19.3; backend typecheck/build passed.
  Frontend typecheck/build passed; Vite still warns about the existing large bundle.
  No security audit was disabled and no dependency was added.
- No MySQL integration/migration rehearsal was run in this UI task. Updated
  integration fixtures compile, but actual MySQL behavior remains a release gate.

### Release and legal boundaries

The new one-column migration adds ONLY nullable `SessionConfirmation.actualCompletedAt`.
It was prepared and checked as SQL text, not applied. It follows the existing
baseline and two-column flexible-session migration without changing their SQL.
Runtime readiness fails closed without the new column. Frontend sends `completedAt`
and the backend requires it for new confirmations; deploy these changes together
only after a separately authorized schema rollout and isolated migration rehearsal.
Railway staging is still pre-flexible-session and cannot run this release as-is.
Earlier release manifests/runbooks describe the prior scope and need a new review
before any release; no hashes/receipts were silently updated to imply approval.

The existing legal documents still contain the previously documented third-party
sharing/data-inventory/contact/retention discrepancies. Both signup methods show
the same preserved documents, but no reconciled legal wording or new notice was
invented. See `REGISTRATION_LEGAL_UI_REVIEW.md` for proposed human review.
No backup, restore, migration, hosting operation, production/recovery access,
commit, push, deployment, thesis edit or academic/catalog/assessment change occurred.

Branch: `dev-justine`. Implementation and disposable MySQL rehearsal passed.
Protected database migration and deployment require separate authorization.
Only independently owned disposable test databases were migrated; nothing deployed.

## Historical implementation and rehearsal (before actual-completion logging)

The sections below preserve the original flexible-range release and its test
evidence. Their scheduled-end confirmation rule was superseded by the current
2026-11-22 rules above. They are not the current completion policy.

### Original dependency and resulting behavior

Previously `Swap.duration` was a required integer (default 1, accepted 1–8 hours).
Agreement approval required it, summaries multiplied it by Total Sessions, and
confirmation eligibility calculated `scheduledAt + duration`. `SwapSession`
stored only a start. Hours do not determine WRMR, ratings or leaderboard ranks.

New agreements require 1–30 Total Sessions and explicit consent, with the same
agreement versions and bilateral approvals. The frontend submits no duration;
the backend stores `duration = null`. No invented one-hour value is submitted.
Changing pending terms, including replacing historical fixed hours, invalidates
earlier approvals and requires both participants to approve the new version.
The UI explicitly warns before this replacement. Confirmed terms remain immutable.

Each flexible session requires `scheduledAt` and `endsAt`, parsed from timestamp
strings with explicit offsets. The calendar accepts local date/time inputs and
sends UTC timestamps. End must be after start; start must remain in the future,
after final bilateral approval and within the existing one-year scheduling bound.
Different sessions may have different durations. The existing parent-row lock,
participant authorization, session-number bounds and acknowledgement lock remain.

In this historical implementation, confirmation was permitted only at/after the
stored end and required each student's independent acknowledgement. Elapsed time
never confirmed a session. The current rule is documented above.
Three confirmations out of five display 60% for the respective student. Both
students finishing sessions unlocks reviews; both validated reviews complete the
exchange. Counters, duplicate handling, reviews and scoring formulas are unchanged.

Historical agreements retain all duration values and signatures. Their existing
start-only schedules still derive ends using the original fixed hours. The old
API payload with `duration` remains accepted; omission on an already-confirmed
agreement does not change its terms. Historical confirmed agreements continue to
honor their fixed duration: an explicit range with a conflicting end is rejected.
Their read-only summaries identify the saved hours as historical terms. They are
not silently converted to flexible terms. No existing schedule is backfilled.

## Prepared migration and rollout boundary

`knoxite-backend/prisma/release/migrations/20261121000000_flexible_session_ranges/migration.sql`:

```sql
ALTER TABLE `Swap` MODIFY `duration` INTEGER NULL DEFAULT NULL;
ALTER TABLE `SwapSession` ADD COLUMN `endsAt` DATETIME(3) NULL;
```

No column is dropped. No UPDATE, DELETE, backfill, foreign-key or index change.
Existing values remain unchanged. Both current/release datamodels are updated.
All previously applied migration files remain unchanged. Release preflight and
the disposable runner accept only the exact checksum-verified known migration
prefix (original baseline, optionally followed by this migration), never an
unknown or failed history. Startup refuses a schema lacking the new nullable
fields; it performs no migrations itself.

**Do not restart/deploy this new backend against current protected databases.**
For a later separately authorized rollout:

1. Review the passing disposable MySQL rehearsal below. Review this migration
   and approve a specific staging target and deployment separately.
2. Verify target identity, TLS, schema/history, permissions and a restorable
   backup. Coordinate maintenance and frontend/backend versions.
3. For an installation with the known release history only, use the release
   migration path (`prisma/release/schema.prisma`), never generic `db push` or
   the incomplete historical migration chain. Do not baseline a nonempty legacy
   database. An older/manual-schema installation needs its own reviewed plan.
4. Apply only after authorization; verify the two columns, unchanged historical
   data/constraints and migration checksums before starting the new backend.
5. Smoke-test with isolated synthetic accounts, then release the matching UI.
   Update any target-specific operator schema receipts separately; do not bypass
   existing staging-admin or private target safeguards.

MySQL DDL is not a single rollback-safe transaction. Before any new writes, a
verified prechange backup can support rollback with the old application. After
flexible agreements/ranges exist, making duration NOT NULL or dropping endsAt
would lose information or fail. Prefer a forward fix; do not fill null hours
with fabricated values or discard schedules. Any data transformation requires
another reviewed plan.

## Validation and limits

- **32 backend tests passed**: real Express routers over an in-memory ORM fixture,
  scheduling parsing/authorization, versioned bilateral approvals, variable
  durations, exact end boundaries, duplicate acknowledgements, bilateral reviews,
  historical timing, schema/history guards, partner-balanced WRMR and leaderboard
  eligibility. These do not prove MySQL locking/concurrency or persistence.
- Browser coverage: **22 existing scheduling/tracking cases passed**. The first
  combined run had 28 passes and two new-test locator failures; the combobox
  selector was corrected. **All 8 new cases passed** on desktop/mobile, including
  both approvals, 20/75-minute ranges, end validation, refresh, historical terms
  and 3/5 progress. Responsive widths: 320, 375, 390, 430 and 1280px; existing
  scheduling tests cover light/dark. Chromium emulation is not physical Android.
- Frontend/backend TypeScript checks and builds passed; Prisma Client remains
  6.19.3. The existing frontend bundle-size advisory remains.
- Offline Prisma datamodel diff against the previous release produces exactly
  the two intended alterations. Previously applied migration files are unchanged.
- **Real MySQL rehearsal passed, 2026-11-21:** Docker Desktop Linux engine 29.9.2
  and the installed `mysql:8.4` image were verified. `npm run build` passed, then
  `node development/ciIntegration.cjs four-blockers.test.js` passed **9 tests,
  0 failed, 0 skipped** (64.5 seconds of test execution, excluding setup).
  The runner independently owned a tmpfs MySQL container on a random loopback
  port excluding protected ports. Its application account had restricted DML
  grants. It removed only its verified container; no labeled fixture remained.
- Added one real before/after migration preservation case inside that container.
  It initializes the prior release in an additional synthetic schema, inserts
  historical fixtures, applies the exact new SQL and compares records/metadata:
  **2 agreements, 2 schedules, 4 acknowledgements, 2 reviews** and their users and
  skills remain identical. Existing schedule `endsAt` values are null. All other
  columns, key relationships and indexes match before/after; only duration's
  nullability/default and the nullable millisecond-precision end column differ.
  The resulting database also matches the release Prisma schema (zero drift).
- The API persisted new agreements with null duration and distinct **5/9-minute**
  ranges. Premature confirmations were rejected, both participants confirmed,
  and final completion required both reviews. Fresh install, migration
  repeatability/checksums, historical fixed timing, startup refusal on a missing
  schema, consent enforcement and student/admin session safeguards passed.
- Initial run: **8 passed, 1 failed**, because previous test cases consumed the
  shared app's registration rate-limit window. The flexible case now constructs
  its own normal application instance; limits remain enabled and unchanged.
  The complete nine-case rerun passed. No production implementation changed.

No protected database was accessed or changed for this task. No accounts,
passwords, sessions, assessments, academic mappings, historical exchanges or
authentication configuration were modified. No commit, push or deployment.

## Exact files changed for this task

- `src/app/pages/SwapAgreementPage.tsx`
- `src/app/pages/CalendarPage.tsx`
- `src/app/components/ExchangeSummary.tsx`
- `knoxite-backend/routes/swaps.ts`
- `knoxite-backend/routes/sessions.ts`
- `knoxite-backend/lib/scheduling.ts`
- `knoxite-backend/services/sessionConfirmationEligibility.ts`
- `knoxite-backend/services/schemaReadiness.ts`
- `knoxite-backend/prisma/schema.prisma`
- `knoxite-backend/prisma/release/schema.prisma`
- `knoxite-backend/prisma/release/migrations/20261121000000_flexible_session_ranges/migration.sql`
- `knoxite-backend/scripts/release-preflight.ts`
- `knoxite-backend/development/fourBlockersEnvironment.cjs`
- `knoxite-backend/tests/scheduling.test.ts`
- `knoxite-backend/tests/flexible-sessions.test.ts`
- `knoxite-backend/tests/integration/four-blockers.test.ts`
- `tests/browser/surface-scheduling.spec.ts`
- `tests/browser/flexible-sessions.spec.ts`
- `docs/FLEXIBLE_SESSION_AGREEMENTS.md`

Earlier uncommitted UI/legal/private provisioning work remains preserved and is
not part of this task's release scope. No dependency or authentication changes.

## Staging deployment plan — prepared, not executed

Rehearsed migration SQL SHA-256:
`623cbcee093ccad1468558e314e0c73fd3ce7456ecbcae4735a757e9c49ef718`.

Target service names/URLs below are from the existing project records, not a
fresh hosted inspection. Reconfirm them before any separately authorized action.
This continuation changed only this report and the integration test file.

1. **Approve and freeze the release.** Review the intended `dev-justine` source
   and its necessary schema/UI/test dependencies; exclude private files and
   unrelated dirty work. Record the candidate commit and migration SHA-256.
   Commit and push require separate authorization. Verify staging Render and
   Vercel auto-deployment controls *before* a push so deployment cannot outrun
   the database change. Do not alter the production projects or `main`.
2. **Quiesce staging writes and back up.** Under separate hosting authorization,
   fence or stop only the staging API and coordinate its frontend/users. The
   repository's local maintenance lock does NOT operate with
   `NODE_ENV=production`; it cannot serve as a Render maintenance switch.
   Capture the existing staging backend/frontend revisions and nonsecret
   configuration inventory. Obtain an encrypted, access-restricted database
   backup with schema, data and `_prisma_migrations`; restore it successfully
   into a separately authorized disposable target before relying on rollback.
   Do not export credentials, tokens or account data into Git/CI artifacts.
3. **Reverify the actual database.** Use existing independently verified strict
   TLS and server identity checks: Railway staging service, schema `railway`,
   expected server UUID/account/grants, trusted certificates and migration
   checksums. Use the restricted migrator privately for DDL, never the running
   app credential or an unverified root URL. Capture before snapshots/counts of
   affected rows, columns, keys/indexes and migration history privately. Confirm
   the exact known baseline and no failed/unknown migrations. Stop for schema
   drift or conflicting columns; do not blindly baseline or mark SQL applied.
4. **Migrate only after explicit approval.** For a verified release-history
   installation, from the reviewed backend revision with the privately supplied
   staging migrator connection, use
   `node node_modules/prisma/build/index.js migrate deploy --schema prisma/release/schema.prisma`.
   Verify the new migration's successful ledger/checksum, nullable `Swap.duration`
   with null default, nullable `SwapSession.endsAt` DATETIME(3), unchanged existing
   duration values/schedules/approvals/counters/reviews and unchanged keys/indexes.
   MySQL DDL autocommits: if one ALTER fails, keep writes fenced and review the
   partial state. Do not blindly retry, resolve history or restore over new data.
5. **Deploy staging backend before the new frontend.** Render
   `knoxite-backend-staging`, branch `dev-justine`, root `knoxite-backend`;
   build `npm ci --include=dev && npm run db:generate && npm run build`,
   start `npm start`. Migrations do not belong in these build/start commands.
   Preserve strict-TLS application credentials, staging-only JWT/CORS/origins,
   OAuth restrictions, consent and timeout configuration; do not rotate or copy
   production secrets during this feature release. Verify schema readiness and
   `/api/health`, then authorized DB-backed reads. Health alone is not identity
   or data-integrity proof. The new backend intentionally refuses the old schema.
6. **Deploy matching staging frontend.** Only the separately configured staging
   Vercel project serving `https://knoxite.vercel.app`: Vite, repository root,
   `npm ci`, `npm run build`, output `dist`, reviewed revision matching the API.
   Verify its actual deployment environment uses
   `VITE_API_BASE_URL=https://knoxite-backend-staging.onrender.com/api`, with no
   production API inheritance. Preserve SPA rewrites/auth origins. New frontend
   against old backend is unsupported: it omits fixed hours and sends `endsAt`.
   Existing legacy API payloads remain supported by the new backend. Ask users
   to refresh stale tabs; never relax version conflicts to accommodate them.
7. **Smoke-test before reopening to the cohort.** With separately authorized
   synthetic staging testers (not existing real-account history), check login,
   STUDENT/ADMIN separation, unchanged session timeouts; total-only agreement
   creation; version changes clearing approvals; independent bilateral approval;
   different session ranges and UTC/local rendering; missing/invalid/future and
   elapsed-end boundaries; outsiders, duplicate confirmations and acknowledged
   reschedule locks; 3/5 progress; no automatic completion; both reviews; closed
   read-only history. Inspect historical agreements/schedules read-only and
   compare preserved counts/hashes. Check refresh/Back, desktop/mobile and both
   themes, as well as correct API routing and existing assessments/scoring.
   Do not generate synthetic swaps/reviews on real participant accounts. If
   creating staging fixtures is not separately approved, limit to read-only
   smoke checks and keep the write workflow gate pending.
8. **Rollback and reopening gate.** Before flexible writes, the prior app can
   be considered only after verified compatibility/restore planning; never run
   a destructive down-migration casually. Once null-duration agreements or end
   ranges exist, old code may reject/misinterpret them. Keep writes fenced and
   prefer a forward fix. Do not set fake hours, drop `endsAt`, or restore an old
   backup over newer history. A restore requires a separately reviewed recovery
   decision and reconciliation of all intervening writes. Reopen staging only
   after identity, preservation, backend/frontend and smoke checks pass.

Remaining gates: separately authorized release/migration/hosting actions,
fresh staging target/history/TLS verification, verified backup restore, coordinated
write fencing and matched releases, and approved smoke-test identities. No local
MySQL rehearsal failure remains. No staging or production rollout is claimed.
