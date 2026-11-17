# Google OAuth local activation

**2026-11-15 multi-student extension:** the original student is retained and specifically authorized additional student emails can now be configured privately for localhost:5181. See [current allowlist instructions and verification](GOOGLE_OAUTH_MULTI_STUDENT_LOCAL_PILOT.md). Earlier single-account descriptions below are historical; production/recovery-1 gates remain unchanged.

**2026-11-15 final local activation:** private research-team approvals and the user's origin/shutdown confirmation were revalidated. Google was enabled only for the exact-account pilot at localhost:5181; the signed timeout policy is unchanged. No real-account login was performed. See [actual activation status and manual testing instructions](GOOGLE_OAUTH_LOCAL_PILOT_ACTIVATION.md). Earlier disabled/pending statements below describe prior stages; recovery-1 and production remain unchanged.

Date: 2026-11-14 (Asia/Manila). Project: `C:\KNOXITE\SkillSwap`, branch `dev-justine`.

## Activation status and proposed isolated environment

The existing Google Identity Services flow is reusable. The supplied public Web client ID has been placed only in a private, **disabled pending configuration** at `%LOCALAPPDATA%\Knoxite\google-local\environment.pending.json`, not in tracked source. No client secret is required for this callback/ID-token flow.

**Normal Knoxite Google Sign-In is not enabled.** On 2026-11-14 the user reported a successful real signed-identity diagnostic for their own OLFU account: `hostedDomain=student.fatima.edu.ph`, `institutionalEmailFormatValid=true`, `knoxiteAccessGranted=false`. This is an observed claim for that test account, not OLFU IT confirmation, current-enrollment evidence or university-wide access approval. The agent did not repeat the real-account test or retain its token. The active private local allowlist is now prepared with that domain; all activation/approval flags remain false. See [pilot readiness and authorization requirements](GOOGLE_OAUTH_PILOT_READINESS.md).

The protected recovery-1 environment on frontend 5180 / API 5012 / MySQL 3311 remains Google-disabled with its existing private configuration and capture policies. Production settings were not accessed or changed.

Proposed separate resources, checked for local port conflicts during inspection:

| Resource | Proposed value | Current state |
| --- | --- | --- |
| Frontend origin | `http://localhost:5181` | Prepared local origin; user reports successful diagnostic; Cloud settings not independently inspected |
| Backend | `http://127.0.0.1:5019` | Smoke-tested with Google disabled; stopped afterward |
| MySQL binding | `127.0.0.1:3319` | Separate user-authorized database, ownership verified |
| Container | `knoxite-google-local-mysql` / MySQL 8.4 | Created with its own ownership label; running |
| Named volume | `knoxite-google-local-mysql-data` | Created; no pre-existing volume adopted/reset |
| Schema | `knoxite_google_local_dev` | Current unchanged Prisma schema applied only after verifying a new empty target |

The user explicitly authorized separate local database provisioning in this chat. No existing Docker container/volume was repurposed. The pending file is retained unchanged; a separate private `environment.json` now contains the dedicated connection, random signing secret and supplied public client ID. Both files keep Google disabled. `infrastructure.json` binds the instance label, actual container ID, exact named volume and creation timestamp. `mysql.private.env` contains private provisioning credentials; do not display/share it or commit any of these files.

The application uses the same Prisma User/identity schema, authentication routes and session implementation in this isolated development deployment. It is not a second identity system inside Knoxite. No accounts were copied or linked across databases. Do not run ordinary `npm run dev` against an unspecified `.env` as a shortcut.

## 1. Existing functionality reused and minimum changes

`GoogleSignIn.tsx` already loaded GIS, obtained a backend nonce challenge, kept a random browser proof in memory, posted the returned ID token and reused password-free onboarding. `routes/google.ts` already verified the token on the server, consumed browser-bound challenges, attached Google `sub` to the same User record, required explicit password/session proof for linking, and rechecked current suspension/session/policy state. New Google registrations already require name, supported program/year and Terms/Privacy acceptance before account/session creation. Existing users with matching email are rejected with explicit linking instructions; email alone never links or merges an account.

The changes reuse those components:

- Signup now requests the GIS **Continue with Google** button; login retains **Sign in with Google** and adds a clear **Sign in with Email** heading above the existing form.
- Missing/disabled configuration shows a disabled Google button and an explanation. It does not load the Google SDK; email forms/recovery remain available. Account-security linking keeps its prior hidden-when-disabled behavior.
- Signup retains full name, email, password/confirmation, academic selectors and Terms/Privacy agreement. The desktop card is wider (576px), with clearer labels/contrast and padding; mobile layout is preserved. No registration system was replaced.
- The shared backend email predicate now enforces the confirmed structure on the real institutional domain. Synthetic reserved-domain rules are unchanged.
- A separate guarded development launcher/configuration and claim-inspection mode were prepared. Production `index.ts`, synthetic safety guards, schema, academic configuration, WRMR, skill presets, assessments and swap rules were not changed.

