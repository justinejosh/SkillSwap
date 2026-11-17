// Only the explicitly owned OAuth DB; never invoked by normal startup or Prisma.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), net = require("node:net");
const directory = path.join(process.env.LOCALAPPDATA || "", "Knoxite/google-local");
const DDL = "ALTER TABLE `AuthSession` ADD COLUMN `lastInteractiveAt` DATETIME(3) NULL";
const digest = (x) => crypto.createHash("sha256").update(JSON.stringify(x, (_, v) => typeof v === "bigint" ? String(v) : v)).digest("hex");
const check = (ok, message) => { if (!ok) throw Object.assign(new Error(message), { safeMessage: message }); };
function signed(value, env) { return { value, proof: crypto.createHmac("sha256", env.JWT_SECRET).update(JSON.stringify(value)).digest("hex") }; }
function readPolicy(env, owner) {
  const p = path.join(directory, "session-policy.json"); if (!fs.existsSync(p)) return null;
  const record = JSON.parse(fs.readFileSync(p, "utf8"));
  check(record?.value?.instanceId === owner.instanceId && record.value.baseSchemaHash === owner.schemaHash &&
    record.value.ddlHash === digest(DDL) && record.value.policy === "role-idle-absolute-v1" &&
    record.proof === signed(record.value, env).proof && typeof record.value.enabled === "boolean",
    "Session-policy receipt does not match this verified OAuth instance; no settings changed.");
  return record;
}
async function apiStopped() {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(Object.assign(new Error(), { safeMessage: "Stop only the dedicated OAuth API on 5019 before migration/rollback. No process was stopped." })));
    server.listen(5019, "127.0.0.1", () => server.close(resolve));
  });
}
async function snapshot(db) {
  const identity = await db.$queryRaw`SELECT DATABASE() AS name, CURRENT_USER() AS account, VERSION() AS version`;
  check(identity[0].name === "knoxite_google_local_dev" && identity[0].account.startsWith("knoxite_oauth@"), "Unexpected SQL identity; migration refused.");
  const tables = await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`;
  const columns = await db.$queryRaw`SELECT TABLE_NAME AS t, COLUMN_NAME AS c, COLUMN_TYPE AS ty, IS_NULLABLE AS n, COLUMN_DEFAULT AS d, EXTRA AS e FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION`;
  const rows = {}, counts = {};
  for (const { name } of tables) {
    check(/^[A-Za-z0-9_]+$/.test(name), "Unexpected table identifier; inspection refused.");
    // Names come exclusively from validated information_schema, never user input.
    const data = await db.$queryRawUnsafe("SELECT * FROM `" + name + "`");
    counts[name] = data.length;
    rows[name] = digest(data.map((r) => JSON.stringify(r, (_, v) => typeof v === "bigint" ? String(v) : v)).sort());
  }
  return { identity, columns, rows, counts };
}
function columnState(state) {
  const cols = state.columns.filter((c) => c.t === "AuthSession" && c.c === "lastInteractiveAt");
  check(cols.length <= 1 && (!cols.length || (cols[0].ty.toLowerCase() === "datetime(3)" && cols[0].n === "YES" && cols[0].d === null)), "Conflicting session column; migration refused.");
  return cols.length === 1;
}
function empty(state) {
  check(state.counts.User === 0 && state.counts.AuthSession === 0 && state.counts.GoogleAuthChallenge === 0,
    "Migration/rollback requires zero users, sessions and Google challenges in this dedicated DB. Preserve existing records and request a reviewed nonempty rollout.");
}
async function run(command) {
  const local = require("./oauthLocal.cjs");
  const f = local.verifiedSettings();
  check(!f.config.google.enabled && ["GOOGLE_SIGN_IN_ENABLED", "GOOGLE_WORKSPACE_ACCESS_CONFIRMED", "GOOGLE_ELIGIBILITY_RULES_CONFIRMED", "GOOGLE_SECURITY_REVIEW_CONFIRMED"].every((k) => f.env[k] === "false"), "Google and all activation gates must remain false.");
  const db = local.client(f.env);
  let lock;
  try {
    const before = await snapshot(db); const present = columnState(before);
    if (command === "inspect") {
      console.log(JSON.stringify({ database: before.identity[0].name, version: before.identity[0].version, users: before.counts.User, sessions: before.counts.AuthSession, columnPresent: present, policyEnabled: f.config.sessionTimeouts === true, tableCount: Object.keys(before.counts).length })); return;
    }
    check(["migrate", "disable", "enable"].includes(command), "Use inspect, migrate, disable or enable.");
    await apiStopped(); empty(before);
    lock = fs.openSync(path.join(directory, "session-migration.lock"), "wx", 0o600);
    if (command === "migrate") {
      check(!present && !readPolicy(f.env, f.owner), "Existing session column/receipt: no DDL replay or adoption. Use inspect.");
      const backupName = "session-before-" + Date.now() + ".sql";
      const dumped = local.docker(["exec", local.layout.container, "sh", "-c", 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --user=root --single-transaction --routines --triggers --no-tablespaces --set-gtid-purged=OFF knoxite_google_local_dev']);
      check(dumped.stdout.includes("CREATE TABLE") && dumped.stdout.includes("AuthSession"), "Backup did not complete; no DDL executed.");
      fs.writeFileSync(path.join(directory, backupName), dumped.stdout, { flag: "wx", mode: 0o600 });
      const evidence = { instanceId: f.owner.instanceId, baseSchemaHash: f.owner.schemaHash, ddlHash: digest(DDL), policy: "role-idle-absolute-v1", backupName, backupSha256: digest(dumped.stdout), before, appliedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(directory, "session-migration-intent.json"), JSON.stringify(signed(evidence, f.env), null, 2), { flag: "wx", mode: 0o600 });
      // Exact fixed DDL; no arbitrary schema/target arguments and no data backfill.
      await db.$executeRawUnsafe(DDL);
      const after = await snapshot(db);
      check(columnState(after) && digest(before.rows) === digest(after.rows) && digest(before.counts) === digest(after.counts) &&
        digest(before.columns) === digest(after.columns.filter((c) => !(c.t === "AuthSession" && c.c === "lastInteractiveAt"))),
        "Post-migration preservation failed. Retain private backup/intent; no reset or automatic adoption.");
      const value = { ...evidence, before: undefined, beforeRowsHash: digest(before.rows), afterRowsHash: digest(after.rows), enabled: true };
      // Remove undefined so the proof uses the same canonical serialized object.
      delete value.before;
      fs.writeFileSync(path.join(directory, "session-policy.json"), JSON.stringify(signed(value, f.env), null, 2), { flag: "wx", mode: 0o600 });
      console.log("Applied one nullable session column; all table rows/counts and existing columns preserved. Private backup/intent/signed receipt retained. Local session policy enabled; Google remains false.");
    } else {
      check(present, "No migrated session column; no policy change permitted.");
      const record = readPolicy(f.env, f.owner); check(record, "Missing verified migration receipt.");
      record.value.enabled = command === "enable";
      const value = signed(record.value, f.env);
      const temporary = path.join(directory, "session-policy.pending.json");
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, path.join(directory, "session-policy.json"));
      check(digest(before.rows) === digest((await snapshot(db)).rows), "Unexpected data change during policy-only rollback/activation.");
      console.log(`Policy ${command === "enable" ? "enabled" : "disabled"}; column and all records retained. Google flags unchanged.`);
    }
  } finally { await db.$disconnect(); if (lock !== undefined) { fs.closeSync(lock); fs.unlinkSync(path.join(directory, "session-migration.lock")); } }
}
module.exports = { DDL, digest, signed, readPolicy, columnState, empty, snapshot, run };
if (require.main === module) run(process.argv[2]).catch((e) => { console.error("[SESSION_MIGRATION] " + (e.safeMessage || "Stopped safely; retain private evidence for review. No credentials printed.")); process.exitCode = 1; });
