# Knoxite production readiness

2026-11-16 · `C:\KNOXITE\SkillSwap` · `dev-justine`

**Recommendation: NOT READY — CONFIRMED BLOCKERS.** Domain acquisition is not the only blocker. Offline preparation proceeded without it; nothing was deployed or activated.

## 1. Domain and authorization boundaries

The project owner reports GitHub Education approval on November 16, 2026, with partner benefits still pending. No production domain is owned; **knoxite.app is not an assumed asset**. No benefit eligibility, free-domain availability, registration or renewal terms were independently verified. No purchase, paid service, DNS change or real student email was attempted.

All URLs such as `https://app.example.invalid`, `https://api.example.invalid` and `notifications@sender.example.invalid` below are **nonworking placeholders**, not registered resources. The app/sender domain is separate from the institutional identity domain `student.fatima.edu.ph`; acquiring an app domain must not change the student-email eligibility rule.

Local OAuth at 5181/5019/3319, recovery-1 and the original database remain separate. Their private approvals, credentials and settings were not changed. Production Google remains disabled in the prepared configuration. Previous local activation is neither production authorization nor campus-wide IT approval.

## 2. Readiness matrix

READY means locally verified implementation, **not successful production operation**.

| Area | Status and evidence | Blocker / required action |
| --- | --- | --- |
| Google identity | READY locally: SDK ID-token verification, issuer/audience/expiry, verified email, hosted domain, nonce/proof and one-use challenge; mocked route tests passed | CONFIGURATION/APPROVAL REQUIRED: real production client/origin, Google audience/access review, approved policy and human security review; no live production test |
| Automatic institutional registration | READY code path: no `localOAuthPilot` means no manual production email preload; two production-shaped mocked identities onboarded as USER despite forged ADMIN requests | Keep the local pilot allowlist intact. Public participation still needs the enrollment decision below |
| Current-student eligibility | APPROVAL REQUIRED | Institutional mailbox control/email format does not establish current-semester enrollment. No semester registry/reassessment/graduation workflow exists; do not silently adopt email-only eligibility |
| Email/password authentication | READY local verification/reset/login/revocation tests | FIX/APPROVAL REQUIRED for server-side signup consent and durable consent evidence; sender setup still absent |
| Verification/recovery delivery | CONFIGURATION REQUIRED; Resend adapter and mock-delivery workflows passed | Owned sending domain, authorized sender, private key, DNS authentication and authorized inbox test; real delivery NOT TESTED |
| Session security | READY in dedicated local pilot: student 30-minute idle/8-hour absolute, admin 15-minute/4-hour; warnings, revocation and background polling checks passed | **FIX REQUIRED for production rollout**: config rejects timeout activation outside the pilot; SQL-only session column is not in normal migration history. Do not launch by turning the policy off |
| Swap lifecycle | Bilateral agreements, role isolation, duplicate protections, two reviews and read-only history verified in rollback-only MySQL | **FIX/APPROVAL REQUIRED**: live confirmation still accepts unscheduled/future sessions; prepared guard is not wired |
| Assessments | READY engine/admin protections; fresh guarded read-only inventory found 30 PUBLISHED versions with 30 project-owner chat attestations | APPROVAL REQUIRED for actual production content use. Local pilot attestation is not independent faculty validation. Do not copy/publish automatically |
| Academic configuration | Fresh read-only inventory: 13 programs, 13 recorded mapping validations; three restricted programs each have YEAR_1 only | Supporting institutional evidence remains a human responsibility. Fresh-only seeding defect corrected in source; no initializer executed |
| Administrator controls | READY local role separation and safe DTO tests | Production admin bootstrap/operator procedure still needs review. Local password-admin provisioning is deliberately tied to the local database and must not be repurposed by removing guards |
| Database | **FIX REQUIRED**: migration chain cannot build the complete current schema from empty | Reconcile/baseline on an approved disposable staging database; identify actual production provider/schema/owner before any production command |
| Hosting | CONFIGURATION REQUIRED | Vercel/Render are team-reported architecture, not a live readiness check. Root/build/start settings and templates below are prepared only |
| Privacy | FIX/APPROVAL REQUIRED | Accountable contact, final notices, retention, deletion/retained exchange history, researcher access, consent version/date and provider arrangements require review |
| Backups | CONFIGURATION REQUIRED / NOT TESTED in production | Encrypted backups, retention/access, recovery objectives and a successful isolated restore must precede migration |
| Monitoring | CONFIGURATION REQUIRED / NOT TESTED | Error/latency, auth abuse, mail bounces and database availability ownership/alerts; redact tokens, query/body credentials and reset links |
| Deployment rollback | APPROVAL REQUIRED / NOT TESTED in production | Reviewed code artifact rollback plus separately rehearsed schema/backup recovery; MySQL DDL is not transactionally reversible |

