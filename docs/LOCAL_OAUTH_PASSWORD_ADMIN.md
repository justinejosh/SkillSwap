# Separate password administrator for the dedicated local OAuth environment

**2026-11-15 student allowlist extension:** [multiple authorized student emails](GOOGLE_OAUTH_MULTI_STUDENT_LOCAL_PILOT.md) are now supported in the dedicated local environment. The primary Google student and the separate exact-ID/email/role password administrator described here are retained; student-list membership cannot grant ADMIN access.

Date: 2026-11-15. Branch: `dev-justine`. This is an explicitly user-authorized local administrator, not an institutional Google administrator or production administrator.

## Scope and identity

The existing institutional Google account stays `USER` (student), with its original ID, profile, Google identity, sessions, skills and assessment history. A separate new `ADMIN` User row was provisioned only in the independently verified `knoxite_google_local_dev` database on loopback MySQL 3319. The dedicated API remains 5019 and frontend 5181. No assessment banks were imported, validated or published.

The sandbox seed/bootstrap cannot be reused: it is explicitly guarded for synthetic sandbox settings/accounts. The new operator-only `oauthLocalAdmin.cjs` reuses `oauthLocal.verifiedSettings()` (branch, separate container AND volume ownership, exact loopback topology, schema identity and signed session receipt), then checks SQL `DATABASE()` and `CURRENT_USER()` and the existing verified linked Google student. No HTTP provisioning endpoint or schema change was added.

The new local administrator uses a randomly generated reserved `.test` email and a 48-character random password (36 random bytes). Only bcrypt cost-12 password hashes enter MySQL. The reserved local admin is administratively verified during explicitly authorized provisioning; this is NOT a claim of real mailbox delivery, student eligibility or university approval. Real student email/Google verification rules remain mandatory.

## Obtain credentials privately and sign in

From PowerShell under the same Windows user that provisioned the account:

```powershell
cd C:\KNOXITE\SkillSwap
npm run oauth:admin:check
npm run oauth:admin:copy-password
```

The second command prints the administrator email only in your terminal and copies the exact password to the clipboard without printing it. Paste at `http://localhost:5181/login`, using the email/password form. Do not use Google for the administrator. After login, open `http://localhost:5181/admin/assessments`.

Use an InPrivate/incognito window or separate browser profile for the administrator so your normal browser's Google student session and local storage remain separate. Authentication tokens in one browser origin's local storage are shared by its tabs; using a separate browser profile avoids replacing your student login locally. The admin setup does not revoke or change student server sessions.

Clear the clipboard after pasting. Do not paste credentials into chat, reports or Git. The account's email is intentionally not recorded here.

One-time setup, already performed, is repeat-safe:

```powershell
npm run oauth:admin:setup
```

It reuses the exact signed private identity, verifies the saved credential against bcrypt, and never resets a password or promotes an existing student. Unknown existing ADMINs, conflicting identities, wrong ownership, invalid signatures, suspension or changed credentials stop the operation. If the password has been intentionally changed, the copy command fails rather than returning/resetting a stale password. A separate explicitly authorized local recovery procedure is then needed; the reserved `.test` address is not a deliverable real mailbox.

## Load the new configuration

