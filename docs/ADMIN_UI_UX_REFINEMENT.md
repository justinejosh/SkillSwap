# Administrator UI/UX refinement

Date: 2026-11-16. Branch: `dev-justine`. Local review target: `http://localhost:5181`.

## Scope and inspection

Inspected the active dashboard, analytics, assessment administration, academic configuration, reports, forum moderation, leaderboard audit and integrity review, along with their existing authenticated endpoints. The pre-task working tree was preserved using a private hash manifest and source snapshot. No pre-existing files were deleted. This task does not change student pages, authentication, database schemas, academic options, WRMR, exchange validation, assessment content or publication policy.

Confirmed usability/data-presentation issues:

- Assessment and integrity routes lacked the dashboard's navigation, account controls and theme consistency.
- Assessments, imports, academic configuration and reports occupied one long page; private questions and repeated review evidence dominated the list.
- Supply/demand merged two separate top-five lists, treating absent counterparts as zero. It could not reliably compare all 80 presets. Long labels made the vertical-column chart hard to read.
- Read failures could appear as empty/zero data. Monthly rate responses omitted the denominators/exclusions needed to explain sparse charts.
- The account list was limited to recent accounts and lacked bounded server-side search/pagination.
- Consequential actions needed explicit identification/confirmation, particularly version retirement. Null integrity timing values should not read as zero minutes.

## Navigation and layout

One small shared `AdminShell` now wraps all active administrative pages. Existing ADMIN route guards and endpoint authorization remain in place. The sidebar collapses on mobile, has active states, and uses ordinary URL links for deep links, refresh and Back. The header includes breadcrumbs, the existing per-account theme preference and server-confirmed logout. Dense working surfaces are neutral cards; decorative background styling is scoped and restrained. Shared controls cover confirmation dialogs, pagination, readable count formatting and text-plus-color status badges. Wide tables scroll inside their cards instead of breaking names into single-character columns; scroll regions and chart labels can receive keyboard focus.

| Section | URL |
| --- | --- |
| Overview | `/admin-dashboard` |
| Analytics & Trends | `/admin-dashboard?section=analytics` |
| Student Management | `/admin-dashboard?section=students` |
| Assessment Management | `/admin/assessments` |
| Import Question Bank | `/admin/assessments?section=import` |
| Forum Moderation | `/admin-dashboard?section=forum` |
| Reports | `/admin/assessments?section=reports` |
| Leaderboard Audit | `/admin-dashboard?section=leaderboard` |
| Integrity Review | `/admin/integrity` |
| Academic Configuration | `/admin/assessments?section=academic` |

The existing ADMIN-only `/analytics` route redirects to the shared analytics workspace. A selected assessment version uses `?version=<id>` and survives refresh/Back. No routing infrastructure was replaced.

## Assessment, academic and moderation workspaces

- Assessment directory: skill/name search, category, BASIC/ADVANCED and stored publication-status filters; ten versions per page; per-attempt question count, threshold, attempt count and details action.
- Opening a version focuses and scrolls to its details. Only the selected version renders its detailed learning outcomes and collapsible grading/retake rules, private questions, version history and **Review & Publication Evidence**. Stored review text, source hashes, dates and administrator identifiers are retained verbatim. A reviewed draft is still DRAFT. Local project-owner/team pilot authorization is explicitly distinguished from independent faculty/university/professional review.
- Import is separate, checks JSON syntax before confirmation, snapshots the submitted object and explains that only a new DRAFT is created. Existing backend validation is authoritative. Canonical initialization remains manual and is described as idempotent; it is never run automatically.
- Validate, publish and retire use the existing endpoints with exact skill/level/version confirmations, busy states and duplicate-click protection. Published immutability, approval requirements, attempts, badges and history are unchanged. No actual import, validation, publication or retirement was performed during this task.
- Academic configuration is separate, searchable and uses the stored mapping status/evidence. Existing handlers, department IDs and permitted years remain unchanged. BSIT, BSIHM-CA and BSIHM-HACLO still have only 1st Year. The provisional draft is identified as such, rather than overwriting validated mapping descriptions.
- Reports have their own search/status/pagination workspace, stored notes, dates and dispositions. Resolving/dismissing requires notes and confirmation; suspension is a separate explicitly confirmed action.
- Student Management separates STUDENT/ADMIN and active/suspended accounts, supports search and twenty-account pages, and confirms existing suspension semantics (access/session revocation, historical records retained). No restoration operation exists in the backend; none was invented.
- Forum has search/category filtering, paging and thread/reply inspection before deletion. Confirmation explains that replies are also removed by the existing cascade. No real content was deleted. Existing APIs do not support thread-specific report flags or individual reply moderation.
- Leaderboard audit separates Top Mentors/Most Active and preserves server order. Search does not renumber underlying ranks. Empty states explain the two-distinct-completed-partner requirement; repeated raw volume is historical, not reputation points.
- Integrity review groups observed patterns and private case history with filters, stored evidence and neutral language. Missing intervals display as unavailable. Existing revision-controlled human review remains unchanged; no automatic penalties, thresholds or scoring changes were added.

