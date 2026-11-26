-- PREPARATION ONLY. Run through the established strict TLS/hostname/UUID
-- verified staging profile after separate operator authorization.
-- No connection strings, credentials, student emails or private notes.
SELECT DATABASE() AS selected_database, @@server_uuid AS server_uuid,
       VERSION() AS mysql_version, CURRENT_USER() AS effective_account,
       UTC_TIMESTAMP(3) AS observed_utc;
SHOW SESSION STATUS LIKE 'Ssl_cipher';

-- Stop if target identity differs or the required schema is absent.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'User' AND COLUMN_NAME IN
       ('isSuspended','activeSuspensionId','tokenVersion'))
       OR TABLE_NAME IN ('StudentSuspension','SuspensionAudit'))
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Only continue after presence/readiness and the complete approved migration
-- checksum history have been verified. SQL checksums are Prisma's stored values.
SELECT migration_name, checksum, finished_at, rolled_back_at, applied_steps_count
FROM _prisma_migrations ORDER BY started_at;

SELECT status, COUNT(*) AS history_records FROM StudentSuspension GROUP BY status;
SELECT COUNT(*) AS active_temporary,
       COALESCE(SUM(expiresAt <= UTC_TIMESTAMP(3)),0) AS overdue_for_reconciliation
FROM StudentSuspension WHERE status = 'ACTIVE';
SELECT COUNT(*) AS legacy_or_separately_retained_restrictions
FROM User WHERE isSuspended = TRUE AND activeSuspensionId IS NULL;
SELECT COUNT(*) AS ownership_or_enforcement_mismatches
FROM User u LEFT JOIN StudentSuspension s ON s.id = u.activeSuspensionId
WHERE u.activeSuspensionId IS NOT NULL
  AND (s.id IS NULL OR s.userId <> u.id OR s.status <> 'ACTIVE'
       OR s.enforcedTokenVersion <> u.tokenVersion OR u.role <> 'USER'
       OR u.isSuspended <> TRUE);
SELECT action, COUNT(*) AS audit_events FROM SuspensionAudit GROUP BY action;
-- Counts do not authorize writes or prove that a legacy binary is compatible.
