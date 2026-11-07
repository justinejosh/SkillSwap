# Local security and release review

Reviewed 2026-11-07 on `dev-justine`, against the current working tree based on `7065ebf60b3c966c72bcca24c24b15f447b6490d`. This is a source review and local regression exercise, not an external penetration test or confirmation of deployment security.

## Reviewed controls and evidence

| Area | Source | Local evidence |
| --- | --- | --- |
| Administrative authorization | `app.ts`, `middleware/authMiddleware.ts`, `routes/admin.ts`, `routes/analytics.ts`, `routes/forum.ts` | All 24 administrative route/method combinations (including the subsequent draft-mapping and integrity-review routes) reject anonymous callers with 401 and ordinary students with 403. A signed student token claiming ADMIN still fails; demoting a current administrator immediately removes access. |
| Student eligibility | `lib/config.ts`, `services/academics.ts`, authentication middleware, matches, portfolios, swap requests | Suspended, unverified, outside-domain, and identifier-less campus addresses cannot use a previously issued student session. Such accounts are excluded from public portfolios and both leaderboards. |
| JWT and session checks | `routes/auth.ts`, authentication middleware | Tokens signed by a different/retired key fail. Session expiration, revocation, database role, and token version are checked; password changes revoke sessions. The production eligibility/verification/HTTPS guard is unit tested. |
| Sensitive exchange operations | `routes/swaps.ts`, `routes/chat.ts`, `routes/sessions.ts` | Participant checks, partner identity, reciprocal skill ownership, bilateral revision consent, duplicate reviews, session acknowledgements, and cancellation behavior have negative and positive API tests. |
| Assessment integrity and privacy | `routes/assessments.ts`, `services/assessmentService.ts`, explicit portfolio DTOs | Backend grading, advanced prerequisite, attempt ownership, supplied-score rejection, immutable versions, retake concurrency, monotonic tiers, and public projections are tested. |

The continuous `tests/integration/student-flow.test.ts` journey uses the real registration, verification, login, academic administration, skill, assessment, match, swap, review, and analytics APIs against disposable MySQL. Only the bootstrap administrator, synthetic answer-key lookup, and deliberate account-state changes are set up directly as test fixtures. Mail delivery is injected; no institutional email is sent. Assessment fixtures and department mappings are explicitly synthetic, not approved student material.

## Findings fixed during review

| Finding | Change |
| --- | --- |
| Shared eligibility SQL accepted a legacy address consisting of just `lag@domain`, although authentication requires a preceding student identifier. | Excluded the bare suffix address in `eligibleStudentWhere`; verified portfolios and both leaderboards under four ineligible account states. |
| Privacy page claimed refresh tokens, a Moderator role, HTTP-only cookie sessions, AES-256 encryption, two-factor authentication, universal audit logging, and automatic deletion/export without supporting implementation. | Replaced these claims with current data visibility, session behavior, history retention, and privacy-request information. No invented privacy contact or deletion deadline remains. The study owner still needs an approved notice and retention/contact arrangements. |
| Registration placeholder said six characters while validation requires twelve. | Aligned the placeholder with the enforced minimum. |

## File and dependency review

Current tracked and proposed text files were scanned for private keys, common provider-token formats, literal credential assignments, and credential-bearing URLs. Matches were reviewed as synthetic test credentials or explicit examples; no live secret was identified by that scan. This is a bounded pattern review, not a guarantee that arbitrary secrets cannot exist. Environment files are ignored and are not staged.

All 11 deleted files are checked-in generated backend `.js` copies with corresponding TypeScript sources. Their removal is intentional: development uses TypeScript and production runs the compiled `dist/index.js`. Build output, generated clients, dependency directories, browser traces, coverage, local environment files, and test data are excluded from commits. Baseline and additive migration SQL are intentional source-controlled schema artifacts.

Both npm dependency audits reported zero known vulnerabilities at the initial review; the follow-up adds no dependencies. Both TypeScript checks and builds, all 17 rule tests, all 20 MySQL API/migration/journey tests (including three parent tests), and all 22 desktop/mobile browser checks pass. These are the earlier full-suite counts. See `VALIDATION.md` for current follow-up coverage and commands; upgrade migration tests were not executed during the follow-up.

## Production containment and secret rotation: not performed

The team subsequently identified Vercel for the frontend and Render service `skillswap-50cf` for the backend, with automatic deployments from `main`. Dashboard access remains with a developer groupmate; the production database provider, backups, access and migration readiness are unresolved. Current authorization expressly prohibits connecting to production, deploying or merging. No live secret, deployment, production API, or production database was changed or inspected. See `DEPLOYMENT_READINESS.md`.

The hosting owner must treat the historical hardcoded key as compromised. Generate a new cryptographically random key in the deployment's secret-management workflow, replace the running signing key on every instance, restart/redeploy the applicable backend, and ensure tokens signed with the old key are rejected. Do not copy a test key or example placeholder. Never paste the replacement into a chat, commit, command transcript, or review document.

If the running build still hardcodes its key, changing an environment variable alone does not rotate it. Disable the vulnerable service until a reviewed, compatible containment fix is running. Do not deploy this schema-dependent upgrade against an unmigrated production database as a shortcut. Production migrations remain outside this work.

The old secret may remain in pre-existing Git history. No shared history was rewritten. Rotation is required regardless of whether history is cleaned later. New source checks do not establish that old deployed artifacts have been replaced.

Keep `CAMPUS_EMAIL_RULE_CONFIRMED=false` until official domain/campus evidence is recorded. The production configuration rejects unconfirmed rules, disabled mailbox verification, empty institutional domains, and an HTTP application URL. A configuration flag is an operator gate, not automatic institutional verification.

## Remaining release gates

- Owner-performed production containment/rotation and verification of the running authorization controls.
- Official campus email convention and validated program-to-department mappings.
- Real institutional mail delivery and a verified fallback workflow.
- Subject-reviewed question banks and an assessment-content pilot.
- A sanitized actual-data audit, migration rehearsal, and legacy-outcome reconciliation.
- Approved study privacy/retention/contact arrangements and team review before any merge or release.

The current browser stores bearer sessions locally and authentication throttling is single-process. These are actual implementation limits to include in the deployment review; they do not implement cookie-based sessions, two-factor authentication, or distributed rate limiting.
