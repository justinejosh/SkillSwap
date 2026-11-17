# Local implementation validation

## Targeted thesis-alignment checks — 2026-11-13

These results were newly executed for this review on `dev-justine`; the older dated results below remain historical. The thesis PDF was read only and its SHA-256 matches the pre-review fingerprint. No schema/migration, original `knoxite` database, production resource, branch, remote, commit, push or deployment operation was performed.

| Check | Current result |
| --- | --- |
| `npm --prefix knoxite-backend test` | **83 passed, 0 failed**; includes the backend build and four new alignment regressions. Uses fixtures/database doubles, not the original database. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed; existing bundle-size warning remains (no dependency or bundling refactor). |
| `npm --prefix knoxite-backend run typecheck` | Passed; Prisma Client was already current, no generation or migration required. |
| Edge `npm run test:browser -- workflows.spec.ts` | **40 passed, 0 failed**, desktop/mobile. The first run had 36 passed/4 failed because the new order assertion selected the section heading as well as card headings. Scoped the assertion to articles and reran the complete workflow suite successfully. |
| Edge `npm run test:browser -- google-auth.spec.ts account-recovery.spec.ts` | **30 passed, 0 failed**, desktop/mobile; Google/provider APIs mocked, no real OAuth activation. |
| `npm run test:sandbox -- authentication.spec.ts account-switching.spec.ts` | **4 passed, 0 failed** on the verified recovery-1 API/frontend. Includes twelve alternating Alice/Bob login/logout cycles, correct API routing even with an intentionally incorrect frontend configuration, registration, mandatory verification, captured verification email, password recovery, session revocation and authenticated navigation. |
| `npm run sandbox:check` / `npm run sandbox:diagnose` | Passed selected settings/checkpoint, exact Docker container/volume/mount/loopback/port and signed backend identity checks. All four synthetic accounts exist, saved passwords match hashes, verified and unsuspended. Nothing was stopped or reset. |
| Read-only academic/assessment catalog query | Port 3311, `knoxite_sandbox_recovery_1_dev` only: 13 active programs, four active years, **0/13 assigned or validated mappings**, one unassigned active department row, zero assessment versions. Original/production mapping states remain unverified. No values were written. |
| Preservation and final diff checks | Thesis SHA-256 unchanged; all 234 pre-review public Git files retained, with only the eight documented existing-file edits plus two new files. No unexpected file changes/deletions. Credential-pattern checks on these ten files returned no flags; `git diff --check` passed. Schema and scoring-policy files remain byte-for-byte unchanged from the pre-review snapshot. |

Final test suites: **157 passed, 0 failed** (83 backend + 70 mocked-API browser + 4 real-sandbox browser). The initial selector failures are disclosed above. The sandbox browser journey adds only synthetic account/session activity and captured local mail; it does not reset seed credentials. Sandbox traces/screenshots/video are disabled so private account credentials are not emitted in artifacts. Synthetic capture is not evidence of real institutional mail delivery.

Docker was initially unavailable; after the user started the sandbox, ownership and signed identity were verified before any database query or real-API test. The separate destructive-fixture/migration integration suite was not run against this interactive sandbox, the original database or production. No new migration rehearsal or real-participant evaluation is claimed.

New code is limited to `MatchCard.tsx`, the monthly eligibility check in `routes/analytics.ts`, `tests/thesis-alignment.test.ts` and matching browser assertions. The audit report lists all ten app/test/documentation files changed in this review, separately from the previously uncommitted implementation. Existing auth/privacy and integrity safeguards remain in place. See `docs/THESIS_ALIGNMENT_AND_PENDING_REVISIONS.md` for the exact evidence, limitations and pending decisions.

Date: 2026-11-07 (Asia/Manila). Branch: `dev-justine`. These results describe local validation, not production deployment or a completed student study.

## Sandbox launcher failure follow-up

### Successful account switching incorrectly exhausted the login limit

