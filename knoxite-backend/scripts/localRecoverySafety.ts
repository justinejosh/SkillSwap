import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { requireLocalDatabase } from "./safeDatabase";

export const localBackupRoot = resolve(
  process.env.LOCALAPPDATA || resolve(homedir(), "AppData/Local"),
  "Knoxite/backups",
);
const backendRoot = resolve(
  __dirname,
  __dirname.includes(`${sep}dist${sep}`) ? "../.." : "..",
);
export const upgradeSqlPath = resolve(
  backendRoot,
  "prisma/migrations/20261107000000_integrity_assessments_wrmr/migration.sql",
);
export const fileDigest = (file: string) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
export type LegacyManifest = Record<
  string,
  { columns: string[]; hashes: string[] }
>;
const identifier = (name: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    throw new Error("Unexpected schema identifier; recovery stopped.");
  return `\`${name}\``;
};

export async function captureLegacyData(
  db: PrismaClient,
  template?: LegacyManifest,
): Promise<LegacyManifest> {
  const layout = template
    ? Object.entries(template).flatMap(([table, value]) =>
        value.columns.map((column) => ({ table, column })),
      )
    : (
        await db.$queryRaw<
          Array<{ TABLE_NAME: string; COLUMN_NAME: string }>
        >`SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`
      ).map((r) => ({ table: r.TABLE_NAME, column: r.COLUMN_NAME }));
  const result: LegacyManifest = {};
  for (const row of layout)
    (result[row.table] ??= { columns: [], hashes: [] }).columns.push(
      row.column,
    );
  for (const [table, entry] of Object.entries(result)) {
    const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${entry.columns.map(identifier).join(",")} FROM ${identifier(table)}`,
    );
    entry.hashes = rows
      .map((row) =>
        createHash("sha256")
          .update(
            JSON.stringify(row, (_key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            ),
          )
          .digest("hex"),
      )
      .sort();
  }
  return result;
}
export function assertLegacyDataPreserved(
  before: LegacyManifest,
  after: LegacyManifest,
  allowNewHistory = false,
) {
  for (const [table, expected] of Object.entries(before)) {
    const actual = after[table];
    const matches =
      allowNewHistory && table === "_prisma_migrations"
        ? expected.hashes.every((hash) => actual?.hashes.includes(hash))
        : JSON.stringify(expected.hashes) === JSON.stringify(actual?.hashes);
    if (!matches)
      throw new Error(
        `Historical rows changed in ${table}; stop recovery and retain the backup.`,
      );
  }
}
export function readLocalUpgradeApproval(file: string) {
  const approvedPath = resolve(file);
  if (!approvedPath.startsWith(localBackupRoot + sep))
    throw new Error(
      "Approval evidence must remain in the private local backup directory.",
    );
  const proof = JSON.parse(readFileSync(approvedPath, "utf8"));
  if (
    proof.kind !== "knoxite-local-upgrade-proof-v1" ||
    proof.target !== "localhost:3306/knoxite" ||
    proof.rehearsalPassed !== true ||
    proof.consumedAt ||
    typeof proof.engineVersion !== "string"
  )
    throw new Error("A completed, unused local clone rehearsal is required.");
  for (const key of ["backupPath", "manifestPath"])
    if (
      typeof proof[key] !== "string" ||
      !resolve(proof[key]).startsWith(localBackupRoot + sep)
    )
      throw new Error(
        "Recovery evidence path is outside the private backup directory.",
      );
  if (
    fileDigest(proof.backupPath) !== proof.backupSha256 ||
    fileDigest(proof.manifestPath) !== proof.manifestSha256 ||
    fileDigest(upgradeSqlPath) !== proof.migrationSha256
  )
    throw new Error(
      "Backup, preservation evidence, or reviewed SQL changed after rehearsal.",
    );
  return proof;
}
export function requireMigrationDatabase(approvalFile?: string) {
  if (!approvalFile) return requireLocalDatabase();
  if (
    process.env.NODE_ENV === "production" ||
    process.env.KNOXITE_EXISTING_LOCAL_ACK !==
      "backup-and-clone-reviewed-knoxite"
  )
    throw new Error(
      "Explicit authorization is required for the existing local database.",
    );
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  const url = new URL(value);
  if (
    url.protocol !== "mysql:" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    (url.port || "3306") !== "3306" ||
    url.pathname !== "/knoxite"
  )
    throw new Error(
      "Existing-database recovery is restricted to localhost:3306/knoxite.",
    );
  const branch = spawnSync("git", ["branch", "--show-current"], {
    cwd: backendRoot,
    encoding: "utf8",
  });
  if (branch.status !== 0 || branch.stdout.trim() !== "dev-justine")
    throw new Error("Existing local recovery must run on dev-justine.");
  readLocalUpgradeApproval(approvalFile);
  return value;
}
