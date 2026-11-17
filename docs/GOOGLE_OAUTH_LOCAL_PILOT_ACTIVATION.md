# Final local Google OAuth pilot validation

Recorded 2026-11-15. Project `C:\KNOXITE\SkillSwap`, branch `dev-justine`.

## Actual status: activated locally; real-account login not performed

The user confirmed the diagnostic was stopped and **http://localhost:5181** is registered as an Authorized JavaScript origin for the existing Google Web client. Private approvals, unchanged source/configuration hashes, account restriction and dedicated database were revalidated. Origin registration is user-confirmed; Google Cloud was not remotely inspected or changed.

Normal Google Sign-In is enabled **only for the dedicated own-account local pilot**, using policy version **`olfu-santa-rosa-own-account-local-v1-2026-11-15`**. This identifier records the approved scope, not a university-wide policy or IT approval. Exact-account enforcement and the signed session-timeout policy are unchanged.

| Dedicated private setting | Activated value and basis |
| --- | --- |
| `GOOGLE_SIGN_IN_ENABLED` | `true`; explicit own-account local activation authorization |
| `GOOGLE_WORKSPACE_ACCESS_CONFIRMED` | `true`; declared own-account access basis and earlier reported signed Workspace diagnostic, **not IT/university-wide approval** |
| `GOOGLE_ELIGIBILITY_RULES_CONFIRMED` | `true`; dated private own-account enrollment/college decision, approved format and onboarding rules |
| `GOOGLE_SECURITY_REVIEW_CONFIRMED` | `true`; dated private research-team review, all eight checks attested, current session-policy acceptance and corroborating tests |
| `GOOGLE_ELIGIBILITY_POLICY_VERSION` | `olfu-santa-rosa-own-account-local-v1-2026-11-15` |

Only those five fields changed. Database/JWT credentials, supplied client ID, institutional/hosted-domain settings and mandatory verification were retained. Recovery-1, original development and production configuration/defaults were not altered.

The guarded API and frontend started temporarily for an HTTP-only check. A fresh signed backend response confirmed Google and timeouts enabled; the provider endpoint confirmed the configured client and allowed origin; `/signup` served the normal app; anonymous protected access returned 401. No JavaScript/Google SDK was executed and no Google challenge/login endpoint was called. Both tool-owned processes were then stopped with Ctrl+C and ports 5019/5181 verified free. Start your own persistent terminals below.

The dedicated database still has **zero users, external identities, sessions and Google challenges**, and its original row fingerprint matches migration evidence. No account was automatically created and no interactive Google login was performed.

## Private-record validation (no contents disclosed)

- Exactly one privately configured email field is present; the address satisfies the confirmed Laguna structure and exact institutional domain. The address is not copied into this report, logs or source.
- A current-academic-year term, positive college-enrollment decision, reviewer, review date and nongeneric evidence-reference identifier are recorded. The research team's attestation is recorded; no independent registrar/enrollment lookup was performed or claimed. No enrollment document was collected.
- Security approval has a reviewer/date, all eight individual checks attested, and acceptance covering the implemented student 30-minute/8-hour and administrator 15-minute/4-hour policy. An outer APPROVED label alone was not used: child records, current source checks and fresh regressions were inspected.
- Review/activation dates are valid, not in the future, and activation follows the two reviews. The security review and activation are not dated before the timeout implementation day.
- Scope is limited to one own-account local pilot at 5181 and explicitly disclaims university-wide/public approval. No conflicting account email was found in the review record. IT approval is not invented or requested again for the user's declared own-account pilot basis.

These are user/research-team records and technical validation, not proof of independent university or professional security certification. Human records were neither edited nor fabricated.

## Security and isolation verified

Backend Google verification checks signature, issuer, audience, token expiry, verified institutional email, configured signed hosted domain, nonce, browser proof, Origin and one-use challenge state. The configured hosted domain is the single-account observed `student.fatima.edu.ph`; it is not described as IT-confirmed for every student.

The exact-account restriction is backend-enforced after verified institutional claims and rechecked for onboarding, linking, session issuance and authenticated requests. Existing-account email collisions do not auto-link. Academic onboarding still requires one of the 13 active programs, an allowed year and Terms/Privacy acceptance. The intentional first-year-only settings for BSIT, BSIHM-CA and BSIHM-HACLO remain intact.

The signed timeout policy remains enabled in the dedicated environment; both role policies, fixed absolute expiry, polling exclusion, logout/reset/unlink revocation, suspension and authorization protections were checked in source/focused regressions. No authentication implementation was changed.

Owned target remains **127.0.0.1:3319 / knoxite_google_local_dev**, MySQL 8.4.13. Container/volume labels, resource identity, exact mount, loopback topology, base schema fingerprint, signed migration receipt, operational column and SQL identity were verified. Zero users/sessions/identities are present and the privately configured account does not already exist. The original table-row fingerprint still matches migration evidence. No existing data or schema was changed. Recovery-1, original `knoxite` and production were not connected to or modified.

## Fresh tests

- Backend strict build/client consistency passed; no generation or schema synchronization was required.
- **32 backend tests passed, 0 failed, 0 skipped**: Google crypto/claims/default-off gates, nonce/replay/link/onboarding/session protections, institutional format, local isolation/allowlist, both timeout roles and login throttling.
- **42 Edge browser tests passed, 0 failed, 0 skipped**, desktop/mobile viewports: Google UI/registration/linking/error handling plus session warnings, multi-tab, assessment progress, expiry and offline behavior.
- The 32-case backend selection was rerun after activation: again 32 passed. It overlaps the earlier selection and is not counted twice. The 42 browser checks preceded the pause; source hashes were unchanged when activation resumed.
- **74 distinct automated cases** across this activation task and its continuation, plus actual HTTP-only smoke checks. Google library crypto checks use offline synthetic keys; positive Google route/GIS tests use mocked identities. These results do not claim a real Google login or substitute for human security approval.
- Read-only dedicated migration integrity and private-file preservation checks passed. Existing historical MySQL concurrency/migration totals were not reused as fresh results.

