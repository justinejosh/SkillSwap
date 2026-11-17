# Google OAuth pilot readiness after the Workspace diagnostic

**2026-11-15 final local activation:** private research-team approvals and the user's origin/shutdown confirmation were revalidated. Google was enabled only for the exact-account pilot at localhost:5181; the signed timeout policy is unchanged. No real-account login was performed. See [actual activation status and manual testing instructions](GOOGLE_OAUTH_LOCAL_PILOT_ACTIVATION.md). Earlier disabled/pending statements below describe prior stages; recovery-1 and production remain unchanged.

**2026-11-15 session implementation follow-up:** [Session timeout implementation](SESSION_TIMEOUT_IMPLEMENTATION.md) records the approved one-column SQL migration and role timeouts, enabled only in the separately verified OAuth environment. The rollback rehearsal preserved data. Google remains disabled; earlier statements below describe the previous baseline.

**2026-11-15 implementation follow-up:** [Local pilot protection and session security](LOCAL_OAUTH_PILOT_AND_SESSION_SECURITY.md) records the now-implemented local exact-account guard and logout/401/leaderboard consistency fixes. Earlier findings below describe the review baseline. Google remains disabled; the proposed session migration and new timeouts are not applied.

Recorded: **2026-11-14 (Asia/Manila)**. Project: `C:\KNOXITE\SkillSwap`; branch: `dev-justine`.

**2026-11-15 follow-up:** the user states that IT authorization is not required for their own single-account local development pilot. This is recorded as its stated local access basis, not university-wide approval, and no approval flag was changed. The new [enrollment/session security review](ENROLLMENT_ELIGIBILITY_AND_SESSION_SECURITY_REVIEW.md) proposes minimal term eligibility and server-side session controls for approval, identifies the current seven-day/no-idle behavior, and lists the remaining steps for that pilot. Earlier “access basis not supplied” statements below describe the prior review state.

## 1. Recorded observation and its limits

The user reports successfully completing the real local identity inspection with their own OLFU institutional account:

```json
{
  "hostedDomain": "student.fatima.edu.ph",
  "institutionalEmailFormatValid": true,
  "knoxiteAccessGranted": false
}
```

This records the **observed hosted domain for that test account**, reported from the diagnostic's verified signed Google identity. Google allowed that account to complete that interaction. The agent did not repeat the real-account test, receive/store the ID token, inspect the Cloud console or independently verify an IT approval document. The actual sign-in timestamp/account subject was not supplied and is not invented.

