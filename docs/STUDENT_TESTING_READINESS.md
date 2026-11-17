# Student testing readiness

Review date: **2026-11-14 (Asia/Manila)**. Project: `C:\KNOXITE\SkillSwap`. Branch: `dev-justine`.

## Readiness decision

**The existing application is ready for supervised engineering/alpha rehearsals using synthetic accounts. Real-student account activation and a remote beta release are not yet cleared.** Academic department mapping verification is complete; no mapping recreation is required. Remaining gates concern real institutional eligibility/mail delivery, reviewed assessment content, privacy/research arrangements and authorized release preparation. The team subsequently confirmed the three first-year-only program settings are intentional for newly offered programs; they must be preserved.

This review continues the completed work. It does not repeat WRMR development or the full lifecycle suite, change the 50/30/20 formula, adjust cancellation policy, recreate academic mappings, publish questions, enable Google, or change the thesis. Prior test totals remain historical and are distinguished from the focused checks below.

Only the verified **recovery-1** synthetic environment was used: MySQL `127.0.0.1:3311/knoxite_sandbox_recovery_1_dev`, API 5012, browser frontend 5180. Docker container/volume identity, exact mount/loopback port, private checkpoint and signed API challenge passed before inspection/testing. The original `localhost:3306/knoxite` database and all production services were not accessed. No services were force-stopped, data reset/deleted, schema migration executed, or Git commit/push/merge/deployment performed.

## 1. Academic configuration — mapping verification complete

Read-only snapshot: **2026-11-14 10:56:52 UTC / 18:56:52 Asia/Manila**.

- Source `knoxite-backend/config/academic-catalog.json` defines all 13 exact program labels and four initial years. `config/provisional-departments.json` defines their nine college relationships; `services/departmentDraft.ts` verifies complete, nonduplicated program-code coverage.
- The database now contains **13/13 assigned, active and validated college-program mappings**, all matching the source relationships. Each has a validation timestamp, nonempty evidence notes, reviewer ID belonging to an existing active administrator, and a positive mapping version.
- Programs in the same college use the **same department ID**. Nine distinct department IDs serve the 13 programs. There is no split between BSCS/BSIT, BSACC/BSAIS, or the three hospitality programs.
- Active department names are unique. The two redundant archived records (`CCS` and `COLLEGE_ARTS_SCIENCES`) remain inactive with zero program links. The linked canonical records are retained.
- The source draft's `PROVISIONAL` provenance label remains distinct from the database's validated runtime mappings. It does not override the database validation status. The team's confirmation is acknowledged; this technical check verifies stored metadata and consistency, not independent authentication of institutional source documents.
- Six clearly identified fictitious programs from the earlier lifecycle tests are separate from these 13 real catalog labels. They were neither promoted into the official catalog nor deleted. No source or database academic configuration was changed in this review.

| Program | Stored active department | Source match / database validation | Enabled years in this sandbox |
| --- | --- | --- | --- |
| BSACC | College of Business and Accountancy | Matches; validated | 1st–4th |
| BSAIS | College of Business and Accountancy | Matches; validated; same ID as BSACC | 1st–4th |
| BSCRIM | College of Criminal Justice | Matches; validated | 1st–4th |
| BSCS | College of Computer Studies | Matches; validated | 1st–4th |
| BSIHM-CA | College of Hospitality and Institutional Management | Matches; validated | **1st only** |
| BSIHM-HACLO | College of Hospitality and Institutional Management | Matches; validated; shared hospitality ID | **1st only** |
| BSIT | College of Computer Studies | Matches; validated; same ID as BSCS | **1st only** |
| BSMLS | College of Medical Laboratory Science | Matches; validated | 1st–4th |
| BSN | College of Nursing | Matches; validated | 1st–4th |
| BSPT | College of Physical Therapy | Matches; validated | 1st–4th |
| BSTom | College of Hospitality and Institutional Management | Matches; validated; shared hospitality ID | 1st–4th |
| BS PHARM | College of Pharmacy | Matches; validated | 1st–4th |
| BS PSYCH | College of Arts and Sciences | Matches; validated; canonical code CAS | 1st–4th |

### Program-year configuration — clarified as intentional

