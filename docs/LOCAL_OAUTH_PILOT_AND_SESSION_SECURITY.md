# Local OAuth pilot protection and session security

**2026-11-15 session implementation follow-up:** [Session timeout implementation](SESSION_TIMEOUT_IMPLEMENTATION.md) records the approved one-column SQL migration and role timeouts, enabled only in the separately verified OAuth environment. The rollback rehearsal preserved data. Google remains disabled; earlier statements below describe the previous baseline.

Recorded 2026-11-15 (Asia/Manila), `C:\KNOXITE\SkillSwap`, `dev-justine`.

## Outcome and authorization boundary

Implemented the approved local exact-account restriction and three security-consistency corrections. Google remains disabled and all three existing Google approval flags remain false. The seven-day session policy is unchanged: no idle timeout/warning has been activated. No Prisma schema, migration runner, assessment rule, WRMR input/formula, academic mapping or database record was modified. No production request or real Google login was attempted.

The user states IT authorization is unnecessary for their own single-account local pilot only. The observed signed `hd=student.fatima.edu.ph` was reported for that account, not as IT/university-wide approval or evidence of current enrollment. Automated tests are not a human security sign-off.

## 1. Local-only exact-account protection

The dedicated launcher reads `%LOCALAPPDATA%\Knoxite\google-local\pilot-account.json`, containing exactly:

```json
{"email": ""}
```

Open that private file in your local editor and fill `email` with your own complete university-issued address. Do not paste the file or tokens into chat/Git. Only one email field is accepted; no lists, wildcards, aliases or approval fields. The server normalizes case/outer whitespace, then compares the whole address exactly. A blank file leaves all account access denied in this environment; enabling Google without a valid account fails startup. This file was created empty, not populated from old conversation history. Existing private environment/credentials/checkpoints were not changed.

`oauthLocal.cjs` injects `KNOXITE_LOCAL_OAUTH_PILOT=true` and `GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL` into the in-memory configuration. Do not add those variables to general `.env`, the frontend, recovery-1 or production. `loadConfig()` rejects their use outside the exact development topology: loopback API 5019, frontend/origin 5181, dedicated MySQL 3319/schema/user, no synthetic-sandbox marker. Ordinary configurations have no pilot restriction. Container/volume ownership, mount, schema-fingerprint and branch checks remain mandatory in the launcher.

Normal Google flow: backend cryptographic verification → institutional claims/hosted domain → exact-account check → existing nonce/proof and one-use challenge/onboarding/linking controls. No browser email is accepted as identity. Onboarding rechecks the server-stored verified email so a pending ticket cannot bypass a changed account policy. Existing email collisions still require explicit authenticated password-confirmed linking; no automatic email linking is introduced. Linked sign-in continues to use Google's stable subject and the existing Knoxite account ID.

As defense against an alternate entry point, session issuance, authenticated requests and new password registration in this dedicated environment also enforce the same account. This does not make a password login Google-authenticated or bypass mailbox verification. It prevents another account from using the password fallback to enter the one-account pilot. ADMIN is not an allowlist exemption. Recovery/account-security workflows retain their existing controls; none creates an authorized session for another account.

The non-authenticating Workspace diagnostic remains an inspection tool: it issues no Knoxite session/account and is not normal sign-in. Restart only the dedicated OAuth API/frontend after changing the private account file; the allowlist is loaded at startup. A policy change denies subsequent requests under the new process but does not delete accounts/history or the old database session record. Normal logout remains the supported revocation operation.

## 2. Confirmed defects and fixes

