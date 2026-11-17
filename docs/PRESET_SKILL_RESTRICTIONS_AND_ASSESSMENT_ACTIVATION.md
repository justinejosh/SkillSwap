# Preset skill restrictions and assessment activation

Date: 2026-11-14 (Asia/Manila). Project: `C:\KNOXITE\SkillSwap`, branch `dev-justine`.

**Subsequent sandbox authorization:** the team explicitly authorized persistent, labelled software demonstrations after this report. Seven skills now have 14 test-only banks in the verified synthetic sandbox, including an additional unreviewed JavaScript draft. The zero-bank/rollback-only statements below describe this earlier task's completed state. Current availability and manual instructions are in [Sandbox assessment availability](SANDBOX_ASSESSMENT_AVAILABILITY.md). No academic subject approval or real-student publication is implied.

## Delivered behavior

New student teaching offers and learning requests now require one of the existing **80 predefined skills**. This is the expressly approved policy change; the eight categories, exact names and stable keys in `knoxite-backend/config/skill-catalog.json` are unchanged. Skills remain available across academic programs. No suggestion button, custom submission form, queue, moderation subsystem, additional catalog, schema migration or dependency was added.

The existing assessment engine was retained. Six complete **unreviewed draft authoring files** were prepared, containing **60 basic and 36 advanced questions**. None was imported, validated or published in the shared sandbox. Functional demonstrations used separately labelled synthetic control-flow fixtures inside an uncommitted database transaction and rolled back all fixture writes. These tests establish software behavior, not question quality, faculty approval, participant outcomes or professional/practical competence.

## 1. Add New Skill interface

The existing modal in `src/app/pages/MySkillsPage.tsx` still presents exchange direction, domain category and the existing Save action. `SkillPresetInput.tsx` now labels its searchable combobox **Choose a Skill**.

- Both Teaches and Wants to Learn use the same category-filtered catalog.
- Search is case-insensitive; mouse/touch selection and arrow-key/Enter navigation remain available.
- Typing is search only. Any edit clears the selected preset key, including typing an exact catalog label; the student must select a result.
- Save is disabled until a preset is selected. The submit handler also checks selection and sends only `{ presetKey }`.
- Category changes and reopening the modal invalidate any earlier selection. Selection supplies the catalog category.
- An empty result displays **No matching preset skills**. No custom-creation fallback appears.
- A catalog failure displays an error and keeps Save disabled. Closing/reopening retries the existing fetch.
- The earlier narrow-screen focus/layout correction is retained. Existing validation, assessment prompts and skip handling are reused.

## 2. Backend enforcement and canonical identity

Student `POST /api/profile/skills/offer` and `/want` accept exactly one reference:

```json
{ "presetKey": "python-programming-fundamentals" }
```

or `{ "skillId": "<actual canonical preset Skill UUID>" }`.

`routes/profile.ts` rejects student `name`/`category` fields and unsupported properties. `resolveStudentPreset()` in `services/skillCatalog.ts` rejects missing/mixed references, unknown keys, forged IDs and existing custom-skill IDs. Missing request bodies produce a validation response rather than an internal error. An ID must identify the exact compatible catalog record; a caller cannot authorize a custom record merely by supplying a real UUID.

A valid key reuses the canonical record or materializes the trusted catalog name/category using the existing serializable transaction. Identity/category conflicts still require administrator review (409); no historical record is rewritten. Catalog key and database UUID remain distinct. Implicit user relations plus the existing unique `(userId, skillId)` offering key make repeated saves idempotent rather than creating duplicate associations. Earned tiers and attempt history are not overwritten on repeat saves.

The legacy `resolveSkill()` path remains available only through authenticated administrator compatibility behavior. Server-verified roles determine that path; a student cannot request it through a body field. Students cannot add their own custom skills through a second endpoint. Existing authenticated catalog reading and ADMIN-only repeatable initialization are unchanged.

## 3. Historical custom skills and protected functionality

Historical Skill rows, UUIDs, categories, offered/wanted associations, public portfolio reads, swap references, assessment links, tiers and attempt history are retained. No names are merged, renamed or converted. Existing removal and prompt-management routes remain usable for historical associations.

**Once a historical custom association is removed, a student cannot add it again through the new selection workflow**, because that would be a new nonpreset association. The Skill record/history itself is retained. Existing historical associations can continue participating in the established exchange/matching flow; this restriction does not add a new matching eligibility filter.

