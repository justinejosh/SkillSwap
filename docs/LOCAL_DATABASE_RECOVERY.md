# Local registration database recovery plan

## Completed local recovery

**Current Google implementation boundary:** the historical recovery below is
complete. The new Google migration is authorized only for isolated disposable or
sanitized databases. `upgrade-existing-local` is blocked in the current revision;
its old proof cannot authorize changes to the existing `knoxite` database. See
`GOOGLE_SIGN_IN.md` before planning any future upgrade.

The user explicitly authorized the backed-up local upgrade after reviewing this plan. It completed on 2026-11-07. The original `localhost:3306/knoxite` connection was retained; production was not accessed.

The local application was placed in a controlled maintenance window. A backup outside OneDrive/Git was restricted to the current Windows user and SYSTEM. Restoration into a private database on the same MariaDB 10.4.32 server exactly matched every original row fingerprint. The clone's personal fields/content were sanitized, the additive upgrade was rehearsed, and its historical-data preservation and final schema were verified before the original database was upgraded.

All original values and relationships across 11 tables were preserved, including the 4 existing users, 5 skills, 5 offered associations, 3 wanted associations, 1 request, 1 swap, 2 reviews, and 4 messages. These are preservation counts at the maintenance checkpoint, not immutable totals for future activity. Thirteen program records and four year-level records were initialized. No real assessment bank, officially validated department mapping, email verification, or historical consent was fabricated.

Private backup/receipt directory: `%LOCALAPPDATA%\Knoxite\backups\2026-11-07T10-14-40-297Z-7e2edc1f`. Raw backups, environment files, fingerprints, and private logs were not committed. The sanitized rehearsal database was removed; the user's original backend watcher was restored and the exact academic-options URL returned HTTP 200. Real frontend/backend checks verified the signup choices at desktop and mobile widths without creating an actual account.

The generic isolated-database guard remains unchanged. The narrowly scoped original-database mode requires the explicit acknowledgement, verified private backup and rehearsal proof, matching SQL/engine/row fingerprints, `dev-justine`, and local maintenance. Its successful proof is marked consumed. Do not rerun the completed migration against the now-current database.

## Confirmed diagnosis

On 2026-11-07 the user chose to keep `localhost:3306/knoxite`. Read-only checks confirmed that this local XAMPP service is MariaDB 10.4.32 and is reachable. Its 11-table schema exactly matches `prisma/baseline/pre-upgrade.prisma` in a read-only Prisma schema comparison. No student record values were read, exported, or changed during diagnosis.

The database lacks Program, Department, YearLevel, the program/year association table, and the other new authentication/assessment/session/reporting tables. It also lacks the new User academic/verification/session fields, Swap integrity/consent fields, and Review validation field. Current code therefore cannot load academic choices or register a complete new account against that schema. Generating Prisma Client supplies application code/types; it does not update database tables. A health endpoint returning OK establishes process liveness, not schema readiness.

The academic-options URL now returns a recoverable 503 for unavailable schema rather than an opaque 500. Registration disables unavailable choices/submission and offers a retry. Neither the endpoint nor the frontend fabricates IDs, automatically seeds an existing database, or returns hardcoded options that cannot be persisted.

## Authorization at initial diagnosis

Initially the user's instruction was: "Do not make production changes or execute migrations." The first follow-up requested keeping this database and diagnosing the service, so diagnosis was read-only. The later explicit answer, "Authorize the backed-up local upgrade," authorized the completed local procedure above. That answer did not authorize production access, deployments, or changes to `main`.

## Approved recovery procedure

1. Preserve `localhost:3306/knoxite` as the application target. Confirm a maintenance window with no local application writes. Do not access Render, Vercel, or any production database.
2. Inventory data integrity using aggregate counts and the existing preflight rules, including known statuses, duplicate reviews, implicit skill-join direction, and migration-history anomalies. The schema match does not establish that the records pass those checks. Stop on discrepancies; do not delete or rewrite records to force success.
3. Create a restricted local backup outside Git and OneDrive, for example under the user's local application-data directory. Retain the original environment configuration separately without logging credentials. Verify backup completion and restoreability before altering the original database.
4. Restore to an explicitly named disposable local `_clone` database on the same MariaDB version. Rehearse the reviewed additive upgrade in `prisma/migrations/20261107000000_integrity_assessments_wrmr/migration.sql`, offering backfill, academic catalog initialization, and migration-history handling. Compare schema, IDs, associations, counts, and representative synthetic/appropriately sanitized outcomes. Earlier MySQL 8.4 tests are not a claim of MariaDB 10.4 compatibility.
5. The current preparation guard intentionally refuses the unsuffixed name `knoxite`. Do not bypass it with ad-hoc SQL. Any original-database path must be implemented as an explicit, narrowly scoped local-existing-database operation bound to the approved host/port/name, verified backup, successful clone rehearsal, and unchanged preflight results.
6. Apply only the reviewed compatible upgrade after all conditions pass and authorization covers the original local database. MySQL/MariaDB DDL is not fully transactional; stop on failure and use the rehearsed restoration procedure rather than retrying blindly. Never drop/reset the existing database or overwrite the only backup.
7. Verify real persisted academic choices (the exact 13 labels and configured years), registration, session/authentication boundaries, offered/wanted relationships, reciprocal matching, assessments with synthetic content only, agreements, reviews, and analytics. Preserve existing users, skills, associations, swaps, reviews, and messages. Never invent academic values, verified email ownership, historical consent, review legitimacy, or earned tiers.

Official email/campus confirmation, actual mail delivery, department validation, and real assessment banks remain separate requirements. A schema upgrade alone does not make production or student testing ready, and missing mail delivery must not be bypassed by silently verifying real accounts.