This is not university-wide OAuth authorization, proof of current college enrollment, a general claim about every OLFU account or a completed normal Knoxite sign-in. `knoxiteAccessGranted=false` is expected: the diagnostic creates no platform account/session. Hosted-domain and verified-email checks establish identity properties, not college enrollment. [Google's server-side ID-token guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## 2. Configuration prepared, not activated

Only this active private configuration field changed:

```dotenv
GOOGLE_ALLOWED_HOSTED_DOMAINS=student.fatima.edu.ph
```

File: `%LOCALAPPDATA%\Knoxite\google-local\environment.json`.

These values were preserved:

```dotenv
GOOGLE_SIGN_IN_ENABLED=false
GOOGLE_WORKSPACE_ACCESS_CONFIRMED=false
GOOGLE_ELIGIBILITY_RULES_CONFIRMED=false
GOOGLE_SECURITY_REVIEW_CONFIRMED=false
GOOGLE_ELIGIBILITY_POLICY_VERSION=olfu-santa-rosa-local-v1-pending
EMAIL_VERIFICATION_REQUIRED=true
```

The client ID, JWT signing secret, database connection/password and all other environment values were unchanged. A private pre-edit copy is `environment.before-observed-hd.json`. A token-free provenance record is `workspace-observation.json`, explicitly scoped to the user's report and recording the absence of IT/enrollment/security approval. Neither file is in the repository. The original pending template is retained unchanged.

Preparing an allowlist is not approving its use. No normal Google route was enabled, no server was restarted to activate it, and no Google account/session was created. Existing configuration validation still refuses `GOOGLE_SIGN_IN_ENABLED=true` when any approval gate is missing. The new focused regression test checks this explicitly.

Recovery-1 remains separate at frontend 5180/API 5012/MySQL 3311, with Google disabled and the synthetic capture policy unchanged. The separate OAuth environment remains frontend 5181/API 5019/MySQL 3319 using `knoxite_google_local_dev`. Production settings were not accessed or changed; disabled source defaults remain intact. No deployment was triggered.

## 3. Security and eligibility review

| Requirement | Current evidence | Remaining action |
| --- | --- | --- |
| Signed institutional identity | User-reported successful real diagnostic; hosted domain observed as above | Preserve observation scope; no raw token is needed |
| Token integrity | Existing backend verifies signature, issuer, audience, expiry, verified email; nonce/proof/origin checks bind requests | Retain all checks during pilot; do not substitute frontend email strings |
| Workspace/third-party access authorization | One-account interaction technically succeeded; no IT authorization supplied | Document the authorized pilot access basis/scope and responsible approver; obtain IT authorization if required by campus policy. Technical success is not permission evidence |
| College/current-enrollment eligibility | Institutional email convention and supported academic choices are enforced | Team must approve the eligibility method and verify the pilot participant under it. Mailbox ownership/program selection alone does not prove current enrollment |
| Academic onboarding | Existing backend requires a supported program/year and Terms/Privacy acceptance before new account/session creation | Use the existing 13 programs and preserved year restrictions; do not invent new options |
| Human security-review approval | Automated verification evidence exists; no human sign-off supplied | Responsible reviewer must accept the local threat/scope checklist and record real approval; do not infer sign-off from passing tests |
| Explicit activation authorization | User requested preparation and explicitly requires authorization before activation | Request/receive approval for normal sign-in only after the above review; do not flip approval flags merely to start the app |
| Email fallback/recovery | Existing password/hash/session/verification workflows preserved | Real positive email verification/recovery needs authorized provider/sender configuration; no delivery is claimed |
| Production release | No production access/change | Separate release authorization, configuration and institutional/privacy/database readiness remain required |

The current code does not query an enrollment registry or implement a per-account “enrollment verified” record. Global approval flags describe an approved policy/configuration; they do not manufacture evidence for a particular user. There is also no application-side named-pilot-account allowlist. The current eligibility checks permit matching approved institutional identities, not a formally verified roster.

The local pilot must therefore have an explicitly accepted cohort/eligibility procedure and controlled local operation. If server-enforced named-account restriction or an enrollment-verification mechanism is required, that is a security/eligibility policy change needing a separate proposal and authorization. It was not added here. Google Cloud test-user settings should not be treated as a replacement for Knoxite's eligibility policy.

Do not reinterpret an existing gate as a waiver of IT authorization. If a pilot is proposed before IT responds, present the proposed access-policy exception explicitly for review; no such exception is assumed or implemented by this configuration update. No private enrollment document or personal ID should be committed to Git or pasted into application logs; record only appropriate approval/evidence references through the team's authorized process.

## 4. Verified existing account, onboarding and linking behavior

Relevant implementation remains unchanged:

- `knoxite-backend/routes/google.ts`: LOGIN/LINK/ONBOARD challenge purposes, expiring single-use tickets, browser proof/nonce binding, current policy version, session ownership, duplicate checks and new-account creation.
- `knoxite-backend/services/googleIdentity.ts`: server verification and independent exact hosted-domain allowlist plus institutional email rule.
- `knoxite-backend/services/authSessions.ts` and `middleware/authMiddleware.ts`: suspension, verified-email, token-version and revoked/expired-session checks.
- `services/academics.ts`: validate the selected program/year against the stored active relationship.
- `GoogleSignIn.tsx`, `SignupPage.tsx`, `LoginPage.tsx`: reuse the existing form/onboarding, password-free Google registration and preserved email fallback.

Fresh focused HTTP-route tests with an **in-memory Prisma double and mocked Google claims** confirmed:

1. A new Google identity produces an onboarding ticket before any account exists. Missing Terms/Privacy acceptance, SHS/unknown program or BSIT year 2 is rejected. Valid first-year onboarding creates one normal User with `passwordHash=null`, a provider link and a Knoxite session.
2. The onboarding ticket cannot be replayed. Existing email collisions return 409; they never automatically attach a Google identity or create a duplicate user.
3. Existing-account linking requires the current password and an authenticated session. Incorrect password, forged browser proof, added frontend email fields and replay are rejected. Successful explicit linking preserves the existing User ID, name, biography and password hash; subsequent Google login returns that same User ID.
4. Suspension, token-version changes and revoked sessions remain enforced. Invalid institutional domains/formats, unverified email, unapproved hosted domain, incorrect issuer/audience/expiry, forged credentials and unapproved origins are rejected.
5. Password login still checks its password hash and mailbox verification. Unavailable mail produces 503 for verification/recovery, without claiming delivery.

The actual Google library was additionally exercised with locally generated RSA keys and offline certificate fixtures for signature/audience/issuer/expiry/key-rotation checks. Those are cryptographic software tests, not a second real Google authentication. The diagnostic's real result is separately attributed to the user.

No normal real-account registration, live existing-account linking or MySQL concurrency test was performed in this follow-up. These tests do not prove database race behavior or current enrollment. Existing dedicated MySQL integration suites are preserved and were not redirected to a protected database. The prior desktop/mobile browser tests remain historical; they were not rerun because no interface code changed.

## 5. Exact steps for an explicitly approved local sign-in pilot

### Before authorization

1. Review this report and identify the pilot scope: this machine, the separate OAuth database, approved participant(s), duration, purpose and handling/retention of any real account data.
2. Record the accepted Workspace access basis, current-college eligibility procedure/participant verification and human security-review decision. The signed-domain observation can support that review but cannot replace the missing decisions.
3. Keep the exact Cloud origin `http://localhost:5181` authorized for the same Web client; retain approved branding/audience settings. No redirect URI is used by the current GIS popup callback flow.
4. Confirm whether email fallback/recovery is included in the pilot. If so, configure/test the real authorized provider and sender first. Do not mark a real email/password user verified manually to simulate that flow.
5. Give explicit authorization to enable **normal Google Sign-In in this separate local environment only**, referencing the accepted review/policy. This report and allowlist preparation are not that authorization.

### After the missing decisions and explicit authorization are received

The implementation/configuration owner can record the real approved policy version and legitimately satisfied approval gates in the active private environment, then enable Google there. If any gate's meaning or approval remains unresolved, stop rather than setting it to true. No command in this report automatically edits the approval flags.

Stop the diagnostic at 5181 with Ctrl+C in its original terminal before launching the normal frontend. Use the guarded commands:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs database-start
node knoxite-backend/development/oauthLocal.cjs check
node knoxite-backend/development/oauthLocal.cjs backend
```

In another PowerShell:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs frontend
```

Then perform the authorized test yourself:

1. Open **http://localhost:5181/signup** for a genuinely new account, or **http://localhost:5181/login** for an already linked account. The button will remain disabled before activation is approved.
2. Choose your own eligible institutional Google identity. Never paste the returned credential into ChatGPT or a token decoder.
3. For new registration, complete the existing name, college program, permitted year and Terms/Privacy form. Verify that no separate Knoxite password is requested and account creation waits for accepted onboarding.
4. Verify the resulting profile and log out; sign in again with Google and confirm the same account/profile returns. Check normal session revocation/suspension only through authorized administration/account controls; do not alter real eligibility evidence.
5. For an existing email/password account in this **same separate database**, an initial Google email collision must refuse auto-linking. Sign in with the existing password, then use **Account security → link Google**, supplying the current password. Verify that the account ID/history stays the same. An account in the original database or recovery-1 is not a local OAuth test account and must not be copied/migrated for this test.
6. A real positive linking/recovery scenario needs a legitimate verified password account or a Google-only account whose password fallback was established through real mail. With mail unconfigured, do not fabricate verification, manually insert credentials or unlink a Google-only account. Mocked negative/protection tests already cover those branches safely.
7. Record safe outcomes/errors only. Do not collect ID tokens, password strings or session tokens as test evidence. Stop the separate app processes when finished. Recovery-1 and production remain outside the pilot.

The database currently remains an isolated local deployment. Any account eventually created there is test-environment data, not an instruction to create a production account or merge identities across databases.

## 6. Fresh results and exact changes in this follow-up

Command executed after rebuilding the unchanged backend application:

```powershell
cd C:\KNOXITE\SkillSwap\knoxite-backend
npm run build
node --test --test-concurrency=1 dist/tests/google-auth.test.js dist/tests/google-memory.test.js dist/tests/institution-email.test.js dist/tests/oauth-local.test.js
```

**17 tests passed, 0 failed, 0 skipped**. The new regression confirms that adding the observed domain leaves Google off and cannot overcome any of the three missing approval flags. Backend build/TypeScript compilation passed. The prior 158-case run is historical and is not counted again as fresh verification.

Repository files changed in this follow-up:

- `knoxite-backend/tests/oauth-local.test.ts` — add observed-allowlist/activation-gate regression.
- `docs/GOOGLE_OAUTH_LOCAL_ACTIVATION.md` — update the current observation/configuration state while preserving historical results.
- `docs/GOOGLE_OAUTH_FEASIBILITY.md` — reflect the reported diagnostic and link this review.
- `docs/GOOGLE_OAUTH_PILOT_READINESS.md` — this report.

Outside Git: only the active local hosted-domain field changed; a private pre-edit backup and the token-free observation record were added. No application authentication implementation, schema, approval flag, policy version, database record or protected sandbox configuration was changed. No normal Google flow was enabled or initiated. No production resource, original database or thesis file was accessed for modification. No commit, push, merge or deployment occurred.

Final checks confirmed exactly the four repository files listed above, with no unexpected changes/deletions. All other baseline source files and pre-existing private OAuth configuration files retained their hashes; only the active environment's hosted-domain field differed. Google activation and all three Google approval gates remain false. The thesis SHA-256 and Git HEAD (`2d02411`, `dev-justine`) were unchanged. Credential exclusion/whitespace checks passed, the separate OAuth database check reported Google disabled, and recovery-1's signed identity plus four seeded credential/verification/role/suspension checks passed. No diagnostic/user-started process was stopped or restarted.