No changes were made to the Prisma schema, academic catalog/mappings, WRMR services, assessment engine, swap lifecycle, cancellation attribution or authentication policies. The 50/30/20 weights, partner-balanced metrics, cold-start discovery and separation of leaderboard eligibility remain unchanged. Assessments are still independent of WRMR.

## 4. Six draft content files and coverage

All paths below are relative to `C:\KNOXITE\SkillSwap`. Each file includes both levels, an explicit answer key (letter and text), explanations, item-level learning objectives, review checklist, scope limitations, sources and verification notes. Each question has four distinct options and one correct answer. Reviewer/date/evidence are **null**, and the review status is **NOT_REVIEWED**.

| File under `knoxite-backend/content/drafts/` | Basic: 10 questions | Advanced: 6 scenario questions |
| --- | --- | --- |
| `python-programming-fundamentals.json` | Python 3 types, operators, sequences, loops, dictionaries and functions | Range boundaries, mutable defaults, aliasing, filtering, exception handling and boundary conditions |
| `bookkeeping-fundamentals.json` | Accounting equation, normal balances, documents, accrual assets and trial-balance limits | Service cash receipts, purchases on account, settlement, receivable collection, bank charges and account balances |
| `introductory-statistics.json` | Center, spread, variables, samples, descriptive proportions and simple probability | Outliers, weighted means, sample variance, observed rates, independent events and limits of causal inference |
| `english-grammar.json` | Standard edited English agreement, clauses, tense, possession, pronoun case and punctuation | Editing agreement, fragments, comma splices, dangling modifiers, parallel structure and plural possession |
| `food-safety-and-hygiene.json` | Clean/separate/cook/chill concepts, measurement, safe water and label-based procedures | Contamination response, internal measurement, allergen cross-contact, missing evidence, chemical instructions and water advisories |
| `chess-fundamentals.json` | Standard piece movement, check, mate, stalemate and promotion | Castling rights, immediate en passant, responding to check, stalemate, underpromotion and blocked paths |

The draft basic attempt size remains 10; advanced is 6, within the existing 5–10 range. All items are one point, with the unchanged initial 80% threshold and existing 20/45-minute defaults. An advanced six-item form therefore requires at least **5/6** correct (83.33%); 4/6 fails. This is the existing threshold applied to discrete marks, not a new passing rule. An exactly-sized pool randomizes order but always selects the same items. Larger reviewed pools can later vary item selection without changing eligibility policy.

### Content verification and limitations

`python tools/verify_draft_assessments.py` checked all 96 item structures/answer-key mappings, executed 15 authored Python answer fragments, recomputed 13 numerical answers and checked three additional arithmetic/board-coordinate facts. It is an offline developer check for trusted repository content, not a sandbox or a student code execution service. Nothing executes submitted student code on the server.

