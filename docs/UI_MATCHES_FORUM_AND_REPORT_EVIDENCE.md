# Matches, assessment navigation, administration and reports

> Historical implementation snapshot. The later default-off evidence and audit implementation is documented in [MODERATION_AUDIT_AND_REPORT_EVIDENCE.md](MODERATION_AUDIT_AND_REPORT_EVIDENCE.md); the image-infrastructure blockers below describe the earlier pass.

Local work on `dev-justine`. Previous Session Plan/scheduling changes and unrelated operator files are preserved. No commit, push, hosting change or protected database access.

## Implemented

- Compatible matches use **Compatible peers / 1 match found / N matches found** instead of anchor links styled as tabs. The old controls did not filter or switch views. Separate evidence groups remain when useful; server order within each group, null scores, request eligibility, the dashboard title, description and KnoxHub action are preserved.
- One **How matching works** disclosure explains reciprocal skills, 50/30/20 weights, partner balancing, missing evidence, assessment exclusion and the non-probabilistic score. Profiles use **About ratings and exchanges**, without repeating the ranking explanation.
- Active Swaps distinguish pending agreement, scheduling pending, first session, independent participation, partner confirmation and reviews pending. Numeric progress appears only after an approved agreement has recorded participation. Calendar failure means scheduling is unknown, never an invented empty schedule. Actual participation without a schedule remains supported.
- Assessment History and Back to My Skills use existing compact buttons/icons. Public-profile Back to KnoxHub follows the same navigation pattern. Destinations, history, tiers and eligibility are unchanged.
- Admin academic years sort descending on copies of the permitted sets, including details and the year-management controls. First-year-only sets remain intact. Program evidence opens a separate compact details panel, with reviewer IDs/version secondary and evidence verbatim. Recorded evidence is not relabeled as university approval.
- Assessment administration uses clearer labels, a searchable canonical skill selector and optional identifier-copy controls. Raw JSON remains available under Advanced Import Options. Changing the selected skill changes only `skillId`; malformed JSON is retained with an error. Import, validation and publication safeguards are unchanged. Add Academic Option retains its accurate generic label because that form also creates departments and year options.
- Forum inspection separates the original thread, authors, timestamps, replies and thread removal. Students see reply removal only for their own exact identity; administrators can remove individual replies. Both use the same confirmation/error UI. Existing thread-author post deletion remains intact.

## Backend and data contracts

New authenticated endpoint: `DELETE /api/forum/posts/:postId/comments/:commentId`.

It checks the resolved parent thread, reply membership and authenticated author-or-ADMIN permission; rejects extra body fields; serializes on the parent row and uses an atomic constrained delete. Repeated/concurrent deletion returns one success and one not-found response. Counts come from actual remaining Comment rows; no stored counter is introduced. Deleting a reply preserves its thread and unrelated replies.

Forum retention follows the existing permanent-deletion convention. No existing forum moderation access/audit log is present, so this change does not claim to create one. No model or migration is needed for reply deletion.

## Image evidence: blocked on private storage

**Image attachment upload, validation, persistence and administrator preview are NOT enabled or complete.** No private object-storage adapter, approved image retention rule or server-side image-decoding pipeline exists in the repository. Using public image URLs, inline MySQL data or enlarging the JSON body limit would not meet the requested safeguards.

The report form shows a compact disabled Supporting Evidence (Optional) field, supported formats/5 MB limit and an explicit explanation. It does not allow file selection or pretend that a preview/upload was saved. Text-only reporting is unchanged. The backend continues rejecting image data, client-chosen object keys and external evidence URLs as unsupported fields. Administrator report reason, description, reporter, target and date remain available as before; no image indicators are fabricated.

`docs/deployment/report-evidence.proposed.sql` is a **design draft outside both Prisma migration chains**, not an executed or validated migration. It proposes one private object reference per report, MIME/size/dimension/hash metadata and a report foreign key. It stores no image bytes, credentials or public URL. Prisma modeling, release migration reconciliation and disposable MySQL validation must accompany the actual approved storage implementation. No existing report needs a fabricated backfill.