## 3. Implemented safe changes

- `knoxite-backend/lib/config.ts`: production now requires explicit HTTPS CORS origins including the configured frontend origin, rejects paths/credentials/loopback origins and synthetic mode, and rejects non-origin production frontend URLs. Development defaults and the private pilot guards remain unchanged.
- `src/config.ts`: production refuses HTTP/loopback/credential-bearing API URLs or query/fragment contamination. Development and recovery-1 routing remain unchanged. The frontend check runs when the compiled module loads; it does not by itself validate a provider deployment.
- `knoxite-backend/services/academics.ts`: **new** BSIT, BSIHM-CA and BSIHM-HACLO records receive YEAR_1 only. Other new programs retain the existing general year list. Every existing program still uses `update: {}`: no stored years, labels, mappings or evidence are repaired/overwritten.
- `knoxite-backend/lib/scheduling.ts`: prepared `assertScheduledSessionEnded`, tested with no schedule, invalid duration, future/in-progress times and the exact end boundary. **No live route calls it.** Existing confirmation behavior and historical records are unchanged pending the decision in section 4.

No new dependency, authentication replacement, schema change, enrollment system or UI redesign was introduced.

### Exact additional task files

Tests: `knoxite-backend/tests/production-preparation.test.ts`, `knoxite-backend/tests/google-memory.test.ts`, `knoxite-backend/tests/rules.test.ts`, `tests/sandbox/production-auth.spec.ts`, `tests/sandbox/student-lifecycle.spec.ts`, `tests/browser/google-auth.spec.ts`.

Configuration worksheets: `docs/deployment/backend.env.example`, `docs/deployment/frontend.env.example`, `docs/deployment/vercel.example.json`. These are not live `.env`, `vercel.json` or Render configuration files. This report is `docs/KNOXITE_PRODUCTION_READINESS.md`.

## 4. Decisions and technical blockers

### A. Confirmation timing — approval before activation

`POST /api/swaps/:id/log-session` currently verifies participant, status/integrity and sequential counts but never queries a schedule or compares time. Tracking uses the same incomplete availability conditions. The prior read-only/rollback reproduction remains applicable; the current smoke test exercises that existing behavior, not the intended end-time requirement.

Proposed patch: inside the existing exchange lock, require both recorded approvals and the matching `(swapId, sessionNumber)` schedule, then call the prepared guard with `swap.duration` (currently **hours per session**, integer 1–8). Accept new confirmations only when server time is at or beyond scheduled start plus agreed duration. Keep current participant isolation, sequential limits and idempotent duplicate handling. Return authoritative eligibility/end-time information to Tracking so Calendar and Tracking agree. No new attendance method or grace period is proposed; elapsed time does not prove attendance.

**Approve the gate and treatment of existing unscheduled/early confirmations first.** Do not retroactively erase confirmations, reviews, metrics or tiers. Remaining unconfirmed legacy sessions may need scheduling/review; that operational impact must be decided rather than silently bypassed. No new policy was activated here.

