-- AlterTable
ALTER TABLE `User` ADD COLUMN `activeSuspensionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StudentSuspension` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `administratorId` VARCHAR(191) NOT NULL,
    `reason` ENUM('HARASSMENT', 'REPEATED_VIOLATIONS', 'FRAUDULENT_EXCHANGE', 'SPAM_MISUSE', 'ELIGIBILITY_VIOLATION', 'OTHER') NOT NULL,
    `reasonExplanation` VARCHAR(500) NULL,
    `studentExplanation` VARCHAR(2000) NOT NULL,
    `privateNotes` VARCHAR(2000) NULL,
    `durationDays` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `enforcedTokenVersion` INTEGER NOT NULL,
    `expiredAt` DATETIME(3) NULL,
    `reactivatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentSuspension_userId_createdAt_id_idx`(`userId`, `createdAt`, `id`),
    INDEX `StudentSuspension_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuspensionAudit` (
    `id` VARCHAR(191) NOT NULL,
    `suspensionId` VARCHAR(191) NOT NULL,
    `action` ENUM('SUSPENDED', 'EXPIRED', 'EXPIRED_RESTRICTION_RETAINED') NOT NULL,
    `actorAdministratorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SuspensionAudit_suspensionId_action_key`(`suspensionId`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_activeSuspensionId_key` ON `User`(`activeSuspensionId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_activeSuspensionId_fkey` FOREIGN KEY (`activeSuspensionId`) REFERENCES `StudentSuspension`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSuspension` ADD CONSTRAINT `StudentSuspension_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentSuspension` ADD CONSTRAINT `StudentSuspension_administratorId_fkey` FOREIGN KEY (`administratorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuspensionAudit` ADD CONSTRAINT `SuspensionAudit_suspensionId_fkey` FOREIGN KEY (`suspensionId`) REFERENCES `StudentSuspension`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuspensionAudit` ADD CONSTRAINT `SuspensionAudit_actorAdministratorId_fkey` FOREIGN KEY (`actorAdministratorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
