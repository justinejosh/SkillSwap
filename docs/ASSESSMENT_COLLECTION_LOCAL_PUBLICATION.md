# Complete assessment collection: dedicated local publication

Date: 2026-11-15 (Asia/Manila). Project: `C:\KNOXITE\SkillSwap`; branch: `dev-justine`.

## Actual result

**All 15 skills, 30 v1 assessment banks/versions and 240 questions are published in the dedicated localhost:5181 OAuth environment.** Basic: 15 banks with 10 questions each. Advanced: 15 banks with 6 questions each. Every question has four choices and exactly one authoritative key. No real student was automatically awarded a score or tier.

Frontend `http://localhost:5181`; API `http://127.0.0.1:5019/api`; MySQL loopback 3319, database `knoxite_google_local_dev`. The operator verified branch, separate container AND volume labels/IDs, exact mount and loopback topology, SQL database/user, shared-schema identity, signed session receipt, exact local admin manifest/password and a fresh HMAC-signed running-backend challenge before authenticated writes.

This supersedes the **OAuth availability snapshot** in the earlier assessment audit, which correctly reported zero banks before this authorized operation. Recovery-1 remains its separate environment; its banks/user data were never copied here.

## Use the assessments

1. Refresh My Skills at `http://localhost:5181/my-skills` to fetch the newly published availability. A backend restart is unnecessary: the existing endpoints read banks from the database.
2. Existing teaching skills show **Take Assessment**. Basic is 10 MCQs; at least 8 correct meets the unchanged 80% threshold and earns Amateur for that offered skill only.
3. After a Basic pass, **Upgrade to Verified** opens the six-question applied/scenario level. At least 5/6 (about 83.33%) is the first attainable score meeting the unchanged 80% threshold. There is no new waiting period.
4. The existing student currently offers all ten Technology skills plus Bookkeeping (11). All 11 now have eligible Basic assessments; Advanced is supported but prerequisite-locked, and all 11 tiers remain Not Assessed. To assess Statistics, English Grammar, Food Safety or Chess, first add the corresponding preset as a **teaching** skill. Do not change program/year configuration.
5. The other 65 catalog skills remain offerable, with Assessment Unavailable unless a separate reviewed bank is later published. Skipping still permits offering/swapping. Wanted skills do not receive assessments.
6. Use the separate password administrator in an InPrivate/separate browser profile at `http://localhost:5181/admin/assessments` to inspect all 30 published versions. Do not publish/import them again merely to refresh the student page.

