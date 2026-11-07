-- AlterTable
ALTER TABLE `User` MODIFY `passwordHash` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ExternalIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `subject` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `verifiedEmail` VARCHAR(191) NOT NULL,
    `hostedDomain` VARCHAR(191) NOT NULL,
    `policyVersion` VARCHAR(191) NOT NULL,
    `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastVerifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ExternalIdentity_provider_subject_key`(`provider`, `subject`),
    UNIQUE INDEX `ExternalIdentity_userId_provider_key`(`userId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoogleAuthChallenge` (
    `id` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(16) NOT NULL,
    `nonceHash` CHAR(64) NOT NULL,
    `browserProofHash` CHAR(64) NOT NULL,
    `policyVersion` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `tokenVersion` INTEGER NULL,
    `subject` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
    `verifiedEmail` VARCHAR(191) NULL,
    `hostedDomain` VARCHAR(191) NULL,
    `displayName` VARCHAR(100) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GoogleAuthChallenge_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ExternalIdentity` ADD CONSTRAINT `ExternalIdentity_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

