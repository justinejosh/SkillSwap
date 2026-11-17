# Preset skill catalog and assessment readiness

Date: 2026-11-14 (Asia/Manila). Checkout: `C:\KNOXITE\SkillSwap`; branch `dev-justine`.

**Subsequent approved policy:** new student associations are now preset-only. The initial-release behavior and test totals below are retained as historical implementation evidence. Student free-text submission is superseded by [Preset skill restrictions and assessment activation](PRESET_SKILL_RESTRICTIONS_AND_ASSESSMENT_ACTIVATION.md). Legacy records and administrator creation compatibility remain; six draft content files are unreviewed and unpublished.

## Implemented scope

Knoxite now offers the exact 80 predefined skills below: ten in each of the existing eight categories. Both teaching offers and learning requests use the same searchable catalog and shared Skill IDs. Existing free-text creation remains available, with no course/program restriction, new moderation subsystem, schema migration, dependency, assessment-policy change or WRMR change.

All 13 college mappings, their validation evidence and the intentional first-year-only BSIT/BSIHM-CA/BSIHM-HACLO settings remain unchanged. `STUDENT_TESTING_READINESS.md` now records the team's clarification that those restrictions are intentional; no additional year levels were enabled. The thesis and original/production databases were not modified or accessed.

## Architecture inspection and canonical identity

The existing `Skill` model has a UUID, globally unique name and category. Both legacy implicit user relations and `UserOfferedSkill(userId, skillId)` use that shared record. Assessments link through `AssessmentBank(skillId, level)`; attempts/earned tiers belong to the user's offered-skill relationship. Matching and requests already use skill IDs, so no replacement matching engine or new schema is needed.

The live Add New Skill modal is in `src/app/pages/MySkillsPage.tsx`. The older `SkillManager.tsx` is an unused mock component and was not rebuilt or wired into production routes. Preset selection extends the live modal and its existing save/prompt workflow.

`knoxite-backend/config/skill-catalog.json` is the single catalog definition. Each entry has a stable `key`, exact display name, one category, advisory content-planning group and priority indicator. **A catalog key is not a Prisma Skill UUID.** `GET /api/profile/skill-catalog` returns each key plus its actual `skillId` (or null before materialization). Only authenticated users can read it.

`POST /api/profile/skills/offer` and `/want` accept either `{ presetKey }` or the existing `{ name, category }` body. The backend resolves/creates the shared record and attaches its UUID. A case-insensitive exact preset name also resolves the same record and canonical category, so typing the exact label cannot create a second preset under another category. Unknown keys/mixed references are rejected. Custom names retain the existing lowercase/upsert behavior; the old `general` category remains accepted for legacy clients, but is not a ninth preset/UI category.

No fuzzy aliases, abbreviations or synonyms are invented. For example, a historical `python` record is not silently merged into `Python Programming Fundamentals`. Existing exact-name records are reused without renaming, recategorizing, replacing IDs or moving banks/associations. Conflicting exact-name/category records or ambiguous IDs return a review conflict; they are not destructively converted.

An authenticated ADMIN can use **Initialize 80 Skill Presets** in `/admin/assessments` (`POST /api/admin/skill-catalog/initialize`). It adds missing records and reuses compatible existing ones in a serializable transaction, using the existing conflict handler. Student calls return 403. It does not create banks, approvals, tiers or user skill associations. GET is read-only; selecting a not-yet-materialized preset can also resolve/create it transactionally. No automatic production startup seeding or remote operation was added.

## Full catalog

The UUIDs are environment-specific and are obtained from the authenticated catalog endpoint or the existing administrator Catalogue IDs list. The stable keys below identify the configuration entries; assessment authors must resolve the actual database UUID before importing a bank.

Group A: suitable for future basic and advanced knowledge/scenario content. Group B: basic knowledge content recommended initially. Group C: practical evaluation preferred. **All groups are advisory planning guidance, not content approval, current availability, certification or permanent publication restrictions.**

