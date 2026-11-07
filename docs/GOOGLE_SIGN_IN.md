# Google Sign-In implementation and activation requirements

Status: implemented locally on `dev-justine`, **disabled by default**. No Google
client was created, university policy marked approved, existing `knoxite` database
upgraded, or production resource accessed. The earlier uncommitted account
recovery changes are retained. Node.js 22 or newer is required by the selected
`google-auth-library` 11.x dependency; verify the eventual deployment runtime.

## Activation gates — still outstanding

Obtain and record these approvals before changing configuration:

1. The accountable OLFU IT owner approves Knoxite's web OAuth client and basic
   Google Sign-In scopes under the institution's Workspace app-access controls.
   Confirm the consent audience, authorized users, and relevant organizational
   restrictions. An institutional mailbox alone does not establish permission.
2. Confirm the actual signed Workspace `hd` domains separately from eligible
   email domains. Do not assume `hd` equals `student.fatima.edu.ph`.
3. OLFU confirms that the configured email-domain/campus-suffix policy establishes
   **current Santa Rosa college-student eligibility**, including exclusions and
   exceptions for SHS, other campuses, staff, and retained alumni mailboxes.
   Self-selected college programs do not establish enrollment. If this cannot be
   established by these account rules, keep Google disabled: implement an
   institutionally authorized roster/eligibility service before activation.
4. Record the confirming authority, evidence reference, date, policy version,
   and handling of account renames, recycled addresses, and loss of eligibility.
5. Complete a security review and an explicitly authorized real-account pilot.
   Test mail delivery/fallback recovery, browser behavior, linking, unlinking,
   origin restrictions, and session revocation. Synthetic tests are not approval.

The public web client ID belongs in backend configuration. This GIS ID-token
flow does not require a Google client secret, access token, refresh token, Gmail
permission, Drive permission, Directory API access, or a service account.
Do not paste ID tokens, private keys, passwords, or delivery tokens into chat.

## Configuration (examples only; do not enable yet)

`knoxite-backend/.env.example` documents the complete keys:

| Key | Required meaning before enabling |
| --- | --- |
| `GOOGLE_SIGN_IN_ENABLED` | Defaults to `false`; remains false in this workspace. |
| `GOOGLE_CLIENT_ID` | Approved Google **Web application** client ID. Public identifier, not a secret. |
| `GOOGLE_ALLOWED_HOSTED_DOMAINS` | Exact comma-separated, IT-confirmed signed `hd` domains. No wildcards. |
| `GOOGLE_WORKSPACE_ACCESS_CONFIRMED` | Explicit confirmation of authorization for this client. Defaults false. |
| `GOOGLE_ELIGIBILITY_RULES_CONFIRMED` | Explicit confirmation that the implemented account rules establish the intended college population. Defaults false. |
| `GOOGLE_SECURITY_REVIEW_CONFIRMED` | Human security/pilot sign-off. Defaults false. |
| `GOOGLE_ELIGIBILITY_POLICY_VERSION` | Nonempty evidence-linked approved policy identifier. |

Existing `CAMPUS_EMAIL_RULE_CONFIRMED=true`, configured institutional domains,
and `EMAIL_VERIFICATION_REQUIRED=true` are also required. `loadConfig` rejects an
enabled Google flag with missing approvals, domains, or client configuration in
**every environment**, including development. Tests use explicitly synthetic
configurations and an injected verifier; there is no environment-controlled
test-token bypass or public token-forging endpoint.

Register exact authorized JavaScript origins for approved local/staging/frontends.
Local and release environments should use separately managed clients. The current
local frontend is `http://localhost:5173`; configure any additional loopback
hostname/port explicitly rather than assuming it is interchangeable. Use HTTPS
outside approved localhost testing. This implementation uses the GIS JavaScript
callback, not a redirect receiver. Do not add arbitrary callback URLs.

Configure `PUBLIC_APP_URL` and exact `CORS_ORIGINS` consistently. Google POST and
DELETE routes additionally require an approved Origin and JSON content type.
Review the eventual frontend's CSP, popup/COOP, and FedCM behavior according to
Google's setup documentation. No provider headers/settings were changed here.

## Backend flow and API

| Endpoint under `/api/auth` | Behavior |
| --- | --- |
| `GET /providers` | Public capabilities. Disabled response contains no client ID and performs no database query. |
| `GET /methods` | Authenticated owner-only password/link availability. Disabled Google performs no new-table query. |
| `POST /google/challenge` | Creates a LOGIN nonce bound to a browser proof hash. |
| `POST /google/login` | Verifies ID credential, nonce and browser proof; signs in a linked student or creates a limited onboarding context. |
| `POST /google/onboard` | Requires a valid pending context, name, valid program/year, and terms acceptance before creating a USER account. |
| `POST /google/link/challenge` | Requires existing student authentication and a fresh current-password check. |
| `POST /google/link` | Requires the same current session/account, browser proof, matching eligible Google email, and unlinked identity. |
| `DELETE /google/link` | Requires fresh password proof and verified email/password fallback; removes the link and revokes all sessions. |

Disabled Google requests fail with 503 **before querying new tables or invoking
Google verification**. The approved client ID is obtained by the frontend from
the server capability response; there is no independent frontend enable flag.