### B. Production session rollout

`SESSION_TIMEOUTS_ENABLED=true` is rejected outside the dedicated local pilot. False retains the old seven-day behavior, which does **not** meet the approved production target. The worksheet intentionally requests true and therefore remains fail-closed until rollout work is reviewed; setting false is not a release workaround.

The local migration tool adds `AuthSession.lastInteractiveAt` by guarded SQL and validates a signed, instance-specific receipt. That column is absent from the shared Prisma schema/history to preserve recovery-1 compatibility. Prepare an approved production additive migration, column/backfill checks, startup validation and production policy configuration. Rehearse without touching either local database. Existing older tokens lack the policy/role claims and will require reauthentication under the current enforcement implementation; retain rows/history and obtain an explicit rollout decision. Never copy the local receipt or remove its ownership checks.

### C. Enrollment and consent

Choose and record one production participation policy: researcher-confirmed current enrollment/semester review, an approved cohort, or an explicitly accepted institutional-email-only residual-risk policy. Authentication and academic selections are already implemented; none proves current enrollment. If current enrollment is required, design pending/approved/rejected/reassessment decisions, responsible reviewer, minimal evidence, semester expiry and graduation handling before adding tables or restrictions. Production must not require manually preloading every email.

Google onboarding rejects `termsAccepted !== true`. Password signup checks the checkbox in React but its backend register DTO does not accept/enforce a consent flag. Neither path stores an immutable consent version/date. This is confirmed source behavior, not a claim of legal sufficiency. A consistent server requirement and consent evidence model need approved notice versions/retention and a reviewed additive migration before public registration. No acceptance record or approval was fabricated.

### D. Migration chain and production administrator

Installed Prisma is 6.x (`package.json` requests 6.19.3); use the lockfile/installed CLI, not an unreviewed latest major. Local `migrate deploy --help` was checked without connecting to a database. Current web documentation may describe a newer command system; it is not a reason to upgrade this project.

The March initial migration lacks the later `Swap` model and `User.role`; its Review links through `swapRequestId`. The November upgrade assumes intermediate structures, including `Swap`, that the checked-in earlier chain does not create. Existing local bootstrap uses audited baseline SQL, direct upgrade scripts, backfill and migration resolution rather than replaying a complete chronological chain. The SQL-only session column is a separate gap. Therefore **do not run the current migration directory blindly against an empty production database**, and do not mark migrations applied merely to suppress errors.

After a database owner/provider and actual state are confirmed, review either a fresh baseline or a reconciliation path against an exact restored staging clone. Derive candidate SQL offline from the pinned Prisma schema, explicitly account for the session field, compare constraints/indexes/relations and preserve existing records. Approve the resulting migration artifact/history before deployment. No SQL/history file was changed or executed here. Existing local migration utilities reject remote targets; keep those guards.

Production needs its own reviewed, one-shot administrator provisioning procedure with verified target identity, secure terminal/secret-store password, bcrypt hashing, role assignment and audit evidence. Do not reuse local test credentials, promote Google users, expose a public ADMIN registration route or remove local-bootstrap restrictions.

## 5. Production configuration and domain-dependent steps

### Offline work already possible

Review the worksheets; rehearse authentication with mocks and captured mail; review schema/backup/rollback plans; complete content/privacy/enrollment approvals; test code and build with reserved HTTPS placeholders. No domain purchase or sender verification is required for these activities.

### Steps that genuinely require the final domain

