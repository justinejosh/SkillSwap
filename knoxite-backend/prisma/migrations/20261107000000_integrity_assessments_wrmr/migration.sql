-- AlterTable
ALTER TABLE `User` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL,
    ADD COLUMN `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `programId` VARCHAR(191) NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `yearLevelId` VARCHAR(191) NULL,
    MODIFY `avatarUrl` MEDIUMTEXT NULL;

-- AlterTable
ALTER TABLE `SwapRequest` ADD COLUMN `message` TEXT NULL,
    MODIFY `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `Review` ADD COLUMN `isValidated` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Swap` ADD COLUMN `agreementVersion` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `cancelledAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `integrityVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `receiverApprovedAt` DATETIME(3) NULL,
    ADD COLUMN `requestId` VARCHAR(191) NULL,
    ADD COLUMN `requesterApprovedAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('PENDING_AGREEMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Department_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `YearLevel` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `YearLevel_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserOfferedSkill` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `skillId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tier` ENUM('NOT_ASSESSED', 'AMATEUR', 'VERIFIED') NOT NULL DEFAULT 'NOT_ASSESSED',
    `tierAwardedAt` DATETIME(3) NULL,
    `awardAttemptId` VARCHAR(191) NULL,
    `basicPromptDismissedAt` DATETIME(3) NULL,
    `advancedPromptDismissedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserOfferedSkill_awardAttemptId_key`(`awardAttemptId`),
    INDEX `UserOfferedSkill_skillId_isActive_idx`(`skillId`, `isActive`),
    UNIQUE INDEX `UserOfferedSkill_userId_skillId_key`(`userId`, `skillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentBank` (
    `id` VARCHAR(191) NOT NULL,
    `skillId` VARCHAR(191) NOT NULL,
    `level` ENUM('BASIC', 'ADVANCED') NOT NULL,
    `title` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `AssessmentBank_skillId_level_key`(`skillId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentVersion` (
    `id` VARCHAR(191) NOT NULL,
    `bankId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `questionCount` INTEGER NOT NULL DEFAULT 10,
    `passingPercent` INTEGER NOT NULL DEFAULT 80,
    `durationMinutes` INTEGER NOT NULL DEFAULT 20,
    `maxStarts` INTEGER NOT NULL DEFAULT 3,
    `windowHours` INTEGER NOT NULL DEFAULT 168,
    `cooldownHours` INTEGER NOT NULL DEFAULT 24,
    `learningOutcomes` TEXT NOT NULL,
    `validationNotes` TEXT NULL,
    `validatedById` VARCHAR(191) NULL,
    `validatedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AssessmentVersion_bankId_status_idx`(`bankId`, `status`),
    UNIQUE INDEX `AssessmentVersion_bankId_version_key`(`bankId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentItem` (
    `id` VARCHAR(191) NOT NULL,
    `versionId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    `prompt` TEXT NOT NULL,
    `competency` VARCHAR(191) NOT NULL,
    `rubric` TEXT NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentOption` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `offeringId` VARCHAR(191) NOT NULL,
    `versionId` VARCHAR(191) NOT NULL,
    `level` ENUM('BASIC', 'ADVANCED') NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `status` ENUM('IN_PROGRESS', 'PASSED', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'IN_PROGRESS',
    `passingPercent` INTEGER NOT NULL,
    `policy` JSON NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `gradedAt` DATETIME(3) NULL,
    `earnedPoints` INTEGER NULL,
    `possiblePoints` INTEGER NULL,

    INDEX `AssessmentAttempt_offeringId_level_startedAt_idx`(`offeringId`, `level`, `startedAt`),
    UNIQUE INDEX `AssessmentAttempt_offeringId_level_attemptNumber_key`(`offeringId`, `level`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssessmentAttemptItem` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `optionOrder` JSON NOT NULL,
    `answerOptionId` VARCHAR(191) NULL,
    `awardedPoints` INTEGER NULL,

    UNIQUE INDEX `AssessmentAttemptItem_attemptId_itemId_key`(`attemptId`, `itemId`),
    UNIQUE INDEX `AssessmentAttemptItem_attemptId_position_key`(`attemptId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SessionConfirmation` (
    `id` VARCHAR(191) NOT NULL,
    `swapId` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `sessionNumber` INTEGER NOT NULL,
    `confirmedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SessionConfirmation_swapId_participantId_sessionNumber_key`(`swapId`, `participantId`, `sessionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,

    INDEX `AuthSession_userId_revokedAt_idx`(`userId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,

    UNIQUE INDEX `EmailVerificationToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserReport` (
    `id` VARCHAR(191) NOT NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `resolution` TEXT NULL,
    `resolvedById` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserReport_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SwapSession` (
    `id` VARCHAR(191) NOT NULL,
    `swapId` VARCHAR(191) NOT NULL,
    `sessionNumber` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `meetingLink` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SwapSession_swapId_sessionNumber_key`(`swapId`, `sessionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Program` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `departmentId` VARCHAR(191) NULL,
    `mappingValidatedAt` DATETIME(3) NULL,
    `mappingValidatedById` VARCHAR(191) NULL,
    `mappingNotes` TEXT NULL,
    `mappingVersion` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Program_code_key`(`code`),
    UNIQUE INDEX `Program_label_key`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ProgramYearLevels` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_ProgramYearLevels_AB_unique`(`A`, `B`),
    INDEX `_ProgramYearLevels_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Review_revieweeId_isValidated_idx` ON `Review`(`revieweeId`, `isValidated`);

-- CreateIndex
CREATE UNIQUE INDEX `Review_swapId_reviewerId_key` ON `Review`(`swapId`, `reviewerId`);

-- CreateIndex
CREATE UNIQUE INDEX `Swap_requestId_key` ON `Swap`(`requestId`);

-- AddForeignKey
ALTER TABLE `UserOfferedSkill` ADD CONSTRAINT `UserOfferedSkill_awardAttemptId_fkey` FOREIGN KEY (`awardAttemptId`) REFERENCES `AssessmentAttempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOfferedSkill` ADD CONSTRAINT `UserOfferedSkill_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserOfferedSkill` ADD CONSTRAINT `UserOfferedSkill_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentBank` ADD CONSTRAINT `AssessmentBank_skillId_fkey` FOREIGN KEY (`skillId`) REFERENCES `Skill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentVersion` ADD CONSTRAINT `AssessmentVersion_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `AssessmentBank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentItem` ADD CONSTRAINT `AssessmentItem_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `AssessmentVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentOption` ADD CONSTRAINT `AssessmentOption_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `AssessmentItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentAttempt` ADD CONSTRAINT `AssessmentAttempt_offeringId_fkey` FOREIGN KEY (`offeringId`) REFERENCES `UserOfferedSkill`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentAttempt` ADD CONSTRAINT `AssessmentAttempt_versionId_fkey` FOREIGN KEY (`versionId`) REFERENCES `AssessmentVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentAttemptItem` ADD CONSTRAINT `AssessmentAttemptItem_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `AssessmentAttempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssessmentAttemptItem` ADD CONSTRAINT `AssessmentAttemptItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `AssessmentItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SessionConfirmation` ADD CONSTRAINT `SessionConfirmation_swapId_fkey` FOREIGN KEY (`swapId`) REFERENCES `Swap`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailVerificationToken` ADD CONSTRAINT `EmailVerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserReport` ADD CONSTRAINT `UserReport_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserReport` ADD CONSTRAINT `UserReport_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `Program`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_yearLevelId_fkey` FOREIGN KEY (`yearLevelId`) REFERENCES `YearLevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Swap` ADD CONSTRAINT `Swap_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `SwapRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SwapSession` ADD CONSTRAINT `SwapSession_swapId_fkey` FOREIGN KEY (`swapId`) REFERENCES `Swap`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Program` ADD CONSTRAINT `Program_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProgramYearLevels` ADD CONSTRAINT `_ProgramYearLevels_A_fkey` FOREIGN KEY (`A`) REFERENCES `Program`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ProgramYearLevels` ADD CONSTRAINT `_ProgramYearLevels_B_fkey` FOREIGN KEY (`B`) REFERENCES `YearLevel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve every existing offered-skill association in the new explicit relation.
-- Run the guarded preflight first; A = Skill and B = User in the retained join.
-- Repeating the separate backfill never resets earned tiers or assessment history.
INSERT INTO `UserOfferedSkill` (`id`, `userId`, `skillId`, `isActive`, `tier`, `createdAt`, `updatedAt`)
SELECT UUID(), `B`, `A`, true, 'NOT_ASSESSED', NOW(3), NOW(3) FROM `_OfferedSkills`
ON DUPLICATE KEY UPDATE `isActive` = true;
