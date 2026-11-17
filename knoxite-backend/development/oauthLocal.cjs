// Separate opt-in local deployment/diagnostic entry. Never imported by index.ts.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { spawnSync, spawn } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const directory = path.join(process.env.LOCALAPPDATA || "", "Knoxite/google-local");
const layout = Object.freeze({ container: "knoxite-google-local-mysql", volume: "knoxite-google-local-mysql-data", dbPort: 3319, database: "knoxite_google_local_dev", user: "knoxite_oauth", apiPort: 5019, frontendPort: 5181, origin: "http://localhost:5181" });
const label = "knoxite.oauth-local";
const hash = (x) => crypto.createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex");
function ensure(ok, message) { if (!ok) { const e = new Error(message); e.safeMessage = message; throw e; } }
function json(file) { return JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")); }
function privateFile(file, data) { fs.writeFileSync(path.join(directory, file), typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 }); }
function branchGuard() {
  ensure(process.env.NODE_ENV !== "production", "Local OAuth tools are prohibited in production.");
  const r = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", windowsHide: true });
  ensure(r.status === 0 && r.stdout.trim() === "dev-justine", "Use dev-justine in the existing checkout.");
}
function docker(args, required = true) {
  const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
  if (required) ensure(r.status === 0, "Docker operation failed. Existing resources/credentials were retained; inspect locally without printing secrets.");
  return r;
}
function metadata() {
  const c = docker(["inspect", layout.container]), v = docker(["volume", "inspect", layout.volume]);
  return { container: JSON.parse(c.stdout)[0], volume: JSON.parse(v.stdout)[0] };
}
function verifyOwnership(owner, m) {
  const mounts = m.container?.Mounts?.filter((x) => x.Destination === "/var/lib/mysql") || [];
  const ports = m.container?.HostConfig?.PortBindings?.["3306/tcp"] || [];
  ensure(owner?.format === 1 && owner.instanceId && owner.containerId === m.container?.Id && owner.volumeCreatedAt === m.volume?.CreatedAt &&
    m.container.Name === "/" + layout.container && m.container.Config.Image === "mysql:8.4" &&
    m.container.Config.Labels?.[label] === owner.instanceId && m.volume.Name === layout.volume && m.volume.Labels?.[label] === owner.instanceId &&
    mounts.length === 1 && mounts[0].Type === "volume" && mounts[0].Name === layout.volume && mounts[0].RW === true &&
    ports.length === 1 && ports[0].HostIp === "127.0.0.1" && ports[0].HostPort === String(layout.dbPort),
  "Dedicated OAuth database ownership/topology failed. No resources were adopted or reset.");
}
function verifyEnvironment(env) {
  ensure(env.NODE_ENV === "development" && !env.KNOXITE_SYNTHETIC_SANDBOX && env.HOST === "127.0.0.1" && env.PORT === String(layout.apiPort) && env.PUBLIC_APP_URL === layout.origin && env.CORS_ORIGINS === layout.origin,
    "Use the separate fixed local OAuth configuration; protected sandbox policies cannot be changed here.");
  const u = new URL(env.DATABASE_URL);
  ensure(u.protocol === "mysql:" && u.hostname === "127.0.0.1" && u.port === String(layout.dbPort) && u.pathname === "/" + layout.database && u.username === layout.user && !!u.password,
    "Only the dedicated loopback OAuth database is permitted.");
  ensure(env.INSTITUTION_EMAIL_DOMAINS === "student.fatima.edu.ph" && env.CAMPUS_EMAIL_SUFFIX === "lag" && env.EMAIL_VERIFICATION_REQUIRED === "true", "Institutional eligibility and verification must remain enabled.");
  return require(path.join(root, "knoxite-backend/dist/lib/config.js")).loadConfig(env);
}
function pilotEnvironment(env, account) {
  ensure(!account || (typeof account === "object" && !Array.isArray(account) &&
    Object.keys(account).every(key => ["email", "additionalEmails"].includes(key)) &&
    typeof account.email === "string" && (account.additionalEmails === undefined ||
      (Array.isArray(account.additionalEmails) && account.additionalEmails.every(email => typeof email === "string")))),
    "pilot-account.json must contain the original email and an optional additionalEmails array; no credentials, roles or approvals.");
  return { ...env, KNOXITE_LOCAL_OAUTH_PILOT: "true", GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: account?.email || "",
    GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON: JSON.stringify(account?.additionalEmails || []) };
}
function verifiedSettings() {
  branchGuard(); const env = json("environment.json"), owner = json("infrastructure.json");
  verifyOwnership(owner, metadata());
  const receipt = require("./sessionTimeoutMigration.cjs").readPolicy(env, owner);
  const admin = require("./oauthLocalAdmin.cjs").readManifest(directory, env, owner);
  const config = verifyEnvironment({ ...pilotEnvironment(env, fs.existsSync(path.join(directory, "pilot-account.json")) ? json("pilot-account.json") : null),
    KNOXITE_LOCAL_PASSWORD_ADMIN_ID: admin?.value.userId || "", KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: admin?.value.email || "",
    SESSION_TIMEOUTS_ENABLED: receipt?.value.enabled ? "true" : "false" });
  ensure(owner.schemaHash === hash(fs.readFileSync(path.join(root, "knoxite-backend/prisma/schema.prisma"), "utf8")), "Prisma schema changed since provisioning; request an explicit isolated upgrade review.");
  ensure(owner.phase === "complete", "Provisioning is incomplete; no automatic reset or migration is allowed.");
  return { env, owner, config };
}
function client(env) { const { PrismaClient } = require(path.join(root, "knoxite-backend/node_modules/@prisma/client")); return new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } }); }
async function freePort(port) {
  const net = require("node:net");
  await new Promise((resolve, reject) => { const s = net.createServer(); s.once("error", () => reject(Object.assign(new Error(), { safeMessage: `Port ${port} is occupied. No process was stopped.` }))); s.listen(port, "127.0.0.1", () => s.close(resolve)); });
}
async function setup() {
  branchGuard(); fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(path.join(directory, "environment.json"))) { verifiedSettings(); console.log("Existing verified OAuth environment retained; no credentials regenerated or schema reapplied."); return; }
  // Existing resources without complete private ownership proof cannot authorize
  // credential regeneration or adoption, even if their names/ports look right.
  ensure(docker(["info"], false).status === 0, "Docker must be available before creating private credentials.");
  ensure(docker(["inspect", layout.container], false).status !== 0 && docker(["volume", "inspect", layout.volume], false).status !== 0 && !fs.existsSync(path.join(directory, "infrastructure.json")), "An existing resource/checkpoint requires manual review; nothing was replaced.");
  await freePort(layout.dbPort);
  const pending = json("environment.pending.json");
  ensure(pending.GOOGLE_SIGN_IN_ENABLED === "false" && !!pending.GOOGLE_CLIENT_ID && !pending.DATABASE_URL && !pending.JWT_SECRET, "Expected the disabled pending configuration; no configuration overwritten.");
  const instanceId = crypto.randomUUID(), password = crypto.randomBytes(32).toString("base64url"), rootPassword = crypto.randomBytes(32).toString("base64url");
  const env = { ...pending, DATABASE_URL: `mysql://${layout.user}:${password}@127.0.0.1:${layout.dbPort}/${layout.database}`, JWT_SECRET: crypto.randomBytes(48).toString("base64url") };
  verifyEnvironment(env);
  privateFile("environment.json", env);
  privateFile("provision-intent.json", { instanceId, authorizedBy: "User explicitly authorized separate local database provisioning in this chat", createdAt: new Date().toISOString() });
  privateFile("mysql.private.env", `MYSQL_ROOT_PASSWORD=${rootPassword}\nMYSQL_DATABASE=${layout.database}\nMYSQL_USER=${layout.user}\nMYSQL_PASSWORD=${password}\n`);
  console.log("Creating the authorized separate MySQL container/volume; existing sandbox resources are not targeted.");
  docker(["volume", "create", "--label", `${label}=${instanceId}`, layout.volume]);
  const newVolume = JSON.parse(docker(["volume", "inspect", layout.volume]).stdout)[0];
  ensure(newVolume.Labels?.[label] === instanceId, "Volume ownership changed during provisioning; no container was started with it.");
  docker(["run", "--detach", "--name", layout.container, "--label", `${label}=${instanceId}`, "--publish", `127.0.0.1:${layout.dbPort}:3306`, "--mount", `type=volume,source=${layout.volume},target=/var/lib/mysql`, "--env-file", path.join(directory, "mysql.private.env"), "mysql:8.4"]);
  const m = metadata(); const owner = { format: 1, instanceId, containerId: m.container.Id, volumeCreatedAt: m.volume.CreatedAt, phase: "created", schemaHash: hash(fs.readFileSync(path.join(root, "knoxite-backend/prisma/schema.prisma"), "utf8")) };
  verifyOwnership(owner, m); privateFile("infrastructure.json", owner);
  const db = client(env);
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) { try { await db.$queryRaw`SELECT 1`; ready = true; break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
    ensure(ready, "New MySQL did not become ready. Private credentials/resources are retained for review; do not regenerate them.");
    const tables = await db.$queryRaw`SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()`;
    ensure(Number(tables[0].n) === 0, "The dedicated target is not empty; schema creation refused.");
    console.log("Applying the existing Prisma schema to the verified empty OAuth database only...");
    const applied = spawnSync(process.execPath, [path.join(root, "knoxite-backend/node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"], { cwd: path.join(root, "knoxite-backend"), env: { ...process.env, ...env }, encoding: "utf8", windowsHide: true });
    ensure(applied.status === 0, "Fresh OAuth schema creation failed. No existing database or source schema was changed.");
    // Read-only configuration copy, not a copy of users/skills/swaps/content.
    const source = await require("./assessmentDemo.cjs").openVerifiedSandbox();
    try {
      const catalog = require(path.join(root, "knoxite-backend/config/academic-catalog.json"));
      const readAcademics = () => source.db.program.findMany({ where: { code: { in: catalog.programs.map((p) => p.code) } }, include: { department: true, yearLevels: { orderBy: { order: "asc" } } }, orderBy: { code: "asc" } });
      const programs = await readAcademics(); const before = hash(programs);
      ensure(programs.length === 13 && new Set(programs.map((p) => p.departmentId)).size === 9 && programs.every((p) => p.isActive && p.department?.isActive && p.yearLevels.length), "Academic source requires review; no academic defaults were invented.");
      for (const p of programs.filter((p) => ["BSIT", "BSIHM-CA", "BSIHM-HACLO"].includes(p.code))) ensure(p.yearLevels.length === 1 && p.yearLevels[0].order === 1, "Intentional first-year-only source configuration is inconsistent.");
      const departments = new Map(programs.map((p) => [p.department.id, p.department]));
      const years = new Map(programs.flatMap((p) => p.yearLevels.map((y) => [y.id, y])));
      await db.$transaction(async (tx) => {
        await tx.department.createMany({ data: [...departments.values()] });
        await tx.yearLevel.createMany({ data: [...years.values()] });
        for (const p of programs) await tx.program.create({ data: { id: p.id, code: p.code, label: p.label, isActive: p.isActive, departmentId: p.departmentId,
          mappingNotes: "Local OAuth configuration copy from verified synthetic sandbox; no new institutional validation is asserted.",
          yearLevels: { connect: p.yearLevels.map((y) => ({ id: y.id })) } } });
      });
      ensure(hash(await readAcademics()) === before, "Source academic configuration changed concurrently; review required.");
      owner.academicConfigurationHash = before;
    } finally { await source.db.$disconnect(); }
    owner.phase = "complete";
    fs.writeFileSync(path.join(directory, "infrastructure.json"), JSON.stringify(owner, null, 2) + "\n", { mode: 0o600 });
    console.log("Separate OAuth database prepared: 13 programs / nine departments, existing year restrictions preserved. No users or content copied; Google remains disabled.");
  } finally { await db.$disconnect(); }
}
const proof = (env, value) => crypto.createHmac("sha256", env.JWT_SECRET).update(JSON.stringify(value)).digest("hex");
async function backend() {
  const f = verifiedSettings(); await freePort(layout.apiPort);
  // No dotenv or original .env fallback. All mail variables come from this file.
  for (const [key, value] of Object.entries(f.env)) process.env[key] = value;
  const express = require(path.join(root, "knoxite-backend/node_modules/express"));
  const app = express(), db = client(f.env);
  if (f.config.sessionTimeouts) {
    const cols = await db.$queryRaw`SELECT COLUMN_TYPE AS ty, IS_NULLABLE AS n FROM information_schema.columns
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AuthSession' AND COLUMN_NAME = 'lastInteractiveAt'`;
    ensure(cols.length === 1 && cols[0].ty.toLowerCase() === "datetime(3)" && cols[0].n === "YES", "Verified session migration is missing/conflicting; no API started.");
  }
  app.get("/__oauth-local/status", (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(String(req.query.challenge))) return res.sendStatus(400);
    const value = { instanceId: f.owner.instanceId, challenge: req.query.challenge, googleEnabled: f.config.google.enabled, sessionTimeouts: f.config.sessionTimeouts === true };
    res.set("Cache-Control", "no-store").json({ ...value, proof: proof(f.env, value) });
  });
  app.get("/__oauth-local/admin-status", (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(String(req.query.challenge))) return res.sendStatus(400);
    const value = { instanceId: f.owner.instanceId, challenge: req.query.challenge, passwordAdminConfigured: !!f.config.localOAuthPilot?.passwordAdmin };
    res.set("Cache-Control", "no-store").json({ ...value, proof: proof(f.env, value) });
  });
  app.get("/__oauth-local/pilot-status", (req, res) => {
    if (!/^[a-f0-9]{64}$/.test(String(req.query.challenge))) return res.sendStatus(400);
    const pilot = f.config.localOAuthPilot;
    const emails = [pilot.email, ...(pilot.additionalEmails || [])].sort();
    const value = { instanceId: f.owner.instanceId, challenge: req.query.challenge, policy: "local-exact-student-allowlist-v2",
      studentCount: emails.length, allowlistFingerprint: proof(f.env, { purpose: "local-student-list", emails }) };
    res.set("Cache-Control", "no-store").json({ ...value, proof: proof(f.env, value) });
  });
  app.use(require(path.join(root, "knoxite-backend/dist/app.js")).createApp(db, f.config));
  const server = app.listen(layout.apiPort, "127.0.0.1", () => console.log(`Local OAuth application API on 127.0.0.1:${layout.apiPort}; Google enabled: ${f.config.google.enabled}.`));
  process.once("SIGINT", () => server.close(() => void db.$disconnect()));
  process.once("SIGTERM", () => server.close(() => void db.$disconnect()));
}
async function frontend() {
  const f = verifiedSettings(); await freePort(layout.frontendPort);
  const challenge = crypto.randomBytes(32).toString("hex");
  const r = await fetch(`http://127.0.0.1:${layout.apiPort}/__oauth-local/status?challenge=${challenge}`, { redirect: "error", signal: AbortSignal.timeout(3000) });
  const result = await r.json(); const value = { instanceId: result.instanceId, challenge: result.challenge, googleEnabled: result.googleEnabled, sessionTimeouts: result.sessionTimeouts };
  ensure(r.ok && value.instanceId === f.owner.instanceId && value.challenge === challenge && value.googleEnabled === f.config.google.enabled && value.sessionTimeouts === (f.config.sessionTimeouts === true) && result.proof === proof(f.env, value), "Start the matching local OAuth backend first; no foreign API is accepted.");
  const child = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "localhost", "--port", String(layout.frontendPort), "--strictPort"], { cwd: root, stdio: "inherit", windowsHide: true,
    env: { ...process.env, VITE_API_BASE_URL: `http://localhost:${layout.apiPort}/api`, VITE_KNOXITE_SANDBOX: "false", VITE_KNOXITE_SANDBOX_PROFILE: "legacy" } });
  child.once("exit", (code) => { process.exitCode = code || 0; });
}
function inspectClaims(payload, env, nonce) {
  const { studentEmailAllowed, loadConfig } = require(path.join(root, "knoxite-backend/dist/lib/config.js"));
  ensure(["accounts.google.com", "https://accounts.google.com"].includes(payload.iss) && payload.aud === env.GOOGLE_CLIENT_ID && Number.isFinite(payload.exp) && payload.exp > Date.now()/1000 && Number.isFinite(payload.iat) && payload.iat <= Date.now()/1000 + 60 &&
    typeof payload.sub === "string" && /^[\x21-\x7e]{1,255}$/.test(payload.sub) && payload.email_verified === true && typeof payload.email === "string" && studentEmailAllowed(payload.email, loadConfig(env)) &&
    payload.nonce === nonce && typeof payload.hd === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(payload.hd), "Verified institutional claims/nonce were not accepted. No Knoxite access was granted.");
  return { hostedDomain: payload.hd.toLowerCase(), institutionalEmailFormatValid: true, knoxiteAccessGranted: false, note: "Observed signed claim only. Hosted-domain trust and Workspace/college eligibility approval are still required." };
}
async function inspectWorkspace() {
  const f = verifiedSettings(); ensure(!f.config.google.enabled, "Use claim inspection only while application Google authentication remains disabled.");
  await freePort(layout.frontendPort);
  const { googleVerifier } = require(path.join(root, "knoxite-backend/dist/services/googleIdentity.js"));
  const app = inspectionApp(f.env, googleVerifier());
  app.listen(layout.frontendPort, "localhost", () => console.log(`Claim inspection only: ${layout.origin}. No accounts, sessions, token logs or database writes. Press Ctrl+C to stop.`));
}
function inspectionApp(env, verify) {
  ensure(env.GOOGLE_SIGN_IN_ENABLED === "false", "Claim inspection cannot enable application sign-in.");
  const express = require(path.join(root, "knoxite-backend/node_modules/express"));
  const { onlyKeys, text } = require(path.join(root, "knoxite-backend/dist/lib/http.js"));
  const app = express(), challenges = new Map();
  app.use((_req, res, next) => { res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }); next(); });
  app.get("/", (_req, res) => res.type("html").send(probePage(env.GOOGLE_CLIENT_ID)));
  app.use(express.json({ limit: "24kb" }));
  app.use((req, res, next) => { if (req.get("Origin") !== layout.origin || !req.is("application/json")) return res.sendStatus(403); next(); });
  app.use(require(path.join(root, "knoxite-backend/dist/routes/auth.js")).throttle());
  app.post("/challenge", (req, res) => {
    onlyKeys(req.body, ["browserProofHash"]); const browserHash = text(req.body.browserProofHash, "Browser proof", 64); ensure(/^[a-f0-9]{64}$/.test(browserHash), "Invalid browser proof.");
    for (const [key, v] of challenges) if (v.expiresAt <= Date.now()) challenges.delete(key);
    const id = crypto.randomUUID(), nonce = crypto.randomBytes(32).toString("base64url");
    challenges.set(id, { browserHash, nonce, expiresAt: Date.now()+300000, used: false }); res.json({ id, nonce });
  });
  app.post("/inspect", async (req, res) => {
    onlyKeys(req.body, ["id", "browserProof", "credential"]); const saved = challenges.get(text(req.body.id, "Challenge", 100));
    const browserProof = text(req.body.browserProof, "Browser proof", 43);
    ensure(saved && !saved.used && saved.expiresAt > Date.now() && /^[A-Za-z0-9_-]{43}$/.test(browserProof) && saved.browserHash === hash(browserProof), "Inspection challenge expired or was used. Reload to start again.");
    saved.used = true; // Consume before verification, preventing concurrent replay.
    const payload = await verify(text(req.body.credential, "Google credential", 16384), env.GOOGLE_CLIENT_ID);
    res.json(inspectClaims(payload, env, saved.nonce));
  });
  app.use((err, _req, res, _next) => res.status(err.status || 422).json({ error: "Google inspection did not complete. Reload or contact OLFU IT if access is blocked. No Knoxite access was granted." }));
  return app;
}
function probePage(clientId) {
  const id = JSON.stringify(clientId).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Knoxite local Workspace inspection</title><style>body{font:16px system-ui;background:#eff6ff;color:#172554;padding:24px;max-width:680px;margin:auto}main{background:white;border-radius:16px;padding:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><main><h1>Inspect your institutional Workspace claim</h1><p>Local diagnostic only. This does not sign you into Knoxite, create an account or approve a hosted domain. Your Google token is verified in memory and is never logged or saved. Only the observed signed hosted-domain claim is displayed.</p><p>Use your own OLFU institutional account. If Google blocks access, stop and report the error wording without tokens.</p><button id="start">Prepare Google inspection</button><div id="google"></div><pre id="result" role="status"></pre></main><script src="https://accounts.google.com/gsi/client" async defer></script><script>
document.getElementById('start').onclick=async()=>{const out=document.getElementById('result');out.textContent='Preparing...';try{
const secret=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const r=await fetch('/challenge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({browserProofHash:digest})});if(!r.ok)throw Error();const c=await r.json();
if(!window.google)throw Error();google.accounts.id.initialize({client_id:${id},nonce:c.nonce,auto_select:false,callback:async(value)=>{try{const verified=await fetch('/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.id,browserProof:secret,credential:value.credential})});value.credential='';const data=await verified.json();out.textContent=verified.ok?JSON.stringify(data,null,2):'Inspection rejected. No Knoxite access granted. Reload to retry.';}catch{out.textContent='Inspection unavailable. No Knoxite access granted.';}}});const el=document.getElementById('google');el.replaceChildren();google.accounts.id.renderButton(el,{type:'standard',text:'continue_with',theme:'outline',size:'large',width:Math.min(320,el.clientWidth)});out.textContent='Use the Google button when you are ready.';
}catch{out.textContent='Google inspection could not load. Check the authorized origin and Workspace access. No Knoxite access granted.';}};</script></html>`;
}
async function run(command) {
  if (command === "setup") return setup();
  if (command === "database-start") {
    const f = verifiedSettings(); docker(["start", layout.container]); const db = client(f.env);
    try {
      let ready = false;
      for (let i = 0; i < 30; i++) { try { await db.$queryRaw`SELECT 1`; ready = true; break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }
      ensure(ready, "Owned OAuth database did not become ready; credentials/data were retained.");
      console.log("Owned local OAuth database is ready; no schema or credential changes.");
    } finally { await db.$disconnect(); }
    return;
  }
  if (command === "backend") return backend();
  if (command === "frontend") return frontend();
  if (command === "inspect-workspace") return inspectWorkspace();
  if (command === "check") { const f = verifiedSettings(), db = client(f.env); try { await db.$queryRaw`SELECT 1`; console.log(`Verified separate OAuth database; application Google enabled: ${f.config.google.enabled}; no real login attempted.`); } finally { await db.$disconnect(); } return; }
  ensure(false, "Use setup, database-start, check, backend, frontend or inspect-workspace. No arbitrary target arguments are accepted.");
}
module.exports = { verifiedSettings, client, docker, pilotEnvironment, layout, verifyEnvironment, verifyOwnership, inspectClaims, inspectionApp, probePage, run };
if (require.main === module) run(process.argv[2]).catch((e) => { console.error(`[LOCAL_OAUTH] ${e.safeMessage || "Operation failed safely. Verify private configuration/ownership; no credentials printed. No existing data was reset."}`); process.exitCode = 1; });
