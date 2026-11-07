# Local implementation validation

Date: 2026-11-07 (Asia/Manila). Branch: `dev-justine`. These results describe local validation, not production deployment or a completed student study.

## Disabled-by-default Google Sign-In implementation

| Check | Result |
| --- | --- |
| Backend rule/API-boundary tests | 41 passed |
| Isolated MySQL API, authentication, migration and student-journey coverage | 47 unique runner-reported tests passed, including parent tests |
| Desktop/mobile browser coverage | 62 passed: 36 existing workflows, 10 account recovery, 16 Google authentication |
| Total distinct runner-reported checks | 150 passed; no unresolved failures |
| Frontend TypeScript/build and backend build | Passed |
| Actual localhost capabilities | `google.enabled: false`; `emailDeliveryAvailable: false` |
| Existing `localhost:3306/knoxite` database | No migration or mutation performed for this implementation |

Results combine the complete existing backend/integration/browser suites with
focused runs after corrections and additions. Repeated executions are not added
to the total. The final Google integration run passed 12 tests; the standalone
Google migration preservation test passed separately. Earlier integration cases
unaffected by those additions remain covered by the full regression run.

The official Google library verified generated RSA signatures offline using a
mocked trusted certificate source. Tests rejected invalid signatures, wrong
issuer/audience, expired tokens, unknown keys, missing Workspace membership,
unverified email, consumer accounts, and invalid campus/domain claims; an updated
trusted key was accepted. No real Google account or institutional credential was
used. API tests injected a verified-claims provider at the application factory,
not through a route/environment bypass. They cover default-off behavior before
database access, mandatory approval gates, browser proofs, nonces, purpose and
policy binding, changed eligibility during pending onboarding, CSRF/Origin/JSON
checks, replay, expiry, duplicate/concurrent onboarding, explicit linking,
cross-account attempts, stale sessions, suspension, identity changes, password
fallback, unlink safeguards, session revocation, and rate limits.

Migration tests used a disposable MySQL 8.4 container bound to loopback port 3308.
A populated prior-schema fixture included users/hashes/profiles, both skill join
tables, offered-skill tiers, requests, swaps, reviews, messages, and sessions.
The new application successfully performed password login and read authenticated
method availability **before** Google tables existed. Every pre-existing row in
every prior table fingerprint-matched after the Google migration. No identity was
automatically backfilled. Constraints rejected duplicate identities and preserved
case-sensitive subject distinctions; unresolved failed migration history blocks
before schema mutation, and repeated/partial upgrade attempts stop.
The final fresh-container rehearsal initially reached MySQL during startup; the
check passed after the disposable server reported ready for connections.
The legacy migration rehearsal also continued to preserve its original records.
This does not establish compatibility with an unrehearsed MariaDB/production
engine or authorize upgrades of existing databases.

Browser tests used mock APIs and a stubbed GIS script, blocking unrelated hosts.
They cover no SDK load when disabled, successful session exchange without Google
token storage, onboarding, program/year/terms requirements, cancellation back to
preserved password-registration inputs, email collisions, explicit password
reauthentication for linking, fallback-before-unlinking, and blocked SDK behavior.
The first run identified a select accessible-name issue and recovery mocks that
did not yet recognize the new capabilities GET. Explicit select labels and
updated mock capabilities corrected them; subsequent targeted runs passed.

The local backend watcher was briefly restarted to regenerate the Prisma client;
generation changes client files only, not database schema. No actual `.env`,
cloud credential, or university approval was changed. One backend runtime
dependency, `google-auth-library`, was added with its lockfile; Node >=22 is now
declared. The temporary formatter was not added as a project dependency.

Outstanding external validation: approved Google client/origins/consent and
Workspace authorization, sufficient college/campus eligibility evidence, security
review, real institutional pilot, actual mail delivery, exact-engine migration
rehearsal, and release authorization. See `docs/GOOGLE_SIGN_IN.md` and
`docs/EMAIL_DELIVERY_SETUP.md`. Existing production security/deployment gates
remain outstanding. No push, merge, deployment, or production access occurred.

## Account recovery and verification feedback follow-up

| Check | Result |
| --- | --- |
| Backend build and rule/API-boundary tests | 38 passed |
| Isolated MySQL recovery, existing API, and student-journey tests | 24 passed, including parent tests |
| New desktop/mobile recovery browser scenarios | 10 passed across the initial unaffected cases and corrected focused rerun |
| Frontend TypeScript and build | Passed |
| Actual local recovery-options endpoint | HTTP 200, `emailDeliveryAvailable: false` |
| Whitespace check | `git diff --check` passed |