**BSIT, BSIHM-CA and BSIHM-HACLO intentionally have only 1st Year associated with them**, as the team clarified during the preset-catalog task: these are newly offered programs. Their college mappings are correct and validated. The generic source catalog defines four possible year levels, while database program-specific associations correctly constrain these three programs. This is not missing department evidence or a WRMR defect.

An actual browser read of registration confirmed the three one-year dropdowns and BSCS's four-year dropdown. Students in years 2–4 of those three programs cannot select their year under the current settings. The backend also validates program/year associations. Existing student records are retained; no historical records were rewritten.

Do not enable years 2–4 for those three programs or recreate their departments. Their existing database configuration remains unchanged. Any future additional year levels require the team's separate configuration authorization.

Relevant code: `services/academics.ts`, `routes/auth.ts`, `routes/profile.ts`, `routes/admin.ts`, `src/app/pages/SignupPage.tsx`, `ProfilePage.tsx`, `AssessmentAdminPage.tsx`.

## 2. Registration, authentication and delivery

| Feature | Implemented/current behavior | Readiness |
| --- | --- | --- |
| Standardized registration | API-backed program/year options; backend rejects unsupported program/year selections; no SHS strand flow | Ready for synthetic rehearsal; preserve the intentional first-year-only programs |
| Email/password login | Backend password, verification, current role/suspension and database session checks | Working; live Alice/Admin login succeeded using normal forms |
| Institutional account rule | Configurable exact domain plus nonempty identifier ending in the campus suffix | Software gate present; real campus/current-college eligibility still requires institutional confirmation |
| Email verification | Random hashed one-use link, 30-minute expiry; unverified accounts cannot sign in under required-verification policy | Works with captured synthetic delivery; real delivery not configured |
| Password recovery | Real recovery page/API; one-use purpose-separated reset link, 15-minute expiry; reset revokes sessions and does not waive verification | Implemented; prior live synthetic journey verified it; delivery/negative-path checks refreshed here |
| Unavailable delivery | Account-independent unavailable response and explanatory UI; no false claim of a sent message | Focused backend/UI tests passed |
| Google Sign-In | Implemented but disabled; backend token/challenge/linking controls retained | Keep disabled; no SDK/client/real Workspace access enabled in this task |

The current sandbox deliberately accepts **`students.knoxite.test`**, with suffix `lag`, mandatory email verification, campus-confirmation flag false and Google false. It uses a separately guarded synthetic entry point and local captured mail. This is not a production verification bypass and does not establish that an institutional email address proves current Santa Rosa college enrollment.

A non-secret presence-only check of the ordinary local backend `.env` found: default webhook provider, no webhook endpoint/credential, no Resend key/From address, sender approval false, campus-rule confirmation false, Google false, verification required. No credential values or database connection were printed or used. **Real verification/recovery delivery is currently unconfigured locally.** Production configuration was not inspected and cannot be inferred from the local files.

Before real-account testing, the authorized team must provide:

1. Confirmed institutional email domain, signed Workspace domains if Google is ever enabled, campus identifier and the method for establishing current college enrollment, including staff/alumni/SHS/other-campus exceptions. Program self-selection and mailbox ownership alone do not independently prove enrollment.
2. Either the approved HTTPS delivery webhook plus its private bearer credential, or the prepared Resend integration's private sending key and approved From address/domain. Do not use Resend's endpoint as the custom webhook URL: their JSON contracts differ.
3. Accountable sender/domain ownership, required sender-domain authentication, a monitored support contact and approved processor/privacy arrangements. Do not invent permission to send as OLFU.
4. Correct approved `PUBLIC_APP_URL`/origins and an authorized actual-mail pilot covering inbox/spam/bounce, link origin/fragments, expiry, single use, resend, delivery failure, reset and session revocation. Provider acceptance is not proof of inbox delivery. No such external pilot was run here.

Use `docs/EMAIL_DELIVERY_SETUP.md`, `services/email.ts`, `services/resendEmail.ts`, `routes/auth.ts`, `services/authSessions.ts`, `middleware/authMiddleware.ts`, and `docs/GOOGLE_SIGN_IN.md`. Google has its separate Workspace, eligibility, client and security-review gates; do not enable it to work around unconfigured mail.