Confirmed `routes/auth.ts` applied its generic IP/path 10-requests/15-minute
throttle to `/login`, including successful sign-ins. Synthetic seeding, browser
tests and ordinary Alice/Bob switching therefore consumed one localhost budget.
Logout did not clear it. The issue was not a password/hash or lost identity.

Login now has a separate failure-only limiter retaining the existing shared-IP
10-failures/15-minute budget. Successful sign-ins refund only their in-flight
reservation and cannot erase failures for other accounts; 5xx responses do not
consume the budget. Concurrent requests reserve capacity before authentication,
and aborted requests retain their failure cost. Password, institutional,
verification, suspension and session checks are unchanged. Other authentication
routes keep their existing generic throttles. Retry-After is exposed through
CORS and also supplied in JSON details; the page displays the remaining cooldown
and blocks duplicate submissions until it expires.

Executed checks: 79 backend tests passed, including 20 successful alternating
account logins through the actual auth route with an isolated database double,
failure/expiry/concurrency protection and unchanged recovery throttling. Fourteen
desktop/mobile account-recovery browser tests passed, including countdown,
duplicate-submit protection and Retry-After fallback. Frontend typecheck/build
and whitespace checks passed (existing bundle-size advisory retained). Because
the user-started backend's Windows process metadata is not accessible to this
tool session, a safe stop/start from the owning PowerShell was requested. The
user confirmed successful restart of recovery-1 with the compiled update. The
real Edge browser regression then passed twelve alternating Alice/Bob sign-ins
and account-menu logout actions in one browser, checking every login/logout
response and normal session revocation without mocked APIs or printed private
credentials. The sandbox remains running with all authentication checks active.

### Recovery-1 activation after the 5180 conflict

The user's repair created and verified recovery-1 at MySQL 3311/API 5012, then
refused frontend port 5180. Native Windows checks identified the previously
recorded frontend PID 25432 as this checkout's Vite script, with the current
Windows owner SID, exact Node executable/script argument, matching saved
creation time, and `--port 5180 --strictPort`. The recovery-1 settings/checkpoint,
exact container/volume topology and signed API identity were verified before
the handoff. These checks established process ownership only; they did not adopt
or alter the older database's identity.

Only that recorded frontend was stopped after immediate proof rechecks. Its
record was retained privately in recovery-1; the old backend and all databases
were left untouched. Port 5180 became free, and the normal use-replacement
command activated recovery-1 and persisted selection after readiness checks.
All four accounts passed password-hash, verification, suspension and role
checks. Alice login and protected My Skills navigation passed in actual Edge
and Chrome sessions, including the wrong-frontend-config routing regression:
four tests passed against the real recovery-1 API. The selected sandbox was
left running; no source authentication changes or resource deletion were made.

### Two orphaned namespaces: terminal-reported regression

The supplied `sandbox:repair` output confirmed an unhandled state: original
ownership could not be established, and the single fixed replacement already
had Docker resources but lacked its matching private settings. Setup correctly
refused regeneration, so selection stayed original and check/copy continued to
reject its mismatched identity. Earlier successful tool-session checks did not
validate this actual terminal state.

Repair now allocates one of eight bounded recovery generations while retaining
both older namespaces. It persists a pending generation before setup, reuses
that exact generation on retries and activation, and switches the active pointer
only after full ownership/health/frontend verification. Orphans and unverified
occupied ports are skipped; pending conflicts and capacity exhaustion fail
closed. Backend safety guards, resource-name checks, frontend API pinning and
optional browser tests all recognize the same generation layouts. No label-only
adoption, credential regeneration, resource deletion or auth bypass is used.

Independent review and injected regression tests cover the exact original-plus-
replacement orphan state, failed preparation, unchanged active selection,
stable pending retries and lack of side effects. Browser tests at the first and
last generations prove the frontend targets 5012 and 5019 rather than 5010.
These use mocked metadata responses and no credentials or live new databases.
No live repair/setup command or new Docker resource was created from the tool
session during this follow-up. The user was asked to run the updated repair in
their own PowerShell; actual readiness/login there remains to be confirmed.