The first browser run passed eight scenarios and identified two verification
failures: the shared React 18 Input component does not forward refs. Referencing
the native form's email control fixed the issue. The focused desktop/mobile
rerun passed both previously failing scenarios. No failure remains unresolved.
Browser tests use synthetic intercepted responses. The separate API tests use a
disposable MySQL 8.4 database on loopback port 3308, with injected mail capture;
they send no real email. The existing local `knoxite` schema was not migrated or
used for integration fixtures.

Recovery tests cover generic request responses, unavailable mail before account
lookup, distinct mail templates, rate limiting, cross-purpose tokens (including
namespace substitution), expiry, suspension, forbidden target fields, replay,
simultaneous requests using the same/different links, bcrypt password replacement,
session revocation, pending-link invalidation, and unchanged verification/profile
fields. Existing verification links, registration, reciprocal matching,
assessments, exchange completion, analytics, and administrative boundaries passed
their API/student-journey regressions.

The user-selected local password form is a separate, temporary developer recovery
tool outside the repository. Preparing it does not reset a password. It requires
the user's private submission and does not bypass institutional verification.
Actual email delivery, production deployment, and production key rotation were
not performed. Source changes remain on `dev-justine` for review.

## Academic-options recovery and authorized local upgrade

| Check | Result |
| --- | --- |
| Backend build and rule/API-boundary tests | 35 passed |
| Full isolated MariaDB 10.4.32 API/migration/student-flow suite | 27 passed, including parent tests |
| Desktop/mobile browser regression suite | 36 passed |
| Runner-reported tests | 98 passed, zero failures/skips in the final runs |
| Actual frontend + actual recovered backend signup checks | Passed at 1280px and 390px; 13 programs, four years per program, no horizontal overflow |
| Original local database preservation | Every original row/relationship across 11 tables fingerprint-matched before and after the approved upgrade |
| Exact browser API URL | `http://localhost:5000/api/auth/academic-options` returned HTTP 200 |

Read-only diagnosis found the old schema in the confirmed local XAMPP database. Following explicit user authorization, recovery used an access-restricted backup outside Git/OneDrive, verified restoration, a sanitized clone on the same MariaDB version, reviewed additive SQL, strict preflight/schema checks, one-time proof evidence, and application maintenance. The existing connection target was retained. No production resource was contacted or changed, no mail was sent, and actual-browser verification did not create a student account. See `docs/LOCAL_DATABASE_RECOVERY.md` for the receipt location and procedure. Legacy outcome legitimacy and actual email delivery remain separate requirements.

The recovery also fixes a Windows startup-hook issue: matching Prisma clients are reused rather than regenerated while another process holds the engine DLL. Missing/stale schema/version metadata still requests generation. Academic availability failures return safe 503 responses without SQL/credentials; an empty catalog does not seed itself on a GET request. Registration disables unavailable choices/submission, supports retry, preserves typed form data, and never substitutes fabricated IDs.

The earlier no-migration boundaries/results below describe their respective historical phases. The later explicit local authorization superseded the restriction only for this backed-up local procedure and its isolated rehearsals. Production restrictions remain in force.

## Development startup recovery

Reproduced the reported `TS7006` failures with an ungenerated `.prisma/client` placeholder declaring `PrismaClient` as `any`. Added automatic generation before development, builds, and type checking. From that failing local state, `npm run typecheck`, the actual `ts-node/register` application loader, the backend build, and all 26 rule tests passed after generation.

Verified the exact `npm run dev` path on isolated loopback port 5019; `/api/health` returned `{"status":"ok"}`. The smoke process used a dummy loopback database URL on port 1, so no student or production database was accessed. No schema, migration, or dependency version changed. The absent local JWT key was generated into the ignored backend `.env` without displaying or committing it; this was not production key rotation. The temporary smoke server was stopped after verification.

## Partner integrity and provisional academic mapping follow-up

| Check | Result |
| --- | --- |
| Backend rule tests, including partner-integrity policies | 26 passed |
| Actual MySQL API/integrity/student-journey tests | 23 passed, including three parent tests |
| Desktop/mobile browser workflow coverage | 32 passing scenarios: 30 unaffected cases plus two corrected/retested cases |
| Passing checks covered by these runs | 81 |
| Frontend and backend TypeScript; frontend production build | Passed |
| Schema/migration changes | None; Prisma schema and migration files unchanged |
| Dependency changes | None; earlier zero-vulnerability audits remain the recorded audit results |

