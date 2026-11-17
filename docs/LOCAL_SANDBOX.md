# Run and explore Knoxite with synthetic accounts

This is a separate, persistent local development environment. Your existing
`localhost:3306/knoxite`, backend on 5000, frontend on 5173, and their `.env` files
are not changed. Google remains disabled. All records here are synthetic.

## Repair after a directory move or lost settings

Use the current checkout, not an old OneDrive copy:

```powershell
cd C:\KNOXITE\SkillSwap
npm run sandbox:diagnose
npm run sandbox:repair
npm run sandbox:check
npm run sandbox:copy-password -- alice
```

Repair first verifies the selected container/volume and attempts complete
checkpoint recovery when settings differ. A verified instance still running
from a previous checkout can be transferred with `sandbox:relocate`: it requires
the matching checkpoint and exact Docker topology, read-only password checks,
a signed backend response with the recorded PID, and Windows executable, owner
SID, creation-time and command-line proofs for both processes. Only those
verified application processes are stopped; the database stays intact.

If no matching checkpoint can establish the old instance, repair prepares a
**separate replacement**, retaining the original settings/container/volume.
Neither container labels nor credentials are copied to make an unverified
instance look owned. No original history is imported into the new synthetic DB.
The layouts are a closed allowlist:

| Resource | Original | Replacement |
| --- | --- | --- |
| Private settings under `%LOCALAPPDATA%\Knoxite\sandbox` | `settings.json` | `replacement\settings.json` |
| Docker container | `knoxite-synthetic-mysql` | `knoxite-synthetic-mysql-replacement` |
| Named volume | `knoxite-synthetic-mysql-data` | `knoxite-synthetic-mysql-data-replacement` |
| MySQL | `127.0.0.1:3309/knoxite_sandbox_dev` | `127.0.0.1:3310/knoxite_sandbox_replacement_dev` |
| API | `127.0.0.1:5010` | `127.0.0.1:5011` |
| Frontend | `http://localhost:5180` | `http://localhost:5180` |

If the historical replacement also has resources but no matching private
settings, repair **does not reuse or reset it**. It reserves the first safe
`recovery-1` through `recovery-8` namespace. Slot N uses private folder
`recovery-N`, container `knoxite-synthetic-mysql-recovery-N`, volume
`knoxite-synthetic-mysql-data-recovery-N`, MySQL port `3310 + N`, database
`knoxite_sandbox_recovery_N_dev`, and API port `5011 + N`. The frontend remains
at 5180 and pins requests to the selected profile's API. These are bounded,
allowlisted local targets, not arbitrary host/database overrides.

This handles the reported state where both the original and the old fixed
replacement are orphaned. Occupied names, volumes, private history and unverified
listeners are skipped and retained. Capacity exhaustion fails without deleting
anything. A valid older replacement can still be resumed with its existing
credentials; it is not unnecessarily replaced.

Before setup, repair writes a private `pending-replacement.json` reservation.
Preparation and activation must use that same profile. Failed activation leaves
the reservation intact; a retry resumes it rather than producing another
identity. A reservation with missing settings but existing resources fails closed
as `PENDING_CONFLICT`, and is retained for explicit investigation. An untouched
reservation with no resources can safely continue first-time setup.

You can prepare the fallback without selecting it:

```powershell
npm run sandbox:prepare-replacement
npm run sandbox:diagnose-replacement
npm run sandbox:use-replacement
```

Preparation bootstraps only the empty replacement DB and seeds fresh synthetic
accounts through normal verified-email/password authentication. It starts API
5011 without taking over frontend port 5180. Repeating preparation preserves its
same settings/passwords and only checks an existing schema read-only.

Selection is persisted in the private `active-profile.json` only after the
replacement passes ownership, API and frontend checks. Standard start/check/
accounts/copy-password/mailbox commands then use that selected profile, and the
frontend banner distinguishes original from replacement. The profiles have
different passwords and session signing keys, even though the synthetic email
names are the same. Copy the password after selection; do not use the other
profile's password. Frontend API targets are pinned to 5010/5011 by the allowlisted
profile (5010, 5011 or 5012–5019), never to the ordinary backend or a deployment.

