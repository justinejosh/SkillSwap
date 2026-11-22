# CI compatibility and staging administrator handoff

**Historical policy note — 2026-11-22:** Scheduled-end confirmation checks in
this report describe the earlier implementation/test baseline. The current local
rules allow explicit actual-completion logging for early or unscheduled sessions,
with a non-future time after bilateral agreement approval. Independent participant
confirmations, sequential limits, closed-exchange protections and bilateral reviews
remain required. See [current behavior and migration dependencies](FLEXIBLE_SESSION_AGREEMENTS.md).
Earlier test counts are retained as historical evidence, not fresh validation of
the current rules. No hosted schema or deployment change is implied.

2026-11-16 · `dev-justine` · local verification only

**2026-11-18 follow-up:** [staging release preparation](STAGING_RELEASE_PLAN.md) adds hash-checked private QA secret restoration/cleanup without dropping content tests. Three owner-configured Actions secrets and an actual hosted run remain required; the historical input limitation below is retained for context.

**The release-migration/consent/session-fixture incompatibility is resolved locally. Actual GitHub Actions execution remains unverified.** This does not authorize a push or establish staging/production readiness.

## Changes

- `.github/workflows/ci.yml`: removed the shared fixed-port MySQL service and `db:bootstrap` setup dependency. Existing unit, browser, typecheck/build and audit checks remain. Integration setup now pulls MySQL 8.4 and runs `node development/ciIntegration.cjs`; no deployment step or artifact upload was added.
- `knoxite-backend/package.json`: the existing `test:integration` entry point now builds and invokes the same guarded runner, so ordinary local callers do not need to construct private fixture environments themselves.
- `knoxite-backend/development/ciIntegration.cjs` (new): enumerates **all nine** compiled integration files, creates a separately owned tmpfs MySQL container per file, applies only `prisma/release/schema.prisma` migrations, injects private fixture settings and removes only the verified container in `finally`. A failed file fails CI; no skip-to-green behavior. Optional explicit file arguments support focused local reruns without changing the default CI coverage.
- `knoxite-backend/development/fourBlockersEnvironment.cjs`: retains local `dev-justine` requirement and exact Docker ownership/loopback/port checks. Adds support for detached GitHub-hosted checkouts only with the expected repository, run ID and workspace context. Production/local protected ports remain excluded. Credentials are randomly generated outside the repository; test output redacts database passwords and JWT-shaped tokens. No local pilot settings are loaded. [GitHub runner variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables).
- `knoxite-backend/tests/integration/fixtureDatabase.ts` (new): API fixtures require the owned manifest and the exact corresponding database URL before connecting. Normal tests use the DML-only user. Only the two historical migration-preservation tests receive DDL credentials for their independently disposable container; they retain legitimate legacy-upgrade coverage. Their temporary schemas are constrained synthetic names on that container.
- Existing integration files updated: `academic-options.test.ts`, `api.test.ts`, `google-auth.test.ts`, `google-migration.test.ts`, `integrity.test.ts`, `migration.test.ts`, `password-recovery.test.ts`, `student-flow.test.ts`. All use owned targets. Registration fixtures submit explicit acceptance and a synthetic **unapproved** notice version. API coverage additionally checks missing/false acceptance, stale notice rejection, no partial account, and stored server version/time. Google negative cases remain intact.
- `api.test.ts` and `student-flow.test.ts`: unscheduled/future/end-minus-one confirmations are rejected; mocked server time reaches the agreed scheduled end before positive confirmations. Duplicate/concurrent confirmation, participant isolation, bilateral reviews/completion and metrics assertions remain. The API fixture's test-only tokens last two hours so a one-hour session can actually elapse; the production session policy was not changed. Clock mocks reset after the subtest.
- `academic-options.test.ts`: corrected the stale all-programs-have-four-years expectation; now explicitly asserts YEAR_1 only for BSIT/BSIHM-CA/BSIHM-HACLO.
- `knoxite-backend/tests/ci-isolation.test.ts` (new): detached-context rejection tests and missing-manifest refusal before database connection.
- `tests/browser/workflows.spec.ts`: successful academic-options mocks now include consent metadata; unavailable/empty options still block signup.
- `docs/KNOXITE_PRE_EMAIL_STAGING_READINESS.md`: links this follow-up without replacing its historical findings. This report is the only other documentation addition.

No application business logic, schema, historical migration/checksum, account, notice wording, private bank, OAuth setting, protected database or unrelated bootstrap script changed. No file was staged, committed or pushed. Legacy `tests/sandbox` suites are not part of this CI workflow and were not run against protected environments; changed CI session behavior is covered by the owned integration and mocked browser suites.

## Fresh local results