The first browser run passed 30 cases and found two failures in the new administrator disposition control's accessible name. An explicit accessible label corrected the issue. The focused rerun passed that workflow on desktop and mobile; the other 30 cases were not needlessly repeated. No test remains unresolved.

The MySQL run initialized a fresh disposable loopback database from the existing, unchanged `prisma/baseline/empty.sql` snapshot. This created only a synthetic schema and fixtures. No upgrade/migration command, existing student database, production API, or production resource was accessed. The migration suite was deliberately excluded under the current instruction not to execute migrations. Earlier migration-rehearsal results below are historical evidence, not a claim of rerunning them in this follow-up.

The selected backend command, after `npm test` builds the TypeScript tests, was:

```text
node --test --test-concurrency=1 dist/tests/integration/api.test.js dist/tests/integration/integrity.test.js dist/tests/integration/student-flow.test.js
```

New checks cover the exact 13-program/nine-college draft, preserved catalog codes/labels and existing assignments, exclusion of provisional mappings from proximity, stale/validated mapping edit protection, repeated five-star exchanges, partner-balanced means/rates, confirmed cancellations, two-partner leaderboard eligibility, distinct-partner activity ordering, unvalidated outcomes, and discoverable/request-capable cold-start users. Administrator review tests cover private signals, concurrent duplicate-open prevention, server-sourced evidence, revision checks, separation from generic reports, neutral dismissal, and unchanged accounts/history/tiers/scoring flags. The continuous journey now verifies all 24 administrative route/method boundaries.

See `docs/PARTNER_INTEGRITY_POLICY.md` for the explicitly reported approvals and metric definitions, and `docs/DEPLOYMENT_READINESS.md` for the newly supplied hosting facts and remaining production restrictions.

## Earlier reviewed full suite and continuous student journey

| Check | Result |
| --- | --- |
| Frontend TypeScript and production build | Passed |
| Backend TypeScript/build and Prisma generation | Passed |
| Backend rule tests | 17 passed |
| MySQL API, migration, and continuous-journey tests | 20 passed, including three parent tests |
| Desktop/mobile browser suite | 22 passed |
| Total runner-reported tests | 59 passed, zero failures/skips |
| Frontend and backend dependency audits | Zero known vulnerabilities reported |
| Git whitespace validation | Passed |

The added continuous journey registers two students through the real API, verifies their captured test mailbox links, logs in, configures synthetic academic mappings, saves reciprocal skills, publishes synthetic basic/advanced fixtures, earns Amateur and Verified at exactly 80%, requests a swap while unranked, records bilateral consent and session acknowledgements, submits both reviews, and checks completed-exchange analytics. Subsequent matches yield exactly 100 and 90 from the real stored ratings, completion rate, and proximity, without assessment weighting. The existing suite separately covers failed advanced attempts preserving Amateur, retake limits, and concurrent submissions.

The additional security review covers all 18 administrative route/method combinations with anonymous and student callers; a forged token role; demotion of an administrator; a token signed with a retired synthetic key; and sessions belonging to suspended, unverified, outside-domain, or identifier-less campus accounts. Ineligible accounts stay out of public portfolios and both leaderboards. See `docs/SECURITY_RELEASE_REVIEW.md` for findings, fixes, and deployment limits.

This full run used a newly created disposable MySQL 8.4 instance bound to loopback port 3308 and explicitly acknowledged synthetic `_test` databases. The migration rehearsals were repeated as part of this run. Browser tests use mock API responses; the continuous actual-backend journey is an API integration test, not a browser-to-real-backend evaluation. Institutional mail, real bank validity, production configuration, and actual student records remain unverified.

## Earlier cold-start and assessment-scope follow-up

| Check | Result |
| --- | --- |
| Frontend TypeScript and production build | Passed |
| Backend TypeScript/build and rule tests | Passed; 17 rule tests |
| Disposable MySQL API regression suite | 10 passed, including its parent test |
| Desktop/mobile browser suite | 22 passed |
| Total runner-reported follow-up tests | 49 passed, zero failures/skips |
| Git whitespace validation | Passed |

The new API case confirms that reciprocal students with no ratings, no eligible concluded swaps, and Not Assessed skills remain visible with a null score and can request and accept a swap. Cancelling before agreement confirmation does not manufacture a completion-rate denominator. Browser checks confirm enabled requests from Dashboard and KnoxHub at both widths, explicit missing-evidence explanations, and separate visible groups for scored and unranked candidates without assigning zero or changing scored results.