Executed validation for this follow-up: 76 backend tests passed, including the
injected two-orphan repair flow and alignment of all eight layouts with strict
database guards. Two credential-free browser tests passed for recovery-1 and
recovery-8 API routing. Frontend typecheck/build, JavaScript syntax and whitespace
checks passed. The existing bundle-size advisory remains. No new package,
production setting, real-account verification bypass or WRMR change was added.

### 2026-11-08 checkout relocation and unrecoverable-instance fallback

Work continued at `C:\KNOXITE\SkillSwap` on `dev-justine`. The supplied diagnostic
reported settings at 14:43Z, mismatched labels and no checkpoint. The same absolute
settings path visible to tools instead retained 14:27Z settings and a matching
checkpoint. The exact historical writer/replacement could not be established;
this discrepancy is not presented as a reproduced settings regeneration.
The earlier generation-before-resource-check flaw remains prevented. New private
creation/selection/start/failure events and launcher path/revision diagnostics
support future investigation without logging credentials or student data.

Confirmed a separate relocation bug: the saved live processes still referenced
the previous OneDrive checkout, so the new checkout correctly refused to treat
them as its own. Added explicit relocation requiring the complete verified
checkpoint, exact Docker/volume identity, read-only synthetic credential proof,
signed backend PID, and Windows process executable/owner SID/creation-time/
arguments. Successfully transferred only the verified backend/frontend to the
new checkout. Docker resources and original settings bytes remained intact.

Also reproduced a transient health failure followed by a valid signed response
from the same PID. Health checks now retry transport errors within fixed bounds,
classify resets as unresponsive rather than missing, and never retry a foreign
instance/signature into acceptance. Readiness remains fail-closed.

Added `sandbox:repair` plus a closed replacement layout: separate private folder,
container, named volume, MySQL 3310/knoxite_sandbox_replacement_dev and API 5011.
Unverifiable old settings/resources are retained. Replacement preparation was
executed against a newly empty, isolated database only; its four synthetic users
went through normal email capture/verification/password login. Replacement Alice
logged in successfully, the original Alice password was rejected there, and its
session was rejected by the original API. Activation refused occupied port 5180
without stopping the original frontend or changing profile selection. The
verified original instance remains selected. No old records were imported or
reset. Passwords are not placed in Docker command-line arguments during new
container creation or MySQL readiness checks.

Final validation: all 62 backend tests passed. Edge passed the full four-test
sandbox authentication/lifecycle suite, Chrome passed both Alice scenarios,
and the explicit replacement test passed repeated-preparation/settings-byte
preservation, occupied-port refusal, and browser login/protected navigation
against the real replacement API. That browser test overrode only the Vite
profile constant; API responses were not mocked and the active original profile
was not switched. Frontend typechecking/build and whitespace/syntax checks passed.
The build retained its existing large-bundle advisory. The spare replacement
services were stopped with owned-resource checks; both volumes/settings were
retained and the recovered original was left running from the new checkout.
No original knoxite database access, existing-database migration, unverified
resource deletion/relabeling, production operation, commit, push or deployment
was performed. Only the newly empty isolated replacement schema was bootstrapped.

### 2026-11-08 Docker identity review and recovery

The inspected local Docker context was `desktop-linux`. Current settings,
container ownership label and volume ownership label matched. The exact writable
named volume was `knoxite-synthetic-mysql-data` at `/var/lib/mysql`, bound only
through `127.0.0.1:3309`. Settings creation/modification was
2026-11-07T14:27:37.520Z, immediately before container/volume creation at
14:27:40Z. These current records show no settings regeneration; the reported
earlier mismatch was not reproduced. Diagnostic output now identifies the exact
settings path and Docker context so comparisons can be made against the same
resources without dumping Docker environment credentials.