| Confirmed issue | Correction | Regression evidence |
| --- | --- | --- |
| Student/admin logout swallowed network/server failures and cleared local credentials as though revocation succeeded | Shared `logoutSession()` only clears credentials after success or a 401 indicating the credential is no longer accepted. Network/5xx errors preserve the browser session and display a truthful retry message. Backend successful logout still immediately revokes the session | Real page-button tests and helper tests for both roles; network/503/success cases |
| Protected raw fetch callers ignored the shared session-ended handling; chat could keep stale private UI/polling after 401 | `authenticatedFetch()` adds the current bearer token, restricts requests to the configured API, and clears the matching session/emits the existing event on 401. Existing Response consumers remain intact. All 12 protected raw-fetch pages reuse it. Forum list loading now includes the bearer token required by its existing backend | Chat poll expiry redirects, removes private UI and stops polling; forum expiry; late old-session response test |
| Late response from a prior account could clear a newer browser credential | Compare the credential used for a request to the current stored credential before ending it; logout also refuses to clear a changed account | Delayed-response regression |
| Leaderboard queries used only domain/suffix filtering, weaker than current login/matching rules | Both leaderboard endpoints privately fetch email, apply `studentEmailAllowed()` before metrics/ranking, and explicitly omit email from responses | Real HTTP routes with synthetic in-memory Prisma double: malformed historical address excluded, valid two-partner candidate retained, new candidate remains below existing leaderboard eligibility |

No history is deleted. Ranking weights, partner aggregation, ordering and two-partner leaderboard requirement are unchanged. Login/signup's public credential requests remain outside the protected wrapper. Shared API requests also use the wrapper, so there is one expiry path. A 403 (forbidden, suspended, ineligible) is not mislabeled as a 401. Unrelated offline/network failures do not revoke a session or prove server reachability.

Residual limitations: localStorage bearer tokens remain subject to same-origin script access; 401 handling is not a cure for XSS. A manual offline logout cannot guarantee server revocation. The admin's existing logout button lives in a desktop sidebar; its helper is tested at both viewport sizes, actual button checks use desktop width. No broader admin-navigation redesign is included.

## 3. Exact additive session migration proposal — NOT APPLIED

Approved targets: USER idle 30 minutes, absolute 8 hours; ADMIN idle 15 minutes, absolute 4 hours; both warn five minutes before idle expiry. Existing password/nonce/session protections and assessment deadlines/retakes/history must remain intact. Current code still issues/enforces seven-day JWT/database expirations for both roles.

Proposed single schema addition inside the existing `AuthSession` model:

```prisma
lastInteractiveAt DateTime?
```

Exact additive MySQL SQL proposed for a future reviewed migration:

```sql
ALTER TABLE `AuthSession`
  ADD COLUMN `lastInteractiveAt` DATETIME(3) NULL;
```

No default, rename, drop, relation change, index change or data backfill is proposed. Existing rows retain null; their user IDs, session IDs, hashes and all exchange/assessment relationships remain untouched. Null must NOT grant a new activity window. The SQL is documentation only, outside Prisma's migrations directory, and has not been executed. The Prisma source is unchanged so existing launcher schema fingerprints remain valid.

### Rollout requiring your separate approval

1. Approve this one-column migration, role/activity rules, legacy-session strategy and target isolated rehearsal environment. Record a backup/preservation/rollback plan. Do not target the original `knoxite`, recovery-1 or production. The OAuth launcher's schema fingerprint must not be silently rewritten to accept a changed database.
2. Rehearse against a newly authorized disposable/sanitized clone. Verify exact schema/row counts, account/hash and relationship preservation before/after the additive SQL. Include sessions issued before the change. Measure DDL locking on the actual MySQL/MariaDB version; no blanket claim of zero downtime.
3. Prepare backward-compatible code with the new policy default-off; do not let an ORM select a new column before the schema exists. With the switch off, no new timeout behavior runs. Use a deployment/maintenance boundary for the eventual coordinated switch.
4. Recommended legacy strategy at activation: revoke all pre-policy active sessions in the approved target and require reauthentication. Do not infer recent activity or grant a fresh 30 minutes to a seven-day session. Proposed coordinated activation operation (NOT EXECUTED):

   ```sql
   UPDATE `AuthSession`
      SET `revokedAt` = UTC_TIMESTAMP(3)
    WHERE `revokedAt` IS NULL;
   ```

   This is a deliberate rollout decision to approve separately, not part of the additive DDL. Pause sign-in/traffic during the coordinated cutover so newly issued sessions are not accidentally included. Existing token-version and revocation guards continue to reject old credentials. A signed session-policy version should distinguish new sessions; absent/unknown policy must fail closed once the new mode is active.
