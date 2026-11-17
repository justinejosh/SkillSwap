# Academic configuration and WRMR lifecycle validation

Date: 2026-11-13 (Asia/Manila). Project: `C:\KNOXITE\SkillSwap`. Branch: `dev-justine`.

## Outcome and scope

The existing implementation successfully transitions newly registered, verified synthetic students from reciprocal **unranked** discovery to their first WRMR score, then recalculates after repeated partners, a second distinct partner, cancellations and further valid completion. No application defect was established in this focused exercise. No application, schema, formula, metric policy or institutional mapping was changed.

The previous audit's ten app/test/documentation files and all earlier implementation files were reviewed and preserved. Its 157 passing tests remain historical results; they are not counted as freshly executed here. This task adds only a focused sandbox regression and this report, without repeating the full thesis/security audit.

The manuscript was not edited or reread as a new audit. Original `localhost:3306/knoxite`, production services, deployment credentials and unverified Docker resources were not accessed. Nothing was reset, deleted, committed, pushed, merged or deployed. Google remained disabled.

## Academic mapping readiness

Source configuration still defines the exact 13 college program labels and four initial year levels. `knoxite-backend/config/provisional-departments.json` covers each program exactly once across nine college relationships; `services/departmentDraft.ts` checks coverage against `config/academic-catalog.json`. Department similarity depends on a shared department ID, not matching program names. Students select a program/year, never a department.

The selected synthetic instance was independently verified before writes: recovery-1, MySQL `127.0.0.1:3311/knoxite_sandbox_recovery_1_dev`, API 5012, frontend 5180. Exact container/volume labels, mount, loopback port binding, checkpoint/settings correspondence and challenge-signed backend response passed. Process ownership was not assumed and no running process was stopped or adopted.

Fresh administrator API reads confirmed that **all 13 actual college-program records remain unassigned and unvalidated**, including absent mapping evidence/reviewer/date and mapping version zero. Their complete returned records were fingerprint-compared before/after the test and were unchanged. This does not establish the original or production database's mapping status. Synthetic fixture programs described below are additional fictitious records, not validated OLFU programs.

### Mapping checklist

For every row, **E1** means evidence identifying the OLFU Santa Rosa confirming office/person, confirmation date, source/document reference, exact program and department assignment, applicable academic period and any exceptions. A single authentic source covering all 13 rows can satisfy multiple rows; separate fabricated documents are unnecessary. The team reports confirmation, but the supporting source still needs to be supplied/recorded by an accountable administrator.

**V1** means: inspect the source; select the canonical active department ID; record the evidence through the confirmed-mapping workflow; reload the program; verify its department, non-null validation timestamp, correct administrator ID, retained evidence and incremented mapping version; verify derived profile/academic API output. The authorized administrator must inspect the actual evidence; the software does not authenticate a document merely because its reference is entered.

| Exact program label | Team-reported department | Verified status for this sandbox | Evidence needed | Verification procedure |
| --- | --- | --- | --- | --- |
| BSACC | College of Business and Accountancy | Unassigned; unvalidated | E1 explicitly covering BSACC | V1; same department ID as BSAIS |
| BSAIS | College of Business and Accountancy | Unassigned; unvalidated | E1 explicitly covering BSAIS | V1; same department ID as BSACC |
| BSCRIM | College of Criminal Justice | Unassigned; unvalidated | E1 explicitly covering BSCRIM | V1 |
| BSCS | College of Computer Studies | Unassigned; unvalidated | E1 explicitly covering BSCS | V1; same department ID as BSIT |
| BSIHM-CA | College of Hospitality and Institutional Management | Unassigned; unvalidated | E1 explicitly covering BSIHM-CA | V1; shared ID with BSIHM-HACLO/BSTom |
| BSIHM-HACLO | College of Hospitality and Institutional Management | Unassigned; unvalidated | E1 explicitly covering BSIHM-HACLO | V1; shared ID with BSIHM-CA/BSTom |
| BSIT | College of Computer Studies | Unassigned; unvalidated | E1 explicitly covering BSIT | V1; same department ID as BSCS |
| BSMLS | College of Medical Laboratory Science | Unassigned; unvalidated | E1 explicitly covering BSMLS | V1 |
| BSN | College of Nursing | Unassigned; unvalidated | E1 explicitly covering BSN | V1 |
| BSPT | College of Physical Therapy | Unassigned; unvalidated | E1 explicitly covering BSPT | V1 |
| BSTom | College of Hospitality and Institutional Management | Unassigned; unvalidated | E1 explicitly covering BSTom | V1; shared ID with BSIHM-CA/BSIHM-HACLO |
| BS PHARM | College of Pharmacy | Unassigned; unvalidated | E1 explicitly covering BS PHARM | V1 |
| BS PSYCH | College of Arts and Sciences | Unassigned; unvalidated | E1 explicitly covering BS PSYCH | V1 |