Read-only operational verification (normal admin login/logout only):

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/assessmentCollection.cjs check
```

## Exact approval provenance

The user explicitly authorized DRAFT import, then stated that the KNOXITE Research Team had already checked the entire collection and authorized the local publication workflow. That actual chat statement is recorded for **each exact source hash, payload hash and local version ID**, not substituted with a software-test pass.

Basis: **PROJECT_OWNER_CHAT_ATTESTATION**. Review organization: KNOXITE Research Team, relayed by the project owner. Evidence: the 2026-11-15 user response to `request_user_input_async` call `call_d42bea569c9c40eab9d67f80fb866a72`. Decision: 'Our team has already checked it and you may now proceed. After that, proceed with the authorized publication workflow rather than restarting the development process.'

No named subject reviewer, formal review date, faculty qualification/signature or independent academic/psychometric validation was supplied. Those fields remain null/blank. Publication is accurately attributed to the owner's organizational attestation **for this local pilot**, not presented as faculty endorsement, institutional approval or production permission. The authenticated local ADMIN recorded the evidence through the existing validate endpoint; it did not impersonate a faculty reviewer.

[Per-version decision receipt](assessment-review/COLLECTION_REVIEW_DECISIONS.json) and [complete review package](assessment-review/CONSOLIDATED_SUBJECT_REVIEW_PACKAGE.md) preserve this distinction. More formal named subject-review records remain recommended before wider participant evaluation; do not claim measured instrument validity from this pilot.

## Content audit and remaining quality recommendations

All 240 prompts, choices, keys, explanations and learning objectives were inspected. The 30 level payloads pass the existing backend bank validator. No demonstrably wrong answer key was found; **zero source questions/keys were changed**, and all 15 source file hashes match the pre-task originals. The source envelopes still retain their historical unreviewed-draft metadata; later local approval is a separate receipt.

Zero exact duplicate stems were found after removing stable question-key prefixes and normalizing whitespace/case. Semantic overlaps and weaker distractors were recorded individually rather than silently rewritten or declared resolved. Examples:

- Chess A04 restates the Basic stalemate construct; Statistics A04 repeats percentage arithmetic with new values. They are not empirically calibrated advanced difficulty.
- Java A02's identical-content premise makes hashCode equality true for that example, while equals is the reliable general content comparison. Reviewer clarification of the general-comparison wording is recommended; no key was changed without review of a changed hash.
- Several Networking, Git and Troubleshooting Basic distractors are obviously unrelated/destructive; more plausible misconception-based choices could improve discrimination.
- Related Python/JavaScript price-filter scenarios and Networking/Troubleshooting DNS examples overlap across skills. They use their own language/domain logic; the overlap is not hidden as independent practical performance evidence.
- Food Safety requires local applicability judgment; generic WHO/FDA principles are not represented as Philippine institutional/legal procedure. No numeric safety standard, clinical advice or food-handler certification is invented.
- Pools equal questions served (10/10 and 6/6), so randomization changes question/answer order rather than membership. Public review/source material already exposes answer keys. Larger reviewed pools, controlled future testing content and empirical item analysis remain recommendations, not implemented policy changes.

The package contains observations on 131 items, including the generic knowledge-versus-performance limitation on all 90 Advanced items. This does **not** mean 131 factual errors. Formal difficulty/discrimination, professional/practical competency and learning gains are unverified. Verified retains its existing meaning: passing Knoxite's advanced scenario assessment, not professional certification or observed hands-on proficiency.

Independent developer checks executed authored Python/JavaScript examples, Java snippets, Git staging/ignore examples, arithmetic, spreadsheet references, subnet calculations and standard SELECT cases. Five additional derived-table queries were checked on actual MySQL in the rollback fixture. Excel checks are independent arithmetic/reference oracles, not a claim to have executed the questions in Microsoft Excel. Automated checks are not academic validation.

Target metadata differences are explicit in the manifest: bank titles identify the local pilot; learning outcomes include the limited review provenance. The old JavaScript synthetic-only scope prefix was removed from target metadata only. Questions, choices, keys, explanations, objectives, point values, deadlines and thresholds are unchanged.

## Backup, import and preservation evidence

A MySQL single-transaction logical dump was captured **before catalog/bank writes**. All table definitions and individual INSERT row counts matched the owned target, including the SQL-only `AuthSession.lastInteractiveAt` column. A Windows CurrentUser DPAPI encrypted copy was decrypted in memory and matched the original SQL SHA-256 byte-for-byte. Its encrypted checksum and target/row-count receipt are signed privately. **No restore rehearsal was performed or claimed.**

Private location: `%LOCALAPPDATA%\Knoxite\google-local\assessment-collection-2026-11-15\before-collection.sql.dpapi`, with signed `backup.private.json`. Do not print/decrypt SQL into reports or Git: it contains real local account records. Restoring into a new isolated target needs its own infrastructure authorization; never restore this dump over a newer live/original database as routine rollback.

The existing authenticated `/api/admin/skill-catalog/initialize` materialized 69 absent records from the **same existing 80-skill catalog**, reusing the original 11 IDs. It created no new catalog definitions and no offered/wanted associations. Current canonical row count is 80. The exact 15 local target UUIDs were then resolved and frozen before any bank import; recovery-1 IDs were not reused.

Import used 30 authenticated `POST /api/admin/assessments/versions` calls. An intermediate check confirmed all 30 were DRAFT, unvalidated and unavailable to the student, with zero attempts/tiers awarded. The hash/version-bound review record was then written from the actual user decision, followed by the existing validate and publish endpoints. A repeat publication command verified/reused all 30 v1 versions without duplicates, replacement content or new awards.

The workflow uses existing per-version transactions and a signed resumable journal; it is **not one atomic transaction across all 30 versions**. A failure stops with progress retained. A retry requires the same signed source/payload/target/version identities. Wrong target UUIDs/categories, duplicate canonical records, changed content, incomplete/mismatched review evidence, conflicting versions and inconsistent prior validation notes fail closed.

Final preservation checks: both existing User rows, all 11 offered-skill associations, every existing Skill record, assessment attempts/answers, academic tables, swaps/reviews and all other non-authentication records match their pre-task fingerprints. The 13 pre-existing session rows match their hashes exactly. Five new operator administrator sessions were added and all five were revoked on logout. New unbound login-page challenges are authentication activity, not altered student results. Persistent assessment attempts remain **zero**, and the student's 11 tiers remain **Not Assessed**.

Only expected collection tables (`AssessmentBank`, `AssessmentVersion`, `AssessmentItem`, `AssessmentOption`), canonical Skill insertions, operator AuthSession rows and login challenges changed. No persistent synthetic users/attempts/grades were retained. Recovery-1 fixture tests verified their shared database snapshots after rollback. All pre-existing private configuration/approval files are byte-identical to the task baseline. Original database, production and thesis were not changed.

## Published version inventory

See the [machine-readable import manifest](assessment-review/COLLECTION_IMPORT_MANIFEST.json) for all source/payload hashes and source-question-to-database-item mappings.

| Skill / key | Local Skill UUID | Basic bank / version UUID (v1, 10 items) | Advanced bank / version UUID (v1, 6 items) | State |
| --- | --- | --- | --- | --- |
| Python Programming Fundamentals / `python-programming-fundamentals` | `30a3a928-d680-4bd2-bded-78d1b9540a9c` | `d319887a-f637-4d8c-915e-a5b119c7c6b3` / `166421f1-8009-4f4e-8201-23a0aede9389` | `7bbe40a3-0a57-4e4f-82a3-2cf0ec49263e` / `ab305536-20eb-4f9c-8260-3e5dfa494b8f` | Both PUBLISHED |
| Java Programming Fundamentals / `java-programming-fundamentals` | `010953b7-c841-44ba-91b0-ac7cfa9267a8` | `92e2c5b8-6ba0-4063-bc3b-d11745346a68` / `bd129cdb-d4a3-4ff7-a42a-9bca5e00b712` | `69b01d9c-5e7c-44c9-bc07-388062a7d9d9` / `e53dbd57-27c8-4d59-89bb-63410c1ae380` | Both PUBLISHED |
| JavaScript Fundamentals / `javascript-fundamentals` | `a4eb75d1-dd62-4835-a5d3-c0cc5c6d181e` | `1433c7fb-6ae9-4695-9f5a-cfd76276d6be` / `74390216-db67-453c-a604-85168e132383` | `cd4cf140-55d0-43d9-99b7-6fc18fed7f6b` / `b2a6b5ed-0693-4aa3-9d1b-f81ebdfb875b` | Both PUBLISHED |
| HTML & CSS Fundamentals / `html-css-fundamentals` | `7dd7aa71-2a81-4672-95a0-ea1459bebe58` | `7ed7dd6c-13d3-41c1-a789-b01162947f82` / `bbfa36de-66cf-41ec-9ee0-ed074e32361f` | `0a952bed-54be-463a-a206-b2913da1b812` / `6b71b988-abdc-4df7-85cb-08543a4a76fc` | Both PUBLISHED |
| SQL Fundamentals / `sql-fundamentals` | `25d23bd2-1ae6-4ae2-97f6-48f19b39d821` | `991984fe-ba7b-432f-99b5-b177bcc91ff2` / `9f9d85bf-f64b-4062-b984-0cf9e69ec709` | `f89bd7ff-7159-4116-9ce3-24944ed55ef7` / `7c39bfbc-14fa-4b28-a6d6-9d1c57be8831` | Both PUBLISHED |
| Database Management Basics / `database-management-basics` | `f7161588-b157-43f0-a4b0-978b00052040` | `46cc8c55-7c77-454f-bd2e-71289c34c7c5` / `f03d5424-d455-451f-adfd-49614be0aec8` | `5a57902a-da6f-42d7-9537-a58d662d0981` / `ffe6d974-08bd-46d9-b174-8bffbfa4e15c` | Both PUBLISHED |
| Computer Networking Basics / `computer-networking-basics` | `7c23b208-93c6-4af2-b9a3-123a9b732da7` | `c11982da-6905-4ee3-982b-86f086bf65f3` / `a07053f6-c637-4bdd-94e7-746a41e984cb` | `b2fc86f4-b90f-4f46-a1d2-2237ffcdd212` / `3abeea75-f09d-4f4b-8c70-3979409a5a70` | Both PUBLISHED |
| Computer Troubleshooting / `computer-troubleshooting` | `ef862950-5233-4432-8c27-5e7c3b96d89a` | `b20a8c45-5e93-4915-acf6-3d87de361f81` / `c928f7d0-f0af-435e-89c3-0585e543c955` | `9100bdde-bc83-4ddb-9cce-62a2681e00da` / `12adda20-0d26-47cd-b07f-879164a1c72e` | Both PUBLISHED |
| Git & GitHub Basics / `git-github-basics` | `45c0a222-7f12-4a97-8019-64c0519a3d10` | `34bbd4f2-0f95-4678-8033-9d77c7704549` / `6fa055ac-865c-4d97-b9bc-1af275dd5f6b` | `e85168ad-428d-43d4-8176-53937529b3f8` / `fb25970d-cac0-433d-97f8-54506bc37350` | Both PUBLISHED |
| Microsoft Excel Fundamentals / `microsoft-excel-fundamentals` | `29b3aac9-b6c7-4b1b-b347-92d46b562839` | `ad5cf493-277a-495a-bfa9-5fc44b006e8e` / `d4df557a-54c1-4692-91b0-5d0e3628bc06` | `9cbc9fcc-e638-4136-bb20-6a40ccb49695` / `7cb99e25-e4c6-492f-b9a1-357378603ffe` | Both PUBLISHED |
| Bookkeeping Fundamentals / `bookkeeping-fundamentals` | `3d5793dd-399f-4398-918b-0c097096e483` | `5ef1d8af-cc63-40bd-8c6e-f6f5e0d88bb2` / `0ac49896-0c56-4796-b4f9-88fed340304a` | `ee28646a-79f8-414e-bd28-cca7cc79664e` / `6f835ffb-de7b-46c4-90b7-f61f2974f884` | Both PUBLISHED |
| Introductory Statistics / `introductory-statistics` | `45ff54ba-7581-43b2-b5ac-bfd295121033` | `a55d09b4-3544-4725-84b2-0da1d3354cf3` / `61da9bb3-4d3f-4275-b2cb-d82875f3dbf5` | `26815f47-38e6-4ec5-9853-3e2b23f1f419` / `592c0a6a-6d45-446a-a42f-78011db29350` | Both PUBLISHED |
| English Grammar / `english-grammar` | `14e224ba-26cb-48f7-b4c0-2d4a452601ea` | `95dfc52f-dad2-4f1e-99b9-5e94a5110e04` / `50a9d580-7808-4973-84e0-7eed258d58e4` | `e5cc5e80-4205-4c43-a266-848cc15b4fcd` / `f4b4f177-b0b9-49d7-8dd8-fa22df5edf33` | Both PUBLISHED |
| Food Safety and Hygiene / `food-safety-and-hygiene` | `ac13d707-18d4-440a-b1bf-3d028ca77879` | `52bf2117-0071-46dc-9c59-7b329444373f` / `01408e7c-ce96-4256-be8b-9fdd934b296d` | `dd802237-94a8-42b9-a54f-6a612eb7d62d` / `bce62d94-e067-4e7c-a268-4ec999107c3d` | Both PUBLISHED |
| Chess Fundamentals / `chess-fundamentals` | `4dc3bd5d-d090-4c32-843d-909d8ea45bc4` | `502c31cf-01c7-4d82-81e3-ad7eb3f6a7e5` / `b30ab84f-57ba-4194-8e0e-68dc0d478268` | `26fa7a22-b733-4fae-abdb-3c4073a2d62e` / `566c337b-0d12-41cd-83aa-1da54767ddd7` | Both PUBLISHED |

## Fresh tests and build results

| Check | Result |
| --- | --- |
| Backend full `npm test` (includes TypeScript build) | **147 passed, 0 failed**, no skipped/cancelled tests |
| All-collection real MySQL rollback fixture | **16 passed**: parent/group plus 15 skill subtests; 30 live-bank levels exercised, then all synthetic records rolled back |
| New desktop/mobile collection UI with rollback-only OAuth MySQL fixtures | **2 passed** at 1280px and 390px; all 15 Basic buttons, Advanced lock/unlock, Amateur/Verified rendering and mobile fit |
| Existing real-MySQL/browser assessment activation + recovery specs | **3 passed**; failures, cooldown/limits, expired attempts, ownership/manipulation rejection, history, removal/re-addition, retirement resume, per-skill independence and unchanged WRMR covered |
| Mocked browser assessment-recovery, preset selection and session-timeout specs | **32 passed**, desktop/mobile including recovery, multi-tab/session warnings and activity/polling behavior |
| Draft developer oracles | 240 structural checks; 15 Python answers, 16 JavaScript answers, 13 numerical recomputations; 36 additional Technology item checks; no faculty-validation claim |
| Frontend typecheck, standalone strict new-browser-spec check and frontend build | Passed; existing large-chunk build warning remains |
| Frozen target/content check and repeated publication | All 30 versions match; no duplicate version/award, canonical target IDs preserved |

**200 passing automated cases** = 147 backend + 16 MySQL group/subtests + 2 new UI + 3 existing MySQL/browser + 32 mocked browser. Developer oracles and repeated focused runs are not added to that total. These are software verification results, not alpha/beta participant findings or evidence of learning gains.

The first two new collection browser cases failed because the test harness dismissed the application's native final-grading confirmation. The harness now explicitly accepts that confirmation; both final cases passed. No application confirmation, grading or deadline behavior was weakened to obtain a pass. Earlier focused/full backend results were superseded by the final 147-case run.

Explicit local fixture commands:

```powershell
node --test knoxite-backend/development/assessmentCollectionIntegration.test.cjs
$env:KNOXITE_COLLECTION_BROWSER = 'true'
npx playwright test --config playwright.sandbox.config.ts tests/sandbox/assessment-collection.spec.ts
Remove-Item Env:KNOXITE_COLLECTION_BROWSER
```

These commands use only the independently verified local OAuth database and uncommitted synthetic fixtures. They do not grade the real student. The browser serves the actual 5181 frontend with API traffic routed only to the private fixture server; it is not a real Google login or a persistent participant trial.

## Rollback and future content changes

For a wrong published version, use the authenticated existing `/api/admin/assessments/versions/:id/retire` operation with exact IDs from this manifest to close **new** starts. Keep all issued attempts, grades, versions and earned tiers. Do not delete referenced rows or restore the pre-collection dump over newer legitimate history. Retirement intentionally does not invalidate an already-issued pinned attempt. Any content-safety decision to invalidate those attempts needs separate reviewed authorization.

A question change requires a new reviewed content hash/version and normal admin publication workflow. The current operator helper intentionally refuses competing/additional versions or changed source hashes; it is not an unrestricted future publisher. Never copy review flags from recovery-1 or manufacture a reviewer signature.

## Exact task files and unchanged boundaries

Exactly 11 task-specific files were added; prior source files and uncommitted work were retained.

| File | Reason |
| --- | --- |
| `docs/ASSESSMENT_COLLECTION_LOCAL_PUBLICATION.md` | Actual local publication inventory, approval provenance, backup/rollback, fresh tests and preservation report. |
| `docs/assessment-review/COLLECTION_CONTENT_REVIEW.json` | 240-item technical review, keys/objectives, observations and blank formal reviewer fields. |
| `docs/assessment-review/COLLECTION_IMPORT_MANIFEST.json` | 30 exact canonical target/version IDs, source/payload hashes, published states and question-ID mapping. |
| `docs/assessment-review/COLLECTION_REVIEW_DECISIONS.json` | Per-version record of the actual owner-relayed team decision; no named faculty or invented review date. |
| `docs/assessment-review/CONSOLIDATED_SUBJECT_REVIEW_PACKAGE.md` | Complete readable 240-question/answer/explanation package, source hashes, checklist and unresolved quality notes. |
| `knoxite-backend/development/assessmentCollection.cjs` | Guarded encrypted backup, frozen local manifest, authenticated repeat-safe DRAFT import and evidence-bound publication/check tooling. |
| `knoxite-backend/development/assessmentCollectionFixture.cjs` | Verified-owned OAuth rollback fixture; reads published banks, creates only uncommitted synthetic student data. |
| `knoxite-backend/development/assessmentCollectionIntegration.test.cjs` | All 15 skills/30 levels, boundary passes, prerequisites, history, replay and native MySQL checks. |
| `knoxite-backend/tests/assessment-collection.test.ts` | Six collection/source/fingerprint/approval/UUID/category-drift guard tests. |
| `tests/sandbox/assessment-collection.spec.ts` | Opt-in desktop/mobile UI availability and progression with rollback-isolated real MySQL APIs. |
| `tools/build_assessment_review_package.py` | Reproducible review artifact generation from preserved source questions; no DB publication. |

No shared application route, frontend component, database schema, authentication policy, Google restriction, session policy, academic mapping, first-year-only setting, original draft, WRMR weight/metric/cancellation rule or thesis source was modified. All task source additions are local operator/test tooling and technical review artifacts. No dependency install, commit, push, merge or deployment occurred.
