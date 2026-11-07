import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import bcrypt from "bcrypt";
import { backendRoot } from "./preflight";
import {
  localBackupRoot,
  captureLegacyData,
  assertLegacyDataPreserved,
  fileDigest,
  upgradeSqlPath,
} from "./localRecoverySafety";
import { localMaintenanceFile } from "../lib/localMaintenance";

async function main() {
  if (
    process.env.KNOXITE_EXISTING_LOCAL_ACK !==
      "backup-and-clone-reviewed-knoxite" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Explicit approved local recovery is required.");
  const source = new URL(process.env.DATABASE_URL || "");
  if (
    source.protocol !== "mysql:" ||
    !["localhost", "127.0.0.1"].includes(source.hostname) ||
    (source.port || "3306") !== "3306" ||
    source.pathname !== "/knoxite"
  )
    throw new Error("Recovery is restricted to localhost:3306/knoxite.");
  const operationId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}`;
  const folder = resolve(localBackupRoot, operationId);
  mkdirSync(folder, { recursive: true });
  const identity = spawnSync("whoami.exe", ["/user", "/fo", "csv", "/nh"], {
    encoding: "utf8",
  });
  const sid = identity.stdout?.match(/S-1-[0-9-]+/)?.[0];
  if (identity.status !== 0 || !sid)
    throw new Error("Cannot identify the local backup owner.");
  const permissions = spawnSync(
    "icacls.exe",
    [
      folder,
      "/inheritance:r",
      "/grant:r",
      `*${sid}:(OI)(CI)F`,
      "*S-1-5-18:(OI)(CI)F",
    ],
    { encoding: "utf8" },
  );
  if (permissions.status !== 0)
    throw new Error(
      "Cannot restrict backup access; recovery stopped before exporting data.",
    );
  const branch = spawnSync("git", ["branch", "--show-current"], {
    cwd: backendRoot,
    encoding: "utf8",
  });
  if (branch.status !== 0 || branch.stdout.trim() !== "dev-justine")
    throw new Error("Recovery must run on dev-justine.");
  mkdirSync(dirname(localMaintenanceFile), { recursive: true });
  writeFileSync(
    localMaintenanceFile,
    JSON.stringify({ operationId, target: "localhost:3306/knoxite" }),
    { flag: "wx" },
  );
  const statusPath = resolve(folder, "operation.json");
  let originalDdlStarted = false;
  let complete = false;
  const original = new PrismaClient();
  let clone: PrismaClient | null = null;
  const cloneName = `knoxite_rehearsal_${randomBytes(8).toString("hex")}_clone`;
  const cloneUrl = new URL(source);
  cloneUrl.pathname = `/${cloneName}`;
  const saveStatus = (phase: string) =>
    writeFileSync(
      statusPath,
      JSON.stringify(
        {
          operationId,
          target: "localhost:3306/knoxite",
          cloneName,
          phase,
          originalDdlStarted,
          at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  const nativeEnv = {
    ...process.env,
    MYSQL_PWD: decodeURIComponent(source.password),
  };
  const connectionArgs = [
    "--protocol=tcp",
    "--host=127.0.0.1",
    "--port=3306",
    `--user=${decodeURIComponent(source.username)}`,
    "--default-character-set=utf8mb4",
  ];
  function child(
    binary: string,
    args: string[],
    logName: string,
    options: { env?: NodeJS.ProcessEnv; input?: Buffer } = {},
  ) {
    const result = spawnSync(binary, args, {
      cwd: backendRoot,
      encoding: "utf8",
      maxBuffer: 10_000_000,
      env: options.env || nativeEnv,
      input: options.input,
    });
    writeFileSync(
      resolve(folder, logName),
      (result.stdout || "") + (result.stderr || ""),
      "utf8",
    );
    if (result.error || result.status !== 0)
      throw new Error(
        `Local recovery step failed (${logName}); original data must not be reset. Private diagnostics retained.`,
      );
  }
  try {
    // Verify that the running local application has entered maintenance before backup/DDL.
    const response = await fetch(
      `http://localhost:${Number(process.env.PORT || 5000)}/api/auth/academic-options`,
      { signal: AbortSignal.timeout(10000) },
    );
    const state = (await response.json()) as { maintenance?: boolean };
    if (response.status !== 503 || state.maintenance !== true)
      throw new Error(
        "The local backend has not entered maintenance. No database upgrade was attempted.",
      );
    saveStatus("maintenance-confirmed");
    const version = await original.$queryRaw<
      Array<{ version: string }>
    >`SELECT VERSION() version`;
    if (version[0].version !== "10.4.32-MariaDB")
      throw new Error(
        "Unexpected engine version; review compatibility before recovery.",
      );
    const engines = await original.$queryRaw<
      Array<{ ENGINE: string }>
    >`SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`;
    if (engines.some((t) => t.ENGINE !== "InnoDB"))
      throw new Error(
        "A transactional backup requires additional review for non-InnoDB tables.",
      );
    const automation = await original.$queryRaw<
      Array<{ triggers: bigint; routines: bigint; events: bigint }>
    >`SELECT (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()) triggers,(SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE()) routines,(SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) events`;
    if (Object.values(automation[0]).some((n) => Number(n)))
      throw new Error(
        "Database automation requires separate restoration review.",
      );
    const initial = await captureLegacyData(original);
    const manifestPath = resolve(folder, "original-data-fingerprints.json");
    writeFileSync(manifestPath, JSON.stringify(initial, null, 2), "utf8");
    copyFileSync(resolve(backendRoot, ".env"), resolve(folder, "backend.env"));
    const backupPath = resolve(folder, "knoxite-before-upgrade.sql");
    child(
      "C:\\xampp\\mysql\\bin\\mysqldump.exe",
      [
        ...connectionArgs,
        "--single-transaction",
        "--quick",
        "--skip-lock-tables",
        "--hex-blob",
        "--routines",
        "--events",
        "--triggers",
        `--result-file=${backupPath}`,
        "knoxite",
      ],
      "backup.log",
    );
    const dump = readFileSync(backupPath);
    if (
      !dump.length ||
      /^(?:USE\s|CREATE\s+DATABASE\b|DROP\s+DATABASE\b)/im.test(
        dump.toString("utf8"),
      )
    )
      throw new Error(
        "Backup is empty or contains database-selection statements; restoration stopped.",
      );
    assertLegacyDataPreserved(
      initial,
      await captureLegacyData(original, initial),
    );
    const exists = await original.$queryRaw<
      Array<{ n: bigint }>
    >`SELECT COUNT(*) n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=${cloneName}`;
    if (
      Number(exists[0].n) ||
      !/^knoxite_rehearsal_[a-f0-9]{16}_clone$/.test(cloneName)
    )
      throw new Error("Unexpected clone namespace.");
    await original.$executeRawUnsafe(
      `CREATE DATABASE \`${cloneName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    child(
      "C:\\xampp\\mysql\\bin\\mysql.exe",
      [...connectionArgs, `--database=${cloneName}`],
      "restore.log",
      { input: dump },
    );
    clone = new PrismaClient({
      datasources: { db: { url: cloneUrl.toString() } },
    });
    assertLegacyDataPreserved(initial, await captureLegacyData(clone, initial));
    saveStatus("backup-restoration-verified");

    // Sanitize only the private clone; relationship IDs remain available for preservation checks.
    const hash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
    const users = await clone.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM User`;
    for (const user of users) {
      const alias = createHash("sha256")
        .update(user.id)
        .digest("hex")
        .slice(0, 32);
      await clone.$executeRaw`UPDATE User SET name=${`Clone student ${alias.slice(0, 8)}`},email=${`clone-${alias}lag@rehearsal.invalid`},passwordHash=${hash},bio=NULL,gender=NULL,avatarUrl=NULL,location=NULL WHERE id=${user.id}`;
    }
    await clone.$executeRaw`UPDATE Message SET content='Sanitized clone message'`;
    await clone.$executeRaw`UPDATE Review SET comment=NULL`;
    await clone.$executeRaw`UPDATE BoardPost SET looking='Sanitized clone listing',offering='Sanitized clone listing',description='Sanitized clone text'`;
    await clone.$executeRaw`UPDATE Post SET title='Sanitized clone post',content='Sanitized clone text'`;
    await clone.$executeRaw`UPDATE Comment SET content='Sanitized clone comment'`;
    await clone.$executeRaw`UPDATE SwapRequest SET meetingLink=NULL`;
    const sanitized = await captureLegacyData(clone);
    child(
      process.execPath,
      [
        require.resolve("ts-node/dist/bin.js"),
        "--prefer-ts-exts",
        "scripts/migrate-local.ts",
        "upgrade",
      ],
      "rehearsal-upgrade.log",
      {
        env: {
          ...process.env,
          DATABASE_URL: cloneUrl.toString(),
          KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
        },
      },
    );
    assertLegacyDataPreserved(
      sanitized,
      await captureLegacyData(clone, sanitized),
      true,
    );
    if (
      (await clone.program.count()) !== 13 ||
      (await clone.yearLevel.count()) !== 4
    )
      throw new Error("Academic catalog rehearsal failed.");
    saveStatus("sanitized-clone-upgrade-verified");

    const approvalPath = resolve(folder, "approved-local-upgrade.json");
    writeFileSync(
      approvalPath,
      JSON.stringify(
        {
          kind: "knoxite-local-upgrade-proof-v1",
          target: "localhost:3306/knoxite",
          engineVersion: version[0].version,
          approvalSource:
            "Explicit user authorization in this conversation on 2026-11-07",
          backupPath,
          backupSha256: fileDigest(backupPath),
          manifestPath,
          manifestSha256: fileDigest(manifestPath),
          migrationSha256: fileDigest(upgradeSqlPath),
          rehearsalPassed: true,
        },
        null,
        2,
      ),
      "utf8",
    );
    assertLegacyDataPreserved(
      initial,
      await captureLegacyData(original, initial),
    );
    originalDdlStarted = true;
    saveStatus("applying-approved-original-upgrade");
    child(
      process.execPath,
      [
        require.resolve("ts-node/dist/bin.js"),
        "--prefer-ts-exts",
        "scripts/migrate-local.ts",
        "upgrade-existing-local",
      ],
      "original-upgrade.log",
      {
        env: {
          ...process.env,
          DATABASE_URL: source.toString(),
          KNOXITE_LOCAL_UPGRADE_APPROVAL_FILE: approvalPath,
        },
      },
    );
    assertLegacyDataPreserved(
      initial,
      await captureLegacyData(original, initial),
      true,
    );
    if (
      (await original.program.count()) !== 13 ||
      (await original.yearLevel.count()) !== 4
    )
      throw new Error("Original academic catalog verification failed.");
    const proof = JSON.parse(readFileSync(approvalPath, "utf8"));
    if (!proof.originalUpgradePassed || !proof.consumedAt)
      throw new Error("Original upgrade evidence is incomplete.");
    complete = true;
    saveStatus("original-upgrade-and-preservation-verified");
    await clone.$disconnect();
    clone = null;
    await original.$executeRawUnsafe(`DROP DATABASE \`${cloneName}\``);
    console.log(
      JSON.stringify({
        recovery: "passed",
        target: "localhost:3306/knoxite",
        backupDirectory: folder,
        preservedTables: Object.keys(initial).length,
        programs: 13,
        yearLevels: 4,
        cloneRemoved: true,
      }),
    );
  } finally {
    if (clone) await clone.$disconnect();
    await original.$disconnect();
    if ((complete || !originalDdlStarted) && existsSync(localMaintenanceFile)) {
      const marker = JSON.parse(readFileSync(localMaintenanceFile, "utf8"));
      if (marker.operationId === operationId) unlinkSync(localMaintenanceFile);
    }
  }
}
if (require.main === module)
  void main().catch((error) => {
    const code = error?.code ?? error?.errorCode;
    console.error(
      code
        ? `Local recovery failed (${String(code)}); private evidence retained.`
        : error instanceof Error
          ? error.message
          : "Local recovery failed; review private operation evidence.",
    );
    process.exitCode = 1;
  });
