import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { backendRoot } from "../../scripts/preflight";

// Historical CLI regressions need their historical target, not today's release
// contract. Copy only compiled dependencies/public schema assets; never dotenv,
// operator profiles or credentials. Database ownership is checked by each caller.
export function legacyCliFixture() {
  const root = mkdtempSync(join(tmpdir(), "knoxite-legacy-cli-"));
  const copied = new Set<string>();
  function copyModule(file: string) {
    if (copied.has(file)) return;
    const rel = relative(backendRoot, file);
    assert.ok(!rel.startsWith("..") && !isAbsolute(rel));
    copied.add(file);
    const target = join(root, rel);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
    if (!file.endsWith(".js")) return;
    for (const match of readFileSync(file, "utf8").matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
      const dependency = resolve(dirname(file), match[1]);
      const found = [dependency + ".js", dependency + ".json", dependency].find(p => existsSync(p));
      assert.ok(found, `Missing historical CLI dependency: ${match[1]}`);
      copyModule(found);
    }
  }
  for (const entry of ["migrate-google", "migrate-local", "backfill"])
    copyModule(join(backendRoot, "dist/scripts", entry + ".js"));
  mkdirSync(join(root, "prisma"));
  for (const directory of ["baseline", "migrations"])
    cpSync(join(backendRoot, "prisma", directory), join(root, "prisma", directory), { recursive: true });
  symlinkSync(join(backendRoot, "node_modules"), join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");

  // The audited pre-Google model plus precisely the Google migration's nullable
  // password and two models. Later consent/activity/session-range fields belong
  // to the separately tested release migration chain, not this legacy upgrade.
  let schema = readFileSync(join(backendRoot, "prisma/baseline/pre-google.prisma"), "utf8").replace(/\r\n/g, "\n");
  const current = readFileSync(join(backendRoot, "prisma/schema.prisma"), "utf8");
  const user = schema.match(/^model User \{[\s\S]*?^\}/m);
  assert.ok(user);
  assert.match(user[0], /^\s*passwordHash\s+String$/m);
  schema = schema.replace(user[0], user[0]
    .replace(/^(\s*passwordHash\s+)String$/m, "$1String?")
    .replace("model User {", "model User {\n  externalIdentities ExternalIdentity[]"));
  for (const model of ["ExternalIdentity", "GoogleAuthChallenge"]) {
    const definition = current.match(new RegExp(`^model ${model} \\{[\\s\\S]*?^\\}`, "m"));
    assert.ok(definition);
    schema += "\n" + definition[0] + "\n";
  }
  writeFileSync(join(root, "prisma/schema.prisma"), schema);
  const localAppData = join(root, "operator");
  mkdirSync(localAppData);
  return {
    root, localAppData,
    dispose() {
      assert.equal(dirname(root), resolve(tmpdir()));
      assert.match(basename(root), /^knoxite-legacy-cli-[\w-]+$/);
      // Unlink the dependency junction first; never traverse the real modules.
      unlinkSync(join(root, "node_modules"));
      for (const child of readdirSync(root)) {
        assert.ok(["dist", "prisma", "operator"].includes(child));
        rmSync(join(root, child), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
      try {
        rmdirSync(root);
      } catch (error: any) {
        // Windows can retain a child process's cwd handle after all files are
        // removed. Never suppress an error if a file/junction remains.
        if (process.platform !== "win32" || error.code !== "EBUSY" || readdirSync(root).length !== 0) throw error;
        console.log("Empty owned test directory retained until Windows releases its handle; all workspace files and dependency junction were removed.");
      }
    },
  };
}