5. New sessions initialize server-side `lastInteractiveAt=now`, fixed role-based stored/JWT absolute expiry, and a signed role-at-issue/policy claim. To avoid lengthening limits across privilege changes with only one additional column, require reauthentication whenever the database role differs from the signed role-at-issue. Do not accept a browser-supplied role; changing roles must not reuse an old session.
6. Every protected request checks revocation/token version/role and BOTH deadlines with server time. Proposed idle rule: `now < lastInteractiveAt + roleIdleLimit`; absolute: `now < expiresAt` and signed JWT expiry. A missing timestamp in active policy is invalid. Updates must atomically require the session still valid at server receipt; concurrency must not resurrect an expired/revoked session. Session status checks never touch the timestamp.
7. Proposed status/activity endpoints and shared frontend guardian (not implemented) resynchronize server deadlines, warn at 25/10 idle minutes and expire at 30/15. Navigation, reload, hidden tabs and background chat/analytics polling are NOT activity. Approve the foreground click/key/touch/scroll event set and throttling interval before implementation. A holder of a stolen token can forge activity, so an immutable absolute limit remains necessary.
8. Preserve in-progress assessment state and existing attempt expiry. Normal reauthentication may resume only if the existing attempt is still valid; no attempt extension, badge reset, retake reset or policy exception is proposed.
9. Rollback: keep the additive column, take the application into maintenance and revoke all active policy sessions before serving an older build that cannot enforce idle expiry. Do not reopen expired sessions or drop history. Retain rollback evidence and reauthenticate afterward. Reverting only the application could otherwise remove idle protection from still-valid credentials.

Before activation, test server boundary clocks, JWT/DB absolute agreement, role changes, null legacy timestamps, simultaneous logout/activity, restart/multiple instances, multiple tabs, sleeping devices, warnings/keyboard/mobile, and polling that does not renew idle time. These are planned acceptance cases, not claimed passing tests for a feature that does not exist yet.

## 4. Minimal eligibility and human review records

Prepared outside Git: `%LOCALAPPDATA%\Knoxite\google-local\pilot-review.private.json`. It contains blank reviewer/date/term/reference fields and PENDING decisions only. Record current eligible college status through an approved minimal-data viewing procedure; store the decision/reference, not full COR images, student ID numbers, grades or fees. No upload feature or enrollment database was created. Apply appropriate Windows file permissions and do not share this folder; private path placement alone is not encryption or a privacy approval.

Human reviewer checklist (actual name, date, evidence and decision required):

- Google signature, issuer, audience, expiry, verified email, nonce/origin and one-use browser-bound challenge.
- Observed/allowed `hd`, exact Laguna email convention and exceptions procedure; no claim of current enrollment from a mailbox alone.
- Privately configured exact-account restriction at identity, onboarding, linking and session boundaries.
- Existing seven-day/no-idle risk: explicitly accept only for a bounded local pilot OR wait for approved migration/session implementation. Do not describe target limits as active.
- Successful logout revocation, failed logout feedback, password reset/change and suspension/token-version protections.
- Explicit account linking/current-password checks; no email auto-link or account copying.
- Database ADMIN/USER authorization; no reviewer/admin permission fabricated.
- Tokens/credentials excluded from source and logs; privacy notice/Terms, minimum eligibility evidence and retention/contact arrangements reviewed.
- Dedicated loopback resource identity and isolation from recovery-1, original database and production.
- Exact participant, local scope/duration and explicit activation authorization.

For later beta testing, proposed workflow remains: approved academic term → researcher privately checks current enrollment → authorized reviewer records minimal dated term decision → server participation gate → renewal next term. Research team must approve reviewer permissions, term boundaries, evidence/retention/appeal rules and treatment of active swaps before adding tables/guards. Enrollment must remain separate from assessment tiers/WRMR. Nothing in this task implements those beta eligibility restrictions.

## 5. Exact pilot completion steps

