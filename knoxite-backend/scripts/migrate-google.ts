import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { prismaCommand } from "./preflight";
import { requireLocalDatabase } from "./safeDatabase";
import {
  captureLegacyData,
  assertLegacyDataPreserved,
} from "./localRecoverySafety";

export const googleMigration = "20261107010000_google_identity";
// This path intentionally cannot use the earlier exception for localhost/knoxite.
export async function applyGoogleMigration(db: PrismaClient) {
  requireLocalDatabase();
  const existing = await db.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('ExternalIdentity','GoogleAuthChallenge')`;
  if (Number(existing[0].count))
    throw new Error(
      "Google tables already exist or the upgrade is partial. Reconcile the isolated database; no automatic repair is performed.",
    );
  const history = await db.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='_prisma_migrations'`;
  if (Number(history[0].count)) {
    const failures = await db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
    if (Number(failures[0].count))
      throw new Error(
        "Unresolved migration history. Reconcile the isolated clone before any Google schema changes.",
      );
  }
  const check = prismaCommand(
    [
      "migrate",
      "diff",
      "--from-schema-datasource",
      "prisma/schema.prisma",
      "--to-schema-datamodel",
      "prisma/baseline/pre-google.prisma",
      "--exit-code",
    ],
    [0, 2],
  );
  if (check.status !== 0)
    throw new Error(
      "Database differs from the audited pre-Google schema. Stop and reconcile an isolated clone.",
    );
  const before = await captureLegacyData(db);
  prismaCommand([
    "db",
    "execute",
    "--file",
    `prisma/migrations/${googleMigration}/migration.sql`,
    "--schema",
    "prisma/schema.prisma",
  ]);
  assertLegacyDataPreserved(before, await captureLegacyData(db, before));
}

async function main() {
  requireLocalDatabase();
  const db = new PrismaClient();
  try {
    await applyGoogleMigration(db);
    const after = prismaCommand(
      [
        "migrate",
        "diff",
        "--from-schema-datasource",
        "prisma/schema.prisma",
        "--to-schema-datamodel",
        "prisma/schema.prisma",
        "--exit-code",
      ],
      [0, 2],
    );
    if (after.status !== 0)
      throw new Error(
        "Post-upgrade schema differs. Retain the isolated backup and reconcile.",
      );
    prismaCommand([
      "migrate",
      "resolve",
      "--applied",
      googleMigration,
      "--schema",
      "prisma/schema.prisma",
    ]);
    console.log(
      "Isolated Google schema upgrade verified; historical rows fingerprint-matched.",
    );
  } finally {
    await db.$disconnect();
  }
}
if (require.main === module)
  void main().catch(() => {
    console.error(
      "Isolated Google upgrade failed. Check local prerequisites and retain the backup; no automatic reset was performed.",
    );
    process.exitCode = 1;
  });
