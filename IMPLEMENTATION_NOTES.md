# Knoxite implementation and review notes

This change implements the approved plan on `dev-justine`. It is not a production deployment. Do not merge directly into `main`.

## Targeted thesis-alignment review — 2026-11-13

The attached working thesis was read only; its SHA-256 was checked against the pre-review fingerprint. The normalized WRMR calculation is already correct: the manuscript example yields B 92.5, D 92.0 and C 86.0. No formula, weight, cancellation/legacy policy, eligibility rule or schema was changed.

Small corrections show WRMR as a score out of 100, identify balanced input labels and explain one-partner evidence; monthly administrative analytics now reuse the existing session/review outcome gate instead of counting inconsistent completed flags. Existing cold-start access and prior implementations are retained. Four backend regressions and desktop/mobile matching regressions cover the changes.

Read-only inspection of the independently verified recovery-1 synthetic database found all 13 programs/four years but no assigned/validated program mappings and no assessment versions. The team's reported mapping confirmation is distinct from recording actual evidence in the database. No flags, mappings or banks were changed. Original and production databases were not accessed. See `docs/THESIS_ALIGNMENT_AND_PENDING_REVISIONS.md` for manuscript page references, exact partner formulas, pending decisions, changed files, release gates and newly executed validation; see `VALIDATION.md` for test counts.

## Scope and sources of truth

The three thesis objectives remain profiling/skill management, reciprocal WRMR matching, and exchange/performance/progress analytics. The application is scoped to OLFU Santa Rosa **college students only**. There are no SHS registration fields, strands, or proximity rules.

The initial 13 program labels and four year levels are in `knoxite-backend/config/academic-catalog.json`, copied into configurable database records by the guarded local preparation script. The React forms read these records from the API. They contain the team-supplied labels exactly, including `BSTom`, `BS PHARM`, and `BS PSYCH`.

Program year-level associations support adding further approved years without frontend changes. `User.programId` and `User.yearLevelId` remain nullable for historical users; new registrations require valid standardized selections. A department is stored on `Program`, never selected or supplied by a student. Different programs may map to the same department.

No official departments or mappings are seeded. An administrator must supply a department and record official mapping evidence before it contributes to proximity. Missing, inactive, or unvalidated academic information produces unavailable proximity, not an inferred value.

The team subsequently supplied a provisional nine-college mapping covering all 13 programs. `config/provisional-departments.json` preserves the existing internal program codes and exact labels. Profiles display a derived proposed college separately from the validated department. Administrators can inspect/import the draft into previously unassigned programs or edit provisional assignments; importing never overwrites existing assignments or sets validation evidence. Academic proximity continues to ignore every unvalidated draft. No schema change or migration was needed.

### Existing record inspection

The initial audit found no student export and did not open the configured local database. During registration recovery, read-only checks subsequently confirmed that `localhost:3306/knoxite` was XAMPP MariaDB 10.4.32 with the exact preserved pre-upgrade schema. The user explicitly authorized a backed-up local upgrade. Its backup was restored and verified, the private clone was sanitized and rehearsed on the same engine, and all original values/relationships across 11 tables were fingerprint-verified before and after the approved original upgrade. Existing users, skills, swaps, reviews, messages, and associations were retained. No historical consent, rating validity, academic data, or verified email ownership was invented. This is local-data preservation evidence, not a production-data audit or semantic validation of legacy outcomes. See `docs/LOCAL_DATABASE_RECOVERY.md`.

## Security and runtime

