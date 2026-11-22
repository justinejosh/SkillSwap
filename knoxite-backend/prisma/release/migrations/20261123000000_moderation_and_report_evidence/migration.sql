-- Additive only. No historical record or consent is fabricated or rewritten.
CREATE TABLE `AdminAudit` (
  `id` VARCHAR(191) NOT NULL,
  `administratorId` VARCHAR(191) NOT NULL,
  `threadId` VARCHAR(191) NULL,
  `commentId` VARCHAR(191) NULL,
  `commentAuthorId` VARCHAR(191) NULL,
  `reportId` VARCHAR(191) NULL,
  `evidenceId` VARCHAR(191) NULL,
  `action` VARCHAR(32) NOT NULL,
  `reason` VARCHAR(32) NULL,
  `explanation` VARCHAR(250) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `AdminAudit_commentId_key` (`commentId`),
  INDEX `AdminAudit_createdAt_id_idx` (`createdAt`, `id`),
  INDEX `AdminAudit_threadId_createdAt_idx` (`threadId`, `createdAt`),
  INDEX `AdminAudit_reportId_createdAt_idx` (`reportId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReportEvidence` (
  `id` VARCHAR(191) NOT NULL,
  `reportId` VARCHAR(191) NULL,
  `objectKey` VARCHAR(191) NOT NULL,
  `state` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `mimeType` VARCHAR(32) NOT NULL,
  `byteLength` INTEGER NOT NULL,
  `width` INTEGER NOT NULL,
  `height` INTEGER NOT NULL,
  `sha256` CHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ReportEvidence_reportId_key` (`reportId`),
  UNIQUE INDEX `ReportEvidence_objectKey_key` (`objectKey`),
  INDEX `ReportEvidence_state_createdAt_idx` (`state`, `createdAt`),
  CONSTRAINT `ReportEvidence_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `UserReport` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