| Verification | Result |
|---|---|
| All nine integration files through the new disposable runner | **54 passed, 0 failed/skipped**, including nested tests |
| CI isolation, session policy and confirmation eligibility | **13 passed, 0 failed/skipped** |
| Selected registration/academic-options and stale Tracking Chrome tests, desktop/mobile | **16 passed** |
| Backend build; frontend typecheck/build | Passed; existing frontend chunk-size advisory remains |
| Workflow | YAML parsed successfully; trigger/permissions, retained checks, guarded runner and absence of legacy bootstrap/deployment/artifact steps asserted locally |

The first disposable run exposed the obsolete four-year test expectation; corrected before the successful full integration run. The previous 99-test pass was not rerun. This task reran the full integration group because **every file's database setup changed**; unrelated full unit/browser/audit suites were not rerun. Google tokens/mail were mocked. No real account or mail was used.

Reproduce from `C:\KNOXITE\SkillSwap\knoxite-backend` on `dev-justine`, with Docker and the MySQL 8.4 image available:

```powershell
npm run build
node development/ciIntegration.cjs
```

The runner supplies its own targets; do not set a protected `DATABASE_URL` or private pilot manifest. `npm run test:integration` is the equivalent supported entry point. Direct compiled test-file execution fails without the owned manifest rather than accepting a merely `_test`-named database. No generic reset, historical migration rewrite or production command is involved. All containers created for these runs were cleaned up through ownership verification.

## GitHub push gates — still require actual verification

1. After a separately authorized reviewed push, verify GitHub-hosted Docker/image availability, detached checkout context, all nine integration files and cleanup. YAML parsing/local Windows execution is not an actual Ubuntu Actions result.
2. Verify the unchanged full unit/browser jobs, lockfile installation and dependency-audit results. No test/security check was removed to mask incompatibility.
3. **Private content input prerequisite:** the unchanged content-QA tests (for example `tests/draft-assessments.test.ts`) read the fifteen drafts under `content/drafts`. They are presently untracked local inputs, not guaranteed to exist in a clean public checkout. Do not commit sensitive answer keys to satisfy these tests. A separately approved private runner-input/package handoff is required before these content checks can pass on a clean hosted checkout; the current workflow does not fetch a private package, and the checks are deliberately not skipped. Provide only approved QA input to ephemeral runner storage, with access control and cleanup; never upload it as an artifact or log its contents. No credential, bank or private review file was staged/uploaded here. This external input requirement remains separate from the now-correct migration/consent fixtures.
4. Preserve all required checks and confirm Vercel/Render Git integrations before pushing; CI changes do not disable provider auto-deployments. There was no GitHub-hosted run or external configuration change in this task.

## Target-verified staging ADMIN bootstrap procedure — prepared, not executed

The existing `oauth:admin:setup` is deliberately bound to the local OAuth database and must not be redirected or have its guards removed. A reviewed one-shot **staging operator utility** is still required; no new provisioning endpoint or account was created here.

1. Owner approves the exact new staging service, private MySQL host/port/schema, expected `@@server_uuid`, migration fingerprint, operator and separate administrator identity. Record these privately from independent provider ownership evidence; do not derive the expected values solely from the connection being tested. Require provider TLS/CA validation and credentials that cannot reach production databases.
2. Before writes, compare `DATABASE()`, `CURRENT_USER()`, server UUID and grants with that approved target. Require the complete release schema/readiness. Refuse original/local/OAuth/recovery targets and any unexpected state. For initial bootstrap, require zero User/ExternalIdentity/AuthSession records and zero existing administrator; a populated target needs a separately reviewed plan rather than promotion/overwrite. Never synchronize/reset schema.
3. Generate a strong separate password in a hidden local operator prompt/secure generator; retain only in an authorized password manager. Hash with existing bcrypt cost 12. Under one transaction, recheck uniqueness/preconditions and create only the explicitly approved ADMIN User using the existing account architecture, without a Google identity or student-account modification. The utility must refuse repeat/conflicting provisioning. Do not put a plaintext password in SQL, CLI arguments, reports or logs.
4. Determine genuine administrator identity/mailbox verification and the approved bootstrap trust decision **before** allowing sign-in. Do not manufacture mailbox delivery or mark a student verified. With real mail unavailable, an explicit owner-reviewed ADMIN-only provisioning/verification decision is a remaining prerequisite; no verification exception is activated by this document. Do not fabricate student consent or reuse local admin credentials.
5. Record operator/time/target/new user ID and authorization reference, excluding credentials. Log in through the normal password flow only after approval/verification; test admin access, student denial and ADMIN 15-minute idle/four-hour absolute sessions. Never award student roles/tiers/history or publish banks during bootstrap.
6. On failure, stop; do not retry against another database or modify existing identities. Review/revoke only a newly provisioned staging admin/session under the approved procedure. Do not delete records or roll back the entire database as a shortcut.

Remaining prerequisites are owner-supplied target evidence, operator approval, administrator verification decision and implementation/review of that one-shot guarded utility. This is a procedure for later authorization, **not** evidence that a staging admin exists.
