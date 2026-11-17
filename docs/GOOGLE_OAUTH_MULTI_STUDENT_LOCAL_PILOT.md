# Multiple authorized student accounts: dedicated local OAuth pilot

Date: 2026-11-15 (Asia/Manila). Branch: `dev-justine`.

## Current result

The dedicated `http://localhost:5181` environment now supports an exact private allowlist with the original institutional Google student and additional specifically authorized student emails. The user added one additional address through their local terminal; the running API reported **studentCount=2**, originalStudentRetained=true, passwordAdminConfigured=true and loadedPolicyMatchesPrivateConfig=true. No real email is recorded in this document.

The separate password-based ADMIN remains restricted to its original exact User ID/email/role. The Google student allowlist cannot authorize ADMIN sessions. Google onboarding explicitly creates `USER` (student) accounts, even if a signed payload includes an irrelevant role claim; frontend-supplied roles are rejected. No accounts are copied from recovery-1 or automatically created by adding an address.

This is a local operator authorization change, not university-wide IT approval, current-enrollment verification or production activation. The existing hosted-domain/client/security gates are unchanged. Previous single-account reports describe earlier stages; this document describes the current allowlist extension.

## Add the next authorized tester privately

In your own interactive PowerShell terminal:

```powershell
cd C:\KNOXITE\SkillSwap
npm run oauth:students:add
```

Enter the tester's authorized university email at the prompt. It is validated privately, not supplied as a command argument or committed to source. The command rejects ineligible addresses, duplicates (including normalized case/space variants), wrong-campus suffixes, personal addresses and administrator addresses. It preserves the original student and every existing additional entry, backs up the previous private configuration, and records the local policy change privately. It does not create a User, profile, session, assessment result or academic mapping.

After adding a tester, stop ONLY the dedicated backend on 5019 with Ctrl+C in its original terminal, then:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs backend
```

Leave frontend 5181 and recovery-1 running. In another terminal:

```powershell
npm run oauth:students:status
```

The status command verifies the Docker/SQL identity and signed session receipt, then validates a fresh HMAC-signed challenge from the running API. It compares the private list against the backend's keyed fingerprint and reports the count only. No student emails, password, token or public email-list hash are exposed. If it reports a mismatch, restart the intended dedicated backend; do not widen domains, disable checks, reset a database or force-stop an unverified process.

`oauth:students:add` accepts interactive input only. It refuses account addresses in command arguments and piped automation. Run it in your own terminal, not in a shared report or chat. Enrollment/consent authorization for each tester remains the research team's responsibility; entering an address is not proof of enrollment.

## Private configuration and compatibility

File: `%LOCALAPPDATA%\Knoxite\google-local\pilot-account.json`.

The existing `email` value remains the original student/administrative-tool anchor. `additionalEmails` is a list of other authorized student addresses. The historical `{ "email": "..." }` format remains valid; the guarded upgrade added an empty additional list without replacing the original identity. The user then added their second authorized address. Prefer the terminal command over manual edits.

Only `email` and optional `additionalEmails` keys are accepted. Unknown keys (roles, approvals, credentials), malformed lists, non-string/empty/invalid entries, duplicated primary/secondary addresses and wildcards fail closed. Addresses are trimmed/lowercased before exact comparison. Do not change the original `email` or put the administrator in the student list.

The launcher internally sets `GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL` and `GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON`. These are not ordinary frontend/shared `.env` settings. Any use of the additional-list configuration requires the existing guarded development target: loopback host, API 5019, frontend/origin 5181, MySQL 3319, schema/user `knoxite_google_local_dev`/`knoxite_oauth`, and the explicit dedicated pilot flag. Production, recovery-1, original database or conflicting/partial settings are rejected.

For the current upgrade, the previous private file was retained as `pilot-account.before-allowlist-*.private.json`, with a purpose-bound local policy receipt `pilot-allowlist-change-*.private.json`. These remain outside Git. The Google campus/hosted-domain eligibility policy and its approval flags were not rewritten: this extension has its own local exact-allowlist-v2 receipt/status. It does not pretend the old single-account approval was university-wide approval.

Configuration is read at backend startup. Removing an additional entry and restarting causes its subsequent login/onboarding/session authorization to be rejected; its database history is retained. This does not automatically delete users or mutate all their session records. Use the existing authorized suspension/session-revocation tools if a separate permanent account action is required. Never remove the primary account to simulate revocation of someone else.

## Test with the additional real student

1. Keep the original student in their existing browser profile. Use another browser profile/InPrivate context for the second student and a separate profile/context for ADMIN; tabs in one browser profile share the same origin's local storage.
2. The additional account's owner opens `http://localhost:5181/signup` and selects **Continue with Google** (or signs in from `/login`). They choose their own authorized institutional Google identity.
3. The backend first verifies Google's actual signed ID token, issuer/audience/expiration/verified-email/nonce, then the exact university email format and approved signed Workspace hosted domain, then the private allowlist. A frontend email string is never identity proof.
4. A new identity must complete the existing academic onboarding, permitted program/year selection and Terms/Privacy acceptance. BSIT, BSIHM-CA and BSIHM-HACLO retain their first-year-only settings. No academic values are inferred from the Google email.
5. The resulting account has a new User ID and role `USER`. A known provider/subject reuses its existing account; a matching email alone cannot link or merge a different Google identity. Existing password accounts require the existing authenticated linking process.
6. Confirm that the second student sees their own profile/skills/history, can view only public portfolio fields of others, and receives no administrator access. Test reciprocal exchanges in separate browser profiles so each participant keeps their own session.