If an unverified old frontend occupies 5180, activation reports `PORT_OCCUPIED`
and does not stop it. Close that known old Vite terminal yourself, or obtain a
verified process handoff; then rerun `sandbox:repair` or `sandbox:use-replacement`.
No credentials or databases are reset to solve a port conflict. To stop only a
prepared replacement while keeping the original active:

```powershell
npm run sandbox:stop-replacement
```

This retains the replacement volume and private settings as well. There is no
automatic deletion of either sandbox. If deletion is later requested, inspect
which history belongs to it and get approval first.

The earlier setup order could generate settings before detecting an older
resource; missing settings now cause refusal before generating any identity.
Repeated setup/start/repair never regenerates an existing profile's credentials.
Initial settings creation uses an exclusive file write as well as the shared
lifecycle lock; a settings file appearing concurrently is preserved, not replaced.
The private lifecycle audit now records creation, selection, verified starts and
failure codes with checkout paths and timestamps, without secrets or student
data. It cannot identify who replaced a file before this audit existed.
Diagnostics include launcher path/revision to distinguish stale output or copies.
Transport-only health failures get bounded retries; a reset is not classified as
a missing listener, and mismatched signatures/instance IDs remain failures.

Run initial recovery from the Windows terminal that will own the private files.
Do not infer that a tool session's private settings exist in another terminal's
view simply because Docker resources exist. The two-orphan regression tests use
isolated metadata/operation fixtures; frontend port tests mock metadata responses
and do not create new live Docker resources or credentials. A final real login
requires successful initialization and selection in that terminal's environment.

## Requirements and first run (Windows PowerShell)

Use Node.js 22+, installed project dependencies, Git, and running Docker Desktop.
Do not change branches while the sandbox is running. Commands are run from the
repository root, **not** `knoxite-backend`:

```powershell
cd C:\KNOXITE\SkillSwap
git switch dev-justine
npm run sandbox:setup
```

On a new checkout, install locked dependencies first:

```powershell
npm ci
npm --prefix knoxite-backend ci
npm --prefix knoxite-backend run db:ensure
```

Setup creates its own labelled MySQL 8.4 container/volume, waits for readiness,
bootstraps only its initially empty database, starts both local servers, and
initializes three students and an administrator. It never resets an existing
database. If the sandbox schema is outdated or a port/name belongs to something
else, it stops for reconciliation instead of taking it over.

Open **http://localhost:5180/login**. A yellow banner identifies the synthetic
environment. The backend is `http://localhost:5010`, and MySQL is bound to
`127.0.0.1:3309/knoxite_sandbox_dev`. Only the sandbox ports are used.

## Sign-in accounts and private passwords

If login fails, first start the sandbox, then check account consistency without
printing any password or hash:

```powershell
npm run sandbox:start
npm run sandbox:check
npm run sandbox:copy-password -- alice
```

Open `http://localhost:5180/login`, hard-refresh with **Ctrl+Shift+R**, enter
`alicelag@students.knoxite.test`, and paste into the Password field. The clipboard
command copies only the exact password value and prints no password. Do not
include terminal labels/indentation. Passwords remain case-sensitive and are not
silently trimmed or changed. For other fixtures replace `alice` with `bob`,
`casey`, or `admin`.

`sandbox:check` verifies the active backend instance, account existence,
bcrypt password match, verification, suspension, and role. The credentials
commands refuse to reveal/copy a stale saved password or one for a blocked
account. Use the normal captured recovery flow if a password was intentionally
changed; setup/restart never restores or rotates it automatically. The commands
require the isolated database and backend to be running.

Development port 5180 is reserved for the sandbox and pins API calls to port
5010, even if a stale frontend environment points at port 5000 or a deployment.
Normal development/test ports keep their existing configured API behavior.

```powershell
npm run sandbox:accounts
```

This prints the locally generated **initial** passwords in your terminal:

| Account | Role |
| --- | --- |
| `alicelag@students.knoxite.test` | Student |
| `boblag@students.knoxite.test` | Student |
| `caseylag@students.knoxite.test` | Student |
| `adminlag@students.knoxite.test` | Administrator |

Passwords are random per installation and are not stored in Git or this guide.
Do not paste the credentials into chat. If you change a test password, the printed
initial password is no longer current; use the captured password recovery flow.
Setup skips existing accounts rather than resetting passwords or suspensions.

