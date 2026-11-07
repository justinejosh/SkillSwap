import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { requireLocalDatabase } from "./safeDatabase";
import { requireMigrationDatabase } from "./localRecoverySafety";
export const backendRoot = resolve(
  __dirname,
  __dirname.includes(
    `${require("node:path").sep}dist${require("node:path").sep}`,
  )
    ? "../.."
    : "..",
);
export function prismaCommand(args: string[], accepted = [0]) {
  const result = spawnSync(
    process.execPath,
    [require.resolve("prisma/build/index.js"), ...args],
    {
      cwd: backendRoot,
      env: process.env,
      encoding: "utf8",
      maxBuffer: 10_000_000,
    },
  );
  if (!accepted.includes(result.status ?? -1))
    throw new Error(
      "Prisma operation failed. Review the local schema and migration prerequisites; no automatic reset is performed.",
    );
  return result;
}
export async function preflight(
  db: PrismaClient,
  compareSchema = true,
  approvalFile?: string,
) {
  requireMigrationDatabase(approvalFile);
  const history = await db.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_prisma_migrations'`;
  if (Number(history[0].count)) {
    const failed = await db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
    if (Number(failed[0].count))
      throw new Error(
        "Unresolved migration history found. Reconcile it on the isolated clone before any DDL.",
      );
  }
  if (compareSchema) {
    const diff = prismaCommand(
      [
        "migrate",
        "diff",
        "--from-schema-datasource",
        "prisma/schema.prisma",
        "--to-schema-datamodel",
        "prisma/baseline/pre-upgrade.prisma",
        "--exit-code",
      ],
      [0, 2],
    );
    if (diff.status !== 0)
      throw new Error(
        "Database differs from the audited pre-upgrade schema. Reconcile schema history on a sanitized clone before upgrading.",
      );
  }
  const duplicate = await db.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*) AS count FROM (SELECT swapId, reviewerId FROM Review GROUP BY swapId, reviewerId HAVING COUNT(*) > 1) duplicates`;
  if (Number(duplicate[0].count))
    throw new Error(
      "Duplicate reviews found. Upgrade blocked: preserve original rows and approve a lossless reconciliation first.",
    );
  const statuses = await db.$queryRaw<
    Array<{ status: string }>
  >`SELECT DISTINCT status FROM Swap`;
  if (
    statuses.some(
      (s) =>
        !["PENDING_AGREEMENT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(
          s.status,
        ),
    )
  )
    throw new Error(
      "Unrecognized swap states require explicit reconciliation before enum conversion.",
    );
  const requestStatuses = await db.$queryRaw<
    Array<{ status: string }>
  >`SELECT DISTINCT status FROM SwapRequest`;
  if (
    requestStatuses.some(
      (s) =>
        !["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"].includes(s.status),
    )
  )
    throw new Error(
      "Unrecognized request states require explicit reconciliation.",
    );
  const mapping = await db.$queryRaw<
    Array<{ COLUMN_NAME: string; REFERENCED_TABLE_NAME: string }>
  >`SELECT COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '_OfferedSkills' AND REFERENCED_TABLE_NAME IS NOT NULL`;
  if (
    !mapping.some(
      (m) =>
        m.COLUMN_NAME === "A" &&
        m.REFERENCED_TABLE_NAME.toLowerCase() === "skill",
    ) ||
    !mapping.some(
      (m) =>
        m.COLUMN_NAME === "B" &&
        m.REFERENCED_TABLE_NAME.toLowerCase() === "user",
    )
  )
    throw new Error(
      "Unexpected offered-skill join mapping. Backfill must be reviewed.",
    );
  const counts = await db.$queryRaw<
    Array<Record<string, bigint>>
  >`SELECT (SELECT COUNT(*) FROM User) users, (SELECT COUNT(*) FROM Skill) skills, (SELECT COUNT(*) FROM _OfferedSkills) offerings, (SELECT COUNT(*) FROM _WantedSkills) wants, (SELECT COUNT(*) FROM Swap) swaps, (SELECT COUNT(*) FROM Review) reviews, (SELECT COUNT(*) FROM Message) messages`;
  return Object.fromEntries(
    Object.entries(counts[0]).map(([key, value]) => [key, Number(value)]),
  );
}
if (require.main === module) {
  requireLocalDatabase();
  const db = new PrismaClient();
  preflight(db)
    .then((result) =>
      console.log(JSON.stringify({ preflight: "passed", counts: result })),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