## Dashboard definitions and analytics

`Refresh Sync` was only a data reload; it is now **Refresh data** and performs GET requests only. Overview keeps its original `/analytics` sources rather than substituting the different `/admin/dashboard-data` definitions:

| Display | Existing source/definition retained |
| --- | --- |
| Registered Students | `/analytics.systemHealth.totalUsers`: role USER accounts, including suspended accounts; ADMIN excluded |
| Active Ongoing Swaps | `/analytics.swapMetrics.activeSwaps`: CONFIRMED only; pending agreements separate |
| Completed Swaps | `/analytics.swapMetrics.completedSwaps`: existing validated exchange-outcome aggregation |
| Peer Evaluations | `/analytics.systemHealth.totalReviews`: validated review submissions on COMPLETED, integrity-marked exchanges; not unique students |
| All registered accounts | `/admin/dashboard-data.stats.totalUsers`: includes ADMIN; shown separately |
| Open reports/integrity records | Existing `/admin/dashboard-data.stats.reportedIssues`; not a misconduct count |

Supply/demand uses an additive `skillTrends.catalog` response for the exact canonical 80 presets. Existing `topWanted` and `topOffered` response fields remain intact. Counts retain the existing aggregation: active offered-skill links and wanted-skill associations across **all account roles**. Each account can have at most one link per skill per direction. They are not a census of currently eligible/enrolled students and do not imply reciprocal compatibility. No unrelated joined rows inflate the counts. This chart is explicitly scoped to presets; historical custom skills and their associations remain preserved, and the original top-five API fields remain available.

The horizontal grouped chart uses blue supply/green demand, complete wrapped skill names, category plus case-insensitive search, highest demand/supply/shortage/alphabetical sorting and top-ten/all display. Shortage = demand minus supply: positive means more wanted links, zero equal counts, negative more teaching links. Uninitialized/conflicting canonical records return unavailable counts, never invented zeros. Keyboard-focus and hover on skill labels expose counts; an expandable data table supplies the same information. Long charts scroll within a bounded area. Mobile keeps labels readable using internal horizontal scrolling.

Monthly completion preserves the existing outcome gate and formula: validated completions divided by eligible concluded outcomes, including qualifying bilateral-agreement cancellations. It is an exchange-level descriptive rate, not partner-balanced WRMR completion input. Existing six-month UTC window remains; the frontend may narrow it to the last three months. Additive response fields disclose eligible concluded/cancelled and excluded outcomes, plus undated concluded records. A genuine zero is 0%; no eligible outcomes remains null. Excluded concluded records, absent activity and unavailable old-server metadata receive different explanations. Rates use a 0–100% axis and do not connect across null months. The textual evidence table is always available.

Read-only dedicated-database inspection found four validated completions among five eligible concluded exchanges, all in **November 2026**, with no excluded or undated concluded exchanges in that inventory: **80.0%** for that month. Other months do not acquire fabricated rates. An entirely blank historical screenshot state was not reproduced against an authenticated real admin browser; no unsupported claim is made that its sole cause was a date or validation defect. Sparse one-point data, missing explanations and silent request failures were addressed without changing calculations. All-time overview totals and date-scoped chart totals are explicitly distinguished.

