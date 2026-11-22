-- PREPARED FOR SEPARATE REVIEW. Do not apply to a protected database without approval.
-- Preserve historical fixed durations and schedules. No data updates or backfill.
ALTER TABLE `Swap` MODIFY `duration` INTEGER NULL DEFAULT NULL;
ALTER TABLE `SwapSession` ADD COLUMN `endsAt` DATETIME(3) NULL;