1. Obtain an eligible domain only through a user-approved process; verify ownership/control and renewal terms. Pending GitHub partner activation is not treated as an available benefit.
2. Select final frontend/API HTTPS origins. Configure hosting DNS/certificates, frontend `VITE_API_BASE_URL`, backend `PUBLIC_APP_URL` and exact `CORS_ORIGINS`. Never use `.invalid` or localhost in a release. Verify deep links and HTTPS redirects on the actual provider.
3. In Google Cloud, register the **frontend origin** (scheme/hostname/port only), real branding/homepage/privacy/terms URLs and domain ownership. Current GIS uses a JavaScript credential callback plus backend ID-token POST, **not an authorization-code redirect flow**: no app callback redirect URI or client secret is needed. Do not add guessed `/callback` endpoints. Keep the local client/origins separate or use a separate production web client. [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).
4. Determine the appropriate Auth Platform audience with the project/Workspace owner. Do not assume an independently owned project qualifies for OLFU-internal audience. External Testing/test-user restrictions are distinct from Knoxite's local allowlist. Review production publishing, branding verification and Workspace third-party access restrictions without claiming approval. Only basic identity scopes are required. `hd=student.fatima.edu.ph` was observed on one verified test identity; IT/campus-wide access remains unconfirmed.
5. Add an owned sending domain/subdomain to Resend; the provider requires domain verification before general sending. Install the **actual provider-issued** SPF/DKIM and any requested Return-Path/MX records, and agree on DMARC handling with the DNS owner. Do not invent TXT values, overwrite institutional DNS or assume an inbound mailbox is required. Review quotas/limits and current account terms externally; no paid upgrade is authorized. [Verified domains](https://resend.com/docs/dashboard/domains/introduction), [authentication guidance](https://resend.com/guides/email/deliverability/why-emails-go-to-spam).
6. Choose an authorized sender on that domain; store a scoped `RESEND_API_KEY` only in the backend secret store, set the reviewed `EMAIL_FROM`, and set `EMAIL_SENDER_APPROVED` only after its real requirements are met. Disable link/open tracking for credential links and preserve their fragments. The existing adapter sends both verification and recovery messages; no SMTP replacement is needed. Do not place provider keys in `VITE_` variables. [Send-email API](https://resend.com/docs/api-reference/emails/send-email).
7. Perform a separately authorized, operator-participated Google login and one controlled inbox delivery test. Check spam/bounces, link expiry/reuse, password reset and revoked sessions. An API message ID does not establish inbox delivery. No student mailing occurs in this preparation.

`INSTITUTION_EMAIL_DOMAINS`, campus `lag`, observed hosted domain and the app's owned domain serve different purposes. Do not replace institutional checks with the new app domain or treat email digits as credentials. Legitimate naming exceptions require evidence and an approved policy, not a bypass.

### Hosting and security settings

- Frontend/Vercel: repository root, `npm ci`, `npm run build`, output `dist`, approved HTTPS API URL at build time. The example JSON prepares SPA rewrites, static-asset caching, HTML revalidation, basic headers and GIS-compatible opener policy. It was not installed as live provider configuration. Validate header overlap/caching and FedCM/popup behavior in staging. [Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite).
- Backend/Render: root `knoxite-backend`, build `npm ci --include=dev` then `npm run build`, start `npm start`; provider-supplied PORT and external bind host. Builds generate/check Prisma Client, **not database migrations**. Local checks used Node 22.19.0; select and rehearse an explicitly pinned, patched supported Node version before production rather than accepting a changing provider default. [Render Express](https://render.com/docs/deploy-node-express-app), [runtime selection](https://render.com/docs/node-version).
- `/api/health` is process health, not proof of database readiness. Configure separate protected database monitoring and alerts. Review database TLS/CA verification, least-privilege DML app credentials, separate temporary DDL migration credentials, private/restricted network access and connection limits based on provider capacity and replica count.
- Existing API headers disable sniffing/caching and redact errors. Hosting must enforce real HTTPS; config validation alone is not transport enforcement. Verify proxy topology before trusting forwarded IP headers; do not set unrestricted `trust proxy`. Current login/throttle budgets are process-local and can collapse users behind an unconfigured reverse proxy. Edge/distributed abuse protection and load testing remain required.
- Authentication uses explicit bearer tokens in browser storage, not automatically attached cookies. Preserve Origin/JSON/challenge protections; cookie-based CSRF assumptions do not replace token verification. Browser storage remains exposed to XSS: review/enforce a tested CSP compatible with the inline theme bootstrap, GIS, styles and image sources. Do not add a guessed CSP that breaks sign-in. No storage/authentication redesign was made.
- Rotate the previously exposed effective production JWT key and invalidate old tokens only through an authorized operator/release procedure. An old running hardcoded build is not repaired by preparing environment variables. No rotation or live authorization review was performed here.
- Development launchers/debug routes are separate from `index.ts`; production entry must remain `dist/index.js`, never a sandbox/OAuth diagnostic launcher. Synthetic mode is now explicitly rejected in production. Retain local tooling; exclude private settings, drafts with keys and test artifacts from provider/public assets.

## 6. Assessment and academic release safeguards

A fresh ownership-checked, SELECT-only inventory found 30 PUBLISHED assessment versions, all 30 containing `PROJECT_OWNER_CHAT_ATTESTATION`; no questions, keys or private student data were printed. The local publication report records no named independent faculty reviewer. Do not label this provenance university/faculty certification.

For production: freeze the exact content hashes/skill keys; obtain real skill/level/version-specific content decisions and permitted audience/scope; import approved content as DRAFT through the production ADMIN workflow only after separate authorization/backup; validate and publish with genuine attribution. Map canonical keys to production skill UUIDs, never reuse local UUIDs or copy accounts/attempts. Unsupported skills remain offerable with Assessment Unavailable. No tiers are included in WRMR.

Initialization order after a reviewed schema: production admin → canonical 80 skills → approved academic options/year restrictions → evidence-backed department mappings → separately approved assessment drafts/review/publication. No synthetic users, ratings or completed swaps belong in production. Fresh-only year defaults were tested against doubles; no initializer ran against either protected environment. Existing 13 local mappings and first-year-only configurations were read, not approved anew or changed.

## 7. Fresh test evidence and remaining coverage

| Check | Actual result |
| --- | --- |
| Targeted backend files: production preparation, Google memory routes, institutional format, Resend, session policy, admin readiness, rules and scheduling | **66 passed**; the six preparation tests were rerun after strengthening the CORS case and all six passed |
| Password workflow on rollback-only MySQL | Passed registration, unverified-login rejection, one-use verification, generic recovery response, reset expiry/replay, hashed credentials, old-session revocation and logout |
| Two-student rollback-only MySQL smoke | Passed unranked reciprocal discovery, active-partner exclusion, request/acceptance, versioned bilateral agreement, isolated chat, scheduling, independent confirmations, individual reviews, final completion, historical agreement, metrics and one-partner leaderboard exclusion |
| MySQL total | **2 passed** after correcting test expectations: reset request returns 202, and an already-active partner is intentionally excluded from discovery. No app change was made to bypass those rules |
| Focused browser auth/recovery/session matrix | **24 passed initially; 2 existing dialog tests timed out** because click awaited an undismissed native alert. Accepting the alert in its event handler corrected the test deadlock; **both desktop/mobile cases then passed**. All 26 selected cases have passing results |
| Compilation/build | Backend build/TypeScript passed; frontend type check and production build passed with `https://api.example.invalid/api` as an offline placeholder. No request was made to that host. Existing large-bundle warning remains; no measured performance evidence justified speculative splitting |

Mocked Google coverage includes eligible onboarding without production preload, personal Gmail/wrong campus/unauthorized hosted domain, issuer/audience/expiry, verifier-rejected credentials, one-use challenge replay, existing linked identities, explicit password-account linking, suspension, invalid program/year, Terms rejection and ADMIN escalation. Student denial at administrator APIs and both roles' idle/absolute boundaries were exercised. Actual Google cryptographic verification delegates to the SDK; injected-claim tests are not a fresh live Google login. Missing `hd` and Google-only password rejection are enforced in source, but were not isolated as separate new cases in this focused run. Concurrency/distributed abuse and live provider behavior remain NOT TESTED.

The full exchange smoke still uses the **existing permissive confirmation policy**. It does not prove that elapsed scheduling time is enforced; only the prepared pure guard has those boundary tests. Actual deployment, real email, current enrollment, production migration/restore, production admin provisioning, university-wide Google access and production monitoring remain untested.

Preservation: the synthetic fixture verified Docker/container/volume/checkpoint/database identity, kept test records in uncommitted transactions and rolled them back. Shared snapshots/private-settings checks passed. Dedicated OAuth read-only inspection also fingerprinted all 29 tables before/after: **no table changed during that inspection**. The original database and production were not accessed. No bank publication/retirement, real-account mutation, migration, reset, branch switch, commit, push, merge or deployment occurred. Prior working-tree files were retained.

## 8. Ordered release runbook — NOT EXECUTED

1. Approve timing/history treatment, production session rollout, enrollment policy, privacy/consent design, content scope, accountable operators and the release snapshot. Review all accumulated uncommitted changes before any later authorized commit.
2. Identify the production DB owner/provider and whether it is truly empty or contains legacy data. Obtain explicit provisioning/migration permission; no resources are created by this report.
3. Establish restricted MySQL/TLS accounts and encrypted backups. Restore to an approved isolated staging target, record version/row fingerprints/constraints and demonstrate recovery. Select recovery objectives with the team.
4. Reconcile the migration chain and session column on staging, review the SQL/history and approve rollback. Only **after** this blocker is resolved may the pinned project's `prisma migrate deploy --schema prisma/schema.prisma` be used for the approved target. This production-affecting command was **NOT EXECUTED**. Never use `db push`, reset, or the guarded local recovery utilities as a production shortcut.
5. Configure a restricted backend using reviewed secrets and the approved runtime/session policy. Keep public activation/Google off. Verify actual HTTPS/proxy, DB connectivity, role authorization, private-data responses, log redaction and old-key rejection. **No hosted build/redeploy was triggered here.**
6. Configure frontend domain/API URL, SPA routing and headers using the example only after ownership/DNS review. Freeze/review CSP and cache behavior. No localhost fallback or sandbox variables in the artifact.
7. Complete domain-dependent Google and Resend setup above. Set each approval flag only against its recorded evidence; do not turn all flags on to clear startup errors.
8. Perform a separately authorized restricted staging smoke with synthetic users, then operator-participated Google/email tests. Check all four proximity cases/50-30-20 math, cold-start access and two-partner leaderboard rules without fabricating participant research results.
9. Obtain explicit production migration/deployment/public-registration activation authorization. The current worksheet cannot be treated as that authorization.
10. Release a controlled cohort under the approved enrollment/content/privacy arrangements; monitor auth failures, mail outcomes, API errors/latency, DB capacity and operator workload. Do not equate tests with measured student effectiveness.
11. For rollback, restrict new registrations/writes, preserve logs and evidence, and revert to a verified schema-compatible application artifact. If schema recovery is needed, restore the rehearsed encrypted backup to a separately verified target and reconcile post-backup writes under approved incident procedures. Never blindly downgrade DDL or overwrite a database. Revoke sessions/rotate affected keys as authorized; verify recovery before reopening.

Safe offline commands already exercised: frontend typecheck/build, backend build, targeted mocked tests and ownership-guarded rollback-only tests. No production URL, secret, DNS operation, provider configuration, actual migration or deployment command was used.

**Next approvals/work:** activate the reviewed schedule/end-time safeguard with an explicit historical policy; approve the production session/schema rollout and consent/enrollment design; reconcile and rehearse migration/restore. Domain acquisition can proceed independently and is needed only for the final origin/DNS/sender/provider tests, not for those code and policy decisions.