- Required JWT secret from the environment; HS256 algorithm, issuer, audience, subject, session ID, token version, database account status, and session expiration are checked.
- Database-backed administrator authorization; browser local-storage roles are not trusted.
- Public portfolios/matches use explicit projections. Password hashes, emails, tokens, raw responses, answer keys, rubrics, and private attempt history are excluded.
- Swap reads/mutations and chat verify participation. Requests verify current reciprocal skills; acceptance checks them again. Reviews derive the partner, constrain ratings to integers 1–5, and have a database uniqueness constraint.
- Request acceptance creates one explicitly linked agreement. Both parties approve the same revision before confirmation. Session acknowledgements are idempotent per participant/session number. Cancellation and suspension retain history.
- Login sessions, logout, password change with session revocation, reports, administrator dispositions, and session scheduling use real APIs.
- Removed checked-in JavaScript copies. Development uses Node watch with ts-node; production starts `dist/index.js`. TypeScript never emits over source.
- `predev`, `prebuild`, and `pretypecheck` ensure Prisma Client matches the schema and installed version. Matching clients are reused to avoid replacing a Windows engine DLL held by another backend process. Missing/stale clients are generated; a schema change may require stopping other backend processes before explicit `npm run db:generate`. Fresh installations may otherwise expose Prisma's placeholder `PrismaClient: any`. Generation writes code/types and does not migrate a database; strict TypeScript checks remain enabled.
- Dependency audit fixes retain Prisma 6. A development-only `deepmerge-ts` override addresses its advisory; Prisma generation, schema diff, baseline resolution, and migration paths are validated with that override. Nodemon was removed in favor of Node's built-in watcher.

**Deployment operator action:** rotate the previously exposed JWT signing secret and replace old running artifacts. Removing it from current source does not revoke tokens served by an old deployment. No production secret or deployment was changed here.

The subsequent manual source/file review and negative authorization tests are recorded in `docs/SECURITY_RELEASE_REVIEW.md`. They cover all administrative routes, current account eligibility, and sensitive workflow boundaries. The review tightened the shared eligibility query for identifier-less legacy addresses, corrected unsupported privacy-page claims, and aligned the registration password placeholder. Deployment access was unavailable, so production rotation and running-artifact verification remain owner actions.

## Institutional authentication

`INSTITUTION_EMAIL_DOMAINS` defaults to the proposed `student.fatima.edu.ph`; `CAMPUS_EMAIL_SUFFIX` defaults to the proposed `lag`. The rule requires a nonempty identifier before the suffix, immediately preceding `@`. The domain and suffix are independent configuration values. This is a proposed campus restriction, not evidence that the suffix reliably proves campus or current college enrollment.

`CAMPUS_EMAIL_RULE_CONFIRMED=false` keeps production activation blocked until the institution confirms both the domain and campus rule. Production also requires institutional email ownership verification and HTTPS. Existing accounts outside the configured rule retain their data but cannot participate as eligible students.

Email verification uses a random single-use token, a stored SHA-256 hash, a 30-minute expiry, and a configured HTTPS institutional delivery webhook. Tokens are never returned by the API or logged. No actual email was sent during development. Configure `EMAIL_DELIVERY_URL` and `EMAIL_DELIVERY_TOKEN` according to the JSON contract in `services/email.ts`; unavailable delivery leaves accounts unverified with a resend path. Registering or validating a suffix alone does not establish email ownership.

Google Sign-In is implemented locally using backend ID-token verification, single-use challenges and explicit account linking; it remains **disabled by default**. Email/password authentication is preserved. See `docs/GOOGLE_SIGN_IN.md` for the actual architecture, installed library and outstanding institutional/credential/security activation gates. The earlier feasibility-only status has been superseded; local implementation does not establish university approval.

## WRMR policy

1. Filter by reciprocal offered/wanted skill IDs and active, eligible student accounts.
2. Remove peers with a pending request or an active exchange.
3. Score eligible candidates, sort, and return them without pre-scoring truncation.

`score = 100 × (0.50 × averageRating/5 + 0.30 × completionRate + 0.20 × academicProximity)`.

The team-approved proximity cases are 1.0 / 0.8 / 0.6 / 0.4 for same-department/same-year, same-department/different-year, different-department/same-year, and different-department/different-year respectively. No geographic calculation exists. Assessment tiers and overlap counts are not ranking factors. Ties use stable IDs without changing compatibility.

