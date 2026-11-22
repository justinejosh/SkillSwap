-- Additive only. Historical confirmation/audit times remain unchanged.
-- NULL means no separately recorded actual completion time for an old record.
ALTER TABLE `SessionConfirmation` ADD COLUMN `actualCompletedAt` DATETIME(3) NULL;