Required configuration/decisions before implementing or enabling attachments:

1. Select and authorize a private object-storage provider/bucket, region/endpoint and least-privilege server identity. Keep credentials server-only; public access and directory listing must be blocked. Use TLS and encryption at rest. No frontend bucket secret or public upload URL.
2. Approve purpose/access, retention duration, deletion/orphan cleanup and administrator access-audit handling under the privacy notice. No retention duration or policy approval is invented here.
3. Implement a default-off upload capability with server-side authenticated student checks. Stream/limit one image to 5 MB; verify signatures and successful bounded decoding with trusted tooling; reject spoofed MIME, malformed/oversized files and decompression bombs. Re-encode to a supported safe format, stripping metadata, before persistence. Browser `accept` is not security validation.
4. Stage an opaque random object key; create report/evidence metadata only after successful private upload; remove staged objects if the transaction fails. Do not silently create a text-only report when its requested attachment failed. Add tested orphan recovery for cleanup failures.
5. Serve preview bytes only through an authenticated ADMIN endpoint that checks the report/evidence association. Set private/no-store, nosniff and safe image content type. Do not expose object keys or preview URLs through student/public APIs. Add an actual evidence indicator only once metadata exists.
6. Add picker preview/remove/replace and upload-failure tests, real decoder adversarial tests, provider failure/cleanup tests and unauthorized/cross-report retrieval tests. Independently validate the reviewed migration on disposable MySQL, then seek separate migration/configuration/release authorization.

There are **no new active environment variables** for this deferred feature. Provider/bucket credentials, region/endpoint, encryption and default-off capability settings must be finalized with the chosen adapter; proposed settings are not deployed configuration.

## Changed files in this task

- `src/app/components/MatchResults.tsx`, `MetricPolicyNotice.tsx`, new `DeleteReplyButton.tsx`.
- `src/app/components/admin/AdminWorkspaces.tsx`, `AssessmentDirectory.tsx`, new `AssessmentSkillPicker.tsx`.
- `src/app/lib/academicDisplay.ts` (new).
- `src/app/pages/DashboardPage.tsx`, `MySkillsPage.tsx`, `AssessmentPage.tsx`, `PublicProfilePage.tsx`, `AssessmentAdminPage.tsx`, `PostDetailsPage.tsx`, `ReportUserPage.tsx`.
- `knoxite-backend/routes/forum.ts`.
- `knoxite-backend/tests/forum-ownership.test.ts`, new `reports-security.test.ts`, `tests/integration/student-flow.test.ts`.
- `tests/browser/admin-console.spec.ts`, `workflows.spec.ts`, `student-workflow-consistency.spec.ts`, new `dashboard-phase-and-reports.spec.ts`.
- This report and `docs/deployment/report-evidence.proposed.sql`.

## Validation

**66 distinct focused desktop/mobile browser cases passed across the initial and follow-up runs**: 42 initially passed; the follow-up passed all 24 cases (the eight corrected assertions plus 16 additional regressions). No remaining failure in this focused set. Backend/frontend type checks and builds passed; Vite retains its existing large-bundle warning. Backend focused route tests: **3 passed**. Independently owned disposable Linux MySQL integration: **7 passed** (parent plus six subtests), including actual JWT authorization, concurrent reply removal, forum cascades, registration, consent, assessments and bilateral exchange/WRMR checks. No Railway connection was used.

Initial browser runs found old assertions for removed anchor links/renamed controls and a new test's implicit-label selector. The tests now use the intended results header and accessible combobox role; substantive authorization, score-order, unranked requests, evidence and import assertions remain.

No deployment is authorized. For later local review, Vite picks up frontend changes; rebuild/restart the local backend to load the new forum route. No runtime migration or new environment setting is required for the implemented features. Image attachments remain unavailable until the separate storage work above is approved and completed.