The team reported adviser approval for partner-balanced inputs: calculate each partner's mean received rating and completed/concluded rate first, then average equally across partners. A cancellation counts only after bilateral confirmation; pending/rejected/withdrawn requests and pre-confirmation cancellations do not enter the denominator. No concluded exchanges means unavailable completion rate; zero completed out of a positive denominator means 0%. Ratings come from validated bilateral completed exchanges. Raw means, raw totals, and pooled completion rates remain descriptive statistics. Missing inputs leave a reciprocal candidate visible with an explicit unranked result; weights are never redistributed. See `docs/PARTNER_INTEGRITY_POLICY.md` for definitions and approval scope.

Dashboard and KnoxHub present separate groups for matches awaiting evidence and matches with WRMR scores. The awaiting-evidence group is visible first and has no compatibility rank; its display order does not imply quality. Scored candidates retain the backend's WRMR order. The interface explains why a score is unavailable and keeps Request Swap enabled. A score, completed exchange, review, or assessment badge is not a prerequisite for requesting or accepting a reciprocal swap. API regression tests exercise this with new, unassessed students; desktop/mobile tests cover requesting from both matching screens and mixed scored/unranked groups.

An initial cohort consisting entirely of new students can evaluate reciprocal eligibility and the exchange workflow, but cannot establish the effectiveness of WRMR ranking before reliable outcomes exist. Use controlled synthetic fixtures to verify the arithmetic separately, clearly identified as test data. Do not fabricate student history or infer ranking quality from an entirely unranked pilot. Any future cold-start prior or formula change needs explicit thesis approval.

Leaderboards require reliable completed outcomes with at least two distinct partners, separately from matching eligibility. Top Mentors uses partner-balanced rating. The separately approved Most Active order is distinct completed partners, then partner-balanced completion rate, then stable ID; raw swap volume never breaks ties. Private repeated-partner observations and administrator review cases are available at `/admin/integrity`; they create no automatic accusations, account penalties, badge changes, or deleted history. Cases reuse the existing report schema with a reserved reason, evidence snapshots, and revision-checked review events.

Historical outcomes migrate as unvalidated. Unreviewed concluded exchanges make completion metrics unavailable. Historical agreements that cannot satisfy the new integrity checks remain readable but require reconciliation before further progress; no old consent, completion date, or review legitimacy is invented. The team must review actual legacy records before releasing the upgrade. Monthly analytics use actual stored completion/cancellation dates and do not synthesize historical phases.

## Authentication and account recovery follow-up

An isolated interactive synthetic sandbox is available through the root
`sandbox:setup`/`sandbox:start` scripts. It uses its own labelled MySQL container
and persistent volume on 3309 (`knoxite_sandbox_dev`), backend 5010 and frontend
5180; the original database, ports, and `.env` files remain unchanged. Random
credentials and the captured synthetic mailbox live in a current-user/SYSTEM
restricted directory outside the repository. Three students and an administrator
are initialized through normal registration, captured email verification and
password authentication. The local seed alone assigns the synthetic admin role.
Verification, session checks, roles, rate limits and authorization remain active.
Production refuses the separate development entry; normal app routes expose no
sandbox/mailbox endpoint. See `docs/LOCAL_SANDBOX.md` for exact commands.

The optional Resend REST adapter reuses verification/password-recovery workflows
without a new runtime dependency. The existing webhook remains the default.
Sender approval, a verified sending domain and a private scoped API key remain
external prerequisites. No real email was sent or provider account configured.
Google remains disabled. See `docs/EMAIL_DELIVERY_SETUP.md` for both adapters.

