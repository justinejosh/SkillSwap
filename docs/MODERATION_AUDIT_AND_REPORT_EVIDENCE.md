# Moderation audit and optional private report evidence

Status: **implemented locally; evidence disabled by default; shared rollout NOT authorized**. Work remains on `dev-justine`. Existing Session Plan, matching, scheduling and operator changes were preserved.

## Implemented

### Administrator reply moderation

`DELETE /api/forum/posts/:postId/comments/:commentId` now requires an ADMIN reason: `HARASSMENT`, `INAPPROPRIATE`, `SPAM`, `PRIVACY` or `OTHER`. Other requires a trimmed explanation of at most 250 characters. Extra actor/action/timestamp fields are rejected. USER self-deletion still requires no reason and creates no administrator moderation event.

The existing parent-row lock and serializable transaction encompass both the audit insert and constrained comment deletion. An unavailable/failed audit write prevents deletion; a failed deletion rolls back the audit insert. Concurrent removals yield one successful removal and one not-found result. Existing thread deletion and comment counts retain their behavior.

`AdminAudit` records server-derived administrator ID, thread ID, comment ID, author ID, action, reason/explanation and server timestamp. It deliberately stores no deleted comment body, email, IP or token. Snapshot IDs have no cascading foreign keys, so audit history survives deletion of the original thread/comment. No public audit-write or audit-edit endpoint exists. This is application-level append-only history, not a claim of cryptographic tamper protection against a database owner.

`GET /api/admin/moderation-audit?threadId=<optional>&page=1` is ADMIN-only and paginated (20 records). Forum Moderation includes an optional history view; no audit query occurs until it is opened. The reply dialog captures the reason before deletion. Thread-wide deletion remains the existing separate operation; its historical records are not fabricated as reply-audit entries.

### Optional evidence workflow

- Disabled: a neutral note replaces the nonfunctional file control. Text reporting remains available.
- Enabled: one optional JPG/PNG/WebP; client preview/remove/replace; size/decode feedback; failed submissions preserve the selected image and report description. No file data goes into browser storage.
- Student authorization occurs before multipart allocation. File size is capped at 5 MiB, one file, three text fields and four parts. Multipart parsing has a 30-second socket timeout; at most two image submissions run simultaneously per API process. The ordinary 750 KB JSON limit is unchanged.
- The server checks actual JPEG/PNG/WebP signatures against the MIME claim, fully decodes with sharp, rejects malformed/animated/excessively large input, limits to 8,000 pixels per side and 16 million pixels, and applies a 10-second processing timeout. Output is a metadata-stripped WebP capped at 5 MiB. Original names, EXIF/GPS and image bytes are not stored in MySQL.
- Private objects use random server-generated keys. The SDK sends signed Put/Get/Delete requests without public ACLs; TLS verification remains enabled. SDK operations carry 10-second abort signals. Reads are size-bounded and checked against the stored SHA-256 before serving.
- A durable PENDING metadata row exists before object upload. Report creation and transition to ATTACHED commit together. Upload/database failures cannot silently become text-only reports. Ambiguous transaction results are rechecked before any compensating removal; attached objects are never treated as orphans. Failed attempts retain retryable cleanup intent, including uncertain PUT outcomes.
- `POST /api/admin/report-evidence/cleanup` with `{}` is ADMIN-only. It removes at most ten unattached PENDING/CLEANUP_PENDING objects older than one hour per call, under row locks, and records the administrative operation. The one-hour orphan delay is a failure-recovery safeguard, not a participant-data retention policy. It does not remove attached evidence or reports.
- `GET /api/admin/reports/:id/evidence` verifies ADMIN authorization, attachment/report association and integrity, and writes a VIEW_REPORT_EVIDENCE audit entry before returning bytes. Responses use private/no-store, nosniff and an image-only sandbox policy. Failure to audit denies access. The admin preview uses a revocable in-memory blob; no unrestricted object URL is exposed.
- Admin reports expose only `hasEvidence`; student reports expose no storage keys or grading/internal metadata. Existing report reason, description, author, target and date remain visible to authorized administrators. An attachment is not a moderation finding.

### Configured retention preparation