No additional Google Cloud origin is needed for the same registered `http://localhost:5181` frontend. Knoxite's local allowlist does not change Google Cloud audience/test-user settings or Workspace administrator restrictions. If Google blocks the additional student, inspect that provider-side access decision with the authorized project owner/OLFU IT; do not guess a new hosted domain or bypass verification. First-account success does not establish university-wide permission.

The automated tests below do not establish that this second real Workspace login succeeded. The tester must perform it themselves. No real Google login was initiated by the agent in this task.

## Preserved security and privacy

- STUDENT: 30-minute inactivity / 8-hour absolute; ADMIN: 15-minute inactivity / 4-hour absolute, with existing warning, server enforcement, polling exclusion and logout/reset/suspension protections.
- Both initial Google credential handling and pending onboarding recheck allowlist membership. Existing sessions are also checked against the active backend list on each protected request.
- An allowlisted institutional email grants student authorization only. The separate password administrator still needs its exact configured ID/email/ADMIN role. It remains ineligible for Google onboarding/linking.
- Student A cannot read/submit B's assessment attempts/history, overwrite B's personal profile or access administrator endpoints. Public portfolios stay intentionally visible without private email/password/hash/token/identity/session fields. Existing expressly authorized administrator-directory/moderation functions remain unchanged.
- User IDs, existing Google links, password hashes, profiles, academic records, published assessment banks, attempts/tiers, swaps, reviews and the exact 80-skill catalog are preserved. No schema synchronization, database migration, account-copy or production request is needed.

## Fresh verification

Fresh runs for this task:

| Check | Actual result |
| --- | --- |
| Backend full unit/regression suite (`npm test`, includes build) | **154 passed, 0 failed**, no skipped/cancelled tests |
| Focused Google/local policy/admin/session subset | **36 passed**; included in the 154, not counted twice |
| New real-MySQL rollback suite with mocked Google verifier | **5 passed** (parent plus four subtests): two-student onboarding, unique identity/collision rules, private-data/admin authorization and session enforcement |
| Actual dedicated 5181/5019 ADMIN browser check | **2 passed**, desktop 1280px/mobile 390px; existing password administrator still signs in and opens assessment management |
| Google UI and session-timeout browser regressions | **42 passed**, desktop/mobile; Google SDK/provider flows are mocked, with no real student token/sign-in |
| Live `oauth:students:status` | Passed; two privately authorized emails, original retained, admin configured, signed running policy matches private file |
| Live `oauth:admin:check` | Passed: normal password login, role protection, assessment access, admin deadlines and logout/revoked-token checks |
| Frontend typecheck/build | Passed; existing large-chunk build warning remains |

