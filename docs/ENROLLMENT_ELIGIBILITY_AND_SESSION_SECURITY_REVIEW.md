# Enrollment eligibility and session security review

**2026-11-15 implementation follow-up:** [Local pilot protection and session security](LOCAL_OAUTH_PILOT_AND_SESSION_SECURITY.md) records the now-implemented local exact-account guard and logout/401/leaderboard consistency fixes. Earlier findings below describe the review baseline. Google remains disabled; the proposed session migration and new timeouts are not applied.

Review date: **2026-11-15 (Asia/Manila)**. Project: `C:\KNOXITE\SkillSwap`; branch: `dev-justine`.

**This is a focused inspection and proposal, not implementation approval.** No application, schema, authentication setting, database record or Google approval flag was changed. Enrollment uploads, semester verification, new session timeouts and pilot-account restrictions are not implemented by this report.

## 1. Local pilot access basis now recorded

The user explicitly states that university IT authorization is not required for **their own single-account local development pilot**. This is recorded as the user's declared access basis for that narrowly scoped pilot, not an independently verified university policy or university-wide approval. It does not authorize public deployment, other student participants or production Google activation.

The earlier diagnostic is user-reported real evidence for one account: signed `hd=student.fatima.edu.ph`, institutional email format valid, no Knoxite access granted. The separate private local allowlist is prepared with that observed domain. The normal application enable flag and the three Google approval flags remain **false**; the policy version remains pending. The diagnostic does not establish current enrollment or human security approval.

Your declaration resolves the previously missing **stated local access basis**. Remaining items are your actual eligibility confirmation, the scope/enforcement decision, a real security-review decision and explicit activation authorization. IT approval is not being requested again for the pilot you described. Institutional authorization for a wider release remains a separate question.

## 2. Confirmed current implementation

Repository paths below are relative to `C:\KNOXITE\SkillSwap`. Line references describe the inspected version.

| Area | Confirmed behavior | Evidence |
| --- | --- | --- |
| Institutional address | Exact configured domain; real student domain additionally requires the reported initials/surname/four-digit Laguna structure | `knoxite-backend/lib/config.ts`, `studentEmailAllowed()` |
| Google verification | Backend signature/issuer/audience/expiry, verified email, approved `hd`, nonce, browser proof and allowed origin checks | `knoxite-backend/services/googleIdentity.ts`; `knoxite-backend/routes/google.ts` |
| New Google user | No user/session until supported academic choices and Terms/Privacy acceptance; password hash null for Google-only account | `knoxite-backend/routes/google.ts`, `/google/onboard` |
| Linking | Existing email collision refuses auto-link; explicit linking requires current password and the active account/session | `knoxite-backend/routes/google.ts:98`, `:144`, `:353` |
| User eligibility | Email/verification/suspension and role checks; academic selections validated. No current-term enrollment record or check | `knoxite-backend/services/authSessions.ts:6`; `knoxite-backend/middleware/authMiddleware.ts`; `knoxite-backend/services/academics.ts:6`, `:109`; `knoxite-backend/prisma/schema.prisma:259` |
| Session absolute limit | **Seven days for both USER and ADMIN**, enforced by JWT and database expiry | `knoxite-backend/services/authSessions.ts:35`, `:44`; `knoxite-backend/middleware/authMiddleware.ts:30`, `:55` |
| Idle expiry | **Not implemented**; AuthSession has no last-interaction field | `knoxite-backend/prisma/schema.prisma:176`; `knoxite-backend/middleware/authMiddleware.ts` |
| Expiry warning | **Not implemented**; shared API clears local auth on 401, not five minutes in advance | `src/app/lib/api.ts`; `src/app/components/AuthGuard.tsx` |
| Manual logout | Reaching `/auth/logout` revokes that session in the database | `knoxite-backend/routes/auth.ts:365` |
| Password reset/change | Expiring one-use recovery tokens; password update increments tokenVersion and revokes all current sessions | `knoxite-backend/routes/auth.ts:254`, `:284`, `:372`, `:404` |
| Google unlink | Requires current password; revokes sessions/token version and pending user-bound Google challenges | `knoxite-backend/routes/google.ts:408` onward |
| Suspension | Admin action preserves user/history, increments token version and revokes sessions; middleware also checks suspension | `knoxite-backend/routes/admin.ts:206`; `knoxite-backend/middleware/authMiddleware.ts:81` |
| Role enforcement | Authenticated database role, not browser role, drives ADMIN/USER authorization | `knoxite-backend/app.ts:79`, `:159`; `knoxite-backend/routes/admin.ts:18`; `knoxite-backend/middleware/authMiddleware.ts:88`, `:94` |
| Current reauthentication | Password confirmation at password change and Google link/unlink; five-minute link challenge bound to session/token version | `knoxite-backend/routes/auth.ts:372`; `knoxite-backend/routes/google.ts:98–179`, `:353` onward |
| General recent-auth policy | No generic recent-authentication timestamp/window or enrollment-approval reauth control | `AuthSession` schema; admin routes |
| Token storage | Knoxite bearer JWT persists in localStorage; Google ID token is handled transiently | `src/app/lib/session.ts`; `src/app/components/GoogleSignIn.tsx` |
| Isolation | Separate OAuth wrapper checks fixed loopback target, resource IDs/labels/mount, schema fingerprint and branch. Recovery-1 has its own unchanged guards | `knoxite-backend/development/oauthLocal.cjs`; `knoxite-backend/development/safety.ts`, `databaseIdentity.cjs`, `server.ts` |

