import { seedAcademicCatalog } from "../services/academics";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backendRoot, preflight, prismaCommand } from "./preflight";
import { backfillOfferings } from "./backfill";
import {
  assertLegacyDataPreserved,
  captureLegacyData,
  readLocalUpgradeApproval,
  requireMigrationDatabase,
} from "./localRecoverySafety";
import { localDatabaseMaintenance } from "../lib/localMaintenance";
async function main() {
  const mode = process.argv[2];
  const approvalFile =
    mode === "upgrade-existing-local"
      ? process.env.KNOXITE_LOCAL_UPGRADE_APPROVAL_FILE
      : undefined;
  if (mode === "upgrade-existing-local" && !approvalFile)
    throw new Error("An explicit private approval file is required.");
  requireMigrationDatabase(approvalFile);
  if (
    mode !== "bootstrap" &&
    mode !== "upgrade" &&
    mode !== "upgrade-existing-local"
  )
    throw new Error("Choose bootstrap or upgrade.");
  const db = new PrismaClient();
  try {
    const proof = approvalFile ? readLocalUpgradeApproval(approvalFile) : null;
    const original = proof
      ? JSON.parse(readFileSync(proof.manifestPath, "utf8"))
      : null;
    if (original) {
      if (!localDatabaseMaintenance())
        throw new Error(
          "Local application maintenance must be active before the existing-database upgrade.",
        );
      const version = await db.$queryRaw<
        Array<{ version: string }>
      >`SELECT VERSION() version`;
      if (version[0].version !== proof.engineVersion)
        throw new Error("The database engine changed after rehearsal.");
      assertLegacyDataPreserved(
        original,
        await captureLegacyData(db, original),
      );
    }
    if (mode === "bootstrap") {
      const tables = await db.$queryRaw<
        Array<{ count: bigint }>
      >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`;
      if (Number(tables[0].count))
        throw new Error("Bootstrap requires an entirely empty local database.");
      prismaCommand([
        "db",
        "execute",
        "--file",
        "prisma/baseline/empty.sql",
        "--schema",
        "prisma/schema.prisma",
      ]);
    } else {
      const before = await preflight(db, true, approvalFile);
      console.log("Preflight passed:", JSON.stringify(before));
      // MySQL DDL is not fully transactional: use a restored clone and take a backup before this step.
      prismaCommand([
        "db",
        "execute",
        "--file",
        "prisma/migrations/20261107000000_integrity_assessments_wrmr/migration.sql",
        "--schema",
        "prisma/schema.prisma",
      ]);
      await backfillOfferings(db, approvalFile);
      const after = await preflight(db, false, approvalFile);
      if (JSON.stringify(before) !== JSON.stringify(after))
        throw new Error(
          "Historical counts changed. Stop rollout and restore the isolated clone backup.",
        );
    }
    await seedAcademicCatalog(db);
    // Historical migrations are preserved. A verified baseline avoids replaying their incomplete chain.
    const exists = await db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`;
    const applied = Number(exists[0].count)
      ? await db.$queryRaw<
          Array<{ migration_name: string }>
        >`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`
      : [];
    for (const migration of readdirSync(
      join(backendRoot, "prisma/migrations"),
      { withFileTypes: true },
    )
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()) {
      if (!applied.some((a) => a.migration_name === migration))
        prismaCommand([
          "migrate",
          "resolve",
          "--applied",
          migration,
          "--schema",
          "prisma/schema.prisma",
        ]);
    }
    const diff = prismaCommand(
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
    if (diff.status !== 0)
      throw new Error("Post-migration schema differs. Do not release.");
    if (original) {
      assertLegacyDataPreserved(
        original,
        await captureLegacyData(db, original),
        true,
      );
      writeFileSync(
        approvalFile!,
        JSON.stringify(
          {
            ...proof,
            consumedAt: new Date().toISOString(),
            originalUpgradePassed: true,
          },
          null,
          2,
        ),
        "utf8",
      );
    }
    console.log(
      "Local database prepared and verified. No historical rows were deleted.",
    );
  } finally {
    await db.$disconnect();
  }
}
if (require.main === module)
  void main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