| # | Category | Exact canonical display name | Stable catalog key | Planning group | Priority |
| --- | --- | --- | --- | --- | --- |
| 1 | Technology | Python Programming Fundamentals | `python-programming-fundamentals` | A | Yes |
| 2 | Technology | Java Programming Fundamentals | `java-programming-fundamentals` | A | — |
| 3 | Technology | JavaScript Fundamentals | `javascript-fundamentals` | A | — |
| 4 | Technology | HTML & CSS Fundamentals | `html-css-fundamentals` | A | — |
| 5 | Technology | SQL Fundamentals | `sql-fundamentals` | A | — |
| 6 | Technology | Database Management Basics | `database-management-basics` | A | — |
| 7 | Technology | Computer Networking Basics | `computer-networking-basics` | A | — |
| 8 | Technology | Computer Troubleshooting | `computer-troubleshooting` | A | — |
| 9 | Technology | Git & GitHub Basics | `git-github-basics` | A | — |
| 10 | Technology | Microsoft Excel Fundamentals | `microsoft-excel-fundamentals` | A | — |
| 11 | Creative | Graphic Design Basics | `graphic-design-basics` | A | — |
| 12 | Creative | Digital Illustration | `digital-illustration` | C | — |
| 13 | Creative | Sketching and Drawing | `sketching-and-drawing` | C | — |
| 14 | Creative | Photography Fundamentals | `photography-fundamentals` | A | — |
| 15 | Creative | Photo Editing | `photo-editing` | B | — |
| 16 | Creative | Video Editing | `video-editing` | B | — |
| 17 | Creative | Digital Poster Design | `digital-poster-design` | A | — |
| 18 | Creative | Presentation Design | `presentation-design` | A | — |
| 19 | Creative | Canva Design | `canva-design` | B | — |
| 20 | Creative | Creative Writing | `creative-writing` | C | — |
| 21 | Music | Acoustic Guitar Basics | `acoustic-guitar-basics` | C | — |
| 22 | Music | Piano/Keyboard Basics | `piano-keyboard-basics` | C | — |
| 23 | Music | Ukulele Basics | `ukulele-basics` | C | — |
| 24 | Music | Music Theory Fundamentals | `music-theory-fundamentals` | A | — |
| 25 | Music | Reading Musical Notes | `reading-musical-notes` | A | — |
| 26 | Music | Vocal Techniques Basics | `vocal-techniques-basics` | C | — |
| 27 | Music | Songwriting Basics | `songwriting-basics` | B | — |
| 28 | Music | Rhythm and Timing | `rhythm-and-timing` | A | — |
| 29 | Music | Basic Music Production | `basic-music-production` | B | — |
| 30 | Music | Music Arrangement Basics | `music-arrangement-basics` | A | — |
| 31 | Language | English Conversation | `english-conversation` | C | — |
| 32 | Language | English Grammar | `english-grammar` | A | Yes |
| 33 | Language | Academic English Writing | `academic-english-writing` | A | — |
| 34 | Language | Filipino Communication | `filipino-communication` | B | — |
| 35 | Language | Filipino Creative Writing | `filipino-creative-writing` | C | — |
| 36 | Language | Public Speaking | `public-speaking` | C | — |
| 37 | Language | Basic Spanish Conversation | `basic-spanish-conversation` | B | — |
| 38 | Language | Basic Japanese Conversation | `basic-japanese-conversation` | B | — |
| 39 | Language | Basic Korean Conversation | `basic-korean-conversation` | B | — |
| 40 | Language | Presentation and Communication Skills | `presentation-and-communication-skills` | B | — |
| 41 | Lifestyle | Time Management | `time-management` | B | — |
| 42 | Lifestyle | Study Techniques | `study-techniques` | B | — |
| 43 | Lifestyle | Personal Budgeting | `personal-budgeting` | A | — |
| 44 | Lifestyle | Basic Cooking | `basic-cooking` | C | — |
| 45 | Lifestyle | Baking Fundamentals | `baking-fundamentals` | C | — |
| 46 | Lifestyle | Food Safety and Hygiene | `food-safety-and-hygiene` | A | Yes |
| 47 | Lifestyle | Meal Planning Basics | `meal-planning-basics` | A | — |
| 48 | Lifestyle | Stress Management Techniques | `stress-management-techniques` | B | — |
| 49 | Lifestyle | Personal Organization | `personal-organization` | B | — |
| 50 | Lifestyle | Healthy Habit Planning | `healthy-habit-planning` | B | — |
| 51 | Business | Bookkeeping Fundamentals | `bookkeeping-fundamentals` | A | Yes |
| 52 | Business | Financial Accounting Basics | `financial-accounting-basics` | A | — |
| 53 | Business | Cost Accounting Basics | `cost-accounting-basics` | A | — |
| 54 | Business | Financial Statement Interpretation | `financial-statement-interpretation` | A | — |
| 55 | Business | Accounting Information Systems Basics | `accounting-information-systems-basics` | A | — |
| 56 | Business | Entrepreneurship Fundamentals | `entrepreneurship-fundamentals` | A | — |
| 57 | Business | Marketing Fundamentals | `marketing-fundamentals` | A | — |
| 58 | Business | Inventory Management Basics | `inventory-management-basics` | A | — |
| 59 | Business | Customer Service Fundamentals | `customer-service-fundamentals` | B | — |
| 60 | Business | Tourism and Hospitality Operations Basics | `tourism-and-hospitality-operations-basics` | A | — |
| 61 | Academic | College Algebra | `college-algebra` | A | — |
| 62 | Academic | Introductory Statistics | `introductory-statistics` | A | Yes |
| 63 | Academic | General Biology | `general-biology` | A | — |
| 64 | Academic | General Chemistry | `general-chemistry` | A | — |
| 65 | Academic | Anatomy and Physiology Fundamentals | `anatomy-and-physiology-fundamentals` | A | — |
| 66 | Academic | Microbiology Concepts | `microbiology-concepts` | A | — |
| 67 | Academic | Psychology Fundamentals | `psychology-fundamentals` | A | — |
| 68 | Academic | Criminal Justice System Fundamentals | `criminal-justice-system-fundamentals` | A | — |
| 69 | Academic | Human Movement Science Basics | `human-movement-science-basics` | A | — |
| 70 | Academic | Pharmaceutical Science Fundamentals | `pharmaceutical-science-fundamentals` | A | — |
| 71 | Other | Chess Fundamentals | `chess-fundamentals` | A | Yes |
| 72 | Other | Debate Fundamentals | `debate-fundamentals` | C | — |
| 73 | Other | Peer Mentoring Basics | `peer-mentoring-basics` | B | — |
| 74 | Other | Teamwork and Collaboration | `teamwork-and-collaboration` | B | — |
| 75 | Other | Project Planning Basics | `project-planning-basics` | A | — |
| 76 | Other | Community Event Organizing | `community-event-organizing` | B | — |
| 77 | Other | Leadership Fundamentals | `leadership-fundamentals` | B | — |
| 78 | Other | Interview Preparation | `interview-preparation` | C | — |
| 79 | Other | Resume and Portfolio Building | `resume-and-portfolio-building` | B | — |
| 80 | Other | Problem-Solving Techniques | `problem-solving-techniques` | A | — |