The seven-day setting is not stronger than the proposed 8/4-hour limits. Shorter current controls—five-minute Google challenges, 15-minute reset links, existing password confirmation, revocation and role checks—must be preserved. A session timeout must not be confused with Google ID-token expiration or with the separate assessment attempt deadline.

## 3. Confirmed gaps and limitations

| Priority | Finding | Consequence / proposed response |
| --- | --- | --- |
| High before wider student testing | No current-term eligibility mechanism | A valid mailbox can continue authenticating independently of current enrollment; beta participation needs an approved additional gate |
| High policy decision | Both roles can retain a session for up to seven days; no idle timeout | Propose the requested shorter role-based limits; implement only after approval |
| High for a guaranteed one-account pilot | No server-enforced named-pilot-account allowlist | Domain eligibility permits more than one institutional identity; Google Cloud test-user settings are not a substitute for an application-side cohort restriction |
| Medium | Logout UI suppresses failed revoke requests | `src/app/pages/DashboardPage.tsx:159` and `src/app/pages/AdminDashboardPage.tsx:275` clear local credentials even if the server request fails. Server revocation is confirmed only when the request succeeds; offline logout cannot guarantee immediate remote invalidation |
| Medium | Some authenticated requests bypass the shared API helper | `src/app/pages/ChatPage.tsx:105–125` polls with raw fetch. Server denial still protects API data, but a 401 there does not use the shared session-ended handling; the UI can retain stale content until navigation |
| Medium, conditional on historical data | Leaderboard candidate filtering is weaker than login/matching filtering | `knoxite-backend/app.ts:88–154` uses the suffix-based `eligibleStudentWhere` without the full `studentEmailAllowed()` post-filter used by matching/portfolios. A malformed historical address with qualifying activity could remain visible. No affected real account was established; propose a focused consistency fix without changing metrics |
| Review limitation | No generic recent-auth proof for every sensitive admin action | Preserve existing password-confirmed actions; approve the exact additional actions/mechanism before extending reauth |
| Residual risk | Bearer token storage is accessible to same-origin scripts | Idle expiry reduces exposure but does not cure XSS/token theft. A cookie/session-storage architecture change is a separate review, not part of this minimal proposal |

