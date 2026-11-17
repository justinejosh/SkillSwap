import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { privateSandbox } from "./state";

// Opt-in: interrupts only the signed, owned synthetic backend. Never seeds,
// migrates, resets data, or targets the ordinary backend/database.
test("owned backend exit recovers with stable credentials and idempotent startup", async () => {
  test.skip(process.env.KNOXITE_TEST_LIFECYCLE !== "true", "Explicit isolated lifecycle test opt-in required");
  test.setTimeout(180000);
  const root = process.cwd();
  const require = createRequire(join(root, "package.json"));
  const launcher = join(root, "knoxite-backend/development/sandbox.cjs");
  const { backendStatus } = require(launcher);
  const { directory } = privateSandbox();
  const file = join(directory, "settings.json");
  const original = readFileSync(file);
  const settings = JSON.parse(original.toString("utf8"));
  const command = (name: string) => new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [launcher, name], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", () => reject(new Error("Sandbox test subprocess could not start")));
    child.on("close", (code) => resolve({ code, output }));
  });
  const before = await backendStatus(settings);
  expect(before.state).toBe("ready");
  const record = JSON.parse(readFileSync(join(directory, "processes.json"), "utf8")).backend;
  expect(record.entry === join(root, "knoxite-backend/dist/development/server.js")).toBe(true);
  expect(record.pid === before.pid).toBe(true);
  const { PrismaClient } = require(join(root, "knoxite-backend/node_modules/@prisma/client"));
  const { requireSyntheticEnvironment } = require(join(root, "knoxite-backend/dist/development/safety.js"));
  const db = new PrismaClient({ datasources: { db: { url: requireSyntheticEnvironment(settings.environment) } } });
  const snapshot = () => db.user.findMany({ orderBy: { id: "asc" }, select: { id: true, email: true, passwordHash: true, emailVerifiedAt: true, role: true, isSuspended: true } });
  const accountsBefore = JSON.stringify(await snapshot());
  let interrupted = false;
  try {
    process.kill(record.pid);
    interrupted = true;
    for (let i = 0; i < 30 && (await backendStatus(settings)).state !== "missing"; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    for (const name of ["check", "accounts", "copy-password"]) {
      const failed = await command(name);
      expect(failed.code).toBe(1);
      expect(failed.output.includes("BACKEND_UNAVAILABLE")).toBe(true);
      expect(settings.accounts.some((a: any) => failed.output.includes(a.password))).toBe(false);
    }
    expect((await command("start")).code).toBe(0);
    interrupted = false;
    const recovered = await backendStatus(settings);
    expect(recovered.state).toBe("ready");
    expect(recovered.pid !== before.pid).toBe(true);
    for (const name of ["start", "check", "accounts", "copy-password"]) {
      const result = await command(name);
      expect(result.code).toBe(0);
      // The explicit accounts command is captured privately, never printed.
      expect(settings.accounts.every((a: any) => result.output.includes(a.password))).toBe(name === "accounts");
    }
    expect((await backendStatus(settings)).pid).toBe(recovered.pid);
    expect(readFileSync(file).equals(original)).toBe(true);
    expect(JSON.stringify(await snapshot()) === accountsBefore).toBe(true);
  } finally {
    if (interrupted) await command("start");
    await db.$disconnect();
  }
});