No real retention duration has been selected or approved by this work. Enabling evidence requires an explicitly supplied duration and a review reference. A label in configuration is not independent proof of a completed privacy review.

Once configured under an approved policy, previews reject expired evidence. `POST /api/admin/report-evidence/retention` with `{}` is a dry run. `{ "confirm": true }` explicitly removes at most ten expired attached objects/metadata rows per call, with an audit entry in the same metadata transaction. The original report and all audit entries remain. Failures retain retryable metadata; uncertain removals are safe to retry. No timer, cron service or hosted cleanup job is installed or activated.

## Schema and migration

New Prisma models in both client/shared and release schemas: `AdminAudit`, `ReportEvidence`; optional `UserReport.evidence` relation. Metadata has a unique report association, unique opaque object key, state/age index and Restrict report FK. No image bytes or fabricated historical approvals are added.

Prepared release migration (canonical LF; a path-specific `.gitattributes` rule affects only this new file):

`knoxite-backend/prisma/release/migrations/20261123000000_moderation_and_report_evidence/migration.sql`

SHA-256: `6cad26b64fac038f596088d2d9465344ab06056b103ebd5b6e90c471a2a02ee6`.

It creates only the two new tables, indexes and the report-evidence foreign key. Previously applied migration files/checksums remain unchanged. The fresh-release preflight/isolated CI fixture recognizes the four checksum-verified release migrations. `docs/deployment/report-evidence.proposed.sql` is superseded design material and must not be executed.

Startup inspection requires the new tables even with uploads disabled, because accountable moderation is mandatory. Startup never applies DDL. Shared databases have NOT received this migration; do not restart a protected backend onto this code before a separately reviewed, authorized schema rollout.

The later operator must independently verify the actual target history and separately approve every missing predecessor migration (including flexible ranges and actual-completion storage where absent). Existing private flexible-session approval receipts/manifests were preserved and do not authorize this follow-up.

Disposable migration evidence and full regression totals are recorded below. Historical migration checkpoints compare against their exact earlier models before applying this new additive migration; historical swaps/schedules/confirmations/reviews remain unchanged.

## Storage configuration — server only

There are no storage credentials or active flags added to any environment file. Never prefix these variables with `VITE_` or configure them on the frontend.

| Variable | Requirement |
|---|---|
| `REPORT_EVIDENCE_ENABLED` | Defaults off. Leave unset or `false` until separately approved. |
| `REPORT_EVIDENCE_S3_ENDPOINT` | HTTPS origin for the authorized account/provider, no path or credentials. R2: `https://<account-id>.r2.cloudflarestorage.com`. Loopback HTTP is allowed only outside production for local tests. |
| `REPORT_EVIDENCE_S3_BUCKET` | Dedicated private evidence bucket. |
| `REPORT_EVIDENCE_S3_REGION` | `auto` for R2; actual region for other S3 providers. |
| `REPORT_EVIDENCE_S3_ACCESS_KEY_ID` | Server-side bucket-scoped identity. |
| `REPORT_EVIDENCE_S3_SECRET_ACCESS_KEY` | Server secret store only; never chat, source, CLI arguments or logs. |
| `REPORT_EVIDENCE_S3_FORCE_PATH_STYLE` | Optional `true` for loopback/disposable S3 services or providers requiring it. |
| `REPORT_EVIDENCE_PRIVACY_REVIEW_REFERENCE` | Actual accountable review/document reference; no placeholder approval. |
| `REPORT_EVIDENCE_RETENTION_DAYS` | Explicit reviewed whole days (technical range 1–3650), no default. Test-only seven-day values do not establish policy. |

Private bucket prerequisites before any live activation:

1. Owner creates/authorizes the correct isolated bucket. Disable public/custom-domain access and public listing; verify an anonymous object request is denied. Do not infer privacy from a random key or an application flag.
2. Scope credentials to object read/write/delete in this bucket/prefix; no account-admin or other-bucket privileges. Verify encryption at rest and the correct account endpoint using provider controls. The code does not claim to independently attest hosted settings.
3. Use an **unversioned bucket** for this implementation. Otherwise DeleteObject can leave prior versions; versioned-bucket support/lifecycle handling requires separate implementation and review before use. Confirm provider recovery/backups/lifecycle settings match the approved deletion policy.
4. Browser-to-bucket CORS and public signed URLs are unnecessary: upload and preview pass through the authenticated API. Keep storage secrets solely on the backend.
5. Approve evidence purpose/content guidance, image and audit retention, deletion/recovery, administrative access review, responsible contact, notice/consent implications and processing by the chosen storage provider. The existing notice `2026-11-17-v1` is unchanged; legal/research reviewers decide whether a substantive notice revision or renewed consent is required.
6. Approve/run a recurring operator cleanup process for orphan and expired evidence, including alerts on failures. The endpoints are prepared, not scheduled or executed against hosted data. Administrator audit retention is a separate policy decision; no audit rows are automatically deleted.

## Local reproduction and later rollout

From `knoxite-backend`, run `npm ci --ignore-scripts`, `npm run db:generate`, `npm test`, then `node development/ciIntegration.cjs`. Docker Desktop Linux/MySQL 8.4 must be available. The runner creates independently owned tmpfs databases on random loopback ports, applies only release migrations there and removes each owned container. It ignores protected database profiles. Evidence tests use generated synthetic images, an in-memory storage adapter and an owned loopback S3-protocol service; no real provider credentials are needed.

From the repository root run `npm run typecheck`, `npm run build`, `npm run test:browser`. The normal browser config uses local mocks and desktop/mobile projects. Sandbox end-to-end tests require a separate explicitly authorized sandbox; this task does not run them against existing accounts.

Later Render/Vercel steps require separate authorization: review the full dirty-tree release scope; approve the new migration and preservation plan for the exact target; apply it only via the checksum-verified release path; build backend with `npm ci --ignore-scripts && npm run db:generate && npm run build`; start with `npm start`; release the matching frontend. Old clients cannot bypass the new ADMIN reason requirement. New clients on an older backend hide attachments on capability failure, and reason-bearing deletes fail closed until versions match.

Keep evidence off during that release. Only after migration, storage privacy/identity checks, real review decisions, cleanup arrangements and isolated staging smoke tests should an authorized operator set the server feature flag. No hosted provider has been provisioned or verified by this task.

## Files changed for this follow-up

- `.gitattributes`: canonical LF for only the new, unapplied SQL; no global line-ending rewrite.
- Backend package/lock: pinned S3 SDK, sharp, multer and multer typings; Prisma 6.19.3 and existing effect/deepmerge overrides preserved.
- `knoxite-backend/prisma/schema.prisma`, `prisma/release/schema.prisma`, new release migration above.
- `knoxite-backend/services/{reportEvidenceConfig,privateEvidenceStorage,evidenceImage,reportEvidence,moderationAudit}.ts` (new), `schemaReadiness.ts`.
- `knoxite-backend/{app.ts,lib/config.ts,routes/forum.ts,routes/reports.ts,routes/admin.ts,scripts/release-preflight.ts,development/fourBlockersEnvironment.cjs}`. Earlier operator-only configuration/privacy changes in these files remain intact.
- `src/app/components/DeleteReplyButton.tsx`, `components/admin/{AdminWorkspaces,AdminReports}.tsx`, new `ModerationAudit.tsx`, new `ReportEvidencePreview.tsx`, `src/app/pages/{PostDetailsPage,ReportUserPage}.tsx`.
- Backend `tests/{forum-ownership,flexible-sessions}.test.ts`, new `report-evidence.test.ts`, integration `{four-blockers,student-flow}.test.ts`, new `moderation-evidence.test.ts`.
- Browser `admin-console.spec.ts`, `dashboard-phase-and-reports.spec.ts`, new `evidence-moderation.spec.ts`.
- This report; historical-status notes in the prior report and proposed SQL.

## Validation and remaining gates