These are code-confirmed current gaps or limitations, not claims of a deployed exploit. No live production attack or real-account linking test was performed. Logout failure feedback and consistent 401 handling can be addressed later as small, focused changes, with regression tests; this review does not silently change their behavior.

## 4. Smallest enrollment approach

### Single-account local pilot: no enrollment schema required

Use the researcher-approved minimal-data procedure to check your own current eligibility, then record only its decision, term and reviewer/date/reference in a private pilot record. Do not ask the application to accept a fabricated enrollment flag. No COR upload or persistent enrollment feature is needed solely to exercise your own Google login.

For technical enforcement that the pilot is **only your account**, propose a separate, opt-in **local-only exact-account allowlist**, checked on the backend after signed Google identity verification and on onboarding/linked sign-in. If email/password is included, apply the same restriction to that environment's registration/login/session paths. Store the approved account privately, not in Git. Fail closed when the pilot restriction is configured but missing/invalid. Do not infer aliases or automatically link by email.

This restriction would reuse the current identity/session system and need no schema change, but it is a security/eligibility policy change requiring approval. It is not implemented here. No specific account email is assumed from older conversation history. The existing configuration currently restricts the domain/format, not a single person.

### Real-student beta: minimal persistent term decision

For a cohort of around 30 participants, use manual researcher checking rather than an enrollment-system integration. Do not start with document uploads. An external roster alone is not a server-enforced participation rule; a small application decision record is needed if Knoxite itself must block unconfirmed/expired participation.

**Proposed schema only — not a migration:**

| Model | Minimum proposed data | Purpose |
| --- | --- | --- |
| AcademicTerm | ID, team-approved label, startsAt, endsAt, active state | Explicit validity boundaries; no invented semester dates |
| EnrollmentDecision | ID, userId, termId, revision, decision, reviewerId, reviewedAt; reviewed program/year IDs if needed; minimal evidence-method/reference code | Auditable per-user, per-term decisions without storing the document |

Proposed decisions: CONFIRMED, NOT_CONFIRMED and REVOKED. Absence of a decision means confirmation pending. Display **Enrollment confirmation required / Participation confirmed for this term**, avoiding confusion with the existing per-skill **Verified** badge.

Prefer append-only decisions with a unique `(userId, termId, revision)` and an index for the latest decision. Lock the user/term decision sequence during writes. This preserves correction/revocation history using two small models instead of building an upload/researcher-workflow subsystem. New term confirmation never overwrites a prior term. Exact names/fields and the need for evidence/reference codes remain subject to team approval.

Server eligibility would require: normal authenticated student identity, no suspension, active configured term with `startsAt <= serverNow < endsAt`, and the latest decision for that user/term being CONFIRMED. No decision, an expired term, a negative/revoked latest decision or missing configuration cannot silently become eligible. Revocation can address a status change within the term without deleting the account or exchange history.

If verification also establishes the student's program/year, snapshot those existing IDs in the decision and define what happens when the user later changes their academic profile. A reasonable proposal is reconfirmation before continued participation when the reviewed academic details no longer match. Do not silently update academic mappings, infer automatic year advancement or pretend an old decision verified new details.

Use an already authorized ADMIN as reviewer initially. Do not grant broad administrator rights to every researcher merely to review enrollment. A narrower researcher permission is optional and requires separate approval. Do not allow students to set their own decision, expiry or reviewer; reject self-approval and forged fields. Reviewer status at decision time must be auditable; later staff changes should not erase historical decisions.

### Authentication versus participation

Keep the two layers separate: a genuine identity can authenticate into a limited account state without being cleared for student participation. Proposed pending-state access is own profile/security/verification status and logout/recovery; other-student/private/social participation stays restricted. The exact access matrix needs approval.