Confirmed a setup-order flaw: if settings were missing, new identity/secrets
could be saved before detecting older resources. Setup now refuses generation
while an old container, volume or verified checkpoint remains. All relevant
commands verify both labels, image, exact volume name/type/mount and binding;
remote Docker endpoints are rejected before engine access.

Added a private verified checkpoint and explicit recovery command. Recovery
requires the complete matching settings, original container ID and volume
creation metadata, exact topology, read-only credential checks and a compatible
active backend. It preserves displaced settings and never relabels/deletes
resources or resets database/account data. The live recover command was a no-op
because current identities already matched; restoration/refusal was exercised
with synthetic temporary-file fixtures, not by damaging the interactive sandbox.

Repeated helper validation exposed duplicate ts-node registration during the
new checkpoint integration. Registration is now once per launcher process;
the ready message is emitted only after private configuration validation.
The private settings file and original credentials were retained unchanged.

Validation: all 57 backend tests passed, including wrong container/volume
labels, a different named volume, bind/readonly/duplicate mounts, unsafe port
bindings, regeneration refusal, mismatched checkpoints, failed credential proof,
and full temporary-fixture restoration with preservation of displaced settings.
All four real Edge sandbox tests passed, including forced-exit recovery and the
full verification/recovery/session journey. Chrome passed both Alice scenarios
after recovery. Lifecycle checks confirmed unchanged settings bytes, student
account IDs and password hashes. Frontend typechecking and whitespace checks
passed. The sandbox was left running; no production/original-database operation,
Docker relabel/delete, database migration, commit or push was performed.

### 2026-11-08 lifecycle review

The current backend responded with matching instance metadata and an empty
stderr log. An historical spontaneous crash or foreign-instance response was
not reproduced. The pre-existing launcher could classify a successful JSON
error body as INSTANCE_MISMATCH, reused unsigned health metadata, had no
concurrent-command lock, and did not timestamp process launches/exits.

Added challenge-signed, uncached health checks; distinct unavailable, timeout,
protocol, foreign-instance and stale-settings errors; atomic state writes;
exclusive lifecycle commands with dead-owner lock recovery; checked child
startup; strict executable ownership checks; and safe diagnostics. An owned
legacy backend was upgraded without replacing settings. `start` verifies the
backend again after frontend startup and refuses to report ready if it exited.

The automated opt-in lifecycle test terminated only the signed, recorded
synthetic backend, verified that check/accounts/copy-password failed closed,
restarted it, and verified repeated-start PID stability. Private settings,
account IDs, password hashes, verification, roles and suspension state were
unchanged. Credential-command output was captured privately and never printed.
No migration, original knoxite connection, or production action was involved.

Backend suite: 53 tests passed. Actual Edge browser tests passed Alice login,
wrong frontend API configuration, and the full registration/verification/
recovery/session-revocation journey. Chrome passed both Alice login scenarios
after a full owned-container/backend/frontend stop/start cycle. Frontend
typechecking and Git whitespace checks passed. The sandbox was left running;
Google remains disabled. See below for the original sandbox evidence.

The initial diagnostic observed MySQL running while the application ports were
not yet listening; a later backend check succeeded. The old private error log
recorded a readiness failure. A permanent account/password fault was not found.
The launcher previously obscured different causes with one generic error and
started the full backend through runtime TypeScript compilation.

Startup now checks/builds the backend and launches its compiled JavaScript,
with bounded readiness polling and early-process-exit detection. Errors identify
Docker, port, runtime, build, database or backend availability problems. Private
diagnostics redact configured passwords/secrets/connection URLs. Tests cover
readiness retries, wrong-instance responses, timeout, early exit and redaction.
All 49 backend tests passed. The exact start/check/copy-password command sequence
succeeded with no password/token output; the copy command used only the Windows
clipboard. Alice's actual browser login and wrong-frontend-config regression
both passed against the restarted compiled backend. No credentials were rotated,
no database migration was run, and the original knoxite was not targeted.