Internal program codes `BSTOM`, `BS_PHARM` and `BS_PSYCH` are identifiers; the displayed labels above remain exact. No SHS strand/year options were added.

### Exact existing administrative workflow

Relevant files: `knoxite-backend/routes/admin.ts`, `services/departmentDraft.ts`, `services/academics.ts`, `prisma/schema.prisma`, `src/app/pages/AssessmentAdminPage.tsx`.

1. Obtain the actual campus-specific confirmation source. Record the approving authority/date/reference and check all program labels and shared-college assignments. The user's confirmation report is acknowledged, but this task does not invent missing evidence.
2. Sign in using the normal verified administrator account and open `/admin/assessments`. The backend's administrative routes enforce authentication and ADMIN authorization; student attempts are rejected.
3. Review **College programs and department mapping** and **Official academic options**. `GET /api/admin/academic-programs` supplies programs, department IDs, year associations, mapping notes/reviewer/date/version and the draft. The college catalog already exists; initialization is not required for this sandbox.
4. Select/reuse the canonical department record for each college. Before creating/importing, inspect existing codes and names: this sandbox already had `CCS` / College of Computer Studies, while the draft uses `COLLEGE_COMPUTER_STUDIES`. Names are not unique and these are different IDs. Blindly creating another record with the same college name can split same-department comparisons. No department merging, code renaming or deduplication was performed here. Use an approved stable code and a common ID for programs belonging to the same college.
5. If needed, `POST /api/admin/academic-options` with `type: "department"`, a stable code and name creates an active department. Existing codes are unique; the backend uppercases/validates department codes. The draft import action only fills previously unassigned programs and never validates them; it should be reviewed for existing-code conflicts first. A draft alone is not sufficient for proximity.
6. In the confirmed-mapping form, choose the program and department, enter **Official mapping evidence**, and check the explicit confirmation only after verifying its real source. Submit **Save Confirmed Mapping**. The API is `POST /api/admin/academic-programs/:id/department` with `departmentId`, `validationNotes` and `officiallyConfirmed: true`.
7. The backend requires an active configured department, explicit true confirmation and nonempty notes of at most 5,000 characters. It writes `departmentId`, `mappingNotes`, the current `mappingValidatedAt`, the authenticated `mappingValidatedById`, and increments `mappingVersion`. Client-supplied reviewer/date/tier fields are not accepted. This is an administrator attestation mechanism; it does not independently verify the external source or require a structured evidence attachment.
8. Reload and verify V1 for each row. Review the current state before every save: confirmed mapping updates do not take an expected-version argument, unlike provisional edits. No new concurrency/refactoring policy was added in this task.
9. Confirm program/department/year records remain active and program-year associations are correct. `services/academics.ts` ignores missing validation dates/inactive mappings; `publicPortfolio` derives the department from the selected program. Existing user/skill/swap IDs remain intact; students should not select departments separately.
10. Re-run a reciprocal matching check with known reliable outcome history. A valid mapping supplies the academic term, not historical ratings or completions. New users still remain unranked until the other required evidence exists. Never insert false exchange history to obtain a score.

The real-program confirmations above were **not submitted** in this task. Any later original/production configuration work requires its own explicit authorization and appropriate evidence.

## Synthetic lifecycle fixture and safety

The new `tests/sandbox/wrmr-lifecycle.spec.ts` test uses the existing sandbox configuration and normal APIs. It does not seed completion/review/verification flags directly into the database. It verifies branch, closed sandbox target, exact Docker/checkpoint ownership and signed live API identity before creating data. Prisma access is SELECT-only for session/review evidence and baseline counts; no schema command or database write is made through Prisma by this test.