Backend selection (from `knoxite-backend`):

```powershell
npm run build
node --test --test-concurrency=1 dist/tests/google-auth.test.js dist/tests/google-memory.test.js dist/tests/institution-email.test.js dist/tests/oauth-local.test.js dist/tests/session-policy.test.js dist/tests/login-throttle.test.js
```

Browser selection (project root):

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL='msedge'
npx playwright test tests/browser/google-auth.spec.ts tests/browser/session-timeouts.spec.ts
```

## Your interactive test — start these terminals yourself

Configuration activation and noninteractive checks passed. No further activation permission is needed for the approved own-account test. Keep these two PowerShell terminals running:

Terminal 1:

```powershell
cd C:\KNOXITE\SkillSwap
npm --prefix knoxite-backend run build
node knoxite-backend/development/oauthLocal.cjs database-start
node knoxite-backend/development/oauthLocal.cjs check
node knoxite-backend/development/oauthLocal.cjs backend
```

Terminal 2, after the matching backend is listening:

```powershell
cd C:\KNOXITE\SkillSwap
node knoxite-backend/development/oauthLocal.cjs frontend
```

Open **http://localhost:5181/signup**, choose Continue with Google, and select only your privately approved institutional account. Complete the required display name, college program, permitted year and Terms/Privacy agreement. A Google-only registration does not require a Knoxite password. A collision with an existing account requires the existing secure linking workflow, not another account or manual verification bypass.

Confirm that your own profile opens, then use Log Out and return to **http://localhost:5181/login** to Sign in with Google again. That repeat login should reuse the same account/profile. Perform the actual Google interaction yourself; do not share tokens, private configuration or account details in logs/chat.

### Confirm storage in the isolated database

From a third PowerShell terminal, run this read-only check before and after registration. It uses the same ownership-verified launcher and prints no email, ID, password or token:

```powershell
cd C:\KNOXITE\SkillSwap
@'
const local = require('./knoxite-backend/development/oauthLocal.cjs');
(async () => {
  const f = local.verifiedSettings(), db = local.client(f.env);
  try {
    const identity = await db.$queryRaw`SELECT DATABASE() AS name`;
    if (identity[0].name !== 'knoxite_google_local_dev') throw new Error();
    console.log(JSON.stringify({
      database: identity[0].name,
      totalUsers: await db.user.count(),
      googleIdentities: await db.externalIdentity.count({ where: { provider: 'GOOGLE' } }),
      approvedAccountExists: (await db.user.count({ where: { email: f.config.localOAuthPilot.email } })) === 1,
      approvedAccountLinked: (await db.externalIdentity.count({ where: {
        provider: 'GOOGLE', user: { email: f.config.localOAuthPilot.email }
      } })) === 1
    }, null, 2));
  } finally { await db.$disconnect(); }
})().catch(() => {
  console.error('Read-only pilot check failed; no private contents printed.');
  process.exitCode = 1;
});
'@ | node -
```

Before interaction: zero users/identities and both account booleans false. After successful registration: one user, one Google identity and both booleans true. After logout and Google sign-in again: those counts should remain one, demonstrating account reuse; confirm the same profile remains available. Session-history rows may accumulate normally because logout revokes rather than deletes them.

The launcher rejects other database targets before connecting. These checks demonstrate records in the authorized isolated target and fixed routing; they do not inspect forbidden original/production databases or claim global absence of an account elsewhere.

Real email/password registration and recovery retain mandatory mailbox verification and still need an authorized delivery provider/sender. Google authentication does not configure email delivery or bypass account-linking safeguards.

## Exact changes, evidence and remaining requirements

Project changes during the continuation are technical documentation only:

- `docs/GOOGLE_OAUTH_LOCAL_PILOT_ACTIVATION.md`: replace the paused result with actual activation, evidence, settings and manual test/count commands.
- `docs/GOOGLE_OAUTH_PILOT_READINESS.md`: dated pointer to the activated local state.
- `docs/GOOGLE_OAUTH_LOCAL_ACTIVATION.md`: dated pointer retaining implementation history.
- `docs/SESSION_TIMEOUT_IMPLEMENTATION.md`: note that subsequent Google activation preserves the signed timeout policy.

Outside Git, `%LOCALAPPDATA%\Knoxite\google-local\environment.json` changed only in the five fields listed above. An exclusive private `environment.before-final-pilot-<timestamp>.json` backup and signed `local-activation-<timestamp>.receipt.json` were created. The receipt binds the actual scope/policy, before/after environment hashes, unchanged account/review/session-receipt hashes and the user's origin/shutdown confirmation. It explicitly records no real login performed and does not invent IT approval. Its phase describes successful configuration validation, not completed student sign-in.

Application/tests/schema were unchanged. Existing credentials, ownership record, signed timeout receipt, private account and human-review records were not modified. Previous work and the thesis were preserved. No commit, push, merge, deployment, database reset/data change or generic Prisma synchronization occurred.

No local activation blocker remains. **Your actual Google login is the next unperformed step.** Google could still present consent/Workspace-access or browser-provider errors at runtime; share only sanitized wording if that happens, never tokens or private configuration. University-wide/public deployment, other participants, semester-renewal policy, real email delivery and production release remain outside this approval.
