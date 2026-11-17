-- Exact shared-schema preflight required; never an unknown legacy database.
-- AlterTable
ALTER TABLE `AuthSession` ADD COLUMN `lastInteractiveAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `RegistrationConsent` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `noticeVersion` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RegistrationConsent_userId_noticeVersion_key`(`userId`, `noticeVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegistrationConsent` ADD CONSTRAINT `RegistrationConsent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