## 2. Confirmed email format and exceptions

With `INSTITUTION_EMAIL_DOMAINS=student.fatima.edu.ph` and `CAMPUS_EMAIL_SUFFIX=lag`, both ordinary authentication/registration and Google eligibility use the central `studentEmailAllowed()` predicate. On that domain it requires a case-insensitive local part matching `[a-z]{3,}[0-9]{4}lag`: two initial letters plus at least one surname letter, exactly four digits, and the Laguna suffix. Domain matching is exact, not a suffix match. Gmail, other domains, other campuses, missing/extra digits, plus tags and punctuation variants fail.

This is a structural check. It cannot independently establish that the letters are the person's actual initials/surname, that the digits prove identity, or that the account represents a currently enrolled college student. Passwords/Google signatures and the existing academic/eligibility policy remain separate checks. The four digits are never used as a password, recovery code or authentication factor.

No format exceptions have been supplied or automatically allowed. Nonconforming university-issued accounts require documented administrator/institutional review before any exception policy is approved. No records are deleted/renamed to force conformity. Before production rollout, audit an authorized sanitized clone for legitimate exceptions; the original database remains off-limits. The current format assumes the reported ASCII account convention rather than inventing rules for missing middle initials, compound names or aliases.

Google's signed `hd` claim is checked against a **separate configurable allowlist** in normal sign-in. It need not equal the visible student email domain. The local allowlist is now prepared as `student.fatima.edu.ph` from the user's single-account observation; that preparation does not grant approval or enable sign-in. A Google primary email outside the required student format is not silently accepted merely because an alias looks eligible; such cases need review.

## 3. Google Cloud configuration to perform yourself

Use your existing **Web application** OAuth client. Its supplied public client ID is already in the private backend `GOOGLE_CLIENT_ID` variable. No client secret was supplied or requested, and none is required for this GIS ID-token callback flow.

Add this exact **Authorized JavaScript origin** in Google Cloud:

```text
http://localhost:5181
```