**203 automated cases passed** = 154 backend + 5 MySQL + 2 actual ADMIN browser + 42 mocked browser. Repeated focused runs and live operator checks are not added to the total. The first focused run exposed two stale test-fixture assumptions (required local domain fields, and clearing all pilot inputs when asserting absence); those fixtures were corrected and final runs passed. Security assertions were retained.

The additional email was supplied privately by the user; only the count/status was returned to chat. Current database state remains one original student and one password administrator: being allowlisted does not register the second student automatically. All existing User rows, offered links, two assessment attempts, published assessment banks/versions and other non-authentication tables match the pre-configuration fingerprints. Only normal AuthSession/login-challenge activity changed. Session preservation checks separately distinguish existing rows from the three administrator verification sessions, which were revoked after their checks.

All pre-existing private files remain byte-identical except the explicitly authorized `pilot-account.json` upgrade/user-added address. The admin credential manifest, Google environment/approval flags and signed timeout policy were preserved. Backups and local change receipts are new private files, not source-control artifacts. No existing repository path was deleted.


The new real-MySQL test uses mocked Google claim verification inside a private ephemeral application and one rollback transaction. It exercises two actual database identities and all normal onboarding/API authorization paths without creating persistent synthetic users or accepting mocked credentials in the running backend. No test-only verifier/allowlist bypass was added to real application configuration.

```powershell
node --test knoxite-backend/development/multiStudentPilotIntegration.test.cjs
```

## Exact task changes and preservation

Exactly 12 task-specific repository files changed/added; previous uncommitted work was retained.

| File | Reason |
| --- | --- |
| `docs/GOOGLE_OAUTH_LOCAL_ACTIVATION.md` | Current multi-student note while preserving historical activation records. |
| `docs/GOOGLE_OAUTH_MULTI_STUDENT_LOCAL_PILOT.md` | Current behavior, private commands, safeguards, fresh results and manual testing instructions. |
| `docs/LOCAL_OAUTH_PASSWORD_ADMIN.md` | Clarify that the separate exact administrator is retained under the student-list extension. |
| `knoxite-backend/development/multiStudentPilotIntegration.test.cjs` | Owned OAuth MySQL rollback tests using two synthetic Google identities and a synthetic administrator. |
| `knoxite-backend/development/oauthLocal.cjs` | Strict backward-compatible private-list loading and keyed, count-only signed runtime policy status. |
| `knoxite-backend/development/oauthPilotAccounts.cjs` | Interactive private add/upgrade/status commands with validation, concurrency guard and backups/receipts; no User creation. |
| `knoxite-backend/lib/config.ts` | Dedicated-only additional email parsing, exact allowlist membership, student-only sessions and preserved admin exception. |
| `knoxite-backend/routes/google.ts` | Explicit USER role on normal Google onboarding; request roles remain rejected. |
| `knoxite-backend/tests/google-memory.test.ts` | Two new mocked HTTP regressions covering both approved students, policy rechecks, claims, collisions and role/privacy/session safeguards. |
| `knoxite-backend/tests/multi-student-pilot.test.ts` | Five new config/editor/isolation/role regression cases. |
| `knoxite-backend/tests/oauth-local.test.ts` | Existing no-pilot-config test now clears the new optional input too, preserving the guard assertion. |
| `package.json` | Add oauth:students:add and oauth:students:status scripts. |

The only expected persistent configuration edit is the private `pilot-account.json` upgrade plus the additional authorized email entered by the user; backups/receipts are retained privately. No additional real student account is created merely by configuration. The original/local ADMIN roles and their history remain intact. Production and recovery-1 settings, thesis, WRMR, assessment methodology/content and academic mappings are unchanged. No commit, push, merge or deployment.