Advanced-assessment checks cover the visible scenario-format limitations and version-specific learning outcomes, including retaining an attempt's original outcomes after a new version is published. A configuration regression verifies that production startup refuses unconfirmed campus eligibility, disabled ownership verification, an empty institutional-domain list, or a non-HTTPS application URL. This is local guard validation, not verification of a running production deployment.

The migration suite and dependency audits below are earlier full-suite results; they were not repeated for this follow-up because it changes no schema, migration tooling, or dependencies. The follow-up API database was independently bootstrapped with synthetic fixtures in disposable MySQL 8.4 on loopback port 3308. No actual student data, institutional mail service, or production API was involved.

## Earlier full-suite baseline

| Check | Result |
| --- | --- |
| Frontend TypeScript | Passed (`npm run typecheck`) |
| Backend TypeScript/build | Passed (`npm run typecheck`; builds also run by test commands) |
| Frontend production build | Passed with explicit local API configuration |
| Backend rule tests | 16 passed |
| MySQL API and migration suite | 12 passed, including two parent suites |
| Desktop/mobile browser suite | 16 passed |
| Total runner-reported tests | 44 passed, zero failures/skips |
| Frontend dependency audit | Zero reported vulnerabilities |
| Backend dependency audit, including development dependencies | Zero reported vulnerabilities |
| Git whitespace validation | Passed |

The production build still reports the existing large-bundle warning (approximately 1.09 MB of minified JavaScript before gzip). This does not prevent the build; route-level splitting can be evaluated separately.

## Evidence covered

Rule tests cover all four proximity combinations, missing information, exact 50/30/20 scoring, tie ordering, server grading at and below the passing threshold, foreign/duplicate answers, randomization identity, monotonic tiers, retake limits, legacy metric exclusions, institutional suffix/domain rules, validated department derivation, and database access guards.

API tests use the actual Express application and Prisma client against disposable MySQL 8.4 fixtures. They cover public-data projections, normal-user/admin boundaries, academic catalogue and mapping, two-program/same-department proximity, reciprocal requests, stale selections, bilateral approval revisions, participant authorization, chat ownership, scheduling, concurrent session acknowledgements, duplicate reviews, completion, cancellation denominators, assessment concurrency/version snapshots/retakes, preserved tiers, institutional email verification, password/session revocation, reports, and suspension retaining records.

Migration rehearsal creates independent synthetic databases from the preserved original schema. The upgrade retains user fields and IDs, all shared skills and offered/wanted associations, requests, swaps, reviews, and messages. New academic information remains null; program metadata is initialized without departmental guesses. Offered-skill backfill is repeatable and preserves an existing tier. A separate duplicate-review fixture is rejected before new tables or data changes, with every review retained.

Browser tests run in headless Microsoft Edge at desktop and 390-pixel mobile widths. They use isolated mock responses and block external hosts. They cover save-before-assessment prompting, persistent skip confirmation, unsupported skills, basic pass/advanced failure, full portfolios, standardized college registration, server-authoritative roles despite tampered local storage, explicit API errors, and match-to-profile navigation. These mocks supplement the real-backend integration tests; they are not a claim of a live production end-to-end evaluation.

## Data and external-service boundaries

- No production databases or deployed APIs were accessed or modified.
- No existing student database was migrated. Its configured loopback service was unavailable; no local student export was found.
- All executed database preparation and migrations targeted synthetic, explicitly acknowledged loopback `_test` databases in a disposable Docker container. The container was removed after validation.
- No real email was sent. Mail delivery is injected in tests.
- No real question bank or official department mapping was invented. Synthetic banks/mappings are confined to tests and were discarded with the test database.
- Google OAuth was reviewed and documented but not implemented.
- GitHub Actions is configured, but no remote workflow was triggered. No commit, push, or merge was performed.

## Before releasing to students

Obtain official confirmation of the institutional domain and campus identifier; configure institutional mail delivery; record validated program-to-department mappings; publish human-validated basic/advanced banks; inspect a sanitized clone of real student records and reconcile legacy anomalies; rotate the exposed historical JWT secret through the deployment owner. Production activation remains blocked while campus-rule confirmation is false.

An all-new-student pilot can validate reciprocal matching and swap initiation while everyone is unranked. It cannot establish ranking quality or advanced content validity. Use separately labelled algorithm fixtures for arithmetic and the review protocol in `docs/ASSESSMENT_VALIDATION_GUIDE.md` for real assessment content. No published real question bank or official mapping is supplied by the synthetic tests.