Keep 5180 unchanged if desired, but Knoxite's protected sandbox must stay Google-disabled there. Do not substitute `127.0.0.1` in the browser without separately registering that origin; hostnames/ports are significant. Google's setup guide also recommends the plain `http://localhost` origin for local development. This task did not edit the Cloud client configuration or assume an unregistered origin would work. [Google setup documentation](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

**No authorized OAuth redirect URI is used by this implementation.** GIS uses its popup JavaScript callback, then Knoxite posts JSON to its own backend. The application endpoints are `/api/auth/google/challenge`, `/login`, `/onboard`, `/link/challenge` and `/link` under that prefix, on API 5019 in this local environment. They are not authorization-code redirect handlers. Do not invent `/auth/google/callback` or register `/api/auth/google/login` as a redirect to compensate for an origin error. [GIS JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference).

Confirm Cloud branding/audience/testing configuration. An Internal audience only works for the owning Workspace organization; a personal Cloud project cannot declare itself part of OLFU's organization. An External app in Testing may require your institutional account to be an allowed test user. Workspace administrators may separately block or restrict third-party sign-in even when the OAuth client/origin is correct. No Drive, Gmail, Calendar, offline-access or other API permission is introduced.

Institutional administrators control third-party application access independently of the Cloud client's authorized origin; request only the sign-in access needed, not blanket approval for unrelated APIs. [Google Workspace app-access controls](https://knowledge.workspace.google.com/admin/apps/control-which-third-party-and-internal-apps-access-google-workspace-data).

## 4. User-participated signed-claim inspection — next step

**The user reports completing this diagnostic successfully.** The commands below are retained for reference; repeating it is not necessary for this configuration update. No normal Knoxite Google sign-in/account-creation pilot has been performed. The mode below remains a diagnostic, not a Knoxite login or an eligibility override.

After saving the additional Cloud origin, run in your own PowerShell:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs database-start
node knoxite-backend/development/oauthLocal.cjs check
node knoxite-backend/development/oauthLocal.cjs inspect-workspace
```

Open **http://localhost:5181/** in Chrome or Edge. The page is titled **Inspect your institutional Workspace claim**, not the normal Knoxite login. Ensure that port 5181 is free; stop only an OAuth frontend you intentionally started with Ctrl+C. Do not stop/change recovery-1 on 5180. The tool refuses an occupied port and stops no unrelated process.

1. Read the diagnostic notice, then click **Prepare Google inspection**.
2. Click the Google-rendered button and choose your own OLFU institutional account. Enter institutional credentials only on Google's genuine account page; never paste a Google ID token into ChatGPT, a terminal or an online decoder.
3. If Google blocks access, stop and report only the safe error wording/status and the origin used. `origin_mismatch`/`invalid_client` generally concern client/origin configuration; an administrator/app-access denial may require OLFU IT. Do not change security gates or try a personal Gmail account as a workaround.
4. On a successful diagnostic, the local backend verifies Google's actual signature, issuer, audience and expiry with the existing `google-auth-library` verifier. It also checks verified institutional email/format, issue time, subject structure, the browser-bound nonce/proof and the presence of a well-formed signed `hd` claim.
5. The page displays only `hostedDomain`, `institutionalEmailFormatValid`, **`knoxiteAccessGranted: false`**, and a review note. Share only the observed hosted-domain value and whether Google allowed the interaction. The diagnostic does not add it to the allowlist or attest to institution-wide approval.
6. Stop the diagnostic with **Ctrl+C** when finished. Each challenge lasts five minutes and is single-use; reload/retry after expiry. There are existing rate limits, origin/content-type checks and no credential logging/storage.

The diagnostic never issues a Knoxite JWT/session, creates a user/link, writes a Google challenge to the database, saves an ID token, or authorizes access under an unapproved hosted domain. It holds the returned token only transiently in memory to verify it. It is served solely by the development launcher on loopback; production and normal application routes do not expose it. This observes a claim for review **without bypassing normal hosted-domain eligibility**.

## 5. Starting the separate Knoxite application

The application itself remains Google-disabled. To inspect its existing email/password forms safely, use two PowerShell terminals:

```powershell
# Terminal 1
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs backend
```

```powershell
# Terminal 2, after the matching backend is listening
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs frontend
```

Then open **http://localhost:5181/login** or **http://localhost:5181/signup**. Both Google buttons are disabled until configuration is approved. The frontend launcher verifies a fresh signed response from this exact backend before launching Vite with an explicit API URL. It overrides stale frontend `.env` routing and does not pass the private backend configuration to the frontend. No fallback to 5000, 5012 or Render is permitted by these commands. Stop these terminal processes with Ctrl+C before using the diagnostic on 5181.

The dedicated database currently has zero users. It is not Alice/Bob's sandbox database. Do not expect their passwords or profiles to work there, and do not copy their data into it. Existing production/local accounts remain in their original environment; later real deployment must use explicit secure linking, not copy test identities.

## 6. Environment variables and activation gates

Active private file: `%LOCALAPPDATA%\Knoxite\google-local\environment.json`. The pending file is retained as the original disabled configuration. Never paste either file's contents or commit them. No source-controlled example contains the supplied client ID or generated secrets.

| Variable | Current local state / purpose |
| --- | --- |
| `DATABASE_URL`, `JWT_SECRET` | Dedicated generated private values; never inherited from the original `.env` |
| `NODE_ENV`, `HOST`, `PORT` | `development`, `127.0.0.1`, `5019` |
| `PUBLIC_APP_URL`, `CORS_ORIGINS` | Exactly `http://localhost:5181` |
| `INSTITUTION_EMAIL_DOMAINS`, `CAMPUS_EMAIL_SUFFIX` | Exactly `student.fatima.edu.ph`, `lag` |
| `EMAIL_VERIFICATION_REQUIRED` | `true` |
| `CAMPUS_EMAIL_RULE_CONFIRMED` | `true` in this separate local configuration, based on the user's explicit format confirmation; does not establish enrollment |
| `GOOGLE_CLIENT_ID` | Supplied Web client ID, backend only; served to GIS by `/api/auth/providers` only when enabled |
| `GOOGLE_SIGN_IN_ENABLED` | **false** |
| `GOOGLE_ALLOWED_HOSTED_DOMAINS` | `student.fatima.edu.ph`; prepared from the user's observed signed claim, not IT confirmation |
| `GOOGLE_WORKSPACE_ACCESS_CONFIRMED` | **false**; one-account technical access observed, scoped access authorization/IT confirmation not provided |
| `GOOGLE_ELIGIBILITY_RULES_CONFIRMED` | **false**; current college eligibility must be documented |
| `GOOGLE_SECURITY_REVIEW_CONFIRMED` | **false**; existing approval gate preserved |
| `GOOGLE_ELIGIBILITY_POLICY_VERSION` | `olfu-santa-rosa-local-v1-pending`, not an approval claim |
| `EMAIL_PROVIDER` | `webhook`; no endpoint/token supplied |
| `EMAIL_DELIVERY_URL`, `EMAIL_DELIVERY_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM` | Empty |
| `EMAIL_SENDER_APPROVED` | `false` |

After the observed claim, Workspace access rules, current-college eligibility and security review are accepted, record the actual approved allowlist/policy version and approval gates in **this separate local file**, then set Google enabled true and restart only this separate backend/frontend. `loadConfig()` rejects incomplete activation even in development. Do not set approval flags merely to remove an error. Production activation remains a separately authorized release decision.

For normal Google signup after approval, select **Continue with Google** at `/signup`, then complete the existing program/year and Terms/Privacy form. No Knoxite password is required. Backend onboarding consumes its one-time ticket and creates the existing User/ExternalIdentity/session records. Google assertions are never stored as application sessions. For existing accounts, sign in through the original method and link Google under **Account security**, confirming the current password. An email collision intentionally blocks automatic linking. Google-only users must establish a real password fallback through authorized recovery before unlinking.

## 7. Email/password verification and recovery

Email/password registration remains intact and requires real mailbox verification for real users. A Google-verified Workspace identity can satisfy the Google path's identity assertion; it does not magically configure mail delivery for password registration/recovery.

No real mail provider was connected. In this separate environment, recovery/verification availability is false and the interface explains it. Registration can retain a pending unverified account and honestly report delivery unavailable; that account cannot log in. Avoid creating an email/password account with your intended test email before mail is configured: a later Google email collision still requires proper existing-account authentication/linking rather than an insecure auto-merge.

To enable real mail, supply either the existing authorized HTTPS webhook endpoint/token supporting both verification and password-reset templates, or an approved Resend sending key plus verified sender/domain and sender authorization. Keep secrets backend-only. Do not use an OLFU From address without sender/domain authority, and test actual inbox/spam/bounce delivery separately from an API acceptance result. The existing verification/reset tokens remain expiring, purpose-separated and single-use; recovery revokes sessions as before. See [email delivery setup](EMAIL_DELIVERY_SETUP.md). No simulated mail was represented as real delivery here.

## 8. Database/infrastructure safeguards

`oauthLocal.cjs setup` created an independent labelled container and named volume, with credentials generated once into private files. It verified both resource IDs/labels, exact mount, MySQL image and loopback binding before connecting. It confirmed the new target had **zero tables** before applying the unchanged Prisma schema. No migration was applied to an existing database, and no migration/source schema file was generated or modified.

It then read only the 13 configured programs, nine linked departments and permitted year relationships from the verified recovery-1 configuration and copied those configuration records into the new empty database. No students, passwords, provider links, swaps, skills, reviews, assessment banks or tiers were copied. BSIT, BSIHM-CA and BSIHM-HACLO remain first-year-only. Department IDs/relationships/year choices match the source. The new database does **not** invent academic validation: new mapping validation fields remain null with notes identifying a configuration copy. Validation provenance for a future real-student environment remains a separate review, and does not block ordinary academic selection for this OAuth setup.

Source academic snapshots were unchanged after copying. Setup was run again and retained the exact environment/resources without credential regeneration or schema reapplication. Partial/foreign resources fail closed for manual review, with no automatic deletion/reset/adoption. Do not run a migration or reset to recover an interrupted setup.

`database-start` verifies complete ownership before starting the dedicated container, then checks readiness; it does not initialize schemas or regenerate settings. Start Docker Desktop first if the daemon is stopped. Final new-database counts were 13 programs, nine departments and four year records; zero users, identities, sessions, Google challenges, skills, assessment banks or swaps. New mapping validation timestamps remain null.

## 9. Previous implementation verification (historical)

- **118 backend tests passed**, including centralized real-email structure/domain checks; independent hosted-domain rules; actual Google-library RSA signature/issuer/audience/expiry checks using locally generated synthetic keys; mocked HTTP Google login/link/onboarding/replay/role/session/verification checks; and local environment/ownership/diagnostic nonce-proof tests. All tests run without real Google accounts or production resources.
- **38 desktop/mobile browser tests passed** for login, signup, explicit linking, Google-only fallback restrictions, SDK/policy failures, missing configuration, password recovery, unavailable delivery, preserved forms, Terms/onboarding and first-year-only choices. GIS responses and API claims are mocked.
- **Two additional diagnostic browser tests passed**, desktop/mobile, using mocked GIS and a local in-memory verifier. They confirm `hd` observation without a Knoxite token or browser credential storage. They do not establish real Workspace compatibility.
- Frontend build/type check and strict standalone browser-test TypeScript checks passed. Existing bundle-size warning remains. Backend build/type checking is part of the regression build.
- The actual separately provisioned backend responded with Google disabled and 13 programs; the real local signup/login pages were checked at desktop 1280 and mobile 390 widths with all external requests blocked. Screenshots were visually inspected. Those two smoke iterations did not authenticate any account or create a user.
- Repeated setup/check passed; real OAuth application processes used for smoke checks were stopped afterward. MySQL remains running. No real diagnostic/account test was initiated.

This is **158 distinct automated cases** (118 + 38 + 2), plus the separate read-only local smoke checks. Previous assessment/WRMR totals are historical, not reused as new results. Database-concurrency/migration and full swap/assessment suites were not rerun against protected data; the in-memory doubles do not prove MySQL race behavior. Existing dedicated Google/MySQL integration cases compile but were not executed in recovery-1.

Commands used:

```powershell
npm --prefix knoxite-backend test
npm run typecheck
npm run build
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:browser -- tests/browser/google-auth.spec.ts tests/browser/account-recovery.spec.ts
npm run test:browser -- tests/browser/oauth-inspection.spec.ts
node knoxite-backend/development/oauthLocal.cjs check
```

## 10. Exact changed files and remaining release requirements

Paths relative to `C:\KNOXITE\SkillSwap`, compared with this task's private baseline:

| Existing file | Change |
| --- | --- |
| `knoxite-backend/lib/config.ts` | Central confirmed real-domain format validation; synthetic policy retained |
| `knoxite-backend/routes/auth.ts` | Clear format/exception-review rejection message |
| `knoxite-backend/.env.example` | Document format/digits and retain disabled approval defaults |
| `src/app/components/GoogleSignIn.tsx` | Signup button variant, disabled-state explanation, Workspace-blocking guidance |
| `src/app/pages/SignupPage.tsx` | Reuse signup variant, preserve original form, improve desktop width/labels |
| `src/app/pages/LoginPage.tsx` | Explicit email-method heading; existing login/recovery intact |
| `knoxite-backend/tests/rules.test.ts` | Update synthetic institutional-format example to four digits |
| `tests/browser/google-auth.spec.ts` | Signup/login/disabled/eligibility/academic/form-preservation regressions |
| `docs/GOOGLE_OAUTH_FEASIBILITY.md` | Link current local status; retain earlier history |

New files:

- `knoxite-backend/development/oauthLocal.cjs` — guarded separate setup/launch/check and non-authenticating inspection.
- `knoxite-backend/tests/institution-email.test.ts` — confirmed structural/domain rules and independent `hd` tests.
- `knoxite-backend/tests/google-memory.test.ts` — mocked real-route auth/link/session/onboarding regressions.
- `knoxite-backend/tests/oauth-local.test.ts` — local target/ownership and diagnostic safety regressions.
- `tests/browser/oauth-inspection.spec.ts` — offline diagnostic UI cases.
- `docs/GOOGLE_OAUTH_LOCAL_ACTIVATION.md` — this report and manual steps.

Private files under `%LOCALAPPDATA%\Knoxite\google-local` are outside source control. The supplied client ID is placed in the private environment; generated database/JWT credentials are never printed or included in Git changes. Existing committed/uncommitted work, thesis, protected sandbox configuration/content, skill catalog, academic source files, assessment rules and WRMR remain intact. No commit, push, merge or deployment occurred.

Final checks found exactly nine intended existing-file edits and six new files, no deleted baseline files and no unexpected changes. Protected schema/Google-route/Google-verifier/synthetic-guard/academic/assessment/WRMR/dependency source hashes and the thesis SHA-256 remained unchanged. Actual generated credentials and the supplied client ID were absent from Git changes. Backend explicit type checking and whitespace checks passed. Recovery-1 still reported Google false, 14 assessment banks/versions and 90 skills; its complete academic source snapshot was unchanged. `sandbox:check` passed signed identity and all four seeded account credential/verification/role/suspension checks.

The user-participated diagnostic is now reported complete, and the observed local domain is prepared. Still required before enabling normal Google login: documented scope/authorization for third-party access and hosted-domain trust, current college/enrollment eligibility policy/evidence, exception review if necessary, security sign-off and explicit local activation authorization. Matching email structure alone is not proof of current college enrollment. Production additionally needs authorized origins/HTTPS, mail/sender configuration, privacy/consent/retention arrangements, secret rotation, and confirmed database hosting/backups/migration/rollback/release authorization. No production activation is authorized by this local setup. Current focused results and exact pilot steps are in [Google OAuth pilot readiness](GOOGLE_OAUTH_PILOT_READINESS.md).