References are included in each file: [Python tutorial](https://docs.python.org/3/tutorial/), [OpenStax financial accounting](https://openstax.org/books/principles-financial-accounting/pages/3-2-define-and-describe-the-expanded-accounting-equation-and-its-relationship-to-analyzing-transactions), [OpenStax statistics](https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data), [Purdue OWL grammar](https://owl.purdue.edu/owl/general_writing/grammar/subject_verb_agreement.html) and [FIDE standard chess rules](https://handbook.fide.com/chapter/e012023). These are original educational draft examples, not copied examination banks.

Food items were checked against general [WHO food-safety guidance](https://www.who.int/publications/i/item/9789241594639), [CDC prevention guidance](https://www.cdc.gov/food-safety/prevention/index.html), [FDA food handling](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling) and [NSW allergen controls](https://www.foodauthority.nsw.gov.au/consumer/food-allergies/living-food-allergy/safe-eating). They do not invent local temperature/time limits or claim to constitute Philippine regulatory approval. A qualified subject reviewer must confirm applicability to current campus/local procedures. Bookkeeping is introductory educational double-entry practice, not professional financial advice. English reviewers must confirm the intended language/style conventions. Chess content assumes standard chess.

### Required subject review

For each level, the team must document actual reviewer identity/qualification, review date, source/rules edition, corrections, approved outcomes and item coverage, answer/rationale accuracy, distractor plausibility, ambiguity/accessibility review and evidence of authorization to publish. The six initial scopes/topics are draft recommendations; no faculty approval is asserted. Advanced measures applied scenario reasoning; it does not observe coding, food preparation, performance or other hands-on work and awards no external certification.

## 5. Importing and publishing approved content

There is no automatic importer, seed, public static asset route or application startup hook for these draft files. They are backend authoring artifacts and intentionally do not use a frontend import. A repository containing answer keys must not be treated as a confidential examination bank; subject reviewers should review item exposure and consider revised/expanded pools before a real assessment release.

1. Complete subject review and correct the authoring file. Retain the genuine evidence; never replace null reviewer fields with a fictional person.
2. In the target authorized environment, obtain the existing canonical Skill UUID from `GET /api/profile/skill-catalog` or the assessment administration page. Confirm the exact preset key, name and category. Never use a similarly named historical skill or copy a UUID from another database.
3. Extract **only** the file's `basic` or `advanced` object. Replace `REPLACE_WITH_CANONICAL_SKILL_UUID` with that verified UUID. The surrounding draft envelope is deliberately not an API import payload and is rejected by the existing validator.
4. Sign in as an authenticated ADMIN. In `/admin/assessments`, import that object, or use `POST /api/admin/assessments/versions`. The engine creates a new **DRAFT** version under the skill/level bank; it does not award a student tier.
5. Check imported question count, all four options/keys, explanations in `rubric`, objectives in `competency`, threshold, duration and version. Use the existing validation action (`POST .../versions/:id/validate`) to record real subject-review evidence in `validationNotes` only after review.
6. Publish (`POST .../versions/:id/publish`) only when the team authorizes that reviewed content for students. An unvalidated draft cannot be published. The existing publication workflow retires an earlier published version of that bank; it preserves historical attempts/version links. Do not mutate a published question set.
7. Verify availability for that exact offered skill. Basic requires a published validated basic bank. Advanced additionally requires Amateur and actual basic-pass evidence for the same offering, plus a published validated advanced bank. Attempt-limit/cooldown checks still apply.

These are future authorized steps, not operations performed on the six drafts during this task. Publication/validation API actions exercised in the isolated demonstration were explicitly software fixtures and were rolled back before becoming visible to any shared account.

## 6. Safe demonstration and assessment results

`tests/sandbox/assessment-isolation.ts` verifies `dev-justine`, Docker container and volume labels/topology, exact loopback `_dev` target, complete private checkpoint and signed sandbox health proof before opening Prisma. It never loads or targets `localhost:3306/knoxite`.

A separate ephemeral loopback app uses the existing compiled `createApp`, real registration/verification/login/session middleware, ADMIN controls, bank import/validation/publication routes and assessment routes. Credentials are random, private and not printed. Email links are captured in memory. Google remains off. Browser API requests are routed to this private app; external requests are blocked.

All fixture database work is inside one outer serializable transaction. A test adapter reuses that connection for nested application transactions. Fixture banks are labelled **SYNTHETIC SOFTWARE FIXTURE ONLY**; the fixture administrator is explicitly not faculty. Independent database connections confirm that no fixture bank, grade, tier or account is visible. Teardown rolls back the transaction and compares shared assessment, offering, academic, skill, user/relation, swap and review snapshots. This is software/API/browser verification, not a concurrency stress test or academic content validation.

`assessment-activation.spec.ts` passed at desktop 1280×900 and mobile 390×844:

| Case | Expected and actual result |
| --- | --- |
| No bank / imported DRAFT | Basic unsupported; no fabricated availability |
| Publish before validation | 409; blocked |
| Synthetic test-only validation/publication | Visible only in uncommitted fixture connection; shared snapshot unchanged |
| Advanced before Amateur | 403 |
| Basic forged option or submitted score | 422; no grading/badge bypass |
| Basic 7/10 | FAILED; Not Assessed retained |
| Immediate basic retry | 429 |
| Basic 8/10 after simulated fixture cooldown | PASSED; Amateur; normal success dialog and Maybe Later action |
| Advanced 4/6 | FAILED; Amateur retained |
| Immediate advanced retry | 429 |
| Advanced 6/6 after simulated fixture cooldown | PASSED; Verified; history contains both passes and both failures |
| Different offered skill | Remains Not Assessed; no tier transfer |
| Remove/re-add assessed preset | Same offering ID, Verified and history retained |
| Another account reads/submits attempt | 404 |
| Expired attempts | EXPIRED; no grade/badge; closed-attempt submit returns the same result idempotently (200) |
| Three starts in 168-hour window | Fourth start returns 429, including expired attempts |
| Randomized question/option payload | Ten distinct selections from a 12-item pool; four unique options; persisted permutation matches delivered order; no key/rubric leakage |
| Assessment-only activity and peer metrics | Average peer rating remains null; no swap evidence/rating is invented |
| Shared state after teardown | Snapshot unchanged; no fixture records persisted |

Cooldown/expiry simulation edits **only newly created, uncommitted fixture timestamps**, never clocks or shared historical rows. Existing deterministic unit tests additionally cover shuffle permutation, answer grading, tier monotonicity, retake boundaries and cross-version start limits. Tests do not assert statistically guaranteed differences between every pair of random draws.

## 7. Fresh regression results

| Check | Result |
| --- | --- |
| Backend unit/regression suite (`npm --prefix knoxite-backend test`) | **100 passed, 0 failed** |
| Focused existing workflows plus preset browser suite | **50 distinct cases passed** across desktop/mobile after correcting one stale encoding assertion; see diagnostic history below |
| Actual shared sandbox preset browser/API test | **1 passed**; canonical offers/wants, duplicate reuse, bypass rejection, reciprocal match, unavailable assessments, portfolio/privacy and protected configuration |
| Isolated assessment API/browser demonstration | **2 passed**, desktop/mobile |
| Draft verifier | 6 files, 96 items, 15 executed Python fragments, 13 recomputed numerical answers, 3 additional checks |
| Frontend/backend type checks and builds | Passed; existing frontend bundle-size warning remains |
| Strict standalone TypeScript check for changed browser/sandbox tests | Passed |

Final successful coverage is **153 distinct automated test cases** (100 + 50 + 1 + 2), with diagnostic reruns not counted as additional cases. These are newly executed results for this task, not historical totals. The full swap/WRMR lifecycle and destructive/migration integration suites were not rerun; their existing fixtures were updated to use preset IDs/keys for future executions.

Diagnostic history: the first broader browser run passed 48/50. Both viewport variants failed because an older administrator-review test expected a corrupted `Â·` character instead of the actual middle dot. The assertion was corrected to `\u00b7`; both targeted reruns passed. The first assessment runs reached Verified but expected HTTP 409 for submitting a previously expired attempt. Source inspection confirmed the existing idempotent 200/EXPIRED behavior; assertions were corrected to verify status, null score and no badge. Both complete assessment reruns passed. Neither issue required changing assessment or moderation behavior.

Relevant commands, run sequentially for browser output directories:

```powershell
cd C:\KNOXITE\SkillSwap
npm --prefix knoxite-backend test
npm run typecheck
npm run build
npm --prefix knoxite-backend run typecheck
python tools/verify_draft_assessments.py
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:browser -- tests/browser/preset-skills.spec.ts tests/browser/workflows.spec.ts
npm run test:sandbox -- tests/sandbox/preset-catalog.spec.ts
npm run test:sandbox -- tests/sandbox/assessment-activation.spec.ts
```

The shared preset test adds a clearly named pair of synthetic students and retains them; it never deletes historical data. The assessment demonstration instead leaves no accounts, banks, results or tiers behind. To watch the private demonstration, append `--headed` to its command; its temporary accounts and progress still roll back at completion. This does not make an assessment permanently available to Alice or any shared sandbox account.

## 8. Database, manuscript and local-operation safeguards

Final guarded reads confirm all 80 canonical IDs, the eight previously fingerprinted original Skill rows unchanged, 13 existing validated program mappings across nine department IDs, and the three intentional first-year-only programs intact. The sandbox contains **zero assessment banks, zero versions and zero attempts** after rollback. Existing historical/custom Skill rows are retained; the final total is 90, rather than treating the earlier catalog report's historical 89-row snapshot as a fixed target. No cleanup or forced reconciliation was performed.

The user restarted the sandbox successfully to load strict preset-only enforcement. A final defensive malformed-body guard was built/tested afterward; reload the latest compiled backend with the normal commands in the original PowerShell when next running locally:

```powershell
npm run sandbox:stop
npm run sandbox:start
npm run sandbox:check
```

Those commands preserve settings, credentials and sandbox volume. The launcher verifies ownership; this task did not force-stop user-owned Windows processes. The original database and production resources remain untouched. No schema migration, academic validation change, OAuth activation, commit, push, merge or deployment occurred. The original thesis SHA-256 is unchanged.

Final `sandbox:check` passed the signed backend identity and all four seeded account/password-hash/verification/role/suspension checks. Comparison with this task's private Git-file baseline found exactly 12 intended existing-file changes and 11 new files, no unexpected changes and no deleted baseline files. Protected schema, academic, authentication, WRMR and dependency files retained their baseline hashes. `git diff --check`, new-file whitespace checks and changed-file credential/private-key/real-institutional-address pattern checks passed; no matching secrets were printed.

## 9. Exact files changed in this task

These paths are relative to `C:\KNOXITE\SkillSwap`. They are changes **since this task's private baseline**, not the repository's entire pre-existing uncommitted diff.

| Existing file | Reason |
| --- | --- |
| `knoxite-backend/routes/profile.ts` | Apply preset-only validation to new student offer/want associations, retaining ADMIN compatibility |
| `knoxite-backend/services/skillCatalog.ts` | Separate strict student key/canonical-ID resolver from legacy administrator name resolution |
| `src/app/components/SkillPresetInput.tsx` | Selection-only search, explicit empty/error states, no free-text fallback |
| `src/app/pages/MySkillsPage.tsx` | Require/reset selected key, disable Save, submit preset only |
| `knoxite-backend/tests/skill-catalog.test.ts` | Cover all 80 key/ID paths, custom/forged rejection, category conflicts and legacy compatibility |
| `knoxite-backend/tests/integration/api.test.ts` | Replace new student custom-name fixture submissions with canonical IDs |
| `knoxite-backend/tests/integration/student-flow.test.ts` | Use canonical presets/IDs in the existing student-flow fixture |
| `tests/browser/preset-skills.spec.ts` | Selection-only keyboard/mouse/mobile/filter/empty/failure/historical display checks |
| `tests/browser/workflows.spec.ts` | Update catalog selection fixtures; correct stale middle-dot test encoding |
| `tests/sandbox/preset-catalog.spec.ts` | Verify live canonical-ID reuse and direct API bypass rejection |
| `tests/sandbox/wrmr-lifecycle.spec.ts` | Keep existing lifecycle fixture compatible by selecting presets; no algorithm change |
| `docs/PRESET_SKILL_CATALOG_AND_ASSESSMENT_READINESS.md` | Mark earlier free-text behavior/test totals as historical and link this approved policy update |

New files:

- `knoxite-backend/content/drafts/python-programming-fundamentals.json`
- `knoxite-backend/content/drafts/bookkeeping-fundamentals.json`
- `knoxite-backend/content/drafts/introductory-statistics.json`
- `knoxite-backend/content/drafts/english-grammar.json`
- `knoxite-backend/content/drafts/food-safety-and-hygiene.json`
- `knoxite-backend/content/drafts/chess-fundamentals.json`
- `knoxite-backend/tests/draft-assessments.test.ts` — draft-envelope and existing import-validator compatibility checks.
- `tests/sandbox/assessment-isolation.ts` — guarded rollback-only synthetic fixture app.
- `tests/sandbox/assessment-activation.spec.ts` — actual backend grading/progression plus browser checks.
- `tools/verify_draft_assessments.py` — trusted offline answer verification.
- `docs/PRESET_SKILL_RESTRICTIONS_AND_ASSESSMENT_ACTIVATION.md` — this report.

## 10. Before real student assessment testing

The next task is **subject-expert review of the six draft banks**, starting with the intended demonstration subjects. Reviewers must approve content and its interpretation, and the team must authorize publication. Repository answer-key exposure, small item pools and repeated memorization remain assessment-design considerations; no new retake or secrecy policy was imposed.

Real email delivery/sender configuration, institutional eligibility/campus-rule evidence, privacy/consent/retention contacts, production secret rotation and production database backup/migration/rollback authorization remain the separate release gates documented in `STUDENT_TESTING_READINESS.md` and deployment notes. This task did not verify or satisfy those external requirements. Google remains disabled. No additional WRMR, academic-mapping, tier or retake policy change is proposed here.