## 3. Skill assessment readiness

**Current database: zero assessment banks and zero assessment versions.** Therefore there are no published real skill-specific basic or advanced assessments for students to take. This is a content/configuration gap, not failure of the existing engine. No bank was generated, imported, validated or published by this task.

| Aspect | Existing implementation | Status |
| --- | --- | --- |
| Scope/default | Assessment applies to an active offered user-skill; a new offered skill starts Not Assessed | Ready |
| Basic / Amateur | Ten curated foundational MCQs; initial 80% threshold, administrator-set per version | Engine ready; needs reviewed content |
| Advanced / Verified | Five–ten applied scenario-choice tasks with rubrics; initial 80%; requires this offered skill's basic pass and Amateur progression | Engine ready; needs reviewed content |
| Grading/authorization | Backend scores stored item/answer IDs; client submits answers, not scores/tiers; ownership checked; answer keys/rubrics and private attempts excluded from public profiles | Existing safeguards retained; focused grading/tampering checks passed |
| Retakes | Three starts per rolling 168 hours per offered skill/level, 24-hour cooldown after failure/expiry; active attempt resumes; history spans versions and retained offering records | Backend policy retained and focused tests passed |
| Failure/postponement | Advanced failure or postponement retains Amateur; earned tiers are not downgraded | Focused unit/UI checks passed |
| Unavailable skill | Explicit unavailable message; no arbitrary fallback quiz or misleading active assessment action | Focused desktop/mobile checks passed |
| Skip | Skill is saved first; supported-skill skip has confirmation and persisted dismissal; teaching/swapping remain available; assessment can be resumed later when supported | Existing UI checks passed; no new eligibility barrier |
| WRMR independence | Tiers are public trust information, absent from rating/completion/proximity formula | Source verified; prior successful lifecycle used Not Assessed students |

The server currently fixes the retake policy through `RETAKE_POLICY`; do not assume the administrator's configurable passing threshold also exposes arbitrary retake-policy changes. Basic/advanced versions retain attempt timing, outcomes and grading snapshots. Publishing a new content version does not erase attempts or earned tiers.

Before real assessments become available, subject reviewers must supply supported skill IDs, narrow outcomes, item blueprint, question pools/options/keys, applied rubrics, content provenance, reviewer/date/evidence, accessibility/ambiguity review and approved pilot limits. Import drafts, record completed human validation, then publish through the existing administrator workflow. Synthetic fixture banks from software tests must not be reused as validated student content.

Verified currently means a pass on **advanced scenario-based reasoning**, not independently writing/executing code, observed hands-on competency or professional certification. Unsupported practical formats should remain unavailable. Do not introduce an execution service or broaden the research claims without separate approval.

Relevant files: `services/assessmentService.ts`, `assessmentRules.ts`, `bankValidation.ts`, `routes/assessments.ts`, `routes/admin.ts`, `prisma/schema.prisma`, `src/app/components/AssessmentBadge.tsx`, `src/app/pages/MySkillsPage.tsx`, `AssessmentPage.tsx`, and `docs/ASSESSMENT_VALIDATION_GUIDE.md`.

## 4. Alpha/beta workflow preparation

