# Suspension recovery and rollback

November 26, 2026 · dev-justine · local preparation only. No deployment, protected migration or backup is authorized by this document.

## Compatible recovery

Use the complete reviewed suspension-protocol-2 backend with its existing additive schema. From the Render root directory `knoxite-backend`:

```text
Build Command: npm ci && npm run build
Normal Start Command: node dist/index.js
Recovery Start Command: node scripts/start-suspension-recovery.cjs
```

The recovery launcher loads environment configuration, forces `SUSPENSION_CREATION_ENABLED=false`, checks the compiled protocol marker and starts the ordinary application. It does not bypass startup schema, JWT, consent, institutional identity, session timeout or authorization checks. Missing/incompatible artifacts fail closed. Deploy the complete reviewed source/build, never individual replacement files. The protocol marker is a compatibility check, not proof of artifact provenance.

`SUSPENSION_CREATION_ENABLED` accepts only exact `true` or `false`, defaults to **false**, and is read at startup. Explicit `true` is required for normal audited creation. Recovery overrides even an inherited `true`. Both preview and creation, including compatibility DELETE, return 503 while disabled. ADMIN history and ordinary suspension enforcement/expiry remain available. Student Management shows the server's disabled status. Reports preview reports a recoverable error and preserves entered terms.

Expiry still runs on relevant server requests, including fresh password/Google authentication and administrator directory/history access; it needs no awake worker. Only the exact owned temporary restriction with the unchanged enforcement token version is released. Legacy and independently changed restrictions remain blocked. Expiration is audited once; revoked sessions stay revoked and fresh login is required.

## Versions and artifact gate

- **Unsafe after managed suspensions exist:** `b5c1bcead1590e6290ba1c93a0adffe64d688d10` and any backend lacking the ownership-aware reconciliation and audited workflow. Its actual authentication predicate is frozen in the test fixture with its source hash; it rejects a real disposable expired-suspension snapshot indefinitely. This is a predicate comparison, not a claim that the entire old deployment was run.
- The earlier preview-anchored, proof-version-1 local draft is not an approved rollback target. Version-1 confirmations require fresh review under version 2.
- Other historical deploys are **unverified**, not safe merely because they start or tolerate additive columns.
- Approved recovery commit/build/deployment ID: **PENDING**. All current changes are uncommitted. Before enabling creation, separately approve a reviewed commit, preserve its reproducible build/lockfile and record a successfully tested recovery deploy ID, start command and configuration. Confirm artifact availability for the actual Render plan. No retained hosted artifact is assumed.