Totals: **80 skills; A = 45, B = 21, C = 14; six priority candidates**. Tests independently compare every name/category against the requested list. No skills are restricted to a student's academic program.

## Add New Skill behavior

1. Choose Teaches or Wants to Learn, then one of the eight categories.
2. Focus Skill Name to see up to ten suggestions for that category; typing filters names case-insensitively.
3. Choose with mouse/touch or Arrow Up/Down and Enter. Focus remains in the input and the selected canonical label/category is used. Input/listbox labeling, active-descendant state, visible focus, bounded scrolling and a mobile-height dialog are provided through existing React/UI primitives.
4. Save through the existing form. The backend controls the canonical record/category; it never trusts a client-supplied tier or score.
5. No matching suggestion shows an explicit empty state and allows a custom skill. A suggestion-service failure also preserves custom entry. Existing required/max-length/server validation remains; availability failure does not fabricate presets or assessment content.
6. Existing assessment prompting follows a successful teaching-skill save. No published bank means **Assessment Unavailable**, Not Assessed and continued sharing. Where a real published bank exists, the existing save-first Take/Skip and later upgrade workflow is retained. Wanted skills do not create a user's teaching assessment relationship.

A new regression caught a mobile blur/layout issue: collapsing the in-flow suggestion list while focus moved to Save could move the button between pointer-down/up and swallow the first click. Keeping the form layout stable during internal focus changes corrected it; no assessment or ranking policy changed.

## Existing data and safe sandbox application

The selected recovery-1 database was verified using exact Docker container/volume ownership, mount/loopback port, matching private checkpoint/settings and challenge-signed API identity before database work. Target: `127.0.0.1:3311/knoxite_sandbox_recovery_1_dev`; frontend 5180; backend 5012. No ordinary `knoxite` URL was used.

Before applying the catalog, there were **eight existing skill records**, no exact preset conflicts, and no assessment banks/versions. The first guarded application created 80 skill records; the second created **zero**, reusing all 80. All eight original Skill rows were preserved exactly. Snapshots confirmed existing user offered/wanted links, offered-skill tiers/prompt history, swaps, reviews, assessment attempts/banks, program-year links and department mappings were unchanged by initialization.

The subsequent live test added two clearly labelled synthetic students through ordinary registration/captured verification and normal login. They selected Python/Bookkeeping offers and wants, including cross-program sharing (BSCS and BSN), and one additional namespaced custom skill. Their new records and associations were retained; no existing data was reset/deleted. Total Skill rows after that custom addition are 89: 80 presets, eight preserved older skills and the one new synthetic custom skill. Test-issued sessions were normally logged out. Private credentials, captured links and auth tokens were not printed or put in Git/test traces.