Apply a reusable participation guard to matching/candidate visibility, portfolio discovery and relevant student actions—not just a disabled UI button. Use it consistently in `knoxite-backend/services/academics.ts`/candidate queries, `knoxite-backend/routes/matches.ts`, `knoxite-backend/services/portfolios.ts`, swaps, chat, forum/board, relevant analytics/leaderboards and route-specific authorization. Missing enrollment does not become a zero WRMR score or a new scoring factor.

**Required policy decision:** expired eligibility while an exchange is active. Decide explicitly which existing completion/session/review, cancellation, reporting and historical-access operations remain possible. Abuse reporting and account security should remain reachable through the approved limited-access design. Do not alter bilateral consent, completion/cancellation attribution, partner-balanced metrics or historical review validity to resolve this question automatically. Retain legitimate history and handle current participation separately.

## 5. Proposed session policy — not current settings

| Role | Idle timeout | Absolute lifetime | Idle warning |
| --- | --- | --- | --- |
| Student | 30 minutes | 8 hours | At 25 minutes inactive |
| Administrator | 15 minutes | 4 hours | At 10 minutes inactive |

The warning lead time is five minutes. A 30-minute idle session expires at minute **30**, not 35. These are the user's proposed operational defaults, not universal requirements and not yet approved/implemented settings. OWASP supports server-side idle and absolute expiration, with values chosen for the application's risk and usability. [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

### Minimal backend changes after approval

1. Add configurable role-based limits to `knoxite-backend/lib/config.ts` and use them in `knoxite-backend/services/authSessions.ts`; derive the role from the server's current user record.
2. Align the JWT expiry and stored absolute `AuthSession.expiresAt`. Never refresh that absolute deadline simply because the user is active.
3. Add one nullable `AuthSession.lastInteractiveAt` column for the idle clock. This is a proposed schema change requiring approval. Do not use a process-memory map as the authoritative idle store; it would reset on restart and disagree across processes.
4. In `authMiddleware.ts`, reject expired/revoked/token-version-invalid sessions before serving protected requests. Enforce both deadlines with server time even if the browser timer is disabled. No cron cleanup or client logout is required for an expired token to be rejected.
5. Proposed `GET /api/auth/session-status` returns server time and effective idle/absolute deadlines without extending them. Proposed authenticated `POST /api/auth/session-activity` records explicit interaction. Neither endpoint exists yet.
6. Update interaction atomically only for a still-valid session. Concurrent activity must not resurrect an expired/revoked session. Role elevation must apply a stricter administrator limit from the original session's creation; role downgrade must not lengthen an already stricter deadline.
7. Keep existing logout, suspension, password/reset and unlink revocation controls. Preserve all shorter existing security controls. No refresh token, new authentication library or new identity database is needed.

Possible configuration names, not currently implemented: `STUDENT_SESSION_IDLE_MINUTES`, `STUDENT_SESSION_ABSOLUTE_HOURS`, `ADMIN_SESSION_IDLE_MINUTES`, `ADMIN_SESSION_ABSOLUTE_HOURS`, `SESSION_WARNING_MINUTES`.

### Foreground interaction versus polling

The current fixed seven-day deadline is not renewed by polling. The risk below concerns implementing a future idle clock incorrectly.

Do **not** touch the idle timestamp on every authenticated request. Chat already polls every three seconds (`src/app/pages/ChatPage.tsx:125`); counting those requests as user activity would defeat the proposed policy.

Reuse the common client/session boundary to send an activity request only after approved foreground interaction, such as a real click/key/touch/scroll event in a visible document, with a bounded debounce. The team should approve the event set and update frequency. Timers, analytics polling, message fetching, visibility checks and status checks do not count. A warning's **Stay signed in** button is an explicit interaction, not an automatic timer.

The backend accepts only server timestamps and a still-valid session; a forged client timestamp or a late heartbeat cannot reset expiry. Browser “trusted event”/visibility checks are usability filters, **not cryptographic proof of human presence**. A holder of a stolen bearer token may generate activity requests until the absolute deadline; that is why an absolute limit and existing revocation/reauth controls remain necessary. Do not claim this design eliminates session theft.

### Frontend behavior after approval

Propose a small shared `SessionGuardian` under the authenticated route boundary, reusing `api.ts`, its `knoxite-session-ended` event and `AuthGuard.tsx`. Read deadlines from the server; do not restart the session clock on navigation, reload or opening a second tab. A status check may resynchronize clocks but must not prolong activity.

Warn five minutes before the effective idle deadline. If the absolute deadline comes first, explain that signing in again is required; **Stay signed in** cannot extend the absolute lifetime. At expiration, clear local auth and private cached UI state, stop protected polling and show a sign-in action. Background tabs/device sleep must reconcile with the server on return. Transient connection errors are distinct from a confirmed 401; never treat a failed activity request as a successful extension.

Inventory raw fetch users, especially `src/app/pages/ChatPage.tsx`, and give them consistent 401/session-ended handling. Do not claim server revocation succeeded when a logout request could not reach the API. Cached content/UI and an expired server credential are separate concerns.

Assessments can last longer than the proposed idle window. Warn without discarding answers, allow normal authenticated resume if the existing attempt is still valid, and preserve already earned tiers/history. Do not extend assessment deadlines, reset attempts or change cooldowns to compensate for a session timeout. Multiple tabs need deadline synchronization, not multiple independent clocks that keep one another alive.

### Sensitive changes and recent authentication

Preserve the current per-action password confirmations for password and Google-link changes; they are stronger than merely trusting an old login timestamp. Approve the additional sensitive-action list (for example, enrollment decisions or critical admin changes) before adding a generic recent-auth mechanism.

For a Google-only account, a freshly issued ID token or fresh nonce is not automatically proof that Google demanded a fresh password/MFA challenge. Review what the provider flow can establish and bind it to the same existing subject/session before offering Google reauthentication. Do not substitute a different identity or silently weaken the existing password-fallback/unlink rules. Any reusable recent-auth timestamp/window is an optional later design, not part of the one-column idle proposal. [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

## 6. Privacy and research implications

Use an approved evidence-viewing process rather than retaining full CORs by default. Avoid grades, fees, full student ID numbers, birth dates, addresses or document images when a decision record will meet the research purpose. Even a minimal enrollment decision remains identifiable educational information. The NPC IRR treats education information as sensitive and requires appropriate purpose, transparency and proportionate collection/retention. This technical design is not a declaration of legal compliance; the accountable privacy/research team must determine the proper basis and notices. [NPC IRR, definitions and Sections 17–19](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/).

Keep decisions/reviewer/evidence references administrative and show the student only their own useful status/validity information. Do not include them in public portfolios, matching DTOs, forum content, ordinary logs or analytics exports by default. Define retention, secure disposal (including backups), access correction/appeal, reviewer access and responsible contact before collection. Do not invent a retention period or assume thesis research automatically exempts processing used to decide access.

Term boundaries, eligibility/withdrawal/appeal rules and beta inclusion criteria require team/adviser/privacy review. Research-team manuscript/instrument changes are outside this task. WRMR remains reciprocal filtering plus the approved 50/30/20 formula with existing partner-balanced inputs; enrollment and session security do not become ranking factors or empirical learning-gain claims.

## 7. File-level implementation sequence requiring approval

| Phase | Proposed scope/files | Approval boundary |
| --- | --- | --- |
| A. Own-account pilot preparation | Private eligibility/review record; if approved, local-only exact-account restriction through config/Google/session checks and `knoxite-backend/development/oauthLocal.cjs`; focused tests | Approve scoped policy/code change and actual participant before activation; no term schema needed |
| B. Session controls | `knoxite-backend/prisma/schema.prisma` AuthSession field; `knoxite-backend/lib/config.ts`, `knoxite-backend/services/authSessions.ts`, `knoxite-backend/middleware/authMiddleware.ts`, `knoxite-backend/routes/auth.ts`; new session rules/tests | Approve defaults, activity definition, legacy rollout and isolated migration plan first |
| C. Session UI | Shared guardian/AuthGuard/api integration; SecurityPage/session display; affected raw-fetch pages including chat; desktop/mobile tests | Follow approved backend rules; no purely client-enforced timeout |
| D. Beta enrollment | Proposed two models; a small `knoxite-backend/services/enrollmentEligibility.ts`; extend existing ADMIN routes/admin page and own-profile status; apply participation guard/query scopes | Approve term, evidence/reviewer/retention/access matrix and active-swap policy; then authorize migration rehearsal |
| E. Controlled validation | Synthetic/sanitized isolated fixtures, then authorized participant evaluation | No original/production DB testing or fabricated participant results |

For migrations, use additive tables/nullable fields first, preserve user/skill/swap/review/assessment/session IDs and inspect legacy rows. Do not mark every existing account enrolled or extend old sessions as a backfill. One conservative session-rollout option is to require existing sessions to reauthenticate rather than invent unknown activity timestamps; choose and approve this explicitly. Any backfill using old createdAt must never create a longer deadline. Rehearse on an authorized isolated clone with preservation/rollback checks before an existing-database upgrade. Application rollback must not reopen expired sessions or reactivate old enrollment decisions.

## 8. Acceptance and test plan for future implementation

Enrollment:

- A valid Google/email identity without current confirmation gets the approved limited state, not unrestricted participation.
- Exactly at term end, confirmation stops authorizing participation; next-term evidence is required. Test missing term, future term, overlapping configuration, revoked/negative decisions and corrected revisions. Overlap/tie resolution must be approved, not guessed.
- A retained institutional email after graduation does not substitute for a current-term decision. Manual revocation within a term takes effect on the next relevant request.
- Students cannot submit decision/reviewer/expiry fields or review another user. ADMIN/reviewer authorization, self-approval prevention, audit continuity and private DTOs are tested.
- Changing the reviewed program/year follows the approved reconfirmation policy; the 13 programs and three first-year-only settings remain intact.
- Existing exchange/complaint/record-management operations follow the approved restricted-access matrix, preserving all history and WRMR input definitions.

Sessions:

- Test just before/at/after student 30-minute and admin 15-minute idle limits; just before/at/after 8/4-hour absolute limits. The server denies even with disabled JavaScript or a manipulated client clock.
- Repeated chat/analytics/status polling does not extend idle time; explicit valid interaction can extend idle only up to the fixed absolute deadline.
- Stay-signed-in requests after expiry/revocation, concurrent logout/activity, stale tabs, restart, reconnect and role changes cannot resurrect/lengthen a session.
- Warnings appear at 25/10 idle minutes, stay accessible on mobile/keyboard and do not expose tokens. A hard-expiry warning cannot offer a false extension.
- Manual logout succeeds server-side when connected; offline/failure feedback is truthful. Password resets/change, suspension, Google unlink, current-password and token-version protections remain intact.
- Raw-fetch 401 handling, multiple tabs and expired assessment resume are covered without changing assessment/WRMR methodology.

## 9. Fresh evidence from this review

The backend build/type compilation passed. The final focused selection passed **23 distinct tests, 0 failed, 0 skipped**:

```powershell
cd C:\KNOXITE\SkillSwap\knoxite-backend
npm run build
node --test --test-concurrency=1 dist/tests/google-auth.test.js dist/tests/google-memory.test.js dist/tests/institution-email.test.js dist/tests/oauth-local.test.js dist/tests/login-throttle.test.js dist/tests/email-delivery.test.js
```

The earlier narrower invocation completed 20 passing cases; the final selection added the actual `email-delivery.test.js` file. Overlapping executions are counted once, not as 43 new tests. No runtime test failed. These tests cover existing Google crypto verification with offline RSA/certificate fixtures, mocked HTTP onboarding/linking/suspension/revocation, default-off approval gates, local isolation, institutional format, login throttling and honest mail availability. Claims about existing reset/change revocation also have the source evidence above; the MySQL recovery/concurrency suites were not executed here.

No new timeout/enrollment feature exists to pass its acceptance tests yet. No real Google login, student evaluation, document submission, SMTP delivery, production request or database write was performed. Prior 158/17-test reports remain historical; this review's fresh distinct count is 23. Frontend suites were not rerun because this task changes only technical documentation.

## 10. Minimum remaining steps for your own real Google login

1. Record your current eligible college status/academic term through the approved manual process and designate the actual reviewer. Do not upload enrollment documents into Knoxite or send them in this chat for this step.
2. Decide whether the pilot's single-account restriction must be server-enforced (recommended). Approve the small local-only account allowlist proposal if so; it is currently missing. The full term-verification feature is not required before your own pilot.
3. Have a technically competent team member review the checklist below and record a real dated decision. They must acknowledge the current seven-day/no-idle setting. Either accept that limited local pilot risk explicitly or approve/complete the session-control changes first; do not claim the recommended limits already protect the pilot.
4. Give explicit authorization to activate normal Google Sign-In only in the dedicated local environment, with the accepted participant/scope/policy and completed review. Your statement that IT approval is unnecessary for this pilot can be recorded as its limited Workspace access basis, not as IT approval. No flag changes are authorized merely by this proposal.
5. Only after those decisions, record legitimately satisfied gates/approved policy version and enable the separate local configuration. Use the guarded backend/frontend commands in `GOOGLE_OAUTH_LOCAL_ACTIVATION.md`; test `/signup` or `/login` at **http://localhost:5181**. Recovery-1 and production remain excluded.

No university-wide permission, real mail configuration or full enrollment database feature needs to be fabricated to test your own account. A real positive password/linking/recovery pilot still needs functioning authorized mailbox delivery; do not bypass verification to manufacture a password account.

### Human reviewer record — deliberately unfilled

| Review item | Reviewer decision/evidence |
| --- | --- |
| Actual reviewer name/role and date; second reviewer if available | Pending |
| Pilot account/term eligibility and limited access basis | Pending; IT-not-required declaration recorded above |
| Token/format/hosted-domain/nonce/origin checks | Review source and fresh test evidence; decision pending |
| Existing-account collision/link/unlink/password safeguards | Decision pending |
| Session expiry, revocation, offline logout and proposed limits | Explicit current-risk acceptance or implementation approval pending |
| ADMIN/USER authorization and sensitive changes | Decision pending |
| Privacy, secrets/logs, local database/resource isolation | Decision pending |
| Approved pilot scope/duration and activation authorization | Pending |

Automated testing by this agent is technical evidence, not that human approval.

## 11. Exact changes and restrictions

This task creates this report and updates the existing pilot-readiness document to record the user's local access basis and link this proposal. No application/test/schema/private-configuration file changes are intended. All previous uncommitted work is preserved. No Google flag was changed, enrollment decision invented, semester boundary assumed, data uploaded, resource reset or account created. No original/production database or thesis modification, commit, push, merge or deployment is authorized or performed.


Final preservation check: task-baseline SHA-256 comparison found only these two technical-documentation changes, no missing baseline files, and no application/test/schema changes. All existing private OAuth configuration files matched their pre-review hashes, including the unchanged disabled flags. The thesis PDF hash, `dev-justine` branch and HEAD `2d02411` were preserved. `git diff --check` reported no whitespace errors (existing LF/CRLF notices only).

Exact files changed during this review:

- `docs/ENROLLMENT_ELIGIBILITY_AND_SESSION_SECURITY_REVIEW.md` — new focused findings, proposal, approval checklist and fresh verification evidence.
- `docs/GOOGLE_OAUTH_PILOT_READINESS.md` — dated follow-up recording the user's narrow local access basis and linking this proposal.