Students have reciprocal Python/JavaScript offered/wanted skills. Their initial
tiers are Not Assessed. No completed swaps, ratings, real question banks, or
validated academic mappings are invented. New students remain discoverable and
can initiate reciprocal swaps while WRMR is unranked. Use Alice in a normal browser window and Bob in an incognito window or a
separate browser profile to exercise both sides of an exchange.
The administrator can explore existing administration tools with normal role
checks. Draft assessment/mapping content remains explicitly synthetic unless
separately validated; do not present sandbox work as thesis study evidence.

## Verification and password-recovery mailbox

Real email is **not sent** from this environment. New registrations still start
unverified, passwords are still checked, and sessions/roles/authorization are
unchanged. A separate development-only mailer captures links for the reserved
`students.knoxite.test` domain into a private local mailbox.

1. Register at `http://localhost:5180/signup` with a synthetic address whose
   username ends in `lag`, for example `practice1lag@students.knoxite.test`.
2. Choose a college program/year and a password of at least 12 characters.
3. Open the captured mailbox:

   ```powershell
   npm run sandbox:mailbox
   ```

4. Click **Verify synthetic email**, then **Verify Email** in Knoxite. Sign in
   normally. The same backend one-use token consumer establishes verification.
5. For recovery, use **Forgot password?**, request a link, then run the mailbox
   command again (or refresh the already opened mailbox file). Click the reset
   link and choose a new password. Prior sessions are revoked.

The initial seeded accounts go through registration, captured verification, and
password login too. Administrator role assignment occurs only in the guarded
synthetic seed. There is no public “verify me” endpoint or production mail-capture
provider. The development entry rejects production, non-loopback/wrong database
targets, real email domains, disabled verification, and enabled Google.

The mailbox is a **local HTML file**, not an internet inbox or public API. It
shows up to 50 recent messages; verification links expire after 30 minutes and
reset links after 15 minutes, with one successful use. No Gmail/OLFU delivery
claim is made. Receiving a captured message does not prove actual institutional
ownership or validate the campus email convention.

## Start, stop, and foreground commands

After setup, these commands preserve your sandbox data:

```powershell
npm run sandbox:stop
npm run sandbox:start
```

Start checks/builds the backend before launching its compiled JavaScript, then
waits for the matching backend instance and frontend to be ready. Wait for the
**Synthetic sandbox ready** message before running check/copy commands. This
does not migrate or reset the database. Existing credentials remain unchanged.

The launcher verifies an uncached, challenge-signed health response using the
existing private sandbox key. A TCP connection, HTTP 404, or JSON from another
application does not establish identity. A repeated start reuses a matching
healthy backend; a missing backend is started using the same settings. An old
matching backend is upgraded only when its recorded executable is also owned.
Foreign or differently keyed instances are never taken over automatically.
Start/setup/stop and credential commands use a private lifecycle lock so they
cannot race each other. A lock whose owner has exited is recovered; an unreadable
or still-owned lock is retained and reported for review.

For failures, obtain a safe status report without printing credentials:

```powershell
npm run sandbox:diagnose
npm run sandbox:start
npm run sandbox:check
npm run sandbox:copy-password -- alice
```

Diagnose shows health state, recorded process liveness/ownership, startup time,
and the private log directory. `check` uses a fresh HTTP identity proof and
then checks the isolated database, rather than relying on a Windows TCP listing.
The backend logs timestamped startup, graceful shutdown and fatal-exit markers.
Windows force-kill, shutdown or a terminated terminal/job may leave no exit
marker; stale PID records alone do not mean a service is running. Start the
sandbox again after reboot or an intentional stop. No Windows auto-start service
or automatic account/password reset is installed.

Failures now include an actionable code instead of one generic message:

