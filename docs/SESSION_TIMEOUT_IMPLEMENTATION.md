# Approved session timeout implementation and isolated migration

**2026-11-15 final local activation:** private research-team approvals and the user's origin/shutdown confirmation were revalidated. Google was enabled only for the exact-account pilot at localhost:5181; the signed timeout policy is unchanged. No real-account login was performed. See [actual activation status and manual testing instructions](GOOGLE_OAUTH_LOCAL_PILOT_ACTIVATION.md). Earlier disabled/pending statements below describe prior stages; recovery-1 and production remain unchanged.

Recorded 2026-11-15, `C:\KNOXITE\SkillSwap`, `dev-justine`.

## Result and scope

The approved role policy is implemented and enabled by a signed receipt **only for the separately owned OAuth development environment**. Start its newly built guarded API to use it. No persistent normal OAuth application process or real Google login was started for this task. Recovery-1 and all ordinary configurations retain their existing session behavior. Google Sign-In and its three activation/approval flags remain false; no reviewer approval was manufactured.

| Role | Idle limit | Absolute limit | Warning starts |
| --- | --- | --- | --- |
| USER/student | 30 minutes | 8 hours | 25 minutes after recorded activity |
| ADMIN | 15 minutes | 4 hours | 10 minutes after recorded activity |

JWT and database absolute deadlines share an explicit whole-second issuance time. Every protected request verifies JWT signature/expiry, live session/revocation, token version, current account eligibility and (in active policy) server-side idle/absolute deadlines and signed role/policy claims. An observed role mismatch revokes that session and requires reauthentication. Any future administrative role-changing operation must revoke sessions atomically too; there is currently no general role-change UI in scope.

Successful logout, suspension, password reset/change and Google unlink keep their existing revocation safeguards. Ordinary requests, status checks, chat polling, page reload and hidden-tab timers never touch last activity. Only the explicit activity endpoint can renew idle time, never the fixed absolute deadline.

## 1. Additive migration evidence

Verified target: Docker `knoxite-google-local-mysql`, volume `knoxite-google-local-mysql-data`, exact writable volume mount, independent ownership labels, recorded container ID and volume creation time, and loopback **127.0.0.1:3319 / knoxite_google_local_dev**. The wrapper additionally checks `dev-justine`, unchanged base schema fingerprint, dedicated database user and SQL `DATABASE()/CURRENT_USER()`. MySQL reported **8.4.13**.

Preconditions actually observed: **29 tables; zero users, sessions and Google challenges; session column absent; Google/approval flags false; port 5019 available**. No process was force-stopped. A private full SQL dump completed successfully before DDL. The fixed migration was:

```sql
ALTER TABLE `AuthSession`
  ADD COLUMN `lastInteractiveAt` DATETIME(3) NULL;
```

No default, backfill, rename, drop, reset or historical-session revocation was performed. The precondition deliberately refuses a nonempty user/session/challenge population rather than guessing how to upgrade it.

All existing table row hashes/counts and all prior column definitions matched immediately after DDL. There were still 29 tables and zero users/sessions. The single new column has nullable `datetime(3)` type. MySQL integration fixtures were later created only in this target, then removed by their exact two run-owned user IDs. The final all-table row fingerprint matched the pre-fixture snapshot. Academic rows and all other original data were retained.

Private evidence under `%LOCALAPPDATA%\Knoxite\google-local`:

- `session-before-<timestamp>.sql`: original full dump; retain privately.
- `session-migration-intent.json`: signed pre-DDL identity, column metadata, row/count fingerprints and backup reference.
- `session-policy.json`: signed instance/base-schema/DDL/policy receipt, original/final row fingerprints and enabled state.

Actual evidence: applied at `2026-11-15T05:42:02.492Z`. Private backup `session-before-1794721321912.sql` is **48,041 bytes**; its raw-file SHA-256 is `667687502ee4466793847127264b96667a85dfdd6a6ba3cb4da3cba33aec37d8`. The signed intent's backup digest also verified (it uses canonical JSON string encoding); use the raw-file SHA above with `Get-FileHash`.

