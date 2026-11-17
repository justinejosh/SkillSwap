// Local CLI only. Never imported by the application or deployed entry point.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const net = require("node:net");
const crypto = require("node:crypto");
const identity = require("./identity.cjs");
const databaseIdentity = require("./databaseIdentity.cjs");
const profiles = require("./sandboxProfiles.cjs");
const relocation = require("./relocation.cjs");
const { spawn, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const backend = path.join(root, "knoxite-backend");
const baseDirectory = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), ".local/share"),
  "Knoxite",
  "sandbox",
);
const selectionPath = path.join(baseDirectory, "active-profile.json");
const pendingPath = path.join(baseDirectory, "pending-replacement.json");
let profile, directory, configPath, processesPath, checkpointPath, container, volume;
function selectProfile(name) {
  if (typeof name !== "string") throw new Error("The active sandbox selection is invalid; refusing an implicit profile fallback.");
  profile = profiles.layout(name);
  directory = path.join(baseDirectory, profile.folder);
  configPath = path.join(directory, "settings.json");
  processesPath = path.join(directory, "processes.json");
  checkpointPath = path.join(directory, "settings.verified.json");
  container = profile.container; volume = profile.volume;
}
selectProfile("legacy");
const secret = () => crypto.randomBytes(32).toString("base64url");
let typeScriptRegistered = false;
function registerTypeScript() {
  if (typeScriptRegistered) return;
  require("ts-node").register({ project: path.join(backend, "tsconfig.json") });
  typeScriptRegistered = true;
}
class SandboxError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function failureMessage(error) {
  const dbCode = error?.code || error?.errorCode;
  if (["P1001", "P1002", "P1003", "P1017"].includes(dbCode))
    return "[DATABASE_UNAVAILABLE] The selected isolated MySQL is unavailable. Run sandbox:start and wait for readiness; do not change the original database URL.";
  if (dbCode === "P1000")
    return "[DATABASE_CREDENTIAL_MISMATCH] Private settings do not match the isolated database credentials. Retain the volume and matching settings; no reset is automatic.";
  if (error instanceof SandboxError) return `[${error.code}] ${error.message}`;
  if (error?.code === "ENOENT")
    return "[FILE_OR_COMMAND_MISSING] A required file or executable is missing. Run sandbox:setup for first use and check installed dependencies.";
  if (error?.code === "EACCES" || error?.code === "EPERM")
    return "[LOCAL_ACCESS_DENIED] This Windows user cannot access a required sandbox file/process. Use the same Windows account that created the sandbox.";
  return "[LOCAL_COMMAND_FAILED] A local command failed. Inspect the redacted setup-error.log in the private sandbox directory.";
}
function redactDiagnostic(error, settings) {
  let text = String(error?.stack || error);
  const values = [
    settings?.rootPassword,
    settings?.databasePassword,
    ...Object.values(settings?.environment || {}),
    ...(settings?.accounts || []).map((a) => a.password),
  ];
  for (const value of values)
    if (typeof value === "string" && value.length >= 12)
      text = text.split(value).join("[redacted]");
  return text
    .replace(/mysql:\/\/[^\s'"\)]+/g, "[private database]")
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted token]",
    );
}
function run(command, args, options = {}) {
  const r = spawnSync(command, args, {
    cwd: backend,
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
  if (r.status !== 0)
    throw new SandboxError(
      r.error?.code || "SUBPROCESS_FAILED",
      `Local ${path.basename(command)} command failed. Confirm dependencies and Docker availability. No database reset was attempted.`,
    );
  return r.stdout || "";
}
function secureDirectory() {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    const sid = JSON.parse(
      run("whoami", ["/user", "/fo", "csv", "/nh"])
        .trim()
        .split(/\r?\n/)
        .map((x) => JSON.stringify(x))[0],
    );
    const match = sid.match(/S-1-[0-9-]+/);
    if (!match)
      throw new SandboxError(
        "SANDBOX_GUARD",
        "Cannot establish private directory ownership.",
      );
    run("icacls", [
      directory,
      "/inheritance:r",
      "/grant:r",
      `*${match[0]}:(OI)(CI)F`,
      "*S-1-5-18:(OI)(CI)F",
    ]);
  } else fs.chmodSync(directory, 0o700);
}
function save(file, value) {
  const temporary = file + "." + process.pid + ".tmp";
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function createSettings(file, value) {
  try { fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" }); }
  catch (error) {
    if (error.code === "EEXIST")
      throw new SandboxError("SETTINGS_ALREADY_EXIST", "Private settings appeared during setup. They were preserved; rerun using the existing identity. No overwrite was attempted.");
    throw error;
  }
}
function audit(event, details = {}) {
  try {
    fs.appendFileSync(path.join(baseDirectory, "lifecycle-events.jsonl"), JSON.stringify({
      at: new Date().toISOString(), event, profile: profile.name, project: root, pid: process.pid, ...details,
    }) + "\n", { mode: 0o600 });
  } catch {} // Diagnostics must not replace the original safe failure.
}
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code !== "ESRCH"; }
}
function lifecycleLock(file = path.join(baseDirectory, "lifecycle.lock"), alive = processAlive) {
  const token = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(file, JSON.stringify({ pid: process.pid, token }), { flag: "wx", mode: 0o600 });
      return () => {
        if (JSON.parse(fs.readFileSync(file, "utf8")).token === token) fs.unlinkSync(file);
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      let content, owner;
      try { content = fs.readFileSync(file, "utf8"); owner = JSON.parse(content); } catch {}
      // An incomplete/unknown lock is never silently discarded.
      if (!owner || !Number.isInteger(owner.pid) || owner.pid <= 0 || alive(owner.pid))
        throw new SandboxError("LIFECYCLE_BUSY", "Another sandbox lifecycle command is running. Wait for it to finish before retrying. An unreadable lock requires manual review; credentials must be retained.");
      if (fs.readFileSync(file, "utf8") === content) fs.unlinkSync(file);
    }
  }
  throw new SandboxError("LIFECYCLE_BUSY", "Sandbox lifecycle changed concurrently; retry after the other command finishes.");
}
async function backendStatus(settings, request = fetch) {
  const expected = profiles.forSettings(settings);
  const challenge = crypto.randomBytes(32).toString("hex");
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await request(`http://127.0.0.1:${expected.apiPort}/__synthetic/status?challenge=${challenge}`, {
        signal: AbortSignal.timeout(2000), redirect: "error", cache: "no-store",
      });
      break;
    } catch (error) {
      // A reset/closed keep-alive connection does not prove the listener exited.
      if (attempt === 2) return { state: error.cause?.code === "ECONNREFUSED" ? "missing" : "unresponsive" };
      if (request === fetch) await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  if (!response.ok || !/application\/json/i.test(response.headers.get("content-type") || ""))
    return { state: "invalid-response", httpStatus: response.status };
  let status;
  try { status = await response.json(); } catch { return { state: "invalid-response", httpStatus: response.status }; }
  if (!status || status.synthetic !== true || typeof status.instanceId !== "string")
    return { state: "invalid-response", httpStatus: response.status };
  if (status.instanceId !== settings.instanceId) return { state: "foreign" };
  if (status.protocol !== identity.protocol || !Number.isInteger(status.pid) || typeof status.startedAt !== "string")
    return { state: "outdated" };
  if (!identity.verify(settings, challenge, status)) return { state: "settings-mismatch" };
  return { state: "ready", pid: status.pid, startedAt: status.startedAt };
}
function assertBackend(status) {
  if (status.state === "ready") return;
  const failures = {
    missing: ["BACKEND_UNAVAILABLE", "The selected sandbox backend is missing. Run sandbox:start; it safely starts missing services without changing accounts."],
    unresponsive: ["BACKEND_UNRESPONSIVE", "The selected API did not return a timely health response. Inspect private backend logs; no process was stopped."],
    "invalid-response": ["BACKEND_PROTOCOL_MISMATCH", "The selected API returned an HTTP error or unexpected health response. This is not proof of an instance mismatch. Run sandbox:diagnose; do not reset settings."],
    foreign: ["INSTANCE_MISMATCH", "The selected API belongs to another sandbox instance. Nothing was stopped and credentials will not be displayed or copied. Retain matching private settings."],
    outdated: ["BACKEND_OUTDATED", "The matching backend uses an old health protocol. Run sandbox:start to restart it only if its recorded process is owned."],
    "settings-mismatch": ["SETTINGS_MISMATCH", "The backend identity proof does not match private settings. Restore matching settings or reconcile the owned process manually; no credentials were changed."],
  };
  const [code, message] = failures[status.state] || failures["invalid-response"];
  throw new SandboxError(code, message);
}
function validateSettings(s) {
  if (typeof s?.instanceId !== "string" || !/^[a-f0-9-]{36}$/i.test(s.instanceId))
    throw new SandboxError("SETTINGS_INVALID", "Private sandbox instance metadata is missing or invalid. Retain credentials and reconcile the matching settings; nothing was reset.");
  registerTypeScript();
  require("./safety").requireSyntheticEnvironment(s.environment);
  if (!Array.isArray(s.accounts) || s.accounts.length !== 4 ||
      s.accounts.some((a) => typeof a.password !== "string" || a.password.length < 32 ||
        !/^(alice|bob|casey|admin)lag@students\.knoxite\.test$/.test(a.email)) ||
      new Set(s.accounts.map((a) => a.email)).size !== 4)
    throw new SandboxError("SETTINGS_INVALID", "Synthetic credential metadata is incomplete; restore the matching private backup rather than generating replacements.");
  return s;
}
function privateJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { throw new SandboxError("PRIVATE_METADATA_INVALID", "A private settings/checkpoint file is unreadable or invalid. Retain the file and restore its verified backup; private contents were not logged."); }
}
function readSettings() {
  if (!fs.existsSync(configPath))
    throw new SandboxError(
      "SETTINGS_MISSING",
      "Private sandbox settings are missing. Use sandbox:setup for first use; retain any existing database volume and restore its matching settings instead of resetting it.",
    );
  const s = validateSettings(privateJson(configPath));
  if (profiles.forSettings(s).name !== profile.name)
    throw new SandboxError("PROFILE_MISMATCH", "Settings do not belong to the selected sandbox profile. No fallback or regeneration was attempted.");
  return s;
}
async function free(port) {
  await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", () =>
      reject(
        new SandboxError(
          "PORT_OCCUPIED",
          `Port ${port} is occupied by another process. Nothing was stopped. Stop only the intended sandbox process, then retry.`,
        ),
      ),
    );
    s.listen(port, "127.0.0.1", () => s.close(resolve));
  });
}
const pause = () => new Promise((r) => setTimeout(r, 1000));
async function waitFor(url, check = () => true, options = {}) {
  const probe =
    options.probe ||
    (async () => {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      return r.ok ? r.json() : null;
    });
  const sleep = options.sleep || pause;
  for (let i = 0; i < (options.attempts || 120); i++) {
    try {
      const value = await probe();
      if (value && check(value)) return;
    } catch (error) {
      if (error instanceof SandboxError) throw error;
    }
    if (options.alive && !options.alive())
      throw new SandboxError(
        "BACKEND_EXITED",
        "Sandbox backend exited during startup. Inspect backend.stderr.log; no data or passwords were reset.",
      );
    if (i > 0 && i % 15 === 0)
      console.log("Waiting for the isolated backend to become ready...");
    await sleep();
  }
  throw new SandboxError(
    "BACKEND_NOT_READY",
    "The selected isolated backend did not become ready. Inspect backend.stderr.log and retry sandbox:start. The database was not reset.",
  );
}
function buildBackend() {
  console.log(
    "Checking Prisma client and building the local backend (no database migration)...",
  );
  try {
    run(
      process.execPath,
      [path.join(backend, "scripts/ensure-prisma-client.cjs")],
      { env: cleanEnvironment() },
    );
    run(
      process.execPath,
      [
        require.resolve("typescript/lib/tsc.js"),
        "-p",
        path.join(backend, "tsconfig.json"),
      ],
      { env: cleanEnvironment() },
    );
  } catch {
    throw new SandboxError(
      "BACKEND_BUILD_FAILED",
      "Backend build failed. Run npm --prefix knoxite-backend run typecheck to see compiler diagnostics, then retry. No database migration was run.",
    );
  }
  return path.join(backend, "dist/development/server.js");
}
async function start(entry, args, name, env) {
  const out = fs.openSync(
    path.join(directory, name + ".stdout.log"),
    "a",
    0o600,
  );
  const err = fs.openSync(
    path.join(directory, name + ".stderr.log"),
    "a",
    0o600,
  );
  let child;
  try {
    child = spawn(process.execPath, [entry, ...args], {
    cwd: name === "frontend" ? root : backend,
    env,
    detached: true,
    stdio: ["ignore", out, err],
    windowsHide: true,
    });
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", () => reject(new SandboxError("PROCESS_START_FAILED", `Could not start sandbox ${name}. Inspect private logs and local execution permissions.`)));
    });
    child.unref();
    return { pid: child.pid, entry, launchedAt: new Date().toISOString() };
  } finally {
    fs.closeSync(out);
    fs.closeSync(err);
  }
}
function cleanEnvironment() {
  const e = { ...process.env, NODE_ENV: "development" };
  for (const key of Object.keys(e))
    if (
      /^(DATABASE_URL|JWT_SECRET|EMAIL_|RESEND_|GOOGLE_|CAMPUS_|INSTITUTION_|PUBLIC_APP_URL|KNOXITE_)/.test(
        key,
      )
    )
      delete e[key];
  return e;
}
function dockerMetadata(expected = profile) {
  const context = run("docker", ["context", "show"]).trim();
  const contextInfo = JSON.parse(run("docker", ["context", "inspect", context]))[0];
  const endpoint = process.env.DOCKER_CONTEXT ? contextInfo.Endpoints.docker.Host :
    process.env.DOCKER_HOST || contextInfo.Endpoints.docker.Host;
  if (!/^npipe:\/\/\/\/\.\/pipe\//i.test(endpoint) && !/^unix:\/\//.test(endpoint))
    throw new SandboxError("REMOTE_DOCKER_BLOCKED", "Sandbox commands require a local Docker socket or Windows named pipe. The selected Docker endpoint was not contacted.");
  const docker = spawnSync(
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  if (docker.status !== 0)
    throw new SandboxError(
      docker.error?.code === "ENOENT" ? "DOCKER_MISSING" : "DOCKER_UNAVAILABLE",
      "Docker Desktop is not reachable. Start Docker Desktop, wait until its engine is ready, then retry. No database was changed.",
    );
  const containers = run("docker", ["container", "ls", "--all", "--format", "{{.Names}}"])
    .trim().split(/\r?\n/);
  const volumes = run("docker", ["volume", "ls", "--format", "{{.Name}}"])
    .trim().split(/\r?\n/);
  return {
    context,
    container: containers.includes(expected.container) ? JSON.parse(run("docker", ["inspect", "--type", "container", expected.container]))[0] : null,
    volume: volumes.includes(expected.volume) ? JSON.parse(run("docker", ["volume", "inspect", expected.volume]))[0] : null,
  };
}
async function portAvailable(port) {
  try { await free(port); return true; }
  catch (error) { if (error.code === "PORT_OCCUPIED") return false; throw error; }
}
async function replacementCandidate(name) {
  const expected = profiles.layout(name);
  const folder = path.join(baseDirectory, expected.folder);
  const file = path.join(folder, "settings.json");
  const metadata = dockerMetadata(expected);
  let s;
  try {
    if (fs.existsSync(file)) {
      s = validateSettings(privateJson(file));
      if (profiles.forSettings(s).name !== name) s = null;
    }
  } catch { s = null; }
  const ownershipVerified = !!s && databaseIdentity.ownsDatabase(databaseIdentity.ownershipReport(s, metadata.container, metadata.volume));
  const runtimeBindings = metadata.container?.NetworkSettings?.Ports?.["3306/tcp"] || [];
  const runningOwnedDatabase = ownershipVerified && metadata.container?.State?.Running === true &&
    runtimeBindings.length === 1 && runtimeBindings[0].HostIp === "127.0.0.1" && runtimeBindings[0].HostPort === String(expected.dbPort);
  const signedBackend = s ? (await backendStatus(s)).state === "ready" : false;
  return {
    profile: name,
    settingsPresent: fs.existsSync(file), settingsValid: !!s,
    checkpointPresent: fs.existsSync(path.join(folder, "settings.verified.json")),
    containerPresent: !!metadata.container, volumePresent: !!metadata.volume,
    ownershipVerified,
    dbPortAvailable: runningOwnedDatabase || await portAvailable(expected.dbPort),
    apiPortAvailable: signedBackend || await portAvailable(expected.apiPort),
  };
}
async function chooseReplacementProfile() {
  const pending = fs.existsSync(pendingPath) ? privateJson(pendingPath).profile : null;
  if (pending === "replacement") {
    const fixed = await replacementCandidate("replacement");
    if (!fixed.settingsValid || !fixed.ownershipVerified || !fixed.apiPortAvailable)
      throw new SandboxError("PENDING_CONFLICT", "Pending replacement lost its settings or ownership proof. It was retained and will not be regenerated. Run sandbox:diagnose for this namespace before choosing a new repair attempt.");
    return pending;
  }
  if (pending === null) {
    const fixed = await replacementCandidate("replacement");
    if (fixed.settingsValid && fixed.ownershipVerified && fixed.apiPortAvailable) {
      createSettings(pendingPath, { profile: "replacement", createdAt: new Date().toISOString() });
      return "replacement";
    }
  }
  const candidates = [];
  for (let slot = 1; slot <= 8; slot++) candidates.push(await replacementCandidate(`recovery-${slot}`));
  const result = require("./replacementAllocation.cjs").chooseReplacement({ pending, candidates });
  if (!result.ok) throw new SandboxError(result.code, result.message);
  if (pending === null) createSettings(pendingPath, { profile: result.profile, createdAt: new Date().toISOString() });
  audit("replacement-reserved", { targetProfile: result.profile });
  return result.profile;
}
function replacementTarget() {
  if (fs.existsSync(pendingPath)) {
    const name = privateJson(pendingPath).profile;
    if (typeof name !== "string" || name === "legacy") throw new SandboxError("PENDING_INVALID", "The pending replacement must identify one allowlisted replacement profile.");
    profiles.layout(name); return name;
  }
  return profile.name !== "legacy" ? profile.name : "replacement";
}
function assertDatabaseIdentity(s, metadata) {
  const report = databaseIdentity.ownershipReport(s, metadata.container, metadata.volume);
  if (!databaseIdentity.ownsDatabase(report)) {
    const failed = Object.keys(report).filter((key) => !report[key]);
    throw new SandboxError("DATABASE_INSTANCE_MISMATCH", "Isolated Docker ownership/topology failed: " + failed.join(", ") + ". Run sandbox:diagnose or recover a verified private checkpoint. No settings, containers or volumes were changed.");
  }
  return report;
}
async function verifySavedCredentials(s, metadata) {
  assertDatabaseIdentity(s, metadata);
  validateSettings(s);
  const { PrismaClient } = require("@prisma/client");
  const { credentialStatus } = require("./credentials");
  const db = new PrismaClient({ datasources: { db: { url: s.environment.DATABASE_URL } } });
  try {
    for (const account of s.accounts) {
      const status = await credentialStatus(db, account);
      if (!status.exists || !status.passwordMatches)
        throw new SandboxError("RECOVERY_CREDENTIAL_MISMATCH", "Saved synthetic credentials do not match the isolated database. Recovery was refused; no passwords or records were changed.");
    }
  } finally { await db.$disconnect(); }
}
async function rememberVerifiedSettings(s) {
  const metadata = dockerMetadata();
  assertDatabaseIdentity(s, metadata);
  assertBackend(await backendStatus(s));
  const text = fs.readFileSync(configPath, "utf8");
  if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(s))
    throw new SandboxError("SETTINGS_CHANGED", "Settings changed during validation. Retry without running another editor or lifecycle command.");
  if (fs.existsSync(checkpointPath)) {
    const saved = privateJson(checkpointPath);
    if (!databaseIdentity.checkpointMatches(saved, metadata) || saved.settingsText !== text)
      throw new SandboxError("CHECKPOINT_CONFLICT", "The verified private checkpoint differs from current settings/resources. It was retained; reconcile it before updating the recovery checkpoint.");
    return;
  }
  try { await verifySavedCredentials(s, metadata); }
  catch (error) {
    if (error.code !== "RECOVERY_CREDENTIAL_MISMATCH") throw error;
    console.log("Sandbox is running, but a verified checkpoint was not created because saved initial passwords are stale. No passwords were reset; use the normal synthetic recovery flow.");
    return;
  }
  secureDirectory();
  fs.writeFileSync(checkpointPath, JSON.stringify({
    format: 1, verifiedAt: new Date().toISOString(),
    containerId: metadata.container.Id, volumeCreatedAt: metadata.volume.CreatedAt,
    settings: s, settingsText: text,
  }, null, 2), { mode: 0o600, flag: "wx" });
  console.log("Verified private recovery checkpoint retained outside the repository. No credentials were printed or regenerated.");
}
async function restoreCheckpoint(checkpoint, metadata, target, verify) {
  if (!databaseIdentity.checkpointMatches(checkpoint, metadata))
    throw new SandboxError("RECOVERY_BACKUP_MISMATCH", "Private checkpoint does not match the exact Docker resources. No files were replaced.");
  await verify(checkpoint.settings);
  const original = fs.existsSync(target) ? fs.readFileSync(target) : null;
  if (original) fs.writeFileSync(path.join(path.dirname(target), "settings.displaced." + crypto.randomUUID() + ".json"), original, { mode: 0o600, flag: "wx" });
  const temporary = target + ".recovery." + process.pid + ".tmp";
  try {
    fs.writeFileSync(temporary, checkpoint.settingsText, { mode: 0o600, flag: "wx" });
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
async function recoverInstance() {
  const metadata = dockerMetadata();
  let current;
  try { current = readSettings(); } catch {}
  if (current && databaseIdentity.ownsDatabase(databaseIdentity.ownershipReport(current, metadata.container, metadata.volume))) {
    console.log("Current settings already own the exact container and volume; no restoration or relabeling is needed. Run sandbox:start, then sandbox:check.");
    return;
  }
  if (!fs.existsSync(checkpointPath))
    throw new SandboxError("RECOVERY_BACKUP_MISSING", "No previously verified private checkpoint is available. Keep all settings/resources and recover the original full settings from a trusted backup; a Docker label cannot reconstruct passwords or signing keys.");
  const checkpoint = privateJson(checkpointPath);
  if (!databaseIdentity.checkpointMatches(checkpoint, metadata))
    throw new SandboxError("RECOVERY_BACKUP_MISMATCH", "The checkpoint does not match the exact container, volume and settings content. Nothing was overwritten, stopped, deleted, relabeled or reset.");
  await restoreCheckpoint(checkpoint, metadata, configPath, async (settings) => {
    const candidate = validateSettings(settings);
    // Only the independently matched checkpoint may authorize starting the DB.
    await ensureDatabase(candidate, false);
    await verifySavedCredentials(candidate, dockerMetadata());
    const active = await backendStatus(candidate);
    if (!["ready", "missing"].includes(active.state))
      throw new SandboxError("RECOVERY_ACTIVE_BACKEND", "The active backend does not match the verified checkpoint. Stop/reconcile that process before recovery; settings were retained.");
    if (!databaseIdentity.checkpointMatches(checkpoint, dockerMetadata()))
      throw new SandboxError("RECOVERY_RESOURCE_CHANGED", "Docker resources changed during validation. Retry after reconciliation; settings were not overwritten.");
    secureDirectory();
  });
  console.log("Restored the complete previously verified private checkpoint after exact resource and read-only credential checks. Displaced settings were retained privately. No database records or Docker labels were changed. Run sandbox:start and sandbox:check.");
}
function inspectWindowsProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || process.platform !== "win32")
    throw new SandboxError("PROCESS_PROOF_UNAVAILABLE", "Relocation requires a valid Windows process/owner proof; nothing was stopped.");
  return JSON.parse(run("powershell", ["-NoProfile", "-Command",
    `$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if($p){[pscustomobject]@{pid=[int]$p.ProcessId;executable=$p.ExecutablePath;command=$p.CommandLine;owner=(Invoke-CimMethod -InputObject $p -MethodName GetOwnerSid).Sid;createdAt=$p.CreationDate.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress}else{'null'}`,
  ]));
}
async function relocateInstance() {
  const s = readSettings();
  const metadata = dockerMetadata();
  assertDatabaseIdentity(s, metadata);
  const checkpoint = fs.existsSync(checkpointPath) ? privateJson(checkpointPath) : null;
  if (!databaseIdentity.checkpointMatches(checkpoint, metadata) || checkpoint.settingsText !== fs.readFileSync(configPath, "utf8"))
    throw new SandboxError("RELOCATION_UNVERIFIED", "Relocation needs the complete matching verified checkpoint. Do not use a foreign PID or Docker label as ownership proof; prepare a separate replacement if the checkpoint is unavailable.");
  const records = privateJson(processesPath);
  const previous = relocation.previousRoot(records);
  if (previous === root) {
    console.log("Process records already use this checkout; running normal readiness checks.");
    await launch(s); await rememberVerifiedSettings(s); reportReady(); return;
  }
  if (!previous) throw new SandboxError("RELOCATION_UNVERIFIED", "Recorded backend/frontend entries do not identify one previous checkout. Nothing was stopped.");
  const status = await backendStatus(s);
  assertBackend(status);
  if (status.pid !== records.backend.pid)
    throw new SandboxError("RELOCATION_UNVERIFIED", "Signed backend PID differs from the recorded process. Nothing was stopped.");
  const owner = run("whoami", ["/user", "/fo", "csv", "/nh"]).match(/S-1-[0-9-]+/)?.[0];
  if (!owner) throw new SandboxError("PROCESS_PROOF_UNAVAILABLE", "Windows owner SID could not be established. Nothing was stopped.");
  for (const name of ["backend", "frontend"]) {
    const observed = inspectWindowsProcess(records[name].pid);
    if (!relocation.processMatches(records[name], observed, process.execPath, owner, name === "frontend"))
      throw new SandboxError("RELOCATION_UNVERIFIED", "Recorded process executable, owner, launch time or arguments do not match. Nothing was stopped.");
  }
  await verifySavedCredentials(s, metadata);
  // Recheck all ownership proofs immediately before the reversible process stop.
  assertDatabaseIdentity(s, dockerMetadata());
  const finalStatus = await backendStatus(s);
  assertBackend(finalStatus);
  if (finalStatus.pid !== records.backend.pid)
    throw new SandboxError("RELOCATION_PROCESS_CHANGED", "Signed backend process changed during relocation. Nothing was stopped.");
  for (const name of ["frontend", "backend"]) {
    if (!relocation.processMatches(records[name], inspectWindowsProcess(records[name].pid), process.execPath, owner, name === "frontend"))
      throw new SandboxError("RELOCATION_PROCESS_CHANGED", "Process identity changed during relocation; no unverified process will be stopped.");
    process.kill(records[name].pid);
  }
  save(path.join(directory, "processes.previous." + crypto.randomUUID() + ".json"), records);
  save(processesPath, {});
  for (let i = 0; i < 20 && (await backendStatus(s)).state !== "missing"; i++) await pause();
  await free(5180);
  await launch(s); await rememberVerifiedSettings(s); reportReady();
  console.log("Verified application processes transferred to the current checkout. Settings, passwords, Docker resources and database records were retained.");
}
async function ensureDatabase(s, create) {
  const metadata = dockerMetadata();
  if (metadata.container) {
    assertDatabaseIdentity(s, metadata);
    const c = metadata.container;
    if (!c.State.Running) run("docker", ["start", container]);
  } else {
    if (!create)
      throw new SandboxError("SANDBOX_GUARD", "Run sandbox:setup first.");
    if (metadata.volume)
      throw new SandboxError("ORPHANED_VOLUME", "The expected volume remains without its container. Restore/reconcile its verified instance; no reuse, relabel or reset is automatic.");
    run("docker", [
      "volume",
      "create",
      "--label",
      `knoxite.synthetic=${s.instanceId}`,
      volume,
    ]);
    const envFile = path.join(directory, "mysql-start." + process.pid + ".env");
    fs.writeFileSync(envFile, `MYSQL_ROOT_PASSWORD=${s.rootPassword}\nMYSQL_DATABASE=${profile.dbName}\nMYSQL_USER=sandbox\nMYSQL_PASSWORD=${s.databasePassword}\n`, { mode: 0o600, flag: "wx" });
    try { run("docker", [
      "run",
      "--detach",
      "--name",
      container,
      "--label",
      `knoxite.synthetic=${s.instanceId}`,
      "-p",
      `127.0.0.1:${profile.dbPort}:3306`,
      "-v",
      `${volume}:/var/lib/mysql`,
      "--env-file",
      envFile,
      "mysql:8.4",
    ]); } finally { fs.unlinkSync(envFile); }
  }
  assertDatabaseIdentity(s, dockerMetadata());
  for (let i = 0; i < 120; i++) {
    const r = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        container,
        "mysqladmin",
        "--defaults-extra-file=/dev/stdin",
        "ping",
        "-h",
        "127.0.0.1",
        "--silent",
      ],
      { input: `[client]\nuser=root\npassword=${s.rootPassword}\n`, encoding: "utf8", windowsHide: true },
    );
    if (r.status === 0) return;
    await pause();
  }
  throw new SandboxError(
    "SANDBOX_GUARD",
    "Isolated MySQL did not become ready.",
  );
}
function ownedProcess(p) {
  if (!p || !Number.isInteger(p.pid)) return false;
  if (![path.join(backend, "dist/development/server.js"), path.join(backend, "development/server.ts"), path.join(root, "node_modules/vite/bin/vite.js")].includes(p.entry)) return false;
  try {
    const cmd =
      process.platform === "win32"
        ? run("powershell", [
            "-NoProfile",
            "-Command",
            `(Get-CimInstance Win32_Process -Filter "ProcessId = ${p.pid}").CommandLine`,
          ])
        : run("ps", ["-p", String(p.pid), "-o", "args="]);
    const normalized = process.platform === "win32" ? cmd.toLowerCase() : cmd;
    const entry = process.platform === "win32" ? p.entry.toLowerCase() : p.entry;
    return normalized.includes('"' + entry + '"') || normalized.split(/\s+/).includes(entry);
  } catch {
    return false;
  }
}
async function launch(s, frontend = true) {
  let status = await backendStatus(s);
  const records = fs.existsSync(processesPath)
    ? JSON.parse(fs.readFileSync(processesPath, "utf8"))
    : {};
  const env = {
    ...cleanEnvironment(),
    ...s.environment,
    KNOXITE_SANDBOX_CONFIG_FILE: configPath,
  };
  if (status.state === "ready" && records.backend && records.backend.entry !== path.join(backend, "dist/development/server.js") && processAlive(records.backend.pid))
    throw new SandboxError("RELOCATION_REQUIRED", "This signed sandbox is running from another checkout. Run sandbox:relocate to verify and transfer only its owned application processes; credentials and Docker resources will be retained.");
  // Upgrade the old unsigned health endpoint only when BOTH the instance and
  // the exact recorded executable entry match. Never take over a foreign port.
  if (status.state === "outdated" && ownedProcess(records.backend)) {
    process.kill(records.backend.pid);
    for (let attempt = 0; attempt < 15; attempt++) {
      await pause();
      status = await backendStatus(s);
      if (status.state === "missing") break;
    }
  }
  if (status.state !== "ready" && status.state !== "missing") assertBackend(status);
  if (status.state === "missing") {
    // A process may still be starting before it opens its listener. Do not spawn
    // a second process just because its TCP port has not appeared yet.
    if (ownedProcess(records.backend)) {
      await waitFor("unused", (v) => v.state === "ready", {
        probe: () => backendStatus(s),
        alive: () => processAlive(records.backend.pid),
      });
    } else {
      await free(profile.apiPort);
      records.backend = await start(buildBackend(), [], "backend", env);
      save(processesPath, records);
      await waitFor(
        "unused",
        (v) => {
          if (!["ready", "missing", "unresponsive"].includes(v.state)) assertBackend(v);
          return v.state === "ready";
        },
        {
          probe: () => backendStatus(s),
          alive: () => processAlive(records.backend.pid),
        },
      );
    }
  }
  if (!frontend) return;
  if (!ownedProcess(records.frontend)) {
    await free(5180);
    records.frontend = await start(
      path.join(root, "node_modules/vite/bin/vite.js"),
      ["--host", "127.0.0.1", "--port", "5180", "--strictPort"],
      "frontend",
      {
        ...cleanEnvironment(),
        VITE_API_BASE_URL: `http://localhost:${profile.apiPort}/api`,
        VITE_KNOXITE_SANDBOX: "true",
        VITE_KNOXITE_SANDBOX_PROFILE: profile.name,
      },
    );
    save(processesPath, records);
  }
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5180", { signal: AbortSignal.timeout(2000), redirect: "error" })).ok) {
        ready = true;
        break;
      }
    } catch {}
    await pause();
  }
  if (!ready)
    throw new SandboxError(
      "SANDBOX_GUARD",
      "Sandbox frontend did not become ready.",
    );
  // A backend that exited while Vite was starting must not yield a ready message.
  assertBackend(await backendStatus(s));
  console.log("Sandbox services are responding; verifying private configuration...");
}
function reportReady() {
  console.log(`Synthetic sandbox ready: http://localhost:5180/login (profile ${profile.name}; backend ${profile.apiPort}, database ${profile.dbPort}/${profile.dbName}).`);
}
async function diagnoseInstance() {
  let s;
  try { s = readSettings(); } catch {}
  const records = fs.existsSync(processesPath) ? privateJson(processesPath) : {};
  const metadata = dockerMetadata();
  let checkpoint;
  try { if (fs.existsSync(checkpointPath)) checkpoint = privateJson(checkpointPath); } catch {}
  console.log(JSON.stringify({
    settingsPath: configPath,
    launcherPath: __filename,
    launcherRevision: crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex").slice(0, 16),
    activeProfile: profile.name,
    pendingReplacement: fs.existsSync(pendingPath) ? privateJson(pendingPath).profile : null,
    settingsPresent: fs.existsSync(configPath), settingsValid: !!s,
    dockerContext: metadata.context,
    database: databaseIdentity.ownershipReport(s, metadata.container, metadata.volume),
    mysqlMount: metadata.container?.Mounts?.filter((m) => m.Destination === "/var/lib/mysql").map((m) => ({ type: m.Type, name: m.Name, destination: m.Destination })),
    containerCreatedAt: metadata.container?.Created,
    volumeCreatedAt: metadata.volume?.CreatedAt,
    settingsCreatedAt: fs.existsSync(configPath) ? fs.statSync(configPath).birthtime.toISOString() : null,
    settingsModifiedAt: fs.existsSync(configPath) ? fs.statSync(configPath).mtime.toISOString() : null,
    verifiedCheckpointPresent: fs.existsSync(checkpointPath),
    checkpointMatchesResources: databaseIdentity.checkpointMatches(checkpoint, metadata),
    backend: s ? await backendStatus(s) : { state: "settings-unavailable" },
    processes: Object.fromEntries(Object.entries(records).map(([name, p]) => [name, { pid: p.pid, alive: processAlive(p.pid), owned: ownedProcess(p), launchedAt: p.launchedAt || "not recorded by old launcher" }])),
    logDirectory: directory,
  }, null, 2));
  console.log("Compare this exact settings path and Docker context. Identity and exact volume checks are authoritative; a TCP connection alone is insufficient. No services or settings were changed.");
}
async function executeCommand(requested = process.argv[2]) {
  if (Number(process.versions.node.split(".")[0]) < 22)
    throw new SandboxError(
      "NODE_VERSION",
      "Use Node.js 22 or newer for sandbox commands.",
    );
  if (process.env.NODE_ENV === "production")
    throw new SandboxError(
      "PRODUCTION_BLOCKED",
      "Sandbox CLI is prohibited in production. Use a development terminal.",
    );
  if (
    run("git", ["branch", "--show-current"], { cwd: root }).trim() !==
    "dev-justine"
  )
    throw new SandboxError(
      "WRONG_BRANCH",
      "Switch to dev-justine before running sandbox commands.",
    );
  const preparing = requested === "prepare-replacement";
  const command = preparing ? "setup" : requested === "stop-replacement" ? "stop" : requested === "diagnose-replacement" ? "diagnose" : requested;
  selectProfile(fs.existsSync(selectionPath) ? privateJson(selectionPath).profile : "legacy");
  if (preparing) selectProfile(await chooseReplacementProfile());
  else if (["use-replacement", "stop-replacement", "diagnose-replacement"].includes(requested)) selectProfile(replacementTarget());
  if (command === "recover") return recoverInstance();
  if (command === "diagnose") return diagnoseInstance();
  if (command === "relocate") return relocateInstance();
  if (command === "repair") {
    let s;
    return require("./repairFlow.cjs").repairFlow({
      recoverOriginal: async () => {
        try { s = readSettings(); } catch {}
        const metadata = dockerMetadata();
        if (!s || !databaseIdentity.ownsDatabase(databaseIdentity.ownershipReport(s, metadata.container, metadata.volume))) {
          try { await recoverInstance(); }
          catch (error) {
            if (!["RECOVERY_BACKUP_MISSING", "RECOVERY_BACKUP_MISMATCH", "PRIVATE_METADATA_INVALID", "RECOVERY_CREDENTIAL_MISMATCH"].includes(error.code)) throw error;
            console.log("The original instance cannot be independently recovered. Its settings, container and volume will be retained unchanged; preparing a separate replacement with new synthetic accounts.");
            return false;
          }
          s = readSettings();
        }
        return true;
      },
      prepareReplacement: async () => { await executeCommand("prepare-replacement"); return profile.name; },
      activateReplacement: async (prepared) => {
        if (!fs.existsSync(pendingPath) || privateJson(pendingPath).profile !== prepared)
          throw new SandboxError("PENDING_CHANGED", "The reserved replacement changed during preparation. No different profile will be activated.");
        await executeCommand("use-replacement");
      },
      needsRelocation: async () => {
        const records = fs.existsSync(processesPath) ? privateJson(processesPath) : {};
        const status = await backendStatus(s);
        return status.state === "ready" && records.backend?.entry !== path.join(backend, "dist/development/server.js");
      },
      relocateOriginal: () => relocateInstance(),
      startOriginal: () => executeCommand("start"),
    });
  }
  if (command === "use-replacement") {
    const s = readSettings();
    await ensureDatabase(s, false);
    await launch(s); await rememberVerifiedSettings(s);
    save(selectionPath, { profile: profile.name });
    if (fs.existsSync(pendingPath) && privateJson(pendingPath).profile === profile.name) fs.unlinkSync(pendingPath);
    audit("replacement-selected");
    reportReady();
    console.log("Replacement selected. Original settings/container/volume were retained; old history was not imported.");
    return;
  }
  if (command === "setup") {
    secureDirectory();
    if (!fs.existsSync(configPath)) {
      const metadata = dockerMetadata();
      if (!databaseIdentity.mayInitialize(false, metadata.container, metadata.volume, fs.existsSync(checkpointPath)))
        throw new SandboxError("SETTINGS_MISSING_EXISTING_DATABASE", "Private settings are missing but an existing sandbox resource or verified checkpoint remains. No replacement identity or credentials were generated. Use sandbox:recover with the verified checkpoint, or restore the original full settings.");
      await free(profile.dbPort);
      const databasePassword = secret();
      const s = {
        instanceId: crypto.randomUUID(),
        rootPassword: secret(),
        databasePassword,
        environment: {
          NODE_ENV: "development",
          KNOXITE_SYNTHETIC_SANDBOX: "true",
          KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
          DATABASE_URL: `mysql://sandbox:${databasePassword}@127.0.0.1:${profile.dbPort}/${profile.dbName}`,
          KNOXITE_SANDBOX_PROFILE: profile.name,
          JWT_SECRET: secret(),
          INSTITUTION_EMAIL_DOMAINS: "students.knoxite.test",
          CAMPUS_EMAIL_SUFFIX: "lag",
          CAMPUS_EMAIL_RULE_CONFIRMED: "false",
          EMAIL_VERIFICATION_REQUIRED: "true",
          GOOGLE_SIGN_IN_ENABLED: "false",
          PUBLIC_APP_URL: "http://localhost:5180",
          CORS_ORIGINS: "http://localhost:5180,http://127.0.0.1:5180",
        },
        accounts: ["Alice", "Bob", "Casey", "Admin"].map((name) => ({
          role: name === "Admin" ? "ADMIN" : "USER",
          name: `Synthetic ${name}`,
          email: `${name.toLowerCase()}lag@students.knoxite.test`,
          password: secret(),
        })),
      };
      createSettings(configPath, s);
      audit("settings-created", { settingsPath: configPath, identityRevision: crypto.createHash("sha256").update(s.instanceId).digest("hex").slice(0, 16) });
    }
    const s = readSettings();
    await ensureDatabase(s, true);
    const env = {
      ...cleanEnvironment(),
      ...s.environment,
      KNOXITE_SANDBOX_CONFIG_FILE: configPath,
    };
    // A read-only check distinguishes an empty first-run DB from existing user activity.
    registerTypeScript();
    const { PrismaClient } = require("@prisma/client");
    const db = new PrismaClient({
      datasources: { db: { url: s.environment.DATABASE_URL } },
    });
    let tables;
    try {
      tables = Number(
        (
          await db.$queryRaw`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()`
        )[0].count,
      );
    } finally {
      await db.$disconnect();
    }
    console.log(
      tables === 0
        ? "Preparing empty isolated schema..."
        : "Checking existing isolated schema without modifying it...",
    );
    if (tables === 0)
      run(
        process.execPath,
        [
          require.resolve("ts-node/dist/bin"),
          "--prefer-ts-exts",
          path.join(backend, "scripts/migrate-local.ts"),
          "bootstrap",
        ],
        { env },
      );
    else {
      const r = run(
        process.execPath,
        [
          require.resolve("prisma/build/index.js"),
          "migrate",
          "diff",
          "--from-schema-datasource",
          "prisma/schema.prisma",
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--exit-code",
        ],
        { env },
      );
    }
    console.log("Starting isolated backend and frontend...");
    await launch(s, !preparing);
    console.log(
      "Initializing synthetic accounts through normal authentication...",
    );
    run(
      process.execPath,
      [
        require.resolve("ts-node/dist/bin"),
        "--prefer-ts-exts",
        path.join(__dirname, "seed.ts"),
      ],
      { env },
    );
    await rememberVerifiedSettings(s);
    if (preparing) console.log(`Replacement ${profile.name} prepared privately on MySQL ${profile.dbPort} / API ${profile.apiPort}. All older settings/resources remain unchanged. After port 5180 is safely free, run sandbox:use-replacement; active profile has not changed.`);
    else reportReady();
    if (!preparing) console.log(
      "Use npm run sandbox:accounts to view private test credentials; npm run sandbox:mailbox to open simulated messages. Existing passwords are never reset by setup.",
    );
  } else {
    const s = readSettings();
    if (command === "start") {
      await ensureDatabase(s, false);
      await launch(s);
      await rememberVerifiedSettings(s);
      reportReady();
      audit("start-verified");
    } else if (command === "backend") {
      await ensureDatabase(s, false);
      await free(profile.apiPort);
      run(process.execPath, [buildBackend()], {
        env: {
          ...cleanEnvironment(),
          ...s.environment,
          KNOXITE_SANDBOX_CONFIG_FILE: configPath,
        },
        stdio: "inherit",
      });
    } else if (command === "frontend") {
      await free(5180);
      run(
        process.execPath,
        [
          path.join(root, "node_modules/vite/bin/vite.js"),
          "--host",
          "127.0.0.1",
          "--port",
          "5180",
          "--strictPort",
        ],
        {
          cwd: root,
          env: {
            ...cleanEnvironment(),
            VITE_API_BASE_URL: `http://localhost:${profile.apiPort}/api`,
            VITE_KNOXITE_SANDBOX: "true",
            VITE_KNOXITE_SANDBOX_PROFILE: profile.name,
          },
          stdio: "inherit",
        },
      );
    } else if (["accounts", "check", "copy-password"].includes(command)) {
      assertDatabaseIdentity(s, dockerMetadata());
      assertBackend(await backendStatus(s));
      if (command === "check")
        console.log(
          `Backend instance matches private sandbox settings; target is ${profile.dbPort}/${profile.dbName}, API ${profile.apiPort}.`,
        );
      const { PrismaClient } = require("@prisma/client");
      const { credentialStatus } = require("./credentials");
      const db = new PrismaClient({
        datasources: { db: { url: s.environment.DATABASE_URL } },
      });
      try {
        const selector = (process.argv[3] || "alice").toLowerCase();
        const accounts =
          command === "copy-password"
            ? s.accounts.filter(
                (a) =>
                  a.email === selector ||
                  a.email.split("@")[0].replace(/lag$/, "") === selector,
              )
            : s.accounts;
        if (!accounts.length)
          throw new SandboxError(
            "SANDBOX_GUARD",
            "Unknown synthetic account selector.",
          );
        for (const a of accounts) {
          const status = await credentialStatus(db, a);
          if (command === "check")
            console.log(JSON.stringify({ account: a.name, ...status }));
          else if (
            !status.passwordMatches ||
            !status.verified ||
            status.suspended
          ) {
            console.log(
              `${a.name}: saved credential is unavailable or account is blocked. Use synthetic password recovery; setup will not reset it.`,
            );
            process.exitCode = 1;
          } else if (command === "accounts")
            console.log(
              `${a.name} (saved password verified against sandbox hash)\n  Email: ${a.email}\n  Password (value only): ${a.password}`,
            );
          else {
            if (process.platform !== "win32")
              throw new SandboxError(
                "SANDBOX_GUARD",
                "Use sandbox:accounts on this platform.",
              );
            run("clip", [], { input: a.password });
            console.log(
              `Password copied for ${a.email}. Paste into Password at http://localhost:5180/login. No password was printed.`,
            );
          }
        }
      } finally {
        await db.$disconnect();
      }
    } else if (command === "mailbox") {
      const file = path.join(directory, "mailbox.html");
      if (!fs.existsSync(file))
        throw new Error(
          "Request a synthetic verification/reset message first.",
        );
      if (process.platform === "win32")
        run("powershell", [
          "-NoProfile",
          "-EncodedCommand",
          Buffer.from(
            "Start-Process -WindowStyle Hidden -FilePath '" +
              file.replace(/'/g, "''") +
              "'",
            "utf16le",
          ).toString("base64"),
        ]);
      else console.log(file);
    } else if (command === "stop") {
      assertDatabaseIdentity(s, dockerMetadata());
      const records = fs.existsSync(processesPath)
        ? JSON.parse(fs.readFileSync(processesPath, "utf8"))
        : {};
      const status = await backendStatus(s);
      if (!["ready", "missing", "outdated"].includes(status.state)) assertBackend(status);
      if (status.state === "ready" && records.backend && status.pid !== records.backend.pid)
        throw new SandboxError("PROCESS_RECORD_MISMATCH", "The signed backend PID differs from private process records. Nothing was stopped; reconcile the records before stopping.");
      for (const p of Object.values(records)) {
        if (ownedProcess(p))
          try {
            process.kill(p.pid);
          } catch {}
      }
      const c = JSON.parse(run("docker", ["inspect", container]))[0];
      if (c.Config.Labels?.["knoxite.synthetic"] !== s.instanceId)
        throw new SandboxError(
          "SANDBOX_GUARD",
          "Refusing to stop an unowned container.",
        );
      run("docker", ["stop", container]);
      console.log(
        "Sandbox stopped; isolated database volume and private settings retained.",
      );
    } else
      throw new SandboxError(
        "SANDBOX_GUARD",
        "Use setup, start, accounts, mailbox, or stop.",
      );
  }
}
async function main() {
  const command = process.argv[2];
  if (["setup", "prepare-replacement", "repair"].includes(command)) secureDirectory();
  // Credential checks cannot race an active start/stop and report a false failure.
  const guarded = ["setup", "start", "stop", "stop-replacement", "recover", "repair", "relocate", "prepare-replacement", "use-replacement", "accounts", "check", "copy-password"].includes(command);
  const release = guarded && fs.existsSync(baseDirectory) ? lifecycleLock() : () => {};
  try { await executeCommand(); } finally { release(); }
}
module.exports = { SandboxError, failureMessage, redactDiagnostic, waitFor, backendStatus, assertBackend, lifecycleLock, restoreCheckpoint, createSettings };
if (require.main === module)
  main().catch((error) => {
    audit("command-failed", { code: /^[A-Z0-9_]{1,64}$/.test(error?.code || "") ? error.code : "LOCAL_COMMAND_FAILED" });
    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch {}
    try {
      if (fs.existsSync(directory))
        fs.writeFileSync(
          path.join(directory, "setup-error.log"),
          redactDiagnostic(error, settings),
          { mode: 0o600 },
        );
    } catch {}
    console.error(failureMessage(error));
    console.error(
      "Private diagnostics: " +
        path.join(directory, "setup-error.log") +
        ". Existing knoxite was not targeted.",
    );
    process.exitCode = 1;
  });