| Code | Action |
| --- | --- |
| `DOCKER_UNAVAILABLE` / `DOCKER_MISSING` | Start/install Docker Desktop and wait for its engine. |
| `BACKEND_UNAVAILABLE` | Run `sandbox:start` and wait for readiness before checking or copying. |
| `BACKEND_UNRESPONSIVE` | Inspect private logs; an HTTP timeout does not prove an identity mismatch. |
| `BACKEND_PROTOCOL_MISMATCH` | Port 5010 returned an HTTP error, HTML or invalid health data. Use `sandbox:diagnose`; retain settings. |
| `BACKEND_OUTDATED` | Run `sandbox:start`; only an owned process with matching instance metadata can be upgraded automatically. |
| `SETTINGS_MISMATCH` / `SETTINGS_INVALID` | Reconcile the matching private settings and process; never delete credentials or the volume. |
| `LIFECYCLE_BUSY` | Wait for the current start/stop/check command. Unknown locks need manual review; never delete settings to resolve them. |
| `PROCESS_RECORD_MISMATCH` | Reconcile the signed running PID and process records before stopping; foreground servers should be stopped in their own terminal. |
| `DATABASE_INSTANCE_MISMATCH` | Compare the reported settings path/context, BOTH ownership labels, and exact volume mount. Do not copy a label into settings. |
| `SETTINGS_MISSING_EXISTING_DATABASE` | Old resources or a recovery checkpoint remain. Setup refuses to generate new identity/passwords; use verified recovery. |
| `RECOVERY_BACKUP_MISSING` / `RECOVERY_BACKUP_MISMATCH` | Restore a trusted complete private settings backup; no label-only adoption is permitted. |
| `RECOVERY_CREDENTIAL_MISMATCH` | The backup's saved student passwords do not match current hashes. Recovery is refused; no password resets occur. |
| `CHECKPOINT_CONFLICT` | Keep the previous checkpoint and reconcile the changed settings/resources before replacing any backup. |
| `REMOTE_DOCKER_BLOCKED` | Select local Docker Desktop; remote Docker endpoints are refused before contacting the engine. |
| `BACKEND_BUILD_FAILED` | Run `npm --prefix knoxite-backend run typecheck`, fix compiler/dependency issues, then retry. |
| `BACKEND_EXITED` / `BACKEND_NOT_READY` | Inspect private `backend.stderr.log`; retry without deleting data. |
| `PORT_OCCUPIED` / `INSTANCE_MISMATCH` | Resolve the conflicting local process; the launcher will not stop unrelated services. |
| `DATABASE_CREDENTIAL_MISMATCH` | Restore matching private settings; do not delete/reset the volume. |
| `WRONG_BRANCH` / `NODE_VERSION` | Use `dev-justine` and Node 22+. |

Private error logs redact generated passwords, signing secrets and connection
URLs. Do not share logs without reviewing them. Check/copy failures do not reset
accounts or bypass authentication.

The launcher stops only its recorded, matching processes and owned container.
It retains the named volume `knoxite-synthetic-mysql-data`. Start reuses the owned
container and launches missing services. No Docker volume or database reset is
automatic. Do not delete the private settings file while retaining the volume:
it holds the credentials needed to reopen that sandbox.

## Container/volume identity and verified recovery

`sandbox:diagnose` prints the exact private settings path, Docker context,
settings/container/volume timestamps, and separate ownership/topology booleans.
It works even when settings are missing or invalid. Compare output from the
same Windows account and Docker context; do not print Docker's full inspection
object because its environment contains credentials.

Ownership requires both `knoxite.synthetic` labels to match the private
instance, image `mysql:8.4`, one writable named-volume mount at `/var/lib/mysql`
whose name is **exactly `knoxite-synthetic-mysql-data`**, and the single
`127.0.0.1:3309` binding. Start, stop and credential commands all apply these
checks. A merely present volume, matching port, or familiar container name is
insufficient. No container/volume labels are automatically changed.

The previous setup order could generate new settings before discovering an
older container/volume when the original settings file was missing. Setup now
checks for existing resources/checkpoints first and refuses to generate new
identity, signing keys or passwords in that case. This explains a possible
divergence; it is not evidence that regeneration happened on your machine.

A successful start/setup records the complete, verified private settings in
`%LOCALAPPDATA%\Knoxite\sandbox\settings.verified.json`. Before the first
checkpoint, the launcher verifies exact Docker ownership, the live backend's
signed identity, database access and all four saved synthetic password hashes.
An existing checkpoint is retained rather than overwritten. Intentional student
password changes remain supported; stale initial passwords are never reset.

If settings later go missing or diverge, run:

```powershell
npm run sandbox:diagnose
npm run sandbox:recover
npm run sandbox:start
npm run sandbox:check
npm run sandbox:copy-password -- alice
```