Original all-table row digest: `e03bff596f96a2464d200e6ed4c09e667240a51c631d5a4c87263be2173a333a`. Final all-table row digest after fixture cleanup: `e03bff596f96a2464d200e6ed4c09e667240a51c631d5a4c87263be2173a333a` — identical.

The original `environment.json`, infrastructure ownership record, client ID, JWT/database credentials, account allowlist and human-review file were not overwritten. Policy activation is an in-memory setting derived from the matching signed receipt, not an edit to Google flags. A missing/invalid receipt cannot authorize this policy; a missing/conflicting column prevents the guarded API from starting.

### Why the shared Prisma model remains unchanged

Adding the field to the primary Prisma model would make the protected recovery-1 launcher's schema-diff check demand its own migration. That environment is explicitly off-limits. The exact approved DDL is therefore staged as a SQL-only operational column, accessed with bound Prisma raw queries only when this policy is enabled. The shared generated client/model and schema fingerprint remain unchanged, so no absent-column query is issued in the unmigrated sandbox.

This is a deliberate compatibility stage, not a claim that the primary Prisma datamodel includes the field. Do **not** run generic `prisma db push`, reset, diff application or general migration commands against this OAuth database: a generic convergence operation could remove the managed extra column. The guarded session migration owns it. Adding it to the common Prisma model and rolling out timeouts elsewhere needs a separately approved coordinated rollout. No dependency or additional identity database was introduced.

## 2. Runtime controls

- New policy sessions initialize last interaction at issuance and receive signed `sessionPolicy`/`sessionRole` claims. Their JWT and SQL expirations match exactly. Pre-policy/unversioned sessions and null timestamps are rejected in active mode; no invented last-activity backfill grants time.
- `GET /api/auth/session-status` returns authenticated server time and deadlines; it is read-only. With policy off it returns `enabled:false` without querying the extra field.
- `POST /api/auth/session-activity` accepts only one approved interaction kind, an allowed Origin and the existing bearer session. It rejects client timestamps/extra fields. A user lock followed by a session lock rechecks current role, verification, suspension, token version, revocation and both deadlines before writing a server timestamp. An expired or revoked session cannot be renewed, including a logout/activity race.
- Browser foreground trusted pointer/touch, key and scroll interactions are debounced to at most one ordinary activity request per 30 seconds; **Stay signed in** is an explicit action. This conservative batching can leave the recorded last interaction slightly earlier than the last physical input. Visibility changes, polling and timers only resynchronize status, never renew it.
- Browser event trust is a UI filter, not cryptographic proof of a human. A holder of a stolen bearer token could forge activity requests until the fixed absolute limit; this feature does not eliminate XSS or token theft.
- The warning uses server deadlines and a monotonic browser clock, offers an accessible keyboard/touch action, and cannot offer to extend an absolute lifetime. At a known elapsed deadline, private UI is hidden while retaining component state until the server check resolves. A confirmed 401 clears authentication/unmounts protected views; a network failure is shown honestly and does not claim revocation.
- Cross-tab notifications contain no credentials or trusted deadlines; tabs fetch authoritative status. Storage events synchronize sign-out/account changes. Manual sign-out clears assessment drafts across tabs. Activity in one tab can renew that same shared session without a hidden tab generating activity itself.

The existing local account allowlist remains mandatory at identity/onboarding/linking/session boundaries. A blank private pilot account still denies pilot access. The diagnostic inspection mode remains non-authenticating. Human identity/enrollment/security review and Google activation authorization are separate from this session-policy authorization.

## 3. Assessment continuity

No backend assessment, question bank, grading, threshold, tier, retake, attempt history or attempt deadline was changed. The warning does not remount the assessment form. In an active timeout environment only, unsent option IDs are saved in **sessionStorage**, keyed by student and attempt. They can be restored after the same user reauthenticates only against the fetched active attempt and its current allowed question/option IDs, with the same unexpired deadline.