No additional speculative activity/status/assessment charts were added. The two requested charts take priority.

## Smallest backend additions and security

Two existing authenticated routers required additive read data:

1. `GET /api/admin/users`: ADMIN-only bounded query (`pageSize` at most 50), search/role/suspension filters, deterministic order and explicit safe select. Returns only ID, name, email, role, suspension and creation date. Never password hashes, tokens or external identity secrets.
2. `GET /api/analytics`: ADMIN-only additive full-catalog counts and monthly denominator/evidence metadata. Existing count semantics, fields and scoring gates remain unchanged.

Student route guarding still uses the server-authoritative role. Test coverage denies students before private grading metadata is fetched and verifies backend 403s independently. Private assessment questions continue to use the existing authorized administrator endpoint; student-facing endpoints were not expanded. Session timeouts, revocation and OAuth restrictions were not edited.

## Verification and preservation

Fresh focused results:

| Check | Actual result |
| --- | --- |
| Backend build | Passed (`tsc`; Prisma Client already matched; no schema synchronization) |
| Backend type check | Passed |
| Backend targeted admin readiness, thesis alignment and leaderboard eligibility tests | **10 passed**, including 5 new administrative/security/analytics cases |
| Browser admin console plus relevant existing workflow/session regressions | **46 passed**: desktop 1280×900 and mobile 390×844, normal device scale |
| Rollback-only real MySQL administrative role/data-read integration | **1 passed**; no fixture commits; before/after synthetic shared-data snapshot matched |
| Follow-up chart accessibility, retry, assessment-details and moderation checks | **8 passed**, then **8 passed** after final status/confirmation styling and **2 passed** for selected-detail keyboard focus/scrolling and **2 passed** for precise monthly exclusion wording; these are repeat checks, not additional unique cases |
| Frontend type check and production build | Passed; existing Vite bundle-size warning remains |
| Working-tree whitespace check | Passed; Git emitted existing LF/CRLF conversion notices |

The 46-case run comprises 26 new admin browser cases (13 cases on two viewports) and 20 existing workflow/session checks. It covers navigation/deep links/refresh/Back, truthful counts, chart filtering/sorting/zero/null data, focus/hover counts, long labels, directory filters/paging/details, confirmation cancellation/errors, draft-only mock imports, academic restrictions, user filtering, forum/report mocks, empty leaderboards, theme persistence, forged cached role recovery, session warnings, multi-tab logout and failed revocation handling. Final follow-up checks also verify successful retry clears a previous loading error.

An initial browser development run was interrupted to correct test selectors for implicit select labels. The first MySQL assertion incorrectly assumed the synthetic database contained only thirteen total program rows; it also preserves six legacy/test rows. The corrected assertion checks the thirteen canonical program codes, preserves all extra rows, and reads the existing year-level `name` field. That test then passed. These were test-assumption corrections, not data cleanup or changes to supported college programs.

Browser tests intercept API calls with synthetic fixtures on separate test ports; no actual OAuth account was used for automated moderation, imports, reviews or session creation. MySQL verification reused the existing ownership-checked synthetic fixture, with all test records inside one transaction that was intentionally rolled back. No real question bank or account action was executed. Screenshot inspection covered mobile/desktop analytics and administration layouts; internal chart/table scrolling is intentional.

Dedicated OAuth ownership was verified using the existing private settings/Docker/SQL guards before SELECT-only inspection. Final hashes of **28 of 29** dedicated-database tables matched the task-start snapshot, including users, sessions, identity associations, academic configuration, banks/versions/questions, attempts/tiers, swaps, reviews and case history. The **temporary GoogleAuthChallenge table changed while the local application was running**; this task did not restore/delete it or claim a whole-database unchanged snapshot. The read-only inventory created no Google account/session and issued no real administrative mutations. Recovery-1 configuration/history, the original database, production and thesis were not changed. The pre-task hash comparison found no deleted prior files; policy/config/content/schema/auth/session and student UI sources remained unchanged.

## Exact task files

Changed existing files (relative to the pre-task snapshot, not all accumulated Git changes):