Recovery is a no-op if the current settings already match. Otherwise it restores
only a complete previously verified checkpoint matching the original container
ID, volume creation metadata, both labels, exact mount and binding. It validates
the saved database/student credentials with reads only, refuses a conflicting
backend, and preserves displaced settings in a private `settings.displaced.*.json`
file before atomic restoration. It may start the independently verified database
to perform those reads; it never seeds, migrates, resets passwords, deletes
resources, or adopts a Docker label as an identity.

Without the matching checkpoint/complete original backup, automatic recovery
is refused. Docker labels cannot reconstruct signing keys or student passwords.
Restore the original trusted full settings instead of editing just `instanceId`.
Keep the checkpoint and displaced files private and outside Git/OneDrive.

To see server output directly while developing, first stop the background
sandbox, then run these in two separate PowerShell terminals at the repository
root:

```powershell
# Terminal 1 — automatically starts the owned database if stopped
npm run sandbox:backend
```

```powershell
# Terminal 2 — frontend pinned to the isolated API and ports
npm run sandbox:frontend
```

These foreground commands do not seed or migrate. Stop them with Ctrl+C; do not
run a second backend/frontend on their ports. Source changes require restarting
the foreground backend; Vite reloads frontend changes normally.

## Private state and troubleshooting

Private settings, generated credentials, mailbox, PID records, and logs are in:

```text
%LOCALAPPDATA%\Knoxite\sandbox
```

On Windows the launcher restricts this directory to the current user and SYSTEM.
It is outside OneDrive/the repository. `backend.stderr.log`,
`frontend.stderr.log`, and `setup-error.log` help diagnose failures; do not publish
these files. Startup messages contain no passwords or link tokens.

If setup fails, confirm Docker Desktop is running, ports 3309/5010/5180 are free,
and dependencies/Node are installed. Never resolve a sandbox error by changing
the original `DATABASE_URL`, disabling verification, marking a real user verified,
or deleting an unrelated database/container/volume. Partial schema upgrades stop
for review. The existing `knoxite` database remains outside this workflow.

## Validation commands

```powershell
# Requires the running isolated sandbox; uses actual frontend/backend, no API mocks
npm run test:sandbox

# Optional recovery test: interrupts ONLY the verified synthetic backend,
# checks safe command failures, restarts it, and checks credential preservation.
$env:KNOXITE_TEST_LIFECYCLE = 'true'
npm run test:sandbox -- lifecycle.spec.ts
Remove-Item Env:KNOXITE_TEST_LIFECYCLE

# Optional prepared-replacement isolation test; keeps the original selected.
npm run sandbox:prepare-replacement
$env:KNOXITE_TEST_REPLACEMENT = 'true'
npm run test:sandbox -- replacement.spec.ts
Remove-Item Env:KNOXITE_TEST_REPLACEMENT
npm run sandbox:stop-replacement

# Verify Alice in the installed Chrome engine as well as the default Edge engine.
$env:PLAYWRIGHT_SANDBOX_CHANNEL = 'chrome'
npm run test:sandbox -- authentication.spec.ts --grep 'seeded Alice'
Remove-Item Env:PLAYWRIGHT_SANDBOX_CHANNEL

# Existing browser regressions use their separate mocked API/server configuration
$env:PLAYWRIGHT_BROWSER_CHANNEL = 'msedge'
npm run test:browser
npm run typecheck
npm --prefix knoxite-backend test
```

`test:sandbox` creates a new synthetic student, verifies it through the private
mail capture, signs in, visits protected pages at desktop/mobile sizes, resets
its password, checks old-session rejection, and signs in with the new password.
It does not remove your existing sandbox accounts. Successful login/logout and
account switching no longer consume the login failure budget. Login retains the
existing connection-wide limit of 10 unsuccessful attempts per 15 minutes,
including invalid passwords, malformed credentials and account-policy denials.
Successful sign-ins cannot erase other failed attempts, and server errors do not
consume the budget. Concurrent authentication attempts reserve capacity before
password verification. The page shows the server's remaining cooldown and
prevents duplicate submissions. Registration, email verification, Google and
recovery throttles remain unchanged. Wait for genuine failure cooldowns rather
than disabling security checks. Multi-instance deployments still require
distributed edge limits; proxy trust is not changed by this fix.

Backend integration tests still require an explicitly acknowledged disposable
`_test` database URL; do not use either your original `knoxite` or interactive
sandbox as the integration-test fixture. See `VALIDATION.md` for executed results.
