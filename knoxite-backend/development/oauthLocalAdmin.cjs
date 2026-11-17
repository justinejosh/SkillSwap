// Explicit local operator provisioning only. Never mounted as an HTTP route.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const directory = () => path.join(process.env.LOCALAPPDATA || "", "Knoxite/google-local");
const filename = "local-admin.private.json";
function check(ok, message) { if (!ok) throw Object.assign(new Error(message), { safeMessage: message }); }
function sign(value, env) { return crypto.createHmac("sha256", env.JWT_SECRET).update("knoxite-local-password-admin-v1\n" + JSON.stringify(value)).digest("hex"); }
function verifyManifest(record, env, owner) {
  const v = record?.value;
  check(v?.format === 1 && v.instanceId === owner.instanceId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v.userId || "") &&
    /^admin-[0-9a-f]{16}@admin\.knoxite\.test$/.test(v.email || "") &&
    typeof v.passwordCiphertext === "string" && v.passwordCiphertext.length >= 100 && /^[A-Za-z0-9+/]+={0,2}$/.test(v.passwordCiphertext) &&
    typeof v.createdAt === "string" && Number.isFinite(Date.parse(v.createdAt)), "The local administrator manifest is incomplete or belongs to another instance.");
  const expected = sign(v, env);
  check(typeof record.proof === "string" && record.proof.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(record.proof), Buffer.from(expected)), "Local administrator manifest signature mismatch; no account was changed.");
  return record;
}
function readManifest(folder, env, owner) {
  const file = path.join(folder, filename);
  return fs.existsSync(file) ? verifyManifest(JSON.parse(fs.readFileSync(file, "utf8")), env, owner) : null;
}
function protect(password) {
  check(process.platform === "win32", "Provision credentials from the authorized Windows user's terminal.");
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "$ErrorActionPreference='Stop'; [void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); try { [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))) } finally { [Array]::Clear($b,0,$b.Length) }"],
    { input: password, encoding: "utf8", windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }).trim();
}
function unprotect(ciphertext) {
  check(process.platform === "win32", "Use the same Windows user that provisioned the local administrator.");
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    "$ErrorActionPreference='Stop'; [void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([Console]::In.ReadToEnd()),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); try { [Console]::Write([Text.Encoding]::UTF8.GetString($b)) } finally { [Array]::Clear($b,0,$b.Length) }"],
    { input: ciphertext, encoding: "utf8", windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
}
const digest = x => crypto.createHash("sha256").update(JSON.stringify(x, (_, v) => typeof v === "bigint" ? String(v) : v)).digest("hex");
async function snapshot(db, excludeUserId) {
  const tables = await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`;
  const result = {};
  for (const { name } of tables) {
    check(/^[A-Za-z0-9_]+$/.test(name), "Unexpected table identifier; no change attempted.");
    const rows = await db.$queryRawUnsafe("SELECT * FROM `" + name + "`");
    result[name] = digest(rows.filter(r => name !== "User" || r.id !== excludeUserId)
      .map(r => JSON.stringify(r, (_, v) => typeof v === "bigint" ? String(v) : v)).sort());
  }
  return result;
}
async function open() {
  const local = require("./oauthLocal.cjs"), f = local.verifiedSettings();
  check(f.config.localOAuthPilot?.email && f.config.sessionTimeouts === true, "The private pilot account and signed session policy must be configured.");
  const db = local.client(f.env);
  try {
    const rows = await db.$queryRaw`SELECT DATABASE() AS name, CURRENT_USER() AS account`;
    check(rows[0].name === "knoxite_google_local_dev" && rows[0].account.startsWith("knoxite_oauth@"), "Dedicated SQL identity failed.");
    const student = await db.user.findUnique({ where: { email: f.config.localOAuthPilot.email }, include: { externalIdentities: true } });
    check(student?.role === "USER" && student.emailVerifiedAt && !student.isSuspended && student.externalIdentities.some(i => i.provider === "GOOGLE"), "The existing verified Google student must remain a distinct student account.");
    return { ...f, db, studentId: student.id };
  } catch (e) { await db.$disconnect(); throw e; }
}
async function credentials(f) {
  const record = readManifest(directory(), f.env, f.owner);
  check(record, "Run oauth:admin:setup once from your local terminal.");
  const user = await f.db.user.findUnique({ where: { id: record.value.userId } });
  check(user?.email === record.value.email && user.role === "ADMIN" && user.id !== f.studentId &&
    user.emailVerifiedAt && !user.isSuspended && user.passwordHash &&
    await f.db.externalIdentity.count({ where: { userId: user.id } }) === 0, "Provisioned administrator identity changed; no credentials copied or account overwritten.");
  const password = unprotect(record.value.passwordCiphertext);
  const bcrypt = require(path.join(root, "knoxite-backend/node_modules/bcrypt"));
  check(await bcrypt.compare(password, user.passwordHash), "The initial password no longer matches. It will not be reset automatically.");
  return { user, password };
}
async function apiCheck(f, account) {
  const challenge = crypto.randomBytes(32).toString("hex");
  const r = await fetch("http://127.0.0.1:5019/__oauth-local/admin-status?challenge=" + challenge, { redirect: "error", signal: AbortSignal.timeout(5000) });
  check(r.ok, "Restart only the dedicated OAuth backend in its original terminal to load the administrator configuration.");
  const status = await r.json(), value = { instanceId: status.instanceId, challenge: status.challenge, passwordAdminConfigured: status.passwordAdminConfigured };
  const expected = crypto.createHmac("sha256", f.env.JWT_SECRET).update(JSON.stringify(value)).digest("hex");
  check(status.instanceId === f.owner.instanceId && status.challenge === challenge && status.passwordAdminConfigured === true && typeof status.proof === "string" && status.proof.length === expected.length && crypto.timingSafeEqual(Buffer.from(status.proof), Buffer.from(expected)), "Running API administrator ownership/configuration proof failed.");
  let token;
  const call = async (method, route, body, expectedStatus) => {
    const response = await fetch("http://127.0.0.1:5019/api" + route, { method, redirect: "error", signal: AbortSignal.timeout(10000),
      headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    check(response.status === expectedStatus, "Local administrator verification failed; inspect status without credentials.");
    return response.json();
  };
  try {
    const login = await call("POST", "/auth/login", { email: account.user.email, password: account.password }, 200);
    token = login.token;
    check(login.user.id === account.user.id && login.user.role === "ADMIN" && !login.user.passwordHash, "Unexpected login identity.");
    await call("GET", "/admin/assessments", undefined, 200);
    const timing = await call("GET", "/auth/session-status", undefined, 200);
    check(timing.enabled && Math.abs(Date.parse(timing.idleExpiresAt) - Date.parse(timing.serverNow) - 15 * 60_000) < 10000 &&
      Math.abs(Date.parse(timing.absoluteExpiresAt) - Date.parse(timing.serverNow) - 4 * 3600_000) < 10000, "Administrator session deadlines do not match the approved policy.");
    const offering = await f.db.userOfferedSkill.findFirst({ where: { userId: f.studentId }, select: { id: true } });
    if (offering) await call("GET", "/assessments/offerings/" + offering.id, undefined, 403);
    await call("POST", "/auth/logout", {}, 200);
    await call("GET", "/admin/assessments", undefined, 401);
    token = null;
  } finally {
    if (token) { try { await call("POST", "/auth/logout", {}, 200); } catch {} }
  }
}
async function run(command) {
  check(["setup", "copy-password", "check"].includes(command), "Use setup, copy-password or check.");
  const f = await open();
  try {
    if (command === "setup") {
      let record = readManifest(directory(), f.env, f.owner);
      if (!record) {
        check(await f.db.user.count({ where: { role: "ADMIN" } }) === 0, "An administrator already exists without this manifest; no duplicate created.");
        const value = { format: 1, instanceId: f.owner.instanceId, userId: crypto.randomUUID(), email: "admin-" + crypto.randomBytes(8).toString("hex") + "@admin.knoxite.test",
          createdAt: new Date().toISOString(), purpose: "User-authorized local password administrator only; not institutional mailbox verification", passwordCiphertext: protect(crypto.randomBytes(36).toString("base64url")) };
        record = { value, proof: sign(value, f.env) };
        fs.writeFileSync(path.join(directory(), filename), JSON.stringify(record, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      }
      const existing = await f.db.user.findUnique({ where: { id: record.value.userId } });
      if (!existing) {
        check(await f.db.user.count({ where: { OR: [{ email: record.value.email }, { role: "ADMIN" }] } }) === 0, "An existing identity conflicts with local provisioning; no account overwritten.");
        const password = unprotect(record.value.passwordCiphertext), bcrypt = require(path.join(root, "knoxite-backend/node_modules/bcrypt"));
        const passwordHash = await bcrypt.hash(password, 12);
        const preserved = await f.db.$transaction(async tx => {
          const before = await snapshot(tx, record.value.userId);
          await tx.user.create({ data: { id: record.value.userId, name: "Local OAuth Administrator", email: record.value.email, role: "ADMIN", passwordHash, emailVerifiedAt: new Date() } });
          check(JSON.stringify(before) === JSON.stringify(await snapshot(tx, record.value.userId)), "Unexpected existing-record change; provisioning rolled back.");
          return before;
        }, { isolationLevel: "Serializable", timeout: 30000 });
        fs.writeFileSync(path.join(directory(), "local-admin-preservation.private.json"), JSON.stringify({ at: new Date().toISOString(), instanceId: f.owner.instanceId, existingTables: preserved, onlyNewAdminUserAdded: true }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      }
      await credentials(f);
      console.log("Separate local administrator ready. Existing students, sessions and content retained. No password printed. Restart only the dedicated OAuth backend, then run oauth:admin:check and oauth:admin:copy-password.");
    } else {
      const account = await credentials(f);
      if (command === "check") {
        await apiCheck(f, account);
        console.log("Verified password login, ADMIN assessment access, 15-minute idle / 4-hour absolute deadlines, student assessment privacy and logout revocation. Google student account unchanged.");
      } else {
        execFileSync("clip.exe", [], { input: account.password, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
        console.log("Local administrator email: " + account.user.email + "\nPassword copied privately to clipboard. Paste at http://localhost:5181/login. No password printed.");
      }
    }
  } finally { await f.db.$disconnect(); }
}
module.exports = { readManifest, verifyManifest, sign, open, credentials, snapshot, run };
if (require.main === module) run(process.argv[2]).catch(e => { console.error(e.safeMessage || "Local administrator operation failed safely. No credentials printed. Existing accounts were not reset."); process.exitCode = 1; });
