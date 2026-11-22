# Staging release candidate and operator order

**Historical policy note — 2026-11-22:** Scheduled-end confirmation checks in
this report describe the earlier implementation/test baseline. The current local
rules allow explicit actual-completion logging for early or unscheduled sessions,
with a non-future time after bilateral agreement approval. Independent participant
confirmations, sequential limits, closed-exchange protections and bilateral reviews
remain required. See [current behavior and migration dependencies](FLEXIBLE_SESSION_AGREEMENTS.md).
Earlier test counts are retained as historical evidence, not fresh validation of
the current rules. No hosted schema or deployment change is implied.

2026-11-18 · `C:\KNOXITE\SkillSwap` · `dev-justine`

**Prepared locally; no hosted release authorized or performed.** Railway `knoxite-staging` online status and Render/Vercel setup are owner-reported. No Railway URL, certificate or live database was accessed. Existing main/production, recovery-1, OAuth pilot, assessment content, academic evidence and historical data remain unchanged.

## Release review and commit candidate

The accumulated change inventory includes CI/fixtures, schema-readiness/session/consent/confirmation fixes, existing student/admin UI, canonical skills, assessments and technical documentation. `docs/deployment/STAGING_RELEASE_MANIFEST.json` lists the public commit candidate with per-file hashes; it is **not a commit or human security approval**. Source inspection, dependency/reference checks, credential-pattern scanning and tests support this handoff, not a fresh line-by-line penetration audit.

No active frontend source references the old Render API. Existing `src/config.ts` uses `VITE_API_BASE_URL`, rejects missing/unsafe production API URLs at runtime and retains guarded local routing. It cannot recognize every mistakenly configured production HTTPS endpoint; verify the effective staging URL before login. Do not replace it with a hardcoded Railway/Render address.

New preparation files/changes this task:

- Root `vercel.json`: Vite/root build, `npm ci`, `npm run build`, `dist`, SPA fallback and existing basic/GIS-compatible security headers. Branch selection is a dashboard setting, not a fictitious JSON property.
- `.gitignore`: excludes private operator files/certificates, Vercel linkage, assessment draft JSON, review material and common backup artifacts. Files remain on disk; none was deleted or staged.
- `knoxite-backend/scripts/staging-preflight.ts` + tests: explicit-target, strict-CA/TLS, scoped-grant and empty-schema **read-only** checks; never auto-migrates.
- `knoxite-backend/development/ciAssessmentContent.cjs` + tests and CI workflow steps: private, hash-checked QA input restoration/owned cleanup on the expected GitHub-hosted checkout. Existing content tests stay enabled. Missing/altered inputs fail closed; no publication or fabricated validation. Fork PRs without secrets will not pass these private-input checks automatically; do not use privileged `pull_request_target` execution as a workaround.
- `docs/deployment/staging-render.env.example`, `staging-frontend.env.example`, `staging-credentials.sql.example`: inactive templates only.
- `docs/STUDENT_TESTING_READINESS.md`: redacted a personal institutional-address example. No notice/manuscript text was rewritten.

Restricted passwords and a new independent JWT key were **prepared but not installed** in `C:\Users\Admin\AppData\Local\Temp\knoxite-staging-release-2NQe6o\staging-credentials.private.json`, with a user-specific Windows ACL. Do not paste contents into chat, logs, source, Vercel or Actions. Use its application/migration values only for the corresponding later-authorized staging accounts; `jwtSecret` belongs only in Render staging. No new database user/account exists merely because this file exists.

Private QA package: `C:\Users\Admin\AppData\Local\Temp\knoxite-assessment-qa-zLlDdx`. It contains `part1.secret.txt`, `part2.secret.txt`, `sha256.txt`; the two encoded parts are **sensitive, not encrypted files**. Round-trip checks confirmed all 15 original source files are byte-identical. With authorization, copy them privately into GitHub repository Actions secrets named `KNOXITE_QA_PART1`, `KNOXITE_QA_PART2`, `KNOXITE_QA_SHA256`. Never upload them as public artifacts or commit them. Current workflow restores only these exact 15 names into ignored runner paths, refuses an existing populated target, and removes only its run-owned inputs. Restore/cleanup has not been executed on GitHub; local decoding/security tests passed. Repack with `node knoxite-backend/development/ciAssessmentContent.cjs pack` only when deliberately reviewing a changed content set; update all three secrets together. No content was imported into any database.