1. Privately edit `pilot-account.json` with your own institutional account. Leave the existing `environment.json` Google enable/approval flags false. Fill factual eligibility fields and obtain a real dated human security review in the private review checklist; automated tests do not fill it for you.
2. Decide whether to accept current seven-day/no-idle behavior for your bounded local-only pilot or authorize the session migration/implementation first. Your target-policy approval does not authorize executing the migration.
3. Provide explicit normal local Google activation authorization after review, including participant/scope/duration. Only then may legitimate gate values and a final local policy version be recorded. The Workspace gate records the limited local access basis you declared; it must not be represented as IT/university-wide approval. No flag is flipped by creating the account file or checklist.
4. Confirm Google Cloud contains the additional JavaScript origin **http://localhost:5181** for the existing Web client. The GIS callback ID-token flow does not require inventing a backend OAuth redirect URI. No Cloud configuration was changed by this task.
5. After approved configuration/activation, use separate terminals:

   ```powershell
   cd C:\KNOXITE\SkillSwap
   npm --prefix knoxite-backend run build
   node knoxite-backend/development/oauthLocal.cjs database-start
   node knoxite-backend/development/oauthLocal.cjs check
   node knoxite-backend/development/oauthLocal.cjs backend
   ```

   ```powershell
   cd C:\KNOXITE\SkillSwap
   node knoxite-backend/development/oauthLocal.cjs frontend
   ```

   Start Docker Desktop first. If the check reports an owned but stopped database, use the guarded `database-start` command before retrying check. Stop only your dedicated prior inspection/API/frontend processes with Ctrl+C if their ports conflict; do not stop recovery-1.
6. Open **http://localhost:5181/signup** or **http://localhost:5181/login** and perform the real Google interaction yourself. Complete name/program/permitted year/Terms onboarding. Existing same-email accounts must use the established authenticated linking path rather than automatic linking. Real email/password registration, recovery and positive password-link testing still require authorized delivery credentials/sender setup; do not manually verify a real account to bypass it.
7. Confirm account/session creation, own-profile access and successful logout. Record only sanitized outcome/error wording, never ID/session tokens. No real login is reported successful until you actually complete it. Production and recovery-1 stay Google-disabled.

## 6. Fresh verification

| Fresh check | Actual result |
| --- | --- |
| Backend strict build / Prisma Client consistency | Passed; existing schema matches generated client, no generation/migration required |
| Focused backend selection | **31 passed, 0 failed, 0 skipped** |
| Edge browser selection, desktop/mobile projects | **54 passed, 0 failed, 0 skipped**, including 16 new session-security cases and 38 existing Google/recovery cases |
| Frontend type check and production build | Passed; existing >500 kB bundle warning remains |
| Standalone strict TypeScript check of new browser tests | Passed |
| Guarded separate OAuth `check` | Passed; read-only SELECT 1, Google false, no real login |
| Baseline/hash/secret/whitespace checks | Passed for intended source changes, protected core files, existing private settings/credentials and thesis; no private configured secret/client ID found in task changes |

**85 distinct automated cases** (31 backend + 54 browser), not the sum of repeated executions. Preliminary subsets (14 browser, repeated backend selections) overlap and are not additional cases. No automated test failed. Backend crypto tests use real verification code with locally generated RSA/certificate fixtures; Google route tests mock verified claims and Prisma in memory. Browser tests mock GIS/API and intercept all external requests. No real Google identity, real mailbox delivery, MySQL race/migration rehearsal or new timeout behavior is claimed validated by these results. Planned migration/idle tests remain pending approval and implementation.

Commands executed from the project, with the backend selection run in `knoxite-backend`:

```powershell
npm --prefix knoxite-backend run build
# In knoxite-backend:
node --test --test-concurrency=1 dist/tests/google-auth.test.js dist/tests/google-memory.test.js dist/tests/institution-email.test.js dist/tests/oauth-local.test.js dist/tests/login-throttle.test.js dist/tests/email-delivery.test.js dist/tests/leaderboard-eligibility.test.js dist/tests/thesis-alignment.test.js
# From project root:
npm run typecheck
npm run build
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npx playwright test tests/browser/session-security.spec.ts tests/browser/google-auth.spec.ts tests/browser/account-recovery.spec.ts
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler tests/browser/session-security.spec.ts
node knoxite-backend/development/oauthLocal.cjs check
```

