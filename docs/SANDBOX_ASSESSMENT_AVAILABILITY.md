# Sandbox assessment availability

Date: **2026-11-14 (Asia/Manila)**. Checkout: `C:\KNOXITE\SkillSwap`; branch: `dev-justine`.

## Result and boundary

**You can now take assessments in the normal browser at http://localhost:5180.** The verified `recovery-1` sandbox has **14 persistent test-only banks**: Basic and Advanced for seven existing presets, totalling 112 questions. Refresh an assessment page that was already open so it reloads availability. No application restart is needed for these database-backed bank additions.

All imported titles, learning-outcome descriptions, question prompts and validation notes carry **SYNTHETIC TESTING ONLY — NOT SUBJECT-REVIEWED**. The original six draft files remain unchanged and academically unreviewed. JavaScript has a new unreviewed draft. Publishing these banks for the isolated software demonstration is not approval to publish them for real students.

Only this environment was used: MySQL `127.0.0.1:3311/knoxite_sandbox_recovery_1_dev`, API 5012, frontend 5180. Container/volume ownership, exact mount/loopback topology, private checkpoint, development branch, synthetic-only configuration, reserved-domain account addresses and signed backend identity were verified before access. The original `localhost:3306/knoxite` and production services were not accessed.

## 1. Available skills

| Existing preset | Category | Basic → Amateur | Advanced → Verified | Availability |
| --- | --- | --- | --- | --- |
| Python Programming Fundamentals | Technology | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| Bookkeeping Fundamentals | Business | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| Introductory Statistics | Academic | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| English Grammar | Language | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| Food Safety and Hygiene | Lifestyle | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| Chess Fundamentals | Other | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |
| JavaScript Fundamentals | Technology | 10 MCQs | 6 scenario MCQs | Persistent sandbox only |

Each question has four choices and one correct answer. Version 1 is published for each of the 14 banks. Basic is still 80% (8/10); Advanced is still 80%, which requires at least 5/6 with these equal-point six-item forms. Default durations remain 20 and 45 minutes. The existing Amateur plus basic-pass prerequisite, 24-hour failed/expired-attempt cooldown and maximum three starts per skill/level in 168 hours remain enforced. There is no testing override for your manual attempts.

The other 73 presets remain available for skill swapping without an assessment. For example, **SQL Fundamentals** and **Java Programming Fundamentals** still display **Assessment Unavailable**. A wanted skill does not earn an assessment tier; results belong to the individual offered-skill relationship. Skipping Basic leaves Not Assessed; postponing/failing Advanced preserves Amateur. Assessments do not affect WRMR or leaderboard eligibility.

## 2. Why this uses the existing workflow

The inspection of `knoxite-backend/routes/admin.ts` and `src/app/pages/AssessmentAdminPage.tsx` found an authenticated ADMIN import → record human-validation notes → publish workflow. Its assessment validation action records the acting administrator, server timestamp and free-text notes about coverage/correctness/format/grading. It does not require a faculty identity, faculty qualification field or an institutional-approval checkbox. The separate academic-department confirmation checkbox was not used or changed.

Under the user's explicit authorization, the existing synthetic administrator's action records an **administrative software-fixture check**, accurately labelled as not subject review. No faculty person, qualification, review date or academic approval was invented. Published-bank gating and backend structural validation were used normally; no status field was written directly to bypass those APIs. If a future institutional workflow requires a genuine subject-review attestation, this test attestation cannot satisfy it.

The existing schema has no separate test-content boolean. Separation here is provided by the strictly isolated synthetic database/entry point and conspicuous labels. These records must never be copied into a real-student database as approved banks, and the sandbox database must not become a production seed or migration source.

### Actual metadata recorded

- `createdById` and `validatedById`: the existing **Synthetic Admin** account acting through its normal authenticated session. These identify the administrator actor, not a faculty reviewer.
- `validatedAt`: actual backend timestamps on **14 November 2026, 21:28:20–21:28:23 Asia/Manila**; not an academic review date.
- `status`: PUBLISHED; `version`: 1; normal `publishedAt` timestamps were recorded by the existing endpoint.
- `validationNotes`: the test-only label; administrative software-fixture purpose; explicit denial of academic subject review/faculty qualification/campus content approval/professional certification; restriction to the verified sandbox; the user's authorization; and a SHA-256 content fingerprint.
- Draft-file `review` metadata: still `NOT_REVIEWED`, with reviewer/date/evidence null. It was not rewritten to mirror the software test metadata.

## 3. How the content was prepared