## Alice sandbox login follow-up

Read-only diagnostics confirmed Alice exists in the guarded 3309 sandbox, is
verified/unsuspended with USER role, and the private generated password matches
her stored bcrypt hash. The active frontend and backend instance were correct;
a server-side password mismatch was not reproduced. No password was reset.

Fixed a routing weakness: development port 5180 now pins API calls to 5010 even
if frontend environment configuration points to 5000 or a deployed API. Added
`sandbox:check` (no secret output) and a password-only Windows clipboard command.
Credential display/copy now checks the matching live sandbox instance and bcrypt
hash and refuses stale or blocked credentials instead of blindly printing an
initial password. Existing passwords and verification/role checks are preserved.

The actual Alice browser login and protected My Skills navigation passed both
normally and with an intentionally incorrect frontend API configuration. Those
checks passed again after stopping, restarting and rerunning setup, with no
password changes. The browser allowed only 5180 and 5010 requests; no request was
forwarded to 5000 or Render. Trace/video/screenshots are disabled for private
credential tests, and passwords/tokens are not logged. An initial test harness
cleanup raced with successful navigation; its cleanup was corrected before the
passing runs. Frontend typecheck/build, all 62 mocked browser regressions and
47 backend rule/security tests passed. No backend auth/schema changes or existing
database migrations were needed; the original `knoxite` was not targeted.

## Interactive isolated access and prepared email provider

| Check | Result |
| --- | --- |
| Backend rule/provider/sandbox security tests | 46 passed |
| Disposable MySQL integration/migration/student-flow suite | 47 passed |
| Existing desktop/mobile browser suite | 62 passed |
| Actual sandbox frontend/backend browser authentication journey | 1 passed |
| Total runner-reported checks | 156 passed, no unresolved failures |
| Frontend TypeScript/build and backend build | Passed |
| Interactive sandbox startup, stop/restart and existing-service reuse | Passed |

The interactive environment is separate from the disposable integration fixture:
it persists at `127.0.0.1:3309/knoxite_sandbox_dev`, with a loopback backend on
5010 and frontend on 5180. Its three synthetic students and administrator were
confirmed verified with their expected server-side roles. Generated credentials
are private local files, not test fixtures or Git artifacts. Setup registers and
verifies through the real API and captured mailbox; no production verification
bypass or generic capture mail provider was added.

The new Playwright journey uses the actual interactive frontend and backend,
blocks unrelated hosts, and captures no trace/video/screenshots. It registers a
new synthetic user, confirms unverified login is denied, consumes a captured
verification link, logs in normally, visits protected My Skills and Security
pages, checks mobile overflow, requests password recovery, consumes the reset
link, verifies old sessions and the old password fail, and logs in with the new
password. The existing mocked browser suite separately verifies unavailable-mail
messages and disabled actions. Seeded accounts are not reset by that journey.

Backend tests reject production execution of the development entry, real-domain
capture, unsafe/existing database targets, altered link origins, weakened
verification, and enabled Google. A normal application instance exposes no
synthetic status route. Provider tests verify both Resend templates, explicit
sender approval, fixed HTTPS API destination, no redirects, preserved fragments,
and sanitized provider/network failure messages. API calls were mocked for this
provider testing: no real Resend/OLFU message was sent and delivery is unverified.

Integration validation used a separate disposable MySQL 8.4 instance on 3308.
Its initial cold-start readiness check timed out; after readiness was confirmed,
the complete suite passed. That disposable fixture was removed after testing.
The interactive sandbox remains available for exploration; its named volume is
retained intentionally. The existing `localhost:3306/knoxite`, normal `.env`,
production services and credentials were not changed. No migrations ran against
existing user databases. See `docs/LOCAL_SANDBOX.md` for startup/account commands.

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