Google Identity Services/OpenID Connect is now implemented behind a default-off
backend flag. Explicit institutional Workspace, college/campus eligibility, and
security approvals are required in every environment. The frontend does not load
Google's SDK while disabled. Backend verification uses the official Google auth
library; expiring browser-bound challenges protect login, linking, and onboarding.
Existing email collisions never auto-link. Fresh password/session checks are
required for explicit linking and unlinking; Google-only accounts must establish
a verified email/password fallback before unlinking. Shared Knoxite sessions and
authorization remain in use. No Google access/refresh tokens or extra Google API
permissions are introduced.

The Google migration adds two tables and nullable password hashes, preserving
all existing IDs and data. Only isolated `_test`/`_dev`/`_clone` migration paths are
authorized; the previous original-database upgrade mode is blocked. The existing
`knoxite` database and actual environment credentials were not changed. See
`docs/GOOGLE_SIGN_IN.md` for configuration/approval gates, migration and rollback
limits, and `docs/EMAIL_DELIVERY_SETUP.md` for the existing HTTPS mail contract.
Actual institutional Google login and mail delivery remain untested externally.

The formerly disabled recovery control now opens an emailed password-reset flow.
Verification requests validate the email field and display accepted requests as
status notices. Missing mail configuration is reported explicitly. Recovery uses
short-lived, one-use, purpose-separated tokens, backend password validation, and
transactional password/session revocation; it never verifies an email or changes
an account role. Existing expiring token storage is reused without a migration.
Keyed recovery hashes and strict token-format checks prevent cross-purpose use. See
`docs/ACCOUNT_RECOVERY.md` for endpoints, security boundaries, and the two mail
templates the operator must configure. Actual mail delivery remains unresolved.

## Assessments and portfolios

- Tier belongs to `UserOfferedSkill`, unique by student and offered skill. Removing a skill deactivates the record and preserves attempts, dismissals, and earned tiers.
- New and backfilled offerings default to Not Assessed. Basic is 10 equally weighted MCQs, initially 80%, awarding Amateur. Advanced requires that skill's actual basic pass, uses 5–10 applied scenario choices with a predefined rubric, initially 80%, and awards Verified.
- Basic and advanced content must be skill-specific and curated. No question banks are seeded for real students. Synthetic question content exists only in tests.
- Administrators import a draft, inspect questions/rubrics, record human validation notes, then publish. Published versions are immutable; a replacement version changes only future attempts. Retiring a version preserves existing attempts and tiers.
- Initial advanced support uses applied scenario multiple-choice items (`APPLIED_CHOICE`). This can cover debugging, query construction, code interpretation, and other objectively gradable scenarios. Coding execution, free-text subjective grading, and nontechnical performance formats remain unavailable until separately validated. Submitted code and SQL are never executed.
- Student previews, active attempts, results, badge descriptions, and administrator guidance explain the current scenario-based format. Passing demonstrates a result on the stated reasoning outcomes, not independently writing/executing a program or observed hands-on performance. Owner-only attempt responses display learning outcomes from that attempt's immutable version, including after a replacement bank is published. See `docs/ASSESSMENT_VALIDATION_GUIDE.md` for the human content-review and pilot protocol; engine tests do not validate educational content.
- Server-generated question/option permutations, secure backend grading, owner checks, expiry, and locked transactional promotion prevent score/tier tampering and racing attempts.
- One active attempt per offering/level; three starts per rolling seven days and a 24-hour cooldown after failure/expiry. Limits span versions and removal/re-addition. Network retries resume the same attempt. Unanswered questions receive zero points. Display rounding never decides passage.
- Failure or postponement never removes an earned tier. Verified is a Knoxite advanced assessment result, not professional certification.
- Supported teaching-skill saves precede the invitation. Skip confirmation persists. Unsupported skills remain usable without fabricated questions. Wanted skills have no assessment tiers.
- Authenticated portfolios show complete lists, per-offering badges, program/year, biography/avatar/name, and reliable peer metrics. Private account settings remain separate.

Admin assessment, academic mapping, and reporting tools are available at `/admin/assessments` to authenticated administrators.