Stop ONLY the dedicated OAuth backend with Ctrl+C in its original terminal, then:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs backend
```

Leave the existing 5181 frontend and recovery-1 running. No database setup, migration, schema synchronization, reset or OAuth reactivation command is required. The launcher retains all existing Google approval gates and the signed session-timeout policy.

The helper's `check` command requires a fresh HMAC challenge from `/__oauth-local/admin-status`, proving the running backend owns this environment and has loaded its private admin restriction. It then performs normal password login, read-only assessment-management access, session-deadline checks, private student-assessment rejection and logout/revoked-token rejection. It creates/revokes only its own administrator test session. It never obtains a student's token or logs in through real Google.

## Security boundaries

- Existing `pilotAccountAllowed` is unchanged: Google identity validation, onboarding and student registration still accept only the privately configured institutional Google student.
- `pilotSessionAccountAllowed` adds an exact **User ID + email + ADMIN role** exception solely for session issuance/authorization. Matching an email, submitting a role, forging a Google claim or having another ADMIN ID is insufficient.
- `loadConfig` permits the two admin identifier variables only with the already guarded dedicated local pilot configuration: development, loopback host, API 5019, frontend/origin 5181, MySQL 3319 and schema/user `knoxite_google_local_dev`/`knoxite_oauth`. Partial configuration, recovery-1, original database and production targets fail closed.
- The launcher fills `KNOXITE_LOCAL_PASSWORD_ADMIN_ID` and `KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL` from the signed private manifest, not frontend input. Do not add these to production or shared `.env` files.
- Google login/linking continues to reject ADMIN identities. No administrator Google link was created.
- Password checks, suspension, verified status, role authorization, token-version checks, revocation, 15-minute admin idle timeout and 4-hour absolute timeout remain enforced. The shared timeout policy is unchanged.
- The student gets 403 from administrator endpoints. Administrators cannot enter student assessment-attempt/history routes (403). Personal profile/session endpoints resolve the authenticated user rather than accepting another user's identity. Existing expressly authorized administrator directory/moderation features remain available; this does not promise that administrators cannot see fields intentionally provided by those existing tools.
- Public portfolios are still public to authorized users; private passwords, hashes, tokens and assessment answers/results are not made public by this change.

## Private storage and preservation

`%LOCALAPPDATA%\Knoxite\google-local\local-admin.private.json` contains the exact admin identifiers, instance binding and Windows **CurrentUser DPAPI-encrypted** credential, signed with a purpose-separated HMAC using the existing local secret. The password is not stored in plaintext there or in any repository file. Decryption requires the same Windows user/profile. Node/PowerShell communicate through private subprocess pipes, not password-bearing process arguments or shell history. Microsoft.PowerShell.Security module autoload was unavailable in the tool environment; direct .NET DPAPI was tested and used without weakening encryption.

`local-admin-preservation.private.json` retains table fingerprints proving that provisioning changed only the newly added User row. They contain no row payloads or password. Setup writes a signed creation intent before the transaction so a failed/repeated command does not generate a new identity/password or overwrite an existing account. A pending intent can create only its exact absent identity after repeating all safety checks. Missing manifests are not recovered by adopting an existing ADMIN.

Pre/post-provision fingerprints of every existing SQL table, excluding only the new administrator User row, matched. The user-authorized new account has a different User ID from the Google student. Later successful checks/browser tests add only administrator sessions and revoke them on logout; those additions are expected. No existing student session is reset or revoked. Recovery-1 private settings, original database, production and thesis are outside the write targets.

Access withdrawal, if later requested, should suspend this exact signed ADMIN ID and revoke only its sessions/increment its token version in the verified dedicated DB, then disable its private launcher exception. Preserve the User row/history and encrypted recovery material. No destructive account-delete or generic rollback/reset command is part of this task.

## Fresh verification

Fresh results for this task:

| Check | Result |
| --- | --- |
| Backend full unit/regression suite (`npm test`, including build) | **141 passed, 0 failed**, no skipped/cancelled tests |
| Focused auth/Google/local-guard/session subset | **29 passed**; included in the 141 above, not counted twice |
| Dedicated real MySQL integration (`node --test knoxite-backend/development/oauthLocalAdminIntegration.test.cjs`) | **1 passed**, all synthetic users/sessions rolled back; shared snapshot unchanged |
| Actual 5181/5019 browser, existing Edge/Playwright infrastructure | **2 passed**: 1280px desktop and 390px mobile; real password login and assessment-management rendering |
| Live operator check (`npm run oauth:admin:check`) | Passed: signed running-instance proof, normal admin login, assessment management, student assessment rejection, exact admin deadlines and revoked-token rejection |
| Repeat setup | Passed: reused identity and credential; no new user/password/reset |
| Frontend typecheck and strict standalone browser-spec TypeScript check | Passed |
| Frontend production build | Passed; existing large-chunk warning remains |

There are **144 passing automated cases** (141 backend + 1 rollback MySQL + 2 actual browser), with the live operator check separate. No real Google authentication was performed by these tests. Student rejection from admin endpoints and exact ID/role forgery/suspension rejection were verified with mocked route tests and the real-MySQL uncommitted student fixture; the existing real Google student was not impersonated to obtain a test token.

An initial CLI run exposed circular module initialization, corrected before any account creation. PowerShell module autoload also failed before credential/DB creation; direct CurrentUser .NET DPAPI round-trip passed and was used instead. The first isolated integration expectation was corrected from 403 to 503 for its intentionally disabled Google-linking route; the enabled-path ADMIN rejection remains covered by the mocked-token suite. Final runs above passed.

All existing table fingerprints matched before/after actual admin provisioning (excluding only the new User row). Final User/profile, skills, academic mappings, assessment banks/versions/attempts and other non-authentication records still match. During final verification, the existing student completed a separately observed normal Google sign-in (signed identity verification/session at 2026-11-15 10:37:44 UTC). Thus full AuthSession/ExternalIdentity/GoogleAuthChallenge hashes differ from the initial snapshot because of normal concurrent authentication activity, and the login page also prepares unused browser challenges. These records were preserved rather than overwritten to force a hash match. Our provisioning never updates existing student rows or sessions, and the API/browser tests log in only as the new administrator; external Google requests are blocked in the browser test.

The three new persistent administrator verification sessions were all revoked on logout. All pre-existing private configuration/approval files remain byte-identical to the task baseline; only the two new administrator manifest/preservation files were added. No password, actual administrator email, pilot student's personal email, database URL or JWT secret was found in task-specific repository changes.


Optional explicit live browser check (does normal admin login and logout only; never real Google login, content imports or publication):

```powershell
$env:KNOXITE_LOCAL_ADMIN_BROWSER = 'true'
npx playwright test --config playwright.sandbox.config.ts tests/sandbox/local-oauth-admin.spec.ts
Remove-Item Env:KNOXITE_LOCAL_ADMIN_BROWSER
```

The spec independently verifies ownership before decrypting the private credential in memory. It permits only ports 5181/5019, uses the actual frontend/password form and API, suppresses credential-bearing fill logs, and disables traces/screenshots/video. It checks desktop/mobile admin dashboard and assessment management. It is skipped unless explicitly opted in. The separate real-MySQL integration test runs all synthetic users/sessions inside one rollback transaction; it publishes no banks and leaves the shared database snapshot unchanged.

## Exact task files

Exactly 11 task-specific repository files changed/added, relative to the task baseline. Earlier uncommitted work is preserved.

| File | Reason |
| --- | --- |
| `docs/LOCAL_OAUTH_PASSWORD_ADMIN.md` | Operator commands, scope/security, preservation and fresh validation evidence. |
| `knoxite-backend/development/oauthLocal.cjs` | Load signed private admin identifiers and expose an HMAC-protected local status challenge. |
| `knoxite-backend/development/oauthLocalAdmin.cjs` | New guarded repeat-safe operator provisioning, CurrentUser DPAPI storage, password copy and live check. |
| `knoxite-backend/development/oauthLocalAdminIntegration.test.cjs` | New dedicated-ownership-verified MySQL rollback fixture for role/session/privacy controls. |
| `knoxite-backend/lib/config.ts` | Exact local-only admin ID/email config and session-only authorization helper; Google/student allowlist unchanged. |
| `knoxite-backend/middleware/authMiddleware.ts` | Apply narrow exact-ID/email/ADMIN session restriction while retaining all existing checks. |
| `knoxite-backend/services/authSessions.ts` | Permit only the configured local admin during normal password/session issuance. |
| `knoxite-backend/tests/google-memory.test.ts` | Two new HTTP regressions for separate identities, permissions, session deadlines/logout and forged admin restrictions. |
| `knoxite-backend/tests/local-password-admin.test.ts` | Four new scope, exact identity, verification/suspension and signed-manifest tests. |
| `package.json` | Three operator scripts: oauth:admin:setup, oauth:admin:check, oauth:admin:copy-password. |
| `tests/sandbox/local-oauth-admin.spec.ts` | Opt-in desktop/mobile checks using the actual dedicated frontend/backend with credential artifacts suppressed. |

The earlier assessment audit's administrator-provisioning blocker is resolved by this explicit authorization. Subject review and separate import/publication approval are still required; this account creation grants no bank-publication approval.

No commit, push, merge or deployment. No change to academic mappings, 80-skill catalog, WRMR, assessment banks/tiers, thesis or database schema.