Each run creates clearly named `SYNTHETIC TEST ONLY` departments and programs under a random `wrmr-…` namespace:

- Two fictitious departments; two mapped fictitious programs; a third draft-only fictitious program associated with an active department but without validation.
- Five newly registered `.test` students: a viewer, the scoring subject, a second exchange partner, a one-way/nonreciprocal candidate and a viewer with draft academics. Normal captured-email verification and password login are used; an unverified login is rejected first. No real email is sent.
- Three namespaced teaching/learning skills, all offered skills initially Not Assessed. Assessment tiers are not awarded or used in WRMR.
- Four completed exchanges, one qualifying post-bilateral cancellation, and one cancellation after only one participant approved.

For the two fictitious programs only, the existing API field named `officiallyConfirmed` is exercised with notes explicitly stating **synthetic automated fixture; no institutional evidence or OLFU approval**. This tests the recording mechanism and algorithm gate, not a real-world institutional attestation. The original 13 college-program records are never written. Missing/false confirmation and empty evidence submissions are rejected; student mapping submission is rejected.

All credentials/tokens remain in test memory or the existing private captured-mail mechanism. Real-browser traces, screenshots and video remain disabled. The test blocks foreign network requests; existing decorative avatar image requests are aborted too. It verifies normal login at `localhost:5180`, actual requests to the selected API, and normal authenticated match-card rendering, without mocking matching responses. Test-issued sessions are logged out in `finally`; no history or private settings are deleted/reset.

Both attempts retained their labelled fixture cohorts for inspection: the initial attempt completed all functional steps but failed a final harness assertion; the successful rerun created a fresh namespace. Therefore this task retained **two sets** of the synthetic data listed above, including 10 synthetic students, six fictitious programs, four fictitious departments and 12 exchanges (eight completed, two qualifying cancellations and two early cancellations). Existing seeded Alice/Bob/Casey/Admin credentials remain unchanged and passed `sandbox:check`. The successful run namespace was `wrmr-b2313d0b`.

A final guarded SELECT-only check confirmed 19 total program records: the unchanged 13 real college catalog entries plus six namespaced fixture programs (`wrmr-04652af4` and `wrmr-b2313d0b`). Four fixture programs have synthetic validation metadata and two remain drafts. Across the 13 real college records, assigned departments, validation dates, evidence notes and reviewer fields are all still zero; mapping versions are all zero. The existing `CCS` department record remains present and active.

These additional fictitious catalog records are visible only in this synthetic sandbox; do not export them as the official 13-program catalog or interpret their validation flags as campus approval. No automatic fixture cleanup/deletion is performed. Each future execution adds a fresh labelled cohort.

## Test cases: expected and actual results

The observed subject's score is calculated from the **candidate's** balanced history and the viewer–candidate academic relationship. A viewer's own lack of ratings does not prevent a fully evidenced candidate from being scored; missing academics on either side does prevent the proximity term.