React creates a random 32-byte browser proof held in component memory and sends
its SHA-256 hash when requesting a challenge. The server returns a separate
random nonce for GIS. The signed ID token must contain that exact nonce, and the
completion request must prove possession of the original browser secret.
Challenges expire after five minutes, are purpose-bound, policy-version-bound,
and atomically consumed on success. LINK challenges also bind the user ID,
session ID, and token version. Expired contexts are deleted opportunistically
when new challenges are requested; no raw Google credential is stored.

The official backend library verifies Google's signature, issuer, audience, and
expiry using Google's managed keys. Application checks additionally require a
verified email, approved signed `hd`, approved institutional/campus email rule,
valid subject, current nonce, and browser proof. An ordinary Gmail account or a
consumer Google account registered with an external email is not eligible.
All Google mutation routes are rate limited using the existing per-process
IP/path policy. A multi-instance deployment still needs a distributed edge limit.

After credential checks, a user-locked transaction issues the same Knoxite
`AuthSession` and signed application JWT used for password login. Roles remain
database-authoritative. Suspension, verification, token-version, and existing
authorization checks apply. Google cannot create an administrator account.

## Account preservation and linking

`ExternalIdentity` references the existing `User.id`; unique provider/subject and
user/provider constraints prevent duplicate links. Subjects are opaque and
case-sensitive; the SQL migration uses `ascii_bin` for these columns. Identity
evidence stores verified email, hosted domain, policy version, and timestamps.
It is never included in public student portfolios.

An email collision returns instructions to sign in with the existing method and
link explicitly. It never creates another user, auto-links, marks an existing
unverified account verified, replaces a password, or overwrites profile fields.
Forgotten-password users must complete recovery or an independently verified
administrator process; Google matching the email is not an automatic shortcut.

New eligible Google users finish academic onboarding before receiving a Knoxite
session. Only this approved provider proof establishes their initial verified
email; it does not infer program, year, department, assessment tiers, or ratings.
Their password is null until they establish the email/password fallback through
the existing one-use emailed reset link. Existing hashes are preserved. Password
login handles null as invalid credentials, rather than passing null to bcrypt.

Linking/unlinking rechecks the user/session inside a locking transaction. Changing
a password invalidates pending link contexts through token versions; unlinking
revokes all sessions. Legitimate identity/email changes require reconciliation;
Google login does not silently change the stored email or move an identity.

## Migration and rollback boundaries

Migration: `prisma/migrations/20261107010000_google_identity/migration.sql`.
It adds `ExternalIdentity` and `GoogleAuthChallenge`, and makes `passwordHash`
nullable. It contains no user/link backfill, user-ID changes, data deletion, or
updates to skills, swaps, assessments, or reviews. Historical migration SQL and
the existing baseline remain unchanged; `pre-google.prisma` records the prior
audited schema.

`npm run db:upgrade:google` accepts only explicitly acknowledged loopback databases
ending in `_test`, `_dev`, or `_clone`. It compares the complete pre-Google schema,
fingerprints all pre-existing rows/relations in memory, applies the reviewed SQL,
checks row preservation and target schema, then records migration history.
Unresolved failed migration history is rejected before any schema mutation.
Partial/already-applied upgrades stop for reconciliation. DDL is not atomic;
keep a tested backup and use a disposable/sanitized clone. The old
`upgrade-existing-local` exception is deliberately blocked in this revision.
The user's existing `localhost:3306/knoxite` database is **not authorized**.

Bootstrap and legacy isolated-upgrade tooling applies the new migration before
marking it applied, rather than marking an unexecuted migration complete. Future
existing-database upgrades require a new separately approved plan and a rehearsal
on the exact target engine/version. Tests here used disposable MySQL 8.4;
MariaDB 10.4 and the unconfirmed production engine are not implied validated.

To disable new Google sign-ins, keep/set the feature flag false and restart the
appropriate authorized environment. Disabling does not itself revoke already
issued Knoxite sessions. Existing sessions retain the current seven-day maximum
and local suspension/token-version checks. Google grant revocation or institution
deprovisioning does not automatically revoke those application sessions; agree an
institutional offboarding/revalidation procedure before student activation. No
Directory polling or new Google permissions are silently introduced.

Do not automatically reverse the nullable-password migration after Google users
exist: null passwords cannot become NOT NULL without a reviewed recovery plan.
No rollback may delete those accounts or their histories. Keeping the additive
schema while disabling the feature is the initial safe containment option.

## Remaining external work

The real institutional account pilot, mail webhook/sender configuration, college
eligibility evidence, approved OAuth client/origins/consent settings, security
sign-off, production database/backups, production secret rotation, and authorized
release remain outstanding. Existing browser storage of Knoxite session JWTs is
retained; this change does not claim an HttpOnly-cookie migration. Raw Google
ID tokens, browser proofs, and nonces are never put in URLs or local storage.

See `EMAIL_DELIVERY_SETUP.md` and `VALIDATION.md` for the mail contract and actual
test evidence. No real email or institutional Google login was performed.

## Primary references

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Backend ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [GIS setup, origins, CSP, and popup requirements](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Workspace app-access controls](https://knowledge.workspace.google.com/admin/apps/control-which-apps-access-google-workspace-data)