| Planned workflow | Evidence and practical test instruction | Current limit |
| --- | --- | --- |
| 1. Register/login | Existing real synthetic registration → captured verification → login/recovery/revocation journey previously passed. Current login, invalid-domain/unsupported-SHS rejection and email-failure handling checked | Real mailbox delivery/current-college eligibility pending; three program-year restrictions |
| 2. Manage profile | Existing profile update/API and public portfolio; previous lifecycle exercised normal academic updates; current authenticated profile navigation passed | Student academic selections are self-declared; do not treat them as enrollment proof |
| 3. Add offered/wanted skills | Existing save-first offered skill/default tier and wanted-skill APIs, validated by earlier live lifecycle; skip/unavailability UI checks refreshed | All real assessments currently unavailable |
| 4. Reciprocal discovery | Previously passed continuous actual-API/browser lifecycle and nonreciprocal exclusion; current live match API read succeeded | Initially unranked students remain eligible; do not invent history for study participants |
| 5. Send/receive requests | Earlier lifecycle passed request, acceptance and duplicate/active-pair restrictions using normal APIs | Use intentionally reciprocal skills and separate synthetic accounts in rehearsal |
| 6. Bilateral approval | Earlier lifecycle passed one-approval pending then two-approval confirmation of current revision | Do not reduce to unilateral approval for convenience |
| 7. Sessions | Earlier lifecycle passed both participants' session acknowledgement and duplicate protection | Each participant must acknowledge; one side alone cannot supply completion |
| 8. Peer reviews/completion | Earlier lifecycle passed two validated reviews, integer rating/ownership constraints and validated completion | Do not infer observed teaching quality or actual learning solely from synthetic completion |
| 9. WRMR/analytics | Earlier complete lifecycle demonstrated first score and later balanced recalculation; metrics agreed across matching/profile/analytics. Current personal analytics API and admin page work | `/analytics` is intentionally ADMIN-only. Students see relevant profile/match metrics; do not promise a separate full student system-analytics dashboard |
| 10. Report/moderate | Fresh actual browser: public profile report link prefilled target; student submitted OTHER; administrator dismissed through UI; reporter saw final disposition. Target could not list another student's report, student moderation returned 403, closed disposition overwrite returned 409 | One clearly labelled synthetic check retained; no misconduct allegation, suspension or penalty |

The full WRMR lifecycle was **not repeated** because it already passed and its source/policies were preserved. See `docs/ACADEMIC_WRMR_LIFECYCLE_VALIDATION.md` for its dated expected/actual values and limitations. Earlier full-test counts in that report and `VALIDATION.md` are historical, not freshly executed results for this review.

### Practical session setup

```powershell
cd C:\KNOXITE\SkillSwap
npm run sandbox:check
npm run sandbox:copy-password -- alice
```

Use `http://localhost:5180/login` and the synthetic account details obtained privately through the existing sandbox commands. Do not paste credentials into research documents, screenshots or shared logs. Use separate browser profiles/private contexts for the two participants and administrator. Existing synthetic histories and fixture labels remain intact; no reset/repair/migration is needed for this readiness task.

The sandbox is intentionally loopback-only. `localhost:5180` on a participant's own computer does not reach this workstation. Supervised local rehearsals can use this environment; a remote multiuser beta needs a separately authorized staging/release environment, approved HTTPS origins, secure mail/eligibility configuration and data-management arrangements. Do not expose the MySQL container or use the existing production deployment as an unreviewed shortcut.

Follow the existing planned alpha/beta workflow and approved participant/instrument arrangements. A software rehearsal is not formal research approval. Preserve the distinction between technical verification, participant usability/acceptance responses and actual exchange-outcome evidence. A cohort with no validated history cannot establish empirical WRMR ranking effectiveness. No study responses, acceptance results or learning gains are invented here.

## 5. Privacy, consent and approval gates

Before collecting real study data, the responsible team/institution must finalize:

- The participant-facing privacy notice, accountable responsible contact and monitored support/recovery channel; access to public portfolios, messages, reports, assessments and administrative information must be accurately described.
- Research consent/withdrawal procedures and the approved questionnaire/instrument. The signup checkbox exists in the UI, but the current email/password registration API does not persist a versioned consent record. Do not claim durable in-app consent evidence that is not stored. If such storage is required, obtain approval before a schema/policy change; an approved external consent procedure must be documented accurately.
- Separate retention/deletion arrangements for research survey files, operational accounts/exchange history, messages, assessment attempts, reports, captured sandbox mail and backups. Do not silently apply the thesis's survey-file retention wording to every application record. Self-service account export/deletion is not currently implemented, and preserved exchange history must be accounted for.
- Approved processor/sender arrangements and security of verification/reset links. Captured synthetic mail is private development data, not a real provider-delivery record.
- Authorized deployment containment/release: effective production JWT-key rotation/old-token rejection, known production database owner/provider, backups/restore proof, sanitized migration rehearsal, legacy reconciliation and rollback. These remain unverified external release requirements; this task made no production connection or change.