All 12 protected raw-fetch page consumers were type-checked/built; focused browser behavior checks exercise chat/forum and both logout handlers, rather than claiming full end-to-end coverage of every page/action. No protected database history was reset or seeded. The only pre-existing private file whose hash changed was the running recovery-1 Vite frontend's stdout log, consistent with source HMR; its settings, credentials, checkpoints and other non-log private files were unchanged. This task did not stop its processes or write its database/configuration.

## 7. Exact changed files

**28 project files changed in this task**, relative to the private start-of-task hash baseline; three are newly created (this report, leaderboard test, browser test). No baseline file was deleted. Earlier uncommitted changes in these files and elsewhere were retained.

| File (relative to project root) | Reason |
| --- | --- |
| `docs/ENROLLMENT_ELIGIBILITY_AND_SESSION_SECURITY_REVIEW.md` | Dated implementation follow-up; retain prior baseline findings. |
| `docs/GOOGLE_OAUTH_PILOT_READINESS.md` | Dated implementation follow-up and report link. |
| `docs/LOCAL_OAUTH_PILOT_AND_SESSION_SECURITY.md` | This report, exact pending SQL/rollout, review and activation steps. |
| `knoxite-backend/development/oauthLocal.cjs` | Private single-account file ingestion and dedicated in-memory configuration. |
| `knoxite-backend/tests/google-memory.test.ts` | Allowed/denied identities, pending onboarding, sessions, linking/fallback bypass and unchanged seven-day TTL. |
| `knoxite-backend/tests/leaderboard-eligibility.test.ts` | New HTTP regression for both leaderboards, historical malformed addresses, metrics and private-field exclusion. |
| `knoxite-backend/tests/oauth-local.test.ts` | Local-only/fail-closed configuration, exact account and direct-entry guard regressions. |
| `tests/browser/session-security.spec.ts` | New helper/page/expiry/private-UI/polling/stale-response/API-boundary regressions. |
| `knoxite-backend/app.ts` | Both leaderboard email predicates; explicit email-free activity DTO. |
| `knoxite-backend/lib/config.ts` | Private local-only pilot config and reusable exact-account predicate. |
| `knoxite-backend/middleware/authMiddleware.ts` | Check pilot account on authenticated requests. |
| `knoxite-backend/routes/auth.ts` | Prevent other-account fallback registration in dedicated pilot. |
| `knoxite-backend/routes/google.ts` | Recheck server-verified pending identity during onboarding. |
| `knoxite-backend/services/authSessions.ts` | Pilot account check before issuing sessions; lifetime unchanged. |
| `knoxite-backend/services/googleIdentity.ts` | Pilot check after verified institutional claims. |
| `src/app/lib/api.ts` | Shared authenticated Response wrapper, credential-bound 401 handling and truthful logout. |
| `src/app/pages/AdminDashboardPage.tsx` | Shared expiry handling and admin logout failure feedback. |
| `src/app/pages/AnalyticsPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/ChatPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/CommunityForumPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/DashboardPage.tsx` | Shared expiry handling and student logout failure feedback. |
| `src/app/pages/KnoxHubPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/NotificationPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/PostDetailsPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/ProfilePage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/ReputationPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/SwapAgreementPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |
| `src/app/pages/SwapDetailsPage.tsx` | Reuse shared authenticated Response/401 handling; existing request/response consumers retained. |

Outside the repository, two new private files were created only if absent: `pilot-account.json` (empty email) and `pilot-review.private.json` (blank/PENDING decisions). No existing private environment file was overwritten. The original database and production were not accessed. The thesis hash, Prisma schema/migrations, WRMR/metric/assessment/academic core files, branch `dev-justine` and HEAD `2d02411` were preserved. No dependency, commit, push, merge or deployment change occurred.

Remaining approvals: actual own-account eligibility/reviewer decision; real security review; accepting current local session risk or separately approving the migration/implementation/activation plan; exact pilot scope/duration and explicit normal Google activation. Future beta term verification requires its own policy/schema approval. Real email/password verification/recovery still require an authorized mail provider and sender setup; no delivery was simulated as real.