The user restarted the sandbox through its normal stop/start commands to load the new backend endpoints. No process ownership guard was bypassed. No production or original database seeding, deployment, migration, deletion or Git publication was performed.

## Assessment availability and safeguards

**Current sandbox question-bank availability: zero banks, zero versions; no real basic or advanced assessment has been published.** Neither the catalog nor A/B/C classifications change that. All 80 skills remain shareable without assessments.

Existing backend bank validation/publication remains authoritative. Basic requires a PUBLISHED version with validation metadata for the exact Skill ID. Advanced also requires that student's basic-pass/Amateur prerequisite for the same offered skill. Bank existence on a similarly named custom Skill ID does not transfer eligibility. No catalog field is added to the assessment policy or WRMR formula.

The existing engine preserves ten basic MCQs, five–ten applied advanced choices, initial 80% per-version thresholds, randomized item/answer order, backend-only grading, per-offering attempts/versions and retained tiers. Retake limits remain three starts in 168 hours per level with 24-hour failure/expiry cooldown. Re-adding an existing offered skill reuses its relationship rather than resetting earned tiers or history.

Synthetic published-version metadata is used only in in-memory service tests to verify basic/advanced availability and prerequisites; synthetic UI fixtures exercise the existing progression. **No synthetic question bank was imported, validated or published in the live sandbox.** No questions, passing records or assessment tiers were generated by this task. Group C does not become a hardcoded assessment ban, but future reviewers must not describe theoretical quiz results as observed practical competency.

## Six priority planning templates

These are proposed, unreviewed topic/outcome outlines and completion forms, not importable banks. They contain no question items, answer keys, passing records or reviewer approvals:

- [Python Programming Fundamentals](assessment-plans/python-programming-fundamentals.md) — Technology; resolve UUID through the administrator catalog.
- [English Grammar](assessment-plans/english-grammar.md) — Language; resolve UUID through the administrator catalog.
- [Food Safety and Hygiene](assessment-plans/food-safety-and-hygiene.md) — Lifestyle; resolve UUID through the administrator catalog.
- [Bookkeeping Fundamentals](assessment-plans/bookkeeping-fundamentals.md) — Business; resolve UUID through the administrator catalog.
- [Introductory Statistics](assessment-plans/introductory-statistics.md) — Academic; resolve UUID through the administrator catalog.
- [Chess Fundamentals](assessment-plans/chess-fundamentals.md) — Other; resolve UUID through the administrator catalog.

Each template covers proposed learning-objective/topic scope; basic versus applied scenario topics; 10/basic and 5–10/advanced counts; pool size (at least attempt count, at most 200); keys/distractors/rationale requirements; private rubric fields; content references; subject review; reviewer/date/evidence; draft validation/publication; and immutable published versioning. A pool exactly equal to the attempt size changes order but cannot vary which items are selected. A larger reviewed pool is an authoring choice, not a new mandatory threshold.

Subject reviewers must complete final outcomes, accurate items/options/keys and provenance, check applied reasoning/ambiguity/accessibility, record actual review evidence and approve the content pilot. Import only completed content as DRAFT. Use the existing human-validation action after review, then publish when authorized. A template, preset classification or successful engine test is not academic approval. Any new practical/video/AI/execution format or eligibility-policy change requires separate approval and was not implemented.

## Tests and actual results

- Backend suite: **96 passed, 0 failed**, including eight new catalog/service tests. These check all 80 exact names/categories, stable keys, A/B/C counts and six priority flags; repeated initialization; legacy ID/name/category preservation; exact-name/preset reuse; custom separation; conflict handling; rejected inputs; published-bank availability; basic-pass prerequisite; and unavailable banks. Existing auth/assessment/WRMR regressions also passed. No destructive/migration integration suite was run.
- Frontend/browser result: **14 passed, 0 failed** in the final complete focused run (45.1 seconds), desktop/mobile. New cases cover all category filters, case-insensitive search, keyboard and mouse selection, offered/wanted payloads, custom/empty/failure handling and mobile widths. Existing skip/unavailable/basic-to-advanced-failure regressions are included. Two initial runs each had 13 pass/1 mobile failure: waiting for completion exposed the actual blur/layout defect rather than merely a fast assertion. After the component fix, the targeted desktop/mobile case passed and the full 14-test selection passed. These earlier failures are not concealed or counted as successful tests.
- Actual sandbox browser/API test: **1 passed, 0 failed** (8.6-second test; 10.6-second command). It verifies 80 materialized IDs; ADMIN-only initialization; real offer/want selections through the modal; repeated offer reuse; reciprocal cross-program matches; Not Assessed/unranked access; basic 404 when unavailable; advanced 403 before prerequisite; custom separation; public portfolio IDs/privacy; bank/academic snapshots unchanged; Google off. It does not repeat the full swap/WRMR lifecycle or publish content.
- Frontend/backend builds and type checks passed; existing bundle-size warning remains. The new browser/sandbox tests also passed a strict standalone TypeScript check. The final frontend build/type check passed after the mobile-focus correction. No dependencies or Prisma schema changed.
- Initial catalog application and exact preservation checks passed as described above. Final guarded reads confirmed 80 unique materialized canonical IDs, all eight original Skill rows unchanged, the complete academic/program-year configuration unchanged, zero banks/versions and 89 total skills after the one new custom fixture. Repository and manuscript preservation/whitespace checks passed.