No question text, correct-answer key, score, password or token is stored in the draft. Tampered options are ignored; the server still validates and grades submissions. Submitted/expired drafts are cleared; explicit logout clears all Knoxite drafts in that tab and notifies other tabs. This is transient UI continuity, not server-submitted progress or proof of completing an assessment. Protected recovery-1 does not enable draft saving through this feature. Browser/storage availability may prevent draft recovery; closing a tab normally ends its sessionStorage, subject to browser restore behavior. Never treat browser drafts as trusted answers or extend an attempt to accommodate reauthentication.

## 4. Rollback — rehearsed without deleting a column or history

The following rollback and reactivation were executed successfully immediately after migration, while users/sessions/challenges were zero:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/sessionTimeoutMigration.cjs disable
node knoxite-backend/development/sessionTimeoutMigration.cjs inspect
node knoxite-backend/development/sessionTimeoutMigration.cjs enable
node knoxite-backend/development/sessionTimeoutMigration.cjs inspect
```

Observed disabled state: column retained, 29 tables, zero users/sessions, policy false. Observed reactivated state: same column/data, policy true. Google flags stayed false. The final state is enabled for the dedicated environment.

For a future rollback, stop **only your dedicated OAuth API on 5019** with Ctrl+C, then use `disable` and restart the guarded application. The tool re-verifies ownership and refuses to toggle policy if any users/sessions/challenges exist. That conservative refusal is intentional: simply disabling idle enforcement while live sessions exist could weaken security. If the pilot has since created accounts/history, stop and request a reviewed maintenance/revocation plan; do not reset records, delete the column, overwrite settings or restore an old dump over newer history. A nonempty rollout/rollback was not authorized or implemented here.

The SQL dump is retained as evidence/disaster-recovery input, not automatically restored. A destructive full-dump restore was not run. If DDL succeeds but final verification fails, retain backup and signed intent, keep the API stopped, and review before any recovery. The tool never adopts an unverified column or resets data. Repeating `migrate` after success refuses DDL replay and points to inspection.

The session migration CLI intentionally requires Google and its approval flags off, including its `inspect` command. After the later authorized Google activation, use `oauthLocal.cjs check` and the read-only account-status command in the activation report for routine checks; do not toggle approval flags just to run migration tooling. The following inspection commands describe the earlier Google-disabled migration stage.

Read-only verification:

```powershell
node knoxite-backend/development/sessionTimeoutMigration.cjs inspect
node knoxite-backend/development/oauthLocal.cjs check
```

## 5. Fresh tests and validation

| Check | Fresh result |
| --- | --- |
| Focused backend unit/in-memory/crypto/guard regressions | **40 passed, 0 failed, 0 skipped** |
| Real MySQL/HTTP session integration on verified OAuth DB only | **13 passed, 0 failed, 0 skipped** |
| Browser compatibility and timeout tests, Edge desktop/mobile viewports | **72 distinct passed, 0 failed, 0 skipped** |
| Backend build / generated-client consistency | Passed; no Prisma generation or shared schema change |
| Frontend type check / build / new browser test strict type check | Passed; existing >500 kB bundle warning remains |
| Dedicated migration/rollback/reactivation inspection | Passed; column/data retained, Google false |
| Original-row/private-config/source/manuscript preservation | Verified by task baseline hashes and dedicated database row fingerprints |

**125 distinct automated cases**, counted once across repeated selections. The complete browser selection first passed 70 cases; the final focused selection passed 34 (16 prior session-consistency + 18 current timeout cases), adding two offline-expiry cases to the unique total of 72. A narrower 14-case browser run and repeated backend selections overlap; they are not additional cases. The final 8-case policy rerun explicitly includes ordinary, synthetic and production configuration rejection. An initial helper typing mismatch was corrected before successful backend compilation; the passing test selections above had no failures.

Coverage: both idle/absolute boundaries and legacy/null claims; aligned JWT/SQL expiry; explicit activity without absolute extension; no renewal by chat/status polling; forged client timestamp rejection; role changes; logout/activity races; password-reset and suspension revocation; default-off/isolated config; MOCKED Google unlink revocation under policy; five-minute warnings; multi-tab resynchronization and sign-out; unchanged assessment deadline with draft restoration/filtering/expiry; and hidden private UI during offline expiry checks.

The MySQL tests use temporary synthetic users and actual loopback HTTP routes, not a production database. Cleanup targets only their two exact run-owned IDs and verifies all original table row hashes. Browser tests use controlled synthetic API/GIS responses and virtual clocks; desktop/mobile mean viewport projects, not physical-device trials. Google crypto tests use locally generated offline keys/certificate fixtures, and positive Google route tests use mock claims only. No actual Google feature/approval flag was enabled. Automated results are software verification, not human security review, current enrollment evidence or participant-evaluation data.

Commands (backend unit and SQL test commands run from `knoxite-backend`):

```powershell
npm --prefix knoxite-backend run build
# In knoxite-backend:
node --test --test-concurrency=1 dist/tests/session-policy.test.js dist/tests/google-auth.test.js dist/tests/google-memory.test.js dist/tests/institution-email.test.js dist/tests/oauth-local.test.js dist/tests/login-throttle.test.js dist/tests/email-delivery.test.js dist/tests/leaderboard-eligibility.test.js dist/tests/thesis-alignment.test.js
node --test development/sessionTimeoutIntegration.test.cjs
# Project root:
npm run typecheck
npm run build
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler tests/browser/session-timeouts.spec.ts
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npx playwright test tests/browser/session-timeouts.spec.ts tests/browser/session-security.spec.ts tests/browser/google-auth.spec.ts tests/browser/account-recovery.spec.ts
# Final targeted browser rerun after offline-UI refinement:
npx playwright test tests/browser/session-timeouts.spec.ts tests/browser/session-security.spec.ts
```

No complete WRMR/exchange lifecycle rerun was needed: those implementations were not changed; focused existing formula/cancellation/analytics regressions passed. No full-dump restore or nonempty historical migration was tested. The existing suite selection is recorded, not represented as every repository test.

## 6. Exact source/documentation changes

**19 project files changed during this task**, relative to its private start-of-task baseline; eight new files. No baseline file was deleted and earlier uncommitted work was retained.

| File relative to `C:\KNOXITE\SkillSwap` | Reason |
| --- | --- |
| `docs/GOOGLE_OAUTH_PILOT_READINESS.md` | Dated follow-up; retain earlier review history. |
| `docs/LOCAL_OAUTH_PILOT_AND_SESSION_SECURITY.md` | Dated follow-up linking the now-approved implementation/migration evidence. |
| `docs/SESSION_TIMEOUT_IMPLEMENTATION.md` | This report, exact SQL, migration/test evidence, rollback and remaining pilot steps. |
| `knoxite-backend/development/oauthLocal.cjs` | Verify signed policy receipt, validate column before serving, bind policy mode into signed frontend/backend identity check; export guarded migration helpers. |
| `knoxite-backend/development/sessionTimeoutIntegration.test.cjs` | Explicit guarded OAuth-only MySQL/HTTP test with temporary fixture cleanup/preservation proof. |
| `knoxite-backend/development/sessionTimeoutMigration.cjs` | Fixed one-column DDL, ownership/empty/port checks, private backup/intent, signed activation receipt, conservative policy-only rollback. |
| `knoxite-backend/services/sessionPolicy.ts` | Approved limits, version, deadline checks and bound operational-column read. |
| `knoxite-backend/tests/google-memory.test.ts` | In-memory timestamp support and mocked unlink revocation regression under new policy. |
| `knoxite-backend/tests/session-policy.test.ts` | Role boundary, old/future/null claim and migration/configuration guard tests. |
| `src/app/components/SessionGuardian.tsx` | Server-driven warning, explicit activity, polling exclusion, cross-tab status and offline privacy hiding. |
| `src/app/lib/assessmentDraft.ts` | Per-user/attempt unsent option-ID draft validation/cleanup in this tab. |
| `tests/browser/session-timeouts.spec.ts` | Desktop/mobile virtual-clock timeout, multi-tab, draft and offline regressions. |
| `knoxite-backend/lib/config.ts` | Default-off session setting, local-only activation guard. |
| `knoxite-backend/middleware/authMiddleware.ts` | Server-side idle/absolute/policy/role checks and request timing; observed role mismatch revocation. |
| `knoxite-backend/routes/auth.ts` | Read-only timing and transactionally rechecked explicit-activity endpoints. |
| `knoxite-backend/services/authSessions.ts` | Policy role/iat claims, matching SQL/JWT absolute deadlines and initial last-interaction write; legacy mode retained. |
| `src/app/components/AuthGuard.tsx` | Guardian integration and cross-tab authentication/draft cleanup. |
| `src/app/lib/api.ts` | Explicit logout draft cleanup and cross-tab sign-out marker; existing 401/race safeguards retained. |
| `src/app/pages/AssessmentPage.tsx` | Active-policy-only draft persistence/restore and truthful help text; grading/attempt logic unchanged. |

Outside Git, only the new private SQL backup, signed migration intent and policy receipt were created; policy receipt state was toggled during the authorized rollback rehearsal. Original private configuration/credentials/checkpoints/account/review files retained their baseline hashes. The running recovery-1 frontend may append its HMR log while watching shared source; no recovery-1 database or configuration was changed or connected to by this task.

Primary Prisma schema/migrations/generated-client contract, WRMR weights/aggregation/cancellation logic, backend assessments/banks/history, academic mappings/year restrictions and skill catalog retained their baseline hashes. The thesis PDF hash and branch/HEAD were preserved. No new credentials, actual account address, private client ID or token was inserted into project changes. No commit, push, merge, deployment, original-database or production action occurred.

## 7. Remaining steps before your own Google pilot

1. Fill your exact institutional account privately in `%LOCALAPPDATA%\Knoxite\google-local\pilot-account.json`; do not commit it. The local restriction remains fail-closed when blank.
2. Record actual current college eligibility, participant/term/scope and a real dated human security review in the private checklist. Review the new session results rather than its older seven-day-risk placeholder. Automated passes are not the reviewer decision.
3. Confirm the Web client's authorized JavaScript origin includes **http://localhost:5181** (not just recovery-1's 5180). No Google Cloud configuration was changed in this task.
4. Explicitly authorize normal local Google activation after those reviews. All Google enable/approval flags remain false now. No IT/university-wide approval or current-enrollment evidence is inferred from the observed hosted domain.
5. After authorized Google configuration, build and start only the dedicated environment:

   ```powershell
   cd C:\KNOXITE\SkillSwap
   npm --prefix knoxite-backend run build
   node knoxite-backend/development/oauthLocal.cjs database-start
   node knoxite-backend/development/oauthLocal.cjs check
   node knoxite-backend/development/oauthLocal.cjs backend
   ```

   In another terminal:

   ```powershell
   cd C:\KNOXITE\SkillSwap
   node knoxite-backend/development/oauthLocal.cjs frontend
   ```

   Open **http://localhost:5181/login** or **/signup** and perform the real Google interaction yourself. Session policy is already prepared for that process; Google remains disabled until explicit authorization and legitimate gate configuration.
6. Existing-account collisions still require explicit secure linking. Real password registration/recovery/verification and a positive real-password-link pilot still require authorized email delivery/sender configuration. Do not manually verify a real account or invent delivery success.

Production database hosting/backups/rollback, deployment security, JWT-secret rotation, privacy/research approvals, enrollment policy for a beta cohort and validated assessment content remain separate release requirements. No real Google login, deployment or participant evaluation is claimed by these tests.