| Check | Actual result |
|---|---|
| Complete normal Playwright config | **430 passed**, 0 failed/skipped, desktop and mobile, 15.3 minutes. |
| Final affected dialog theme checks | **4 passed** after scoped surface/transition refinement; synthetic 320×640 screenshots visually inspected. |
| Complete backend `npm test` | **244 passed**, 0 failed/cancelled/skipped. Final build included the Unicode and sanitized-startup-error checks. |
| Complete disposable `ciIntegration.cjs` | All **10 files passed**, **63** Node test results including parents; 0 failures/skips. |
| Final affected MySQL file | **8 passed**, including the additional forced-deletion-failure rollback case; repeated successfully after canonical LF normalization. Latest distinct integration coverage is **64** results across the ten files (not 63+8). |
| Frontend/backend TypeScript and builds | Passed. |
| Prisma shared and release validation | Both passed; Prisma/Client remain **6.19.3**. |
| Clean backend `npm ci --ignore-scripts` and client generation | Passed; native image processing worked after the clean installation. |
| Backend moderate audit / frontend production audit | Both report **0 vulnerabilities**. Existing Prisma overrides: effect **3.22.1**, deepmerge-ts **8.0.2**. |
| Git whitespace / staged files | `git diff --check` passed; nothing staged or committed. |

New pinned dependencies: `@aws-sdk/client-s3 3.1175.0`, `sharp 0.35.5`, `multer 2.5.0`, development `@types/multer 2.3.0`. No frontend dependency was added. Linux hosted CI and the actual provider integration have not been executed; no GitHub push was made.

Confirmed issues corrected during development:

- The new multipart parser initially rejected a valid 4,000-character Unicode description with HTTP 422. A targeted test reproduced this; the per-field byte cap is now 16,000 while the existing server/UI 4,000-character validation remains unchanged.
- The report description now uses a stable explicit label association; upload errors retain its entered value and the selected image.
- New dialog theme changes could briefly interpolate text/surfaces through a low-contrast gray midpoint. Only the new moderation/evidence dialogs now use explicit light/navy surfaces without color interpolation. Assertions compare browser-resolved theme values because Tailwind can return OKLCH rather than RGB strings.
- Malformed storage endpoint startup errors are sanitized; raw configuration inputs are not attached to the thrown error.

No assertions were relaxed to permit unauthorized access, missing audit data, premature completion, changed rankings or dropped attachments. The deliberate HTTP 500 in the disposable rollback test is an injected foreign-key deletion failure; it proves the comment is retained and the audit insert is rolled back, not an unresolved production regression.

Known non-failing warnings: Vite's existing large-chunk warning, experimental Node mock timers, Playwright NO_COLOR/FORCE_COLOR notices, and a transitive node-domexception deprecation notice during installation. No new npm vulnerability was reported.

All integration schemas were independently owned, label/ID/loopback-verified disposable MySQL 8.4 containers. The new migration was tested both on a fresh database and after prior migrations, with existing agreements/schedules/confirmations/reviews preserved and exact Prisma schema compatibility checked. Existing migrations were not edited. The separate sandbox Playwright configuration was intentionally not run: it targets an existing protected environment rather than this task's disposable fixtures. Backup-specific operator tooling was not resumed.

Detailed logs and synthetic screenshots remain in a user-only temporary regression directory outside Git. No private question banks, credentials or operator evidence were uploaded or added to staging. No Railway/production database connection or hosted-service action was performed by this task.

**Implemented/tested locally:** audit/API/UI and evidence processing, private storage adapter, failure recovery and configured-retention operations. **Prepared but not enabled:** evidence upload capability and shared migration. **Blocked on external configuration/human decisions:** actual private bucket/credentials, privacy and audit retention approval, provider deletion/versioning verification and cleanup scheduling. **Not implemented/provisioned:** a hosted automatic cleanup scheduler or versioned-bucket purging (the documented adapter requires an unversioned bucket). No live R2 access, hosted deployment, university approval, cryptographic database-owner tamper protection or fabricated historical audit entry is claimed.

References used for compatibility: [Cloudflare R2 SDK v3 setup](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [Multer upload limits](https://expressjs.com/en/resources/middleware/multer/), [sharp bounded input](https://sharp.pixelplumbing.com/api-constructor/), [sharp metadata removal/output](https://sharp.pixelplumbing.com/api-output/), [S3 DeleteObject/versioning semantics](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/DeleteObjectCommand/).