Render rollback restores the target deployment's start command and individual environment variables as well as its artifact; current environment-group values have different behavior. Changing today's flag alone cannot secure a rollback to an older deployment. Use a verified deployment that already starts the compatible recovery launcher, or build the reviewed compatible source with that launcher. Dashboard and API rollback also differ in auto-deploy behavior. See [Render rollback documentation](https://render.com/docs/rollbacks). Hosted settings have not been inspected or changed in this task.

## Scenarios

| Scenario | Required handling |
| --- | --- |
| A: before migration | Existing deployed application is unchanged. Do not start the new build against missing schema; startup refuses. No down-migration is needed. |
| B: additive migration, old application still active | Columns/tables preserve existing rows, but schema compatibility alone does not make the old reason-free endpoint safe. Hold administrative writes/traffic until the compatible build is active. Compatible recovery startup with zero suspension history is tested locally; the entire old application against this schema is not certified. |
| C: capable backend, no temporary records | Prefer the protocol-2 recovery build with creation off. Do not substitute an unreviewed legacy backend merely because history is empty. |
| D: active temporary suspensions | Block legacy rollback. Use only the pinned compatible recovery build; keep deadlines, history, ownership pointers, token versions and revocations. If no such build is available, hold the release and prepare a compatible forward fix. |
| E: expiry during recovery | A fresh proved-identity login or another reconciliation request expires the owned restriction, writes one event and permits a new login. Independent/legacy restrictions remain. No old session is restored. Real-process disposable tests cover this. |
| F: partial application rollout/failure | Remove incompatible instances from service using separately authorized hosting controls. All serving instances must use the complete compatible build with creation off. Redeploy/restart a known compatible artifact, then validate before reopening. A real disposable process handover is tested; a hosted rolling deployment is not. Never repair a partial rollout by deleting suspension records. |

There is no safe ordinary downgrade to a legacy backend once managed records exist. If compatible recovery cannot be assured, **block rollback and use a compatible forward fix**. Do not leave an old backend serving expired restrictions while waiting for repair.

## Later authorized rollout order

1. Obtain a separate maintenance/release authorization. Verify the staging target, strict certificate/hostname trust and saved UUID using the established private profile. Independently verify a current encrypted backup and disposable restore/preservation evidence; this document does not revive any discontinued backup attempt.
2. Identify and hold all writers using separately approved service controls, drain operations, and record schema/migration/preservation baselines. Never apply against an assumed target. Keep production/recovery-1 untouched.
3. Apply only the existing additive release migration through the reviewed release path and approved migration account. Do not use the incomplete historical chain, reset, db push, or mark migrations applied without execution. Verify the exact SQL checksum, prior checksums, constraints/indexes and preserved rows. Confirm restricted application access to the new tables without granting DDL privileges.
4. Deploy the compatible backend **in recovery mode first**. Render build/start must not run migration commands. Confirm startup readiness, private notices, ADMIN-only history, denied USER access, expired-session rejection and creation 503 through both endpoints. Record the successful compatible recovery artifact/deploy ID before enabling new actions.
5. Deploy the compatible frontend while creation remains off. Check the disabled status, history, reports errors, mobile controls and both themes. Do not serve the new confirmation UI against an old backend contract.
6. After separate operational/policy approval and a recoverable compatible artifact are established, use normal start with explicit `SUSPENSION_CREATION_ENABLED=true`. Smoke-test only authorized synthetic students: preview/cancel, wait then confirm, backend-returned dates/full duration, private identity notice, old-JWT rejection, history and controlled expiry. Do not invent disciplinary records for unrelated students.
7. Reopen only after the owner reviews the evidence. On failure, retain schema/history and use the compatible recovery start. Never automatically clear restrictions or reopen a held service.

## Read-only recovery checks

Use `docs/deployment/suspension-recovery-inspection.sql` only after the established strict TLS/UUID/target preflight. It contains no writes and no student emails/private notes. Verify the schema-presence result before running dependent queries. Encryption shown by SQL is not independent proof of certificate/hostname authentication.

Required suspension migration SHA-256:

```text
87c090e12f74a45d6a820eebbcbd9e96b42a2d37e64483ace72af51f716e5f21
```

The timing/recovery refinement adds no migration and changes no existing migration bytes. Preserve the full preceding release history as well. Expected authoritative migration is `20261126000000_temporary_student_suspensions`.

Check active/overdue counts, ownership/version mismatches and legacy counts without attempting bulk restoration. Then, using authorized test identities, verify wrong-password responses remain generic; active restrictions return a limited notice without login token or private notes; expired owned restrictions permit fresh login; old JWTs remain rejected; USER cannot query ADMIN history. History reads can legitimately trigger audited expiry reconciliation; they are not read-only database diagnostics.

Do not drop suspension tables, remove ownership pointers, decrement token versions, un-revoke sessions, fabricate history, or reactivate legacy/independent restrictions. There is no destructive rollback SQL in this procedure.

## Remaining decisions

Retention/access governance for history/private notes, actual appeal/support instructions and approved privacy-notice coverage still require accountable owner review. No contact, retention period or policy approval is invented. These operational decisions and the future approved recovery artifact are release gates; local tests alone do not establish hosted rollback safety.
