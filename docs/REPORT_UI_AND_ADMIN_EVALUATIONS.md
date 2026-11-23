# Report UI and administrator peer evaluations

Local changes on `dev-justine`, November 23, 2026. No commit, push, deployment, protected database connection or hosted configuration change.

## Changes

- Report a Concern now uses the shared `knoxite-surface` background and a compact outlined Back to Dashboard link with an arrow. Report submission, self-report protection and optional evidence behavior are unchanged. Evidence remains default-off.
- Added **Peer Evaluations** at `/admin-dashboard?section=evaluations`, available through AdminShell and the Overview metric card. Rows show student names, rating, feedback (or its absence), exchange skills/ID/status, submission date/time and stored validation status. No editing/deletion controls.
- Added ADMIN-only `GET /api/admin/peer-evaluations`. Name search, rating, validation and chronological sorting run on the server. Default page size is 20; the API caps it at 50 and validates query bounds. The response excludes student emails, credentials and unrelated profile data.
- The default `COUNTED` filter and Overview share the existing exact predicate: `Review.isValidated = true`, related `Swap.status = COMPLETED`, and `Swap.integrityVerified = true`. This remains an all-time count of submissions, not unique reviewers or a new scoring definition. Other explicitly selected views disclose exclusions from Overview. WRMR and outcome validation are unchanged.
- Exchange context is shown inline. Existing exchange-detail routes are participant-only, so they are not linked from ADMIN review rows. No new exchange-browsing authorization was introduced.
- Academic actions use compact buttons: Review Mappings, Add Academic Option, Change Department and Manage Year Levels. Associated regions have `aria-expanded`/`aria-controls`; closing restores trigger focus. Mounted forms retain values. Initialization, validation, mapping evidence and first-year restrictions retain their existing behavior.
- Import Guide and Advanced Import Options have compact controls. The JSON editor retains malformed input and error feedback; Import Draft and its existing confirmation remain available. Importing still creates only an unreviewed draft.
- Analytics uses View Data Table / Hide Data Table with keyboard-operable disclosure semantics. The same accessible filtered table and chart calculations remain intact.

## Exact changed files

Application:

- `src/app/pages/ReportUserPage.tsx`
- `src/app/pages/AdminDashboardPage.tsx`
- `src/app/pages/AssessmentAdminPage.tsx`
- `src/app/components/admin/AdminShell.tsx`
- `src/app/components/admin/AdminAnalytics.tsx`
- `src/app/components/admin/PeerEvaluations.tsx` (new)
- `knoxite-backend/routes/admin.ts`
- `knoxite-backend/routes/analytics.ts`
- `knoxite-backend/services/reviewReporting.ts` (new)

Tests:

- `tests/browser/admin-console.spec.ts`
- `tests/browser/dashboard-phase-and-reports.spec.ts`
- `tests/browser/workflows.spec.ts`
- `knoxite-backend/tests/peer-evaluations.test.ts` (new)
- `knoxite-backend/tests/integration/peer-evaluations.test.ts` (new)

Report: `docs/REPORT_UI_AND_ADMIN_EVALUATIONS.md` (new). Pre-existing untracked operator files are preserved.

## Verification

- Backend type check and production build: passed (Prisma Client 6.19.3).
- Backend targeted unit/security/scoring/reporting regressions: **39 passed, 0 failed/skipped** across peer-evaluations, rules, partner-integrity, leaderboard-eligibility, reports-security and report-evidence.
- `node development/ciIntegration.cjs peer-evaluations.test.js`: **4 passed, 0 failed/skipped** (parent plus three subtests) on an independently owned disposable MySQL container. Proves real JWT ADMIN/student separation, exact Overview/list totals, server pagination/filtering, bounded queries and unchanged stored review fingerprints. No protected connection profiles are used.
- Final frontend type check and production build: passed.
- Browser checks: **78 passed, 0 failed/skipped**. The final admin-console, dashboard-phase-and-reports and evidence-moderation run passed all 74 desktop/mobile configurations; both affected workflows passed another four configurations. Coverage includes the new directory/card navigation, server-filter parameters and page resets, name/rating/date/validation views, loading/error/retry/empty states, student denial, compact controls and retained form values, malformed JSON, required-field/approval validation, existing confirmations and responsive layouts. Report layout was checked at 320, 375, 390, 430 and 1280 pixels in both themes; admin checks include 320/390/1280 pixels. Screenshots were inspected for the new directory and narrow-screen presentation.
- `git diff --check`: passed. No local implementation/test failures remain.
- During development, newly added tests needed accessible-role selectors for implicit form labels; existing tests were updated for the requested renamed disclosure buttons. An intermediate toolbar JSX error was corrected before the final run. No authorization, validation or business assertions were removed.

## Release notes / limitations

No migration or new environment variable is required. The new frontend section needs the accompanying backend read endpoint when a later release is authorized; an older backend produces the visible retry/error state. No release has been executed.

Browser checks use isolated, mocked APIs and Chromium desktop/mobile viewports, not a physical Android device. Dense admin tables remain horizontally scrollable inside their own accessible containers. The existing Vite bundle-size advisory is unrelated to this change.