| Case | Expected | Actual result |
| --- | --- | --- |
| New account activation | Password alone cannot bypass email verification | Unverified login rejected; captured-link verification followed by normal login succeeded |
| New reciprocal peers | Discoverable with null score and actionable request | API returned null/missing-rating evidence; browser showed Unranked and enabled Request Swap; request proceeded through normal API |
| One-way candidate | Excluded before ranking and ineligible for the requested reciprocal exchange | Absent from matches; attempted nonreciprocal request returned 422 |
| Agreement approval | First approval cannot confirm; both approve the same current version | Pending after first approval; confirmed after the second |
| Session safeguards | No logging before confirmation; both sides must acknowledge; duplicate acknowledgement must not add a session | Premature log rejected; premature reviews rejected before/after only one acknowledgement; exactly two participant confirmations and counters 1/1 stored |
| Completion/reviews | One review is insufficient; two valid distinct reviews complete once | Status remained CONFIRMED after first review; COMPLETED/date/integrity after second; repeated identical review was idempotent; exactly two validated reviews stored |
| First WRMR | One qualifying completed swap with rating 4, CR 1, proximity 1 gives 90/100 immediately | API 90; actual browser `90.0/100 WRMR`; no wait/minimum-extra-exchange introduced |
| Limited evidence | One partner disclosed, while score/request remain usable | Browser showed the one-partner explanation and enabled Request Swap |
| Four proximity cases | 1.0 / 0.8 / 0.6 / 0.4, at AR 4 and CR 1, yield 90 / 86 / 82 / 78 | All four values/scores returned by the real matching API after normal program/year profile updates |
| Missing validated academics | No fabricated full score, even with AR 4 and CR 1 | Draft candidate mapping → null; draft viewer mapping → null; reciprocal candidate remained visible; restoring valid synthetic program restored 90 |
| Same-partner repeat | Mean of that partner's ratings changes; distinct partner count remains one | Ratings 4,2 → AR 3, score 80; two completions still one partner and no leaderboard entry |
| Second distinct partner | Equal partner means, not raw review volume | Partner means 3 and 5 → AR 4, raw AR 11/3, score 90; three completions/two partners; leaderboard eligibility became true |
| Qualifying cancellation | Existing symmetric denominator effect; balanced and pooled metrics remain distinct | Subject CR `(2/3 + 1)/2 = 5/6`, raw CR `3/4`, score 85. Other participant's one-partner CR became 2/3. No fault/actor adjustment |
| Early cancellation | Excluded from concluded denominator without fabricating a failure | After only one approval, cancellation left subject score 85/CR 5/6 and second partner CR 1 |
| Subsequent completion | New eligible outcome recalculates balanced means with unchanged weights | Fourth completion supplied rating 1 from second partner: both partner means 3 → AR 3; CR 5/6; raw CR 4/5; score 75 |
| UI after diverse evidence | `/100`, partner count, no stale one-partner warning/probability claim | Actual browser showed `75.0/100 WRMR`, two partners and no one-partner notice; desktop/mobile regressions also passed |
| Cross-surface consistency | Same personal validated inputs in matches, portfolio, own profile and analytics | All four APIs agreed at every scored milestone on balanced/raw metrics, counts and legacy status |
| System/monthly analytics | Qualifying completions/cancellations update pooled counts; early cancellation does not | Baseline-relative totals/monthly rates matched at each milestone. Monthly baseline used existing validated outcomes; no unrelated history was assumed empty |
| Leaderboard independence | First score does not require leaderboard eligibility | One-partner scores 90 and 80 were available while both leaderboards excluded the subject; second partner enabled both, without changing WRMR formula |
| Preservation/defaults | Real college records, private settings and Google state remain unchanged | 13-program fingerprint identical; settings text identical; Google disabled; seeded account check passed |

### Score progression, independently expected and observed

For the viewer and subject in the same synthetic department/year:

| Milestone | Balanced AR / 5 | Balanced completion | Expected score / 100 | Actual score / 100 |
| --- | --- | --- | --- | --- |
| Newly registered, no validated history | Unavailable | Unavailable | Unranked | Unranked |
| First completion, rating 4 | 4 | 1 | 90 | 90 |
| Second completion, same partner rates 2 | 3 | 1 | 80 | 80 |
| Third completion, second partner rates 5 | 4 | 1 | 90 | 90 |
| Bilaterally approved cancellation with first partner | 4 | 5/6 | 85 | 85 |
| Cancellation before bilateral approval | 4 | 5/6 | 85 | 85 |
| Fourth completion, second partner rates 1 | 3 | 5/6 | 75 | 75 |

Formula remains `100 * (0.50 * AR_bal/5 + 0.30 * CR_bal + 0.20 * P)`. A later successful exchange can lower a score when its valid peer rating is lower; completion alone does not imply a monotonically increasing rank. No confidence multiplier, assessment factor, new threshold, waiting period or cancellation attribution was added.

## Fresh verification commands and counts

Run commands from `C:\KNOXITE\SkillSwap` in the normal local development terminal. The new lifecycle test requires an already verified running synthetic sandbox, not a database reset or new migration.