The six original authoring envelopes are compatible with `services/bankValidation.ts` after extracting their `basic` and `advanced` payloads and resolving the placeholder to the correct existing canonical Skill UUID. The outer authoring envelope is not itself an import payload. The command resolves IDs through the authenticated catalog; it does not create skills or use aliases/legacy lookalikes.

`knoxite-backend/development/assessmentDemo.cjs` is an explicitly invoked development command. It copies a payload in memory, adds the testing labels, validates it using the existing validator, then calls the existing administrator endpoints. Source drafts are not edited. There is no production route, environment bypass, startup seeding or automatic publication hook.

The command refuses unsafe profiles/configuration, missing ownership proof, real-address records, different existing content, unexpected creator/validation metadata, retired versions or duplicate versions. It preflights all targets before writing, uses a private exclusive operation lock, logs no passwords/tokens/keys, and compares protected student/exchange/academic state before and after import. A partial operation can be reviewed and retried against matching drafts; it never deletes, overwrites or retires an unrelated bank.

Initial preparation created 14 versions. A second preparation **reused all 14 and created zero versions**. The authenticated `check` command passed. A private manifest of canonical IDs, version IDs and fingerprints is stored at `%LOCALAPPDATA%\Knoxite\sandbox\recovery-1\assessment-demo.json`; it contains no password, token or answer key. A remaining `assessment-demo.lock` after an interrupted command should be reviewed rather than used as a reason to reset data.

### JavaScript draft

New file: `knoxite-backend/content/drafts/javascript-fundamentals.json`. It contains 10 foundational and six applied questions, keys, explanations, objectives, explicit unreviewed status, references and a review checklist.

Basic covers types, reassignment, const/object mutation, strict equality, arrays, truthiness, functions, loops and properties. Advanced covers filter/reduce boundaries, missing arrow-function returns, array copying, promise order, numeric conversion and closure state. All 16 authored code examples were executed offline and matched their expected output. Relevant references include [MDN const](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const), [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map), [promise callbacks](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then) and [closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures).

`tools/verify_javascript_draft.cjs` is an offline developer check for trusted authored content. Node's VM is not a security boundary, and this is not a production or student-code execution service. The existing engine continues to grade selected options; it does not execute student programs. Advanced assesses scenario reasoning, not observed coding proficiency or professional certification.

## 4. Manual testing — student

Run these commands from your normal PowerShell:

```powershell
cd C:\KNOXITE\SkillSwap
npm run sandbox:start
npm run sandbox:check
node knoxite-backend/development/assessmentDemo.cjs check
npm run sandbox:copy-password -- alice
```

`sandbox:start` should report **Synthetic sandbox ready** for recovery-1. The final command copies Alice's existing password to your clipboard without printing it. It does not reset the password. If you need the other synthetic account names/emails, use `npm run sandbox:accounts` privately; do not share its credential output.

1. Open **http://localhost:5180/login** in Chrome or Edge. Confirm the **Synthetic development sandbox (recovery-1)** banner.
2. Sign in as **alicelag@students.knoxite.test**, pasting the copied password. Existing email verification, password, session, role and suspension checks remain enabled.
3. Open **My Skills**. If JavaScript Fundamentals is already offered, use its **Take Assessment** action. Otherwise choose **+ Add Skill → Teaches → Technology → search JavaScript → select JavaScript Fundamentals → Save Skill**.
4. Choose **Take Basic Assessment** in the saved-skill dialog. On the eligibility page, check the testing-only notice and click **Take Basic Assessment** to start. If you are already on an old assessment page showing unavailable, refresh it.
5. Read the ten questions, select your own answers, and click **Submit Assessment**. Confirm the submission. The backend calculates the result; no answer key is returned in the student attempt payload.
6. A pass earns **Amateur** for JavaScript only. Choose **Take Advanced Assessment** in the success dialog, then start it from the eligibility page. Alternatively choose **Maybe Later** and return through **Upgrade to Verified** on My Skills.
7. Answer the six scenario questions and submit. A pass earns **Verified** for that offered skill. It is a Knoxite test result, not an external certification or observed practical performance.
8. Return to **My Skills** to see the badge. Use **Assessment history** to view the level, attempt number, result and date. Selecting a history entry shows that attempt's score/result.

If you fail or let an attempt expire, keep the history and follow the displayed cooldown/next-eligible time. Do not recreate an account/skill or reset timestamps to bypass the policy. Existing active attempts can be resumed. Previously earned Amateur/Verified remains intact.

