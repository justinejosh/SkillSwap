# Pre-email staging readiness

2026-11-16 · `C:\KNOXITE\SkillSwap` · `dev-justine`

**Follow-up:** [CI compatibility fix](CI_COMPATIBILITY_FIX.md) resolves the migration/consent integration-fixture mismatch locally, with fresh disposable results. Hosted CI, private content-QA inputs and the manual staging gates remain unverified. The original inspection below is retained as a dated snapshot, not a claim that its old CI implementation still applies.

**Decision: NOT READY — CONFIRMED BLOCKER.** The application has established local evidence, but the checked-in CI fixture path is incompatible with the new consent/release schema. Resolve that targeted handoff before pushing for staging. Hosting isolation, cohort access and administrator provisioning also remain unverified/unconfigured. A domain is **not** required to prepare staging; no staging deployment or production readiness is claimed.

Only this report changed in this task. No hosting configuration, application code, notice text, private settings, database or workflow was modified. No commit, push, migration, account creation, email or deployment occurred.

## 1. Git and deployment safety

- Active branch: `dev-justine`; local origin: `https://github.com/justinejosh/SkillSwap.git`. Existing tracked/untracked work retained. Local `main` remains `7065ebf60b3c966c72bcca24c24b15f447b6490d`; no remote refs were changed or refreshed.
- No root `vercel.json`, `.vercel/project.json` or Render blueprint was found. `docs/deployment/vercel.example.json` is an inactive worksheet, **not** proof of the deployed SPA routing/headers. The Vercel repository connection, Production Branch, Preview variables, deployment protection and Render linked branch/environment groups must be checked by their owners. The reported production frontend remains `https://skill-swap-neon-beta.vercel.app/`; it was not probed or changed.
- `.github/workflows/ci.yml` runs on **every push and pull request**. It contains validation jobs, no explicit deployment action/hook. Provider Git integrations can deploy independently of this workflow. Render deploys its linked branch according to service settings; local YAML cannot verify those settings. [Render deploy controls](https://render.com/docs/deploys).
- **Confirmed CI mismatch:** backend job still runs `npm run db:bootstrap` and legacy `test:integration`. That bootstrap resolves old migration history and does not establish the new consent storage. `tests/integration/api.test.ts` and `student-flow.test.ts` still submit registrations without the newly mandatory acceptance/version fields; their configured consent defaults are disabled. These requests cannot satisfy their old 201 expectations. Older sandbox lifecycle fixtures also expect premature confirmation behavior. The prior independent seven-test MySQL suite replaces evidence for changed flows, but does **not** repair the old CI callers. Do not bypass required checks or interpret a green Preview build as a passing integration suite. A focused CI/fixture adaptation to disposable release-schema databases is required; it was not undertaken as another implementation pass.
- Frontend `npm run build` is Vite; backend build checks/generates the shared Prisma Client if necessary, then compiles TypeScript. Neither normal build/start script migrates a database. `src/config.ts` rejects missing/invalid/non-HTTPS API configuration **when the production bundle executes**, not necessarily at Vite compilation. It accepts any otherwise valid HTTPS origin: it cannot identify a production API accidentally inherited as Preview configuration.

**Never commit:** `.env*` credentials, private pilot/settings/account files, database dumps/backups, tokens, provisioning passwords, provider keys, `node_modules`, build outputs and browser traces. Current ignore rules cover environments/dependencies/dist/test outputs, but do **not** cover `.vercel/project.json`, copied `pilot-account.json` or `pilot-review.private.json`. Keep these outside the repository and explicitly check the staging area. A scoped working-tree scan of 367 nonignored files found no private-filename or private-key/Resend-key/JWT pattern candidates; this is a heuristic, not a complete secret/data certification. Fifteen draft JSON banks and review packages are untracked: they contain grading content. **Do not blindly `git add -A` or publish operational answer keys/review attribution in the public repository.** Arrange an approved private content package/store separately; frontend bundles must never import it.

Deployment-triggering operations include a push/PR update that reaches provider Git integrations, `git push origin main`, merging to the production branch, `vercel`/`vercel --prod`/promotion, deploy-hook requests, Render manual deploys, and environment changes saved with rebuild/deploy. Do not run these during preparation. [Vercel Git deployments](https://vercel.com/docs/git).

## 2. Isolation and configuration contract

Production stays on `main` and its existing services. Staging needs a **new backend + empty MySQL**, independent credentials and backups, and a Preview from `dev-justine`. Never clone live users/history or reuse production database users, JWT keys, environment groups, OAuth approvals or mail credentials. Production sessions must fail against the staging signing key. Network/database grants must prevent the staging app user reaching production schemas; CORS alone is not an authorization or database-isolation boundary.

Use these placeholders until actual provider-issued HTTPS URLs exist:

| Location | Required configuration |
|---|---|
| Vercel **Preview, branch `dev-justine` only** | `VITE_API_BASE_URL=https://<ACTUAL-STAGING-API-HOST>/api`; no other secret-bearing VITE variables. Omit synthetic flags. This is baked into the bundle and needs a new Preview build after changes. |
| Separate staging backend | `NODE_ENV=production`, `HOST=0.0.0.0`, provider `PORT`; `DATABASE_URL=<PRIVATE-STAGING-APP-USER-URL-WITH-PROVIDER-TLS>`; `JWT_SECRET=<NEW-STAGING-ONLY-RANDOM-KEY>` (at least 32 unpredictable characters). Separate temporary DDL credentials. |
| Origin/session | `PUBLIC_APP_URL=https://<EXACT-APPROVED-PREVIEW-HOST>`; `CORS_ORIGINS` contains only exact authorized staging origins; `SESSION_TIMEOUTS_ENABLED=true`. Never include the production frontend/API or wildcard Preview domains. |
| Institutional identity | `INSTITUTION_EMAIL_DOMAINS=student.fatima.edu.ph`, `CAMPUS_EMAIL_SUFFIX=lag`, `EMAIL_VERIFICATION_REQUIRED=true`; campus confirmation only under the existing recorded policy. |
| Consent | `REGISTRATION_CONSENT_ENABLED=true`, `REGISTRATION_NOTICE_VERSION=<ACTUAL-ARCHIVED-TERMS-AND-PRIVACY-PAIR-ID>`, `REGISTRATION_NOTICE_APPROVED=true` **only after recording the real review/archive match**. The current worksheet's false/blank values intentionally cannot start production-shaped configuration. |
| Google, initially disabled | `GOOGLE_SIGN_IN_ENABLED=false`; later separate staging `GOOGLE_CLIENT_ID`, exact `GOOGLE_ALLOWED_HOSTED_DOMAINS=student.fatima.edu.ph`, real `GOOGLE_ELIGIBILITY_POLICY_VERSION` and genuinely supported Workspace/eligibility/security confirmation flags. Do not copy local activation receipts or set flags to satisfy a check. |
| Email, no sending | `EMAIL_PROVIDER=resend`, blank `RESEND_API_KEY`, `EMAIL_SENDER_APPROVED=false`, `EMAIL_FROM=notifications@sender.example.invalid`; omit webhook credentials to prevent accidental fallback. Proposed `no-reply@knoxite.app` remains inactive, unowned and unverified. |

Do **not** copy `KNOXITE_LOCAL_*`, Google local-pilot variables, local sessions/admin credentials or synthetic email-capture settings. The current dedicated 5181 pilot stays unchanged. Outside that pilot, existing Google registration can create eligible STUDENT (`USER`) accounts without manually preloading emails; it does not itself enforce a recruited cohort.

## 3. Release schema and initial configuration

Reuse `docs/KNOXITE_FOUR_BLOCKERS_RESOLUTION.md`: pinned Prisma **6.19.3**, separate `prisma/release/schema.prisma` / release migration directory, nullable activity datetime, consent unique `(userId, noticeVersion)` plus FK, existing swap/review/assessment constraints. Previous **seven disposable MySQL tests** established fresh/repeat deploy, exact schema diff, constraints, startup/refusal and known-schema additive preservation. Those results are previous evidence, not rerun here.

For a **later explicitly authorized new empty staging database only**, from the backend directory, inject the verified staging migration URL privately, then:

```powershell
npm ci --include=dev
npm run build
# Set KNOXITE_RELEASE_PREFLIGHT_APPROVED=true only for the independently verified empty target.
node dist/scripts/release-preflight.js
node node_modules/prisma/build/index.js migrate deploy --schema prisma/release/schema.prisma
node node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/release/schema.prisma --exit-code
```

Require EMPTY at first preflight and diff exit 0 afterward. Never use the historical default migration directory, `db:bootstrap`, `db push`, reset or blind resolve for staging. Never use a protected local/production URL. Keep migration execution operator-controlled, outside automatic build/start hooks. Startup checks required storage without changing it.

After an approved **staging-only** ADMIN bootstrap exists, existing authenticated ADMIN endpoints can initialize academic options (`POST /api/admin/academic-options/initialize`, empty body) and the catalog (`POST /api/admin/skill-catalog/initialize`, empty body). Services are `seedAcademicCatalog` and `ensureSkillCatalog`: 13 college programs, eight categories/80 canonical skills, safe repeat behavior; BSIT/BSIHM-CA/BSIHM-HACLO remain YEAR_1 only. Catalog UUIDs are target-specific; resolve stable keys locally. New academic mapping validation is **not inherited from local databases**: enter genuine mapping/evidence through existing administration, without copying identities. Missing validation correctly leaves academic ranking evidence unavailable.

The current guarded password-admin provisioner is tied to local OAuth ownership/loopback settings. **It is not a staging bootstrap.** A separately approved target-verified one-shot operator procedure is still required; do not promote a student, remove guards, insert plaintext passwords or invent a public ADMIN signup. Without it, admin smoke tests/initialization cannot be completed. Assessments start unavailable until separately approved content import/publication; do not copy the local 30 banks automatically.

## 4. Authentication, consent and controlled cohort

Existing implementation retains backend signed Google token verification, issuer/audience/expiry/verified email/hosted-domain checks, nonce/browser proof, explicit account linking, STUDENT-only onboarding, institutional email pattern and academic year restrictions. Sessions retain USER 30-minute idle/eight-hour absolute and ADMIN 15-minute/four-hour with five-minute warnings; polling does not renew activity. Missing readiness/policy fails closed. No authentication setting was changed here.

The research team's **external enrollment review** is the chosen operational approach for recruited participants; no enrollment registry/dashboard/schema is needed or added. Institutional mailbox ownership does not independently establish current enrollment. Before real participants use staging, approve who may reach the **backend**, reviewer/evidence handling, and how recruitment is enforced. Vercel Preview protection limits frontend access but does not secure a public Render API from direct Google onboarding. CORS is insufficient. An approved backend/gateway cohort restriction or an explicitly approved closed operational risk arrangement is still needed before enabling real Google registration. Do not repurpose the local-only allowlist by weakening its guards, or silently enable public participation.

Consent records use server version/time atomically with account creation, reject false/missing acceptance and stale versions, and do not backfill historical consent. Team review of notice wording is acknowledged. However, source does not establish the exact **finalized archived pair/version, responsible contact or retention decision**. Password signup has an embedded Terms/Privacy modal; Google onboarding links `/privacy`, whose separate page still refers to study-supplied notice/contact/retention arrangements. Verify both lead participants to the actual same approved pair before enabling the notice version. Do not rewrite approved language or label placeholders approved. The configuration ID can reference an external immutable archive; the app does not automatically archive its contents.

For later production JWT replacement: the authorized production operator must generate a distinct strong key in the provider secret store, coordinate redeployment and reauthentication/revocation, and verify old tokens fail. Never copy the staging/local key or expose it here. No production key was inspected, replaced or certified rotated.

## 5. Resend precheck

`services/email.ts` selects `resendEmail.ts` when `EMAIL_PROVIDER=resend`; verification and recovery reuse the existing adapter. Links use configurable `PUBLIC_APP_URL`, validated exact origin/path, a fragment token (not URL query), and no redirects. Verification expires after **30 minutes**; reset after **15**. Existing hashed one-use tokens and atomic redemption/revocation remain unchanged. Provider failures expose safe errors, invalidate failed-send tokens, leave password accounts unverified and do not assert inbox delivery; recovery responses avoid account enumeration. Backend logging does not include request bodies/tokens/provider responses. Frontend API config contains no mail/database/JWT secret.

Later required variables: `EMAIL_PROVIDER=resend`, backend-only scoped `RESEND_API_KEY`, authorized `EMAIL_FROM`, `EMAIL_SENDER_APPROVED=true`, correct staging `PUBLIC_APP_URL`. The webhook alternative uses `EMAIL_DELIVERY_URL`/`EMAIL_DELIVERY_TOKEN`; leave these unset when using Resend. Both availability checks and real delivery must be tested separately: a true configured check is not DNS/domain/inbox verification.

After ownership is established and separately authorized: add the owned sending domain/subdomain in Resend; install **provider-issued** SPF/DKIM/Return-Path records and agreed DMARC through its DNS owner; wait for verification; choose authorized sender; disable credential-link click/open tracking; privately install a sending-scoped key; conduct one operator-authorized verification/reset inbox test, including expiry/reuse/bounce handling. Do not modify institutional DNS or use an unowned sender. Provider frontend/API HTTPS URLs can be used before a custom app domain, but real sending needs an owned verified sending domain. [Resend domain requirements](https://resend.com/docs/dashboard/domains/introduction).

Until then: no real registration emails or real mailbox bypass. Password signup may create an unverified record and explicitly report unavailable delivery; it does **not** make the account usable. Keep recruitment closed. Mocked verification/reset testing stays in independently disposable local fixtures, not a public test-token endpoint or real student database.

## 6. Manual deployment safety sequence — instructions only

1. **Before any push:** fix/rehearse the CI fixture mismatch without dropping security tests. Review changed/untracked files and private assessment content; record clean test results. Obtain separate commit/push and infrastructure authorization. Later commands: `git status --short`, `git diff --check`, `git diff --stat`, `git diff -- <reviewed-paths>`, `git add -- <explicit-reviewed-paths>`, `git diff --cached`, then `git commit -m "<reviewed scope>"`. Never blanket-stage private content or promote/merge main.
2. Owners verify Vercel **Settings → Git** repository is `justinejosh/SkillSwap`, production branch remains `main`; inspect branch/domain assignments, hooks and build settings. Verify production Render's linked branch remains `main`, its auto-deploy/check behavior and environment-group attachments. GitHub **Actions/workflows**, repository **Webhooks**, installed deployment integrations and required status checks also need owner inspection. No local report proves remote automation safe.
3. With authorization, provision separate staging MySQL/backend first. Record identity, grants/TLS and backup/restore proof; migrate only its empty schema using section 3. Render staging service: correct repository, branch `dev-justine`, root `knoxite-backend`, build `npm ci --include=dev && npm run build`, start `npm start`, approved supported Node 22 runtime. Keep staging auto-deploy disabled/manual until checks are reliable. No shared production environment group, hook, database credential or JWT key. These are **new staging-service settings**, not edits to production.
4. Vercel **Settings → Environment Variables**: add `VITE_API_BASE_URL` for **Preview + `dev-justine`** only, exact staging HTTPS API. Inspect team/shared/branch Preview values for inherited production URLs/secrets; do not change the Production value. Branch-specific Preview values override generic Preview values. Keep the existing production build/routing configuration unchanged; verify root/Vite build `npm run build`/`dist` and SPA deep-link routing. An example file is not deployed routing. If preview-only routing changes cannot be scoped safely, stop for an approved separate staging frontend project. [Vercel environment scopes](https://vercel.com/docs/environment-variables).
5. Configure Preview access under **Settings → Deployment Protection**, verify it using a signed-out browser and authorize only intended testers. Choose an already available appropriate mechanism; do not activate paid add-ons. Confirm production access remains unchanged. This still does not protect the independent API. [Protection options](https://vercel.com/docs/deployment-protection).
6. **Only after all preceding gates and explicit push authorization:** `git push --set-upstream origin dev-justine`. Expect GitHub CI and possibly Vercel automatic Preview creation. Never run `git push origin main`, merge, `vercel --prod`, promotion or a production deploy hook. Obtain the actual Preview URL from Vercel's deployment record/GitHub check; inspect its commit SHA and Preview target. No URL is invented here.
7. Before login, inspect the effective Preview bundle and browser Network requests: API requests must target **only** the independently verified staging service, never `skillswap-50cf.onrender.com`, localhost or another production endpoint. Inspect backend private DB host/schema/user and grants without disclosing secrets. Reject any mismatch before exercising writes. A successful `/api/health` alone does not establish DB identity. Existing production-origin CORS safety cannot be verified here and must not be relied on to catch mistakes.
8. Add that **exact** Preview origin (scheme + hostname, no path) in a separately reviewed staging Google Web client; set backend audience to that client, exact `PUBLIC_APP_URL`/CORS, and approved policy flags only after actual review. GIS uses a JavaScript credential callback, **no new redirect endpoint/secret**. Use a stable approved Preview URL; when it changes, update the exact Google/CORS/link origin deliberately. Keep Google off until cohort/security gates pass. Leave the 5181 local client/origins and production client unchanged. [Google origin/callback configuration](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
9. Run the smoke checklist below on synthetic or specifically authorized staging accounts. Stop on any identity, authorization, schema, data-source or lifecycle failure; no fallback to production, policy disabling or invented data. Do not proceed to real email activation until separately authorized.

## 7. Short smoke checklist

| Check | Expected evidence before advancing |
|---|---|
| Frontend + deep links | Recorded Preview SHA/API URL, refresh and direct routes work, no production/local API calls. |
| Backend + DB | Verified new provider/schema/user/grants; release diff/readiness pass, backup restored to a separate disposable target. |
| Google | Correct staging audience/origin/hosted domain, unauthorized identity denied; normal academics/consent and USER role; test participant performs real Google interaction themselves only when authorized. |
| Password + consent | Missing/false/stale consent rejected; accepted server version/time; unavailable delivery honest; no mailbox bypass. |
| Roles + privacy | STUDENT denied admin APIs/keys; approved separate ADMIN password login; unrelated students denied private records. |
| Timeouts | USER 30m/8h, ADMIN 15m/4h, five-minute warning, polling no renewal, logout/expiry across tabs. |
| Skills + matches | 80 canonical skills, reciprocal only, cold-start discoverable; no assessment effect on scoring. |
| Requests + agreement | Independent bilateral same-version approvals; closed history read-only. |
| Scheduling | Future valid schedule after approval; unscheduled/in-progress acknowledgement rejected, exact elapsed end allowed. |
| Reviews + completion | Independent confirmations then individual reviews; one review insufficient, duplicate submission no extra rating. |
| Assessments | Unavailable until separately approved banks; no student answer keys; prerequisites/server grading/history preserved. |
| Admin analytics | Correct staging-only counts and definitions; no fabricated rankings/metrics. |
| Errors/navigation | Failure states, expired sessions, refresh/Back and supported mobile/desktop routes usable. |
| Backup/restore | Document actual independent restore result, retention/access and rollback owner; no protected target. |
| Mock email | Disposable fixtures cover verification/reset links, provider failure, one-use/expiry/revocation; no real recipient/provider call. |

## 8. Verification and next action

Fresh this task: backend TypeScript build passed; existing Client matched without regeneration. **11 focused tests passed, zero failures/skips** (`resend-email`, `email-delivery`, `production-preparation`); network delivery mocked. No DB tests or browser suites were rerun. Previous 99-test/build evidence is retained in the four-blocker report, not claimed as newly executed. No frontend code changed, so no redundant frontend build was run.

Remaining gates: **CI fixture compatibility**, provider/dashboard isolation verification, approved staging administrator bootstrap, backend/cohort access decision, exact archived notice version/contact/retention confirmation, genuine staging Google authorization, and independently verified new DB/restore. Domain/sender ownership blocks **real email**, not these offline preparations. Existing worksheets were reviewed and left intentionally inactive.

**Recommended next action:** authorize a small CI/release-fixture handoff plus a target-verified staging ADMIN provisioning plan; have the hosting owners record the manual isolation settings. Do not push/deploy or enable Google/public email registration yet. Final decision: **NOT READY — CONFIRMED BLOCKER** (CI compatibility); no application rebuild or renewed production audit is required.