```powershell
npm run sandbox:diagnose
npm --prefix knoxite-backend run build
node --test --test-concurrency=1 knoxite-backend/dist/tests/rules.test.js knoxite-backend/dist/tests/partner-integrity.test.js knoxite-backend/dist/tests/thesis-alignment.test.js
npm run test:sandbox -- wrmr-lifecycle.spec.ts
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:browser -- workflows.spec.ts --grep 'WRMR scores are out of 100|mixed cohorts|new unranked students|activity order'
npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --strict --skipLibCheck tests/sandbox/wrmr-lifecycle.spec.ts
npm run sandbox:check
```

Run the two Playwright commands sequentially: the existing general browser output directory is the parent of the sandbox artifact directory, so a new general run can clear earlier ignored sandbox artifacts. This does not change application/database records. The essential evidence is retained in this report.

| Check | Fresh result |
| --- | --- |
| Backend build / matching Prisma Client check | Passed; no client regeneration or migration |
| Existing focused backend rules/partner-integrity/alignment suites | **30 passed, 0 failed** |
| New actual-API/browser sandbox lifecycle scenario | Final run: **1 passed, 0 failed**, 19.6 seconds within the test, 22.0 seconds for the command |
| Existing selected desktop/mobile UI regressions | **12 passed, 0 failed** |
| Strict TypeScript check of new test and imported helper | Passed |
| Sandbox ownership/identity and four seeded account checks | Passed; saved passwords match hashes, verified/unsuspended, normal roles |
| Preservation / whitespace checks | All 236 pre-task public Git files byte-for-byte unchanged, including all ten prior audit files; only the two new files below were added. Thesis SHA-256 unchanged; `git diff --check` and whitespace checks of new files passed. |

Final successful runs total **43 passing tests**. The 157 tests from the prior audit were not rerun or reused as current results. The broad/destructive integration and migration suites were not run. Frontend application code/dependencies are unchanged, so no unrelated full browser suite or frontend production rebuild was repeated.

The first lifecycle attempt failed **only its final harness assertion**: it incorrectly classified blocked `api.dicebear.com` decorative image requests as foreign API/script traffic. All functional lifecycle assertions had already passed. The test was corrected to keep those images blocked while separately checking non-image traffic; the complete scenario then passed from new synthetic users. No application workaround, network allowance or identity/authentication weakening was added.

The run writes an ignored, sanitized `wrmr-lifecycle-evidence.json` under `test-results/sandbox/…`, containing only synthetic run identification, expected/observed public metrics and preservation checks. Credentials, verification tokens, auth tokens, private settings contents and real student data are not included in the report or test output.

## Files changed and remaining work

Only two new repository files were added in this task:

| File | Reason |
| --- | --- |
| `tests/sandbox/wrmr-lifecycle.spec.ts` | Cover the previously unverified continuous real-API/browser journey using synthetic academic configuration, multiple completed/cancelled exchanges, cross-surface metric comparisons and preservation checks |
| `docs/ACADEMIC_WRMR_LIFECYCLE_VALIDATION.md` | Mapping evidence checklist, existing admin procedure, actual expected/observed results, test limits and retained synthetic-data disclosure |

No confirmed application defect required a source fix. The only correction was to the new test's image-traffic assertion. All 236 pre-task public Git files, including the ten prior audit files, are preserved unchanged; the earlier uncommitted work remains uncommitted. The manuscript fingerprint remains unchanged. No schema, authentication, scoring, cancellation or production configuration was edited.

Remaining methodological decisions are the previously reported ones, not new blockers discovered by this successful scenario: whether future cancellation attribution should differ from the current symmetric rule; any future legacy/open-outcome definition changes; and how the thesis describes limited evidence. No such change was made or is implied by these results. One qualifying exchange supplies a first score under the existing policy; two distinct completed partners remain a separate leaderboard condition.

**Recommended next configuration task:** supply the actual campus-specific mapping evidence and canonical department-code/ID decisions, then explicitly authorize an administrator to record the 13 real program mappings using the existing evidence-backed workflow. Validate shared IDs for BSCS/BSIT, BSACC/BSAIS and the three hospitality programs before testing real college profiles. Real student activation still depends on the separate institutional eligibility, actual email delivery, privacy and release-readiness approvals documented in the prior audit. No institutional approval is inferred from the successful synthetic test.