After the owner authorizes a local commit, stage **only** manifest-listed files after verifying hashes, inspect `git diff --cached` and run `git diff --cached --check`. Suggested title: `Prepare isolated staging release with hardened authentication and exchange integrity`. Preserve the earlier work as one coherent release candidate; never blanket-stage ignored inputs. Commit/push are separate from migration/deployment authorization. None occurred here. Before pushing, inspect **all existing Git integrations**: the old Vercel production project may still build a dev-justine Preview. Its branch must be ignored or have separately verified staging-only Preview variables/protection before pushing; a new staging project does not isolate that older integration automatically. Existing production Render must still track main. Changing those controls requires owner authorization; do not disable production deployment globally as a shortcut.

## 1. Railway — identity and TLS before writes

1. Confirm the correct project/environment/service and actual MySQL schema. `knoxite-staging` may be a service label; do not assume it is `MYSQLDATABASE` (Railway templates often use a different schema). Record the **public proxy host/port**, real schema, server UUID and owner/grants privately from independently authenticated service-owner access. Render cannot reach Railway's `.railway.internal` network or your localhost. [Railway MySQL connections](https://docs.railway.com/databases/mysql).
2. Obtain the server CA through trusted owner access and verify its fingerprint independently. A public TCP proxy and `MYSQL_PUBLIC_URL` do **not** establish encrypted, authenticated MySQL transport. Do not copy the template's root URL into Render. [TCP proxy](https://docs.railway.com/networking/tcp-proxy).
3. From an authorized operator machine, test with MySQL 8.4 CLI using `--ssl-mode=VERIFY_IDENTITY --ssl-ca=<TRUSTED_CA_FILE> --host=<PROXY_HOST> --port=<PROXY_PORT> --user=<OPERATOR> --password <ACTUAL_SCHEMA>`; `--password` prompts, so no password appears in arguments. Inspect `SHOW SESSION STATUS WHERE Variable_name IN ('Ssl_cipher','Ssl_version')`, `SELECT DATABASE(), @@server_uuid, CURRENT_USER()`, server TLS settings and empty-schema metadata privately. Do not send connection strings or account details to chat.
4. If CA/hostname verification fails, stop and arrange a provider-supported certificate/TLS configuration or approved topology change. Automatically generated MySQL certificates can lack a matching hostname. Do **not** switch to `accept_invalid_certs`, disabled verification, or plaintext to get online. [MySQL identity verification](https://dev.mysql.com/doc/refman/8.4/en/using-encrypted-connections.html).
5. **Only after separate authorization**, use the SQL template to create distinct application and migrator users, both `REQUIRE SSL`. Application: SELECT/INSERT/UPDATE/DELETE on the actual staging schema only. Migrator: those plus CREATE/ALTER/DROP/INDEX/REFERENCES on that schema only. No root reuse, global privileges, GRANT OPTION, FILE/PROCESS/SUPER or production access. `%` does not limit source IP; confirm what source the TCP proxy presents and whether provider/network restrictions are available. Do not assume a direct Render-IP MySQL host grant works through a proxy. The template refuses existing usernames instead of silently changing them. Keep migrator credentials out of the running service; lock when not needed.
6. Create a private expected-target JSON (outside Git), using independent owner evidence:

```json
{
  "host": "ACTUAL_PUBLIC_PROXY_HOST",
  "port": 0,
  "database": "ACTUAL_MYSQLDATABASE",
  "serverUuid": "ACTUAL_SERVER_UUID",
  "currentUser": "knoxite_staging_migrator@%",
  "caSha256": "ACTUAL_TRUSTED_CA_FILE_SHA256",
  "role": "migration"
}
```

These are invalid placeholders, not approved target evidence. Build the private Prisma URL with an encoded password and **absolute** CA path plus `sslaccept=strict`. Prisma 6's MySQL connection options are used; do not upgrade the ORM. [Prisma v6 MySQL](https://www.prisma.io/docs/orm/v6/overview/databases/mysql).

Inject `DATABASE_URL`, `KNOXITE_STAGING_TARGET_FILE` and `KNOXITE_RELEASE_PREFLIGHT_APPROVED=true` privately; from `knoxite-backend`, run `node dist/scripts/staging-preflight.js`. Require `targetMatches`, `empty` and `grantsScoped` true and TLS 1.2/1.3. It rejects root/local/internal targets, wrong identity, unscoped grants and visible objects. It cannot turn an unverified owner-supplied profile into proof of ownership. Check the owner sees no hidden routines/events/objects as well. Repeat with an application-role profile/user **before** initialization. Do not rerun an empty-only check after initialization expecting success.

7. **After explicit migration authorization and backup/restore planning**, use only the approved fresh release path on this verified empty database:

```text
node node_modules/prisma/build/index.js migrate deploy --schema prisma/release/schema.prisma
node node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/release/schema.prisma --exit-code
```

Require diff exit 0 and the expected single release migration/checksum. No historical bootstrap, resolve, `db push`, reset or protected installation. Preserve additive session/consent storage and all constraints. Existing disposable proof is in `KNOXITE_FOUR_BLOCKERS_RESOLUTION.md` and `CI_COMPATIBILITY_FIX.md`; no hosted migration was executed in this task.

## 2. Reserve Vercel origin, then configure Render

Do not click Deploy on the current Vercel New Project page while it selects `main`. The **new separate** `knoxite-staging` project should track `dev-justine`; do not change the existing production project or repository default branch.

If the importer cannot select the desired branch without deployment, create the empty staging project through the owner's authorized project-management flow first (current CLI documents `vercel project create knoxite-staging`, not a deployment command), then connect the repository and set **Settings → Environments → Production → Branch Tracking = dev-justine** before the first authorized deployment. Inspect integration auto-deploy behavior before Git linking/pushing. Leave the New Project wizard if its next action deploys `main`; do not deploy it and repair it later. [Project creation](https://vercel.com/docs/cli/project), [branch tracking](https://vercel.com/docs/git).

Record the actual provider-issued staging frontend URL from the new project/domain settings; do not assume the project name guarantees a particular hostname. This resolves the frontend-origin prerequisite before starting Render. No custom domain is required.

For Render `knoxite-backend-staging` only:

| Setting | Value |
|---|---|
| Branch / root | `dev-justine` / `knoxite-backend` |
| Build | `npm ci --include=dev && npm run db:generate && npm run build` |
| Start | `npm start` (`node dist/index.js`) |
| Runtime / bind | Node 22, `NODE_ENV=production`, `HOST=0.0.0.0`; provider `PORT` |
| Health | `/api/health` (process health, not independent DB identity proof) |
| Auto-deploy | Keep disabled pending explicit release authorization |

Use `staging-render.env.example`. Set a **staging-only application-user** DATABASE_URL, never `MYSQL_PUBLIC_URL` with root/migrator credentials. Upload the trusted CA as a Render Secret File and reference its actual absolute path (commonly `/etc/secrets/railway-mysql-ca.pem`) in the strict TLS URL. Set the prepared staging JWT key, actual `PUBLIC_APP_URL` and exact `CORS_ORIGINS`. Do not attach production environment groups or copy local pilot/synthetic variables. Keep migrations outside build/start. [Render runtime/ports](https://render.com/docs/web-services).

Startup intentionally refuses missing DB/session/consent prerequisites. Mandatory values include `SESSION_TIMEOUTS_ENABLED=true`, mandatory institutional mailbox verification, the recorded campus-rule decision, enabled consent and the **genuinely approved archived notice version**. The templates remain false/blank until real evidence is supplied. Do not use placeholders as approved notices, turn timeouts off, or bind before schema validation merely to pass the health check. The code accepts remote MySQL only with `NODE_ENV=production`; that is runtime hardening for staging, not production deployment permission.

Google remains off. Email remains Resend/unapproved/without a key. A healthy empty backend is only the first phase: it has no student/admin accounts, approved banks or academic data until separately authorized setup. Existing initializers can seed 13 programs/80 presets without inventing mapping evidence; BSIT/BSIHM-CA/BSIHM-HACLO stay first-year-only. A reviewed staging-only administrator bootstrap and identity-verification decision are still required; do not redirect local `oauth:admin:setup`. See `CI_COMPATIBILITY_FIX.md`. No local users/banks/history are copied.

## 3. Vercel staging build and controlled smoke test

For **knoxite-staging only**, select Vite, repository root `./`, install `npm ci`, build `npm run build`, output `dist`, Node 22.x. Root `vercel.json` provides SPA/security settings; verify direct `/login`, `/signup`, profile and admin links on the actual platform after authorization.

Set `VITE_API_BASE_URL=https://<ACTUAL_RENDER_STAGING_HOST>/api`. Because `dev-justine` is this separate project's **Production branch**, set that project's **Production environment** value (and Preview only if testing its Preview builds). This is application staging even though Vercel calls the target Production. Do not set only the old project's Preview scope or modify its live Production value. Check Network requests before login: none may reach `skillswap-50cf.onrender.com`, other production APIs or localhost. Changing this variable requires rebuilding; it is bundled at build time.

Protect **All Deployments** on the separate staging project using an available approved mechanism; Preview-only protection can leave its Production-target staging URL public. Do not purchase add-ons. This protects the frontend, **not** Render's public API; approve a backend/cohort access arrangement before real participants or Google activation. Institutional email is identity evidence, not current enrollment; researchers verify recruited enrollment outside the system. [Vercel protection](https://vercel.com/docs/deployment-protection).

Only after an authorized reviewed commit/push and separately authorized deployment: verify matching Git SHAs and GitHub checks; manually deploy Render staging, confirm schema/health; deploy Vercel from `dev-justine`, inspect API origin and deep links, then use synthetic/explicitly approved test accounts. Check both roles, timeouts/revocation, reciprocal matching, bilateral approvals, scheduled-end confirmations, independent reviews and protected assessment/admin endpoints. No fake exchanges/tiers/reviews on real accounts. Stop on critical failure; never fall back to production.

## Remaining gates and evidence

- Private Actions QA secrets and an actual hosted CI run; no QA tests were removed. Local restore decoding/round-trip is verified; hosted restore/cleanup and Ubuntu execution are not claimed.
- Railway strict TLS, exact owner/schema, restricted credentials, empty preflight and migration/backup authorization. No live connectivity result is claimed.
- Exact frontend/API domains, archived notice identifier, accountable privacy contact/retention, staging-admin bootstrap and cohort/API access decision. Reviewed text was not rewritten; the two registration methods' notice references still need alignment with the finalized archive.
- Google: separate reviewed staging client/origin, hosted-domain/eligibility/security decisions before enabling. Preserve the local allowlist and production Google configuration.
- Real email remains a separate step: owned/verified sending domain, authorized sender, private Resend key/DNS and authorized inbox tests. `no-reply@knoxite.app` is not currently usable. Provider-issued HTTPS URLs suffice for staging application origins; they do not authorize a sender on an unowned domain.

Validation: the final backend suite passed **190 tests, zero failures/skips**. Focused configuration/preflight/QA tests also passed **14** (overlapping coverage, not an additional unique total). Frontend typecheck/build passed with an explicit HTTPS placeholder API; exact Render install/generate/build command passed in an independent clean directory without private banks or any live DB. The clean backend install and frontend `npm audit --audit-level=moderate` reported **zero vulnerabilities** at execution. Prepared secrets and the old production API were absent from the frontend bundle. Existing frontend large-chunk advisory remains. Prior **54 MySQL integration / 16 browser** tests are reused, not claimed as rerun. This task did not change exchange/session/auth behavior, so no protected-DB or full lifecycle rerun was needed.

Immediate owner order: **Railway identity/TLS evidence → authorize restricted accounts + empty migration → reserve the separate Vercel project/origin with dev-justine → configure Render staging → authorize reviewed commit/push and deployments → controlled smoke test.** Supply the exact notice/cohort/bootstrap decisions and private Actions secrets before expecting complete usable student/admin staging. No custom domain purchase is on the critical path.