## Local preparation and migration safety

Never use production credentials for the scripts below. Every preparation script requires a loopback MySQL URL whose database name ends in `_test`, `_dev`, or `_clone`, plus `KNOXITE_LOCAL_DATABASE_ACK=local-synthetic-or-sanitized`.

1. Install locked dependencies in both packages. Generate Prisma explicitly (`npm run db:generate` in the backend).
2. Create an empty isolated local database and set its URL explicitly. `npm run db:bootstrap` prepares the current baseline and records the preserved migration history. It refuses a nonempty database.
3. For an authorized sanitized clone of existing data, make a backup and run `npm run db:preflight`. It requires exact agreement with the audited pre-upgrade schema, known statuses, correct implicit join mapping, no unresolved migration failures, and no duplicate reviews. A mismatch stops the operation rather than resetting or guessing.
4. `npm run db:upgrade` applies the additive SQL only after preflight, backfills offered associations, checks historical counts, initializes approved academic choices without assigning students to them, resolves baseline history, and verifies final schema equality.
5. MySQL DDL is not fully transactional. Rehearse on a restored clone and preserve its backup. If any step fails, stop rollout and restore the clone; do not retry blindly against a partially changed schema.
6. Never delete duplicate reviews to make the index pass. Review a lossless reconciliation strategy first. Never mark legacy rows verified merely to make WRMR produce a number.

The old two-migration chain does not recreate the original checked-in schema. Those migration files are retained; the guarded baseline workflow handles this explicitly. Do not run the old `prisma db push` instructions against existing records.

An explicitly authorized exception was implemented for the confirmed existing local `localhost:3306/knoxite` database. Ordinary preparation tools still reject unsuffixed databases. The recovery path requires `dev-justine`, an explicit local acknowledgement, private verified backup/manifest hashes, a successful same-engine clone rehearsal, application maintenance, the unchanged reviewed SQL, and exact old-row fingerprints. Its one-time proof is consumed on success. Remote targets and production mode are rejected. Recovery evidence/backups stay outside OneDrive and Git with restricted access. This does not authorize production migrations or future unreviewed upgrades.

Rollback must retain the additive offering/attempt tables and assessment evidence. Both offered relationships are maintained together during this rollout; wanted associations remain unchanged. Do not roll back to the vulnerable JavaScript artifacts or hardcoded signing secret.

## Validation

Backend: `npm test` and `npm run test:integration` with an explicit isolated `_test` database and acknowledgement. Integration tests use synthetic users, question banks, emails, and mappings, and rehearse independent upgrade databases. They never inspect real students or send email. Browser tests mock all API requests and block external hosts; run `npm run test:browser` from the root. Windows can set `PLAYWRIGHT_BROWSER_CHANNEL=msedge`; CI installs Chromium.

Both packages expose type checking and builds. GitHub Actions runs unit, API, migration, browser, and dependency checks. Review current test output before merging.

Remaining release gates: official domain/campus confirmation, actual program-to-department validation, validated assessment content, institutional mail delivery configuration, sanitized legacy-data audit/reconciliation, and operator secret rotation. Production database migration and deployment are outside this change.

`docs/ACADEMIC_CONFIGURATION_APPROVAL.md` records the exact pending institutional and subject-review evidence. No official mapping or real question bank was invented to complete configuration. The continuous local student-journey test supplements the separate feature regressions; see `VALIDATION.md` for the latest full run.

Deployment details supplied by the team are recorded in `docs/DEPLOYMENT_READINESS.md`: Vercel frontend, Render backend `skillswap-50cf`, automatic deployments from `main`, and an unresolved production MySQL provider/backup/access plan. Production connections, deployments, production migrations, and merging into `main` remain unauthorized. The earlier partner-integrity follow-up did not execute upgrade migrations; the subsequent user-approved local recovery and its same-engine rehearsals are recorded separately.