You may select **Skip for Now → Confirm Skip** and continue matching/swapping. The warning is dismissed through the existing prompt endpoint; the skill stays Not Assessed. Choosing another preset without a published bank still gives Assessment Unavailable.

The bank records survive normal `sandbox:stop`/`sandbox:start` because the existing database volume is retained. There is no need to reimport them after restart, and no forced reset is appropriate. If deliberate future bank changes are needed, review them through the administrator workflow rather than blindly rerunning preparation.

## 5. Manual testing — administrator

Use a separate private window or log out of the student account first:

```powershell
cd C:\KNOXITE\SkillSwap
npm run sandbox:copy-password -- admin
```

Sign in with the existing **Synthetic Admin** account (`adminlag@students.knoxite.test`), then open **http://localhost:5180/admin/assessments**. Under **Banks and versions**, locate each skill's BASIC and ADVANCED entries. The learning outcomes and validation notes display the testing-only status; each shows Version 1 / PUBLISHED and its question count/threshold. The existing **Inspect private questions and grading** control is administrator-only; it is not a student answer API.

Do not replace test notes with fictional faculty evidence. Do not edit academic mappings/year-level controls while testing assessment content. Retiring a bank through the existing administrator action disables new attempts while preserving historical attempts and badges; no retirement was performed in this task.

For repeatable diagnostics only:

```powershell
node knoxite-backend/development/assessmentDemo.cjs check
```

The preparation command is `node knoxite-backend/development/assessmentDemo.cjs prepare`. It is guarded and repeatable for the same exact test content, but is not required for normal use. It accepts no database URL, remote API override or production mode. It records only software testing metadata in a verified synthetic environment.

## 6. Verification performed

Fresh results for this task:

| Check | Actual result |
| --- | --- |
| Backend regression suite/build | **105 passed, 0 failed**; includes draft compatibility, JavaScript execution and guarded/idempotent preparation cases |
| Normal persistent sandbox browser workflow | **2 passed**, desktop 1280×900 and mobile 390×844 |
| Existing rollback-only assessment browser/API demonstration | **2 passed**, desktop/mobile |
| Existing live preset/reciprocal/unavailable-bank regression | **1 passed** |
| Frontend build and type check | Passed; existing bundle-size warning remains |
| Backend explicit type check | Passed; Prisma Client already matches the unchanged schema |
| Strict standalone TypeScript check for affected sandbox tests | Passed |
| Draft verification | 7 files/112 items; 16 JavaScript and 15 Python examples executed, 13 numerical answers recomputed, 3 additional checks passed |
| Persistent bank preparation/check/repeat preparation | 14 created initially; all 14 reused on repeat; all 14 confirmed published, labelled and version 1 |

Total newly executed successful coverage: **110 distinct test cases** (105 backend + 5 actual sandbox/browser cases). Earlier 153-test totals are historical and are not presented as fresh results. The broad mocked browser suite and full exchange/WRMR lifecycle were not repeated because application algorithms/interfaces were not changed.

The persistent browser cases use normal registration, captured verification mail, login, the real preset modal and real assessment APIs. They verify readable 10/6-item forms, no `isCorrect`/rubric/answer-key fields in student attempt payloads, backend scores, Amateur/Verified prerequisites/progression, accurate history, administrator-only bank navigation, skip confirmation, an unassessed reciprocal match/request, unavailable SQL and mobile layout. Correct-choice oracles exist only in the private test-side database connection, never in the student-facing API.

The retained rollback-only cases verify failed Basic, failed Advanced preserving Amateur, forged-score/option rejection, ownership rejection, cooldowns, expired attempts, three-start limits, randomization persistence, independent offered-skill progress and remove/re-add tier/history preservation. They now use the unsupported **Java Programming Fundamentals** fixture, so the newly persistent Python bank does not invalidate the test's initial unavailable-bank premise. Their synthetic banks/results are still rolled back, leaving shared history intact.

Relevant commands:

```powershell
npm --prefix knoxite-backend test
python tools/verify_draft_assessments.py
npm run typecheck
npm run build
npm run test:sandbox -- tests/sandbox/persistent-assessments.spec.ts tests/sandbox/assessment-activation.spec.ts tests/sandbox/preset-catalog.spec.ts
```

Sandbox test tracing, screenshots and video remain disabled to avoid capturing login credentials/tokens. All nonlocal browser requests were blocked. Existing Alice, Bob, Casey and Admin passwords, identities, skill associations and assessment progress were not changed by the tests.

## 7. Records created and preservation

Persistent demonstration content created through the existing administrator APIs:

- **14 AssessmentBank**, **14 AssessmentVersion**, **112 AssessmentItem** and **448 AssessmentOption** records.
- No skills, program mappings, year-level relationships, student tiers, assessment attempts or fake faculty identities were created by the importer.
- Normal administrator authentication sessions were issued/revoked. No credentials were changed.

Separate browser verification retained clearly labelled synthetic test history:

- Four `SYNTHETIC ASSESSMENT DEMO QA ...` users (two actors and two peers), their eight offerings, four passed JavaScript attempts and two pending reciprocal requests. The two actors earned synthetic Amateur then Verified through actual grading.
- Two additional labelled catalog-regression users and their two offerings/reciprocal wanted associations.
- No completed exchange, peer rating or successful-exchange statistic was fabricated. No existing student was awarded a tier by an administrator/script. All prior history was retained; nothing was deleted/reset.

The final skill table still contains the same 90 rows, including historical custom skills and all 80 presets. The existing 13 validated academic mappings/nine departments were preserved. BSIT, BSIHM-CA and BSIHM-HACLO still have only 1st Year enabled. The importer compared protected record snapshots; browser tests separately confirmed that previously existing users/relations, academic records, skills and bank content were unchanged. Rollback fixtures left no persistent banks/accounts/results behind.

## 8. Exact files changed

Paths below are relative to `C:\KNOXITE\SkillSwap` and describe this task's changes only. Earlier uncommitted work is preserved.

New:

- `knoxite-backend/content/drafts/javascript-fundamentals.json` — 16 unreviewed demonstration questions, keys/explanations/objectives/review checklist.
- `knoxite-backend/development/assessmentDemo.cjs` — guarded, explicit sandbox-only API preparation/check command.
- `knoxite-backend/tests/assessment-demo.test.ts` — compatibility, labels, reuse/conflict refusal and unsupported-command regressions.
- `tools/verify_javascript_draft.cjs` — trusted offline JavaScript answer checks.
- `tests/sandbox/persistent-assessments.spec.ts` — normal desktop/mobile login and persistent-bank student/admin workflows.
- `docs/SANDBOX_ASSESSMENT_AVAILABILITY.md` — this report and manual instructions.

Existing:

- `knoxite-backend/tests/draft-assessments.test.ts` — include the seventh draft and JavaScript answer verification.
- `tools/verify_draft_assessments.py` — verify seven envelopes and invoke the JavaScript checker.
- `tests/sandbox/assessment-activation.spec.ts` — use an unbanked Java fixture to preserve rollback-only unavailable-bank coverage.
- `tests/sandbox/preset-catalog.spec.ts` — use unbanked Java/accounting-information-systems presets to preserve unavailable-bank coverage after the authorized additions.
- `docs/PRESET_SKILL_RESTRICTIONS_AND_ASSESSMENT_ACTIVATION.md` — link this later authorization without rewriting historical test results.

No application grading/authentication/matching service, student/admin interface, schema, dependency, 80-skill definition, academic mapping or year-level setting was changed. No thesis edit, original-database access, production access, commit, push, merge or deployment occurred. Google remains disabled.

Final baseline comparison confirmed exactly five existing-file edits and six new files, with no unexpected changes/deletions. The original six drafts, protected application/schema/configuration/dependency files and thesis SHA-256 were unchanged. Git HEAD remained `2d02411` on `dev-justine`. Whitespace and changed-file credential/private-key/real-institutional-address pattern checks passed. Final `sandbox:check` passed backend ownership and all four seeded account credential/verification/role/suspension checks; no passwords or tokens were printed.

## 9. Review required before real publication

All seven banks remain academically unreviewed. Real publication requires genuine subject-expert review of outcomes, item accuracy, plausible distractors, ambiguity, accessibility, scope, answer explanations, grading fairness and current references, plus real reviewer identity/qualification/date/evidence and team authorization. Food-safety reviewers must confirm current applicable campus/local procedures; no local numeric safety limits were invented. Original source references/checklists remain in the draft files.

Public repository answer keys and exactly-sized item pools are suitable for this demonstration but are not confidential or broad examination pools. Review content exposure, pool expansion and intended interpretation before a student assessment study. No new secrecy/retake policy was silently introduced.

Do not migrate these synthetic bank records, software-test validation notes or earned synthetic badges into a real-student environment. Real email/sender configuration, institutional eligibility evidence, privacy/consent/retention contacts and authorized release/production-database preparation remain separate external requirements. This task supplies a local demonstration, not research evaluation results or empirical evidence of learning gains.