Final successful suites total **111 tests**: 96 backend, 14 focused desktop/mobile browser and one actual-sandbox browser/API integration. Repeated diagnostic runs of the same mobile case are not added again to that total. No old test totals were reused as fresh results.

Final `sandbox:check` passed the selected database/API identity and all four seeded account/password-hash/verification/role/suspension checks. Repository comparison retained all 242 pre-task public Git files with only the five intended existing-file edits below and 13 new files; no unexpected changes/deletions occurred. The original thesis SHA-256 is unchanged, new-file whitespace/credential-pattern checks and `git diff --check` passed, and the working branch remains `dev-justine`.

Relevant commands:

```powershell
npm --prefix knoxite-backend test
npm run typecheck
npm run build
npm --prefix knoxite-backend run typecheck
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npm run test:browser -- preset-skills.spec.ts workflows.spec.ts --grep 'every category|wanted skills select|empty search|unavailable catalog|saving a supported offering|unsupported teaching skills|basic pass uses'
npm run test:sandbox -- preset-catalog.spec.ts
```

Run the two browser commands sequentially because the general output directory is the parent of the sandbox output directory. Sandbox tracing/screenshots/video remain disabled. Future actual catalog-test executions add a fresh labelled synthetic cohort and do not delete it.

## Exact files changed

Existing files modified:

| File | Reason |
| --- | --- |
| `knoxite-backend/routes/profile.ts` | Authenticated catalog read and canonical resolution through the existing offer/want save workflow |
| `knoxite-backend/routes/admin.ts` | ADMIN-only, repeatable catalog initialization using existing authorization/transaction patterns |
| `src/app/pages/MySkillsPage.tsx` | Category-before-name selection, preset/custom payloads, accessible labels, mobile bounds and unavailable wording |
| `src/app/pages/AssessmentAdminPage.tsx` | Add/reuse preset records for bank authoring through the existing administration page; no bank approval shortcut |
| `docs/STUDENT_TESTING_READINESS.md` | Record the team's authoritative clarification that three first-year-only settings are intentional and must remain unchanged |

New files:

- `knoxite-backend/config/skill-catalog.json` — exact 80 names, categories, keys and advisory planning metadata.
- `knoxite-backend/services/skillCatalog.ts` — safe catalog listing, initialization and shared-record resolution.
- `src/app/components/SkillPresetInput.tsx` — searchable category-filtered combobox without a new library.
- `knoxite-backend/tests/skill-catalog.test.ts` — catalog, preservation and assessment service regressions.
- `tests/browser/preset-skills.spec.ts` — desktop/mobile preset and custom-entry regressions.
- `tests/sandbox/preset-catalog.spec.ts` — guarded actual-API/browser integration using new synthetic students.
- `docs/PRESET_SKILL_CATALOG_AND_ASSESSMENT_READINESS.md` — this report.
- The six `docs/assessment-plans/*.md` templates linked above.

No academic configuration/schema, authentication policy, WRMR/partner-balanced scoring, cancellation attribution, retake policy or published content was changed. Existing uncommitted work was preserved. All changes remain local on `dev-justine`; nothing was committed, pushed, merged or deployed.

## Remaining decisions and next task

The catalog is operational independently of assessment content. The next academic task is to complete and subject-review a small set of basic/advanced banks for the six priority skills, select content references/pool sizes and pilot limitations, and then authorize publication through the existing workflow. Existing institutional eligibility, real mail delivery, privacy/consent and release-readiness gates remain separate. Group A/B/C and the six priority labels are not evidence of approval.

Any future legacy synonym merge/category conversion, schema migration, practical-assessment service, moderation-policy expansion, assessment eligibility change or WRMR change requires separate approval. None is needed to use this catalog. Preserve the intentional first-year-only programs and all 13 validated college mappings.