- `knoxite-backend/routes/admin.ts` — bounded ADMIN account directory.
- `knoxite-backend/routes/analytics.ts` — complete canonical catalog and descriptive reporting metadata, existing gates retained.
- `knoxite-backend/tests/thesis-alignment.test.ts` — additive monthly-response expectations only.
- `src/app/pages/AdminDashboardPage.tsx` — shared overview/workspace coordinator and accurate count descriptions.
- `src/app/pages/AnalyticsPage.tsx` — legacy guarded analytics redirect.
- `src/app/pages/AssessmentAdminPage.tsx` — separate directory/import/academic/report workspaces, retained existing configuration handlers.
- `src/app/pages/IntegrityAdminPage.tsx` — shared shell, filtering and clearer neutral evidence/history presentation.
- `src/styles/index.css` — imports scoped administrator styling.
- `tests/browser/workflows.spec.ts` — existing academic tests point to the separated workspace/open its collapsed form.
- `tests/browser/session-security.spec.ts` — tests the shared admin logout confirmation and truthful inline failure on both viewports.

New files:

- `src/app/components/admin/AdminShell.tsx` — shared navigation/header/theme/logout.
- `src/app/components/admin/AdminUI.tsx` — confirmation, pagination, counts and status display.
- `src/app/components/admin/AdminAnalytics.tsx` — chart filters, presentation and evidence tables.
- `src/app/components/admin/AdminWorkspaces.tsx` — account, forum and leaderboard views using existing APIs.
- `src/app/components/admin/AssessmentDirectory.tsx` — paged directory, selected version and private evidence/details.
- `src/app/components/admin/AdminReports.tsx` — report directory and existing disposition actions.
- `src/styles/admin.css` — admin-scoped surfaces, forms, tables and accessibility styling.
- `knoxite-backend/tests/admin-readiness.test.ts` — focused backend authorization, response semantics and publication guards.
- `tests/browser/admin-console.spec.ts` — synthetic browser fixtures and admin regression tests.
- `tests/sandbox/admin-readiness.spec.ts` — ownership-checked rollback-only MySQL authorization/read test.
- `docs/ADMIN_UI_UX_REFINEMENT.md` — this report.

## Remaining limitations / approval boundaries

- Reload the dedicated API to expose the additive catalog/monthly/directory fields. An old backend is reported as unavailable rather than supplying false zero catalog counts.
- The existing assessment-list API still sends complete private bank payloads to authorized administrators. The UI renders only the selected detail; server-side bank pagination/detail endpoints would be a separately scoped performance improvement for a much larger collection.
- Forum and report directories retain existing API result limits; UI filters operate on supplied records. No new reply-moderation, restore-account or semester-enrollment system was introduced. Future enrollment review could surface a separately approved status in Student Management; no status is invented now.
- Existing academic initialization upserts do not overwrite configured mappings/years. A newly missing program, however, is seeded with the catalog's general year list; initialization must not be treated as a replacement for the three approved first-year-only configurations. It was not run. A future fresh-install restriction/seed policy correction requires explicit review rather than silently changing academic configuration here.
- Stored `mappingValidatedAt` indicates recorded validation, not independently verified university approval. Supporting evidence remains visible and unchanged.
- Do not interpret chart association counts as enrollment, attempt counts as unique students, or repeated-partner observations as misconduct. No research findings or participant evaluation results are manufactured.
- Production release, schema changes, restoration privileges and institutional/enrollment-policy changes remain outside this task. No new human approval is claimed.

## Local restart

Only the dedicated API needs restarting for the new read fields. In its original terminal, stop **only port 5019's OAuth backend** using Ctrl+C, then:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs backend
```

Keep the existing localhost:5181 frontend and recovery-1 running. Vite should hot-reload these frontend sources; refresh the administrator page. If the dedicated frontend itself is stopped, start it in a separate terminal using the existing guarded launcher:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs frontend
```

Open `http://localhost:5181/admin-dashboard` using the existing separate password administrator. No credential output is needed. No initialization, import, publication, suspension, migration or reset command is part of this restart. No commits, pushes, merges or deployments were performed.