The existing eight-characteristic ISO instrument edition, statistical interpretation and cancellation-attribution questions remain in `docs/THESIS_ALIGNMENT_AND_PENDING_REVISIONS.md`. They are research-team/adviser decisions; no software policy was changed to resolve them. Current department mapping has passed the database consistency check and should not be reopened or recreated as an algorithm task.

Relevant privacy/source records: `src/app/pages/PrivacyPolicyPage.tsx`, `SignupPage.tsx`, `routes/auth.ts`, `docs/DEPLOYMENT_READINESS.md`, `docs/SECURITY_RELEASE_REVIEW.md` and the earlier alignment report.

## 6. Fresh focused checks

| Check | Result and scope |
| --- | --- |
| `npm run sandbox:diagnose` | Selected recovery-1 settings/checkpoint, exact Docker resources and signed live backend identity verified. No services reset/restarted |
| Guarded academic/bank SELECT-only snapshot | 13/13 expected assignments/validation metadata and nine consistent department IDs; three program-year restrictions identified; zero assessment banks/versions; archived unused duplicates retained |
| Focused backend rules/delivery command below | **12 passed, 0 failed**; backend grading, tampering, randomization, promotion, retakes, bank-format constraints, institutional/production gates and email-unavailability/template/rate-limit behavior |
| Focused Edge desktop/mobile assessment/delivery command below | **8 passed, 0 failed**; persisted skip, unsupported assessment handling, basic pass → advanced failure with Amateur retained, unavailable-mail explanation |
| Actual Edge/API smoke checks | Normal student/admin login; profile/My Skills/KnoxHub/security navigation; current signup year lists; rejected noninstitutional/unknown-SHS registration; student system-analytics redirect; personal analytics API 200; admin System Analytics rendering; full reporter/admin disposition flow and privacy/authorization checks passed |
| Preservation | Academic administration payload and private sandbox settings unchanged across live checks; no mapping, bank, tier, profile or password updates. One new labelled synthetic report, dismissed without sanction, and normal temporary login/logout sessions retained |
| Final account/file checks | `sandbox:check` passed all four seeded account/hash/verification/role/suspension checks. All 241 pre-task public Git files remain byte-for-byte unchanged; only this report was added. Thesis SHA-256 unchanged; branch still dev-justine; whitespace/diff checks passed |

Focused commands actually executed:

```powershell
node --test --test-concurrency=1 --test-name-pattern='campus domain|department comes|backend grading|tampered|randomization|tier promotion|retake rules|bank publishing|production activation|unconfigured delivery|configured mail delivery|recovery requests' knoxite-backend/dist/tests/rules.test.js knoxite-backend/dist/tests/email-delivery.test.js
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:browser -- workflows.spec.ts account-recovery.spec.ts --grep 'saving a supported offering|unsupported teaching skills|basic pass uses|unconfigured email is explained'
```

Fresh automated total: **20 passed, 0 failed**. The additional actual-browser/API smoke checks are reported separately, not counted as new automated test cases. No broad full-suite, WRMR lifecycle, destructive integration, migration, production-provider or real-Google test was repeated. No frontend/backend rebuild was required for a documentation-only change. Existing generated/backend code was used without regeneration or migration.

## 7. Defects, exact changes and next task

**No new confirmed application-code defect required a source correction during this readiness review.** The three one-year program configurations were subsequently confirmed intentional and are no longer an open discrepancy. The absence of assessment banks and real email credentials are configuration/content gaps. Incomplete institutional/privacy/release evidence is an external approval/readiness issue. These were not papered over by changing authentication, schemas or research rules.

Only one repository file was added in this task: **`docs/STUDENT_TESTING_READINESS.md`**, this report. No existing app/test/documentation file was modified. Earlier uncommitted work remains preserved; the thesis remains unchanged. No commit, push, merge, remote change or deployment occurred.

**Recommended next implementation/configuration task:** approve/configure real verification and recovery delivery for an isolated authorized pilot and prepare subject-reviewed assessment content using the preset catalog's six planning templates. Prioritize eligibility/privacy/support arrangements before real account recruitment. Preserve the now-correct 13 college mappings and intentional first-year-only settings; do not repeat approved WRMR development.
