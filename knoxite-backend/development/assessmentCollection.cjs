// Explicit operator-only workflow for the user-authorized 15-skill LOCAL collection.
// No startup hooks, migrations, alternate credentials or arbitrary API/DB targets.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { spawnSync, execFileSync } = require("node:child_process");
const admin = require("./oauthLocalAdmin.cjs"), local = require("./oauthLocal.cjs");
const root = path.resolve(__dirname, "../.."), drafts = path.join(root, "knoxite-backend/content/drafts");
const folder = path.join(process.env.LOCALAPPDATA || "", "Knoxite/google-local/assessment-collection-2026-11-15");
const KEYS = ["python-programming-fundamentals", "java-programming-fundamentals", "javascript-fundamentals", "html-css-fundamentals", "sql-fundamentals", "database-management-basics", "computer-networking-basics", "computer-troubleshooting", "git-github-basics", "microsoft-excel-fundamentals", "bookkeeping-fundamentals", "introductory-statistics", "english-grammar", "food-safety-and-hygiene", "chess-fundamentals"];
const hash = x => crypto.createHash("sha256").update(typeof x === "string" || Buffer.isBuffer(x) ? x : JSON.stringify(x)).digest("hex");
function check(ok, message) { if (!ok) throw Object.assign(new Error(message), { safeMessage: message }); }
const sign = (value, env) => crypto.createHmac("sha256", env.JWT_SECRET).update("knoxite-assessment-collection-v1\n" + JSON.stringify(value)).digest("hex");
function write(file, value, f, exclusive = false) {
  fs.mkdirSync(folder, { recursive: true });
  const record = JSON.stringify({ value, proof: sign(value, f.env) }, null, 2) + "\n";
  const target = path.join(folder, file);
  if (exclusive) fs.writeFileSync(target, record, { flag: "wx", mode: 0o600 });
  else { const pending = target + ".pending"; fs.writeFileSync(pending, record, { flag: "wx", mode: 0o600 }); fs.renameSync(pending, target); }
}
function read(file, f, optional = false) {
  const target = path.join(folder, file);
  if (optional && !fs.existsSync(target)) return null;
  const record = JSON.parse(fs.readFileSync(target, "utf8")), expected = sign(record.value, f.env);
  check(record.value.instanceId === f.owner.instanceId && typeof record.proof === "string" && record.proof.length === expected.length && crypto.timingSafeEqual(Buffer.from(record.proof), Buffer.from(expected)), "Collection record signature/instance mismatch. No content replaced.");
  return record.value;
}
function loadSources() {
  const { validateBankInput } = require(path.join(root, "knoxite-backend/dist/services/bankValidation.js"));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, "knoxite-backend/config/skill-catalog.json"), "utf8"));
  check(
  fs.readdirSync(drafts).filter(n => n.endsWith(".json") && n !== "qa-owner.private.json").length === 15,
  "The authorized collection must contain exactly 15 draft files."
);
  return KEYS.map(key => {
    const text = fs.readFileSync(path.join(drafts, key + ".json"), "utf8"), source = JSON.parse(text), preset = catalog.skills.find(s => s.key === key);
    check(preset && source.presetKey === key && source.skillName === preset.name && source.draftStatus === "DRAFT_UNREVIEWED_NOT_FOR_STUDENT_PUBLICATION", "Source/catalog identity changed; obtain review of the revised collection.");
    for (const level of ["basic", "advanced"]) {
      const bank = source[level], count = level === "basic" ? 10 : 6;
      check(bank.questionCount === count && bank.items.length === count && bank.passingPercent === 80 && bank.level === level.toUpperCase(), "Authorized assessment parameters changed.");
      validateBankInput(bank);
      for (const item of bank.items) {
        const key = item.prompt.split(": ")[0], entry = source.answerKey[key], answer = item.options.find(o => o.isCorrect);
        check(item.options.length === 4 && entry && entry.answer === answer.text && item.options["ABCD".indexOf(entry.choice)]?.isCorrect && entry.explanation === item.rubric && entry.learningObjective === item.competency, "A source key/objective/explanation is inconsistent.");
      }
    }
    return { key, preset, source, sourceHash: hash(text) };
  });
}
function payloadFor(source, skillId, level) {
  const body = structuredClone(source.source[level.toLowerCase()]);
  // Source questions/keys are preserved. Only local publication metadata changes;
  // the old JavaScript testing-only scope prefix is not a question or approval.
  const outcomes = body.learningOutcomes.replace(/^SYNTHETIC TESTING ONLY[^.]*\.\s*/, "");
  return { ...body, skillId, title: `${source.preset.name} - ${level} - local pilot`,
    learningOutcomes: "Local development pilot only. Research-team approval relayed by project owner; no independently verified faculty review or hands-on/professional certification. " + outcomes };
}
function fingerprint(body) {
  return hash({ skillId: body.skillId, level: body.level, title: body.title, questionCount: body.questionCount, passingPercent: body.passingPercent, durationMinutes: body.durationMinutes, learningOutcomes: body.learningOutcomes,
    items: body.items.map(i => ({ kind: i.kind, prompt: i.prompt, competency: i.competency, rubric: i.rubric, points: i.points,
      options: i.options.map(o => ({ text: o.text, isCorrect: o.isCorrect })).sort((a,b) => a.text.localeCompare(b.text)) })).sort((a,b) => a.prompt.localeCompare(b.prompt)) });
}
const versionPayload = (bank, v) => ({ ...v, skillId: bank.skillId, level: bank.level, title: bank.title });
async function banks(db) { return db.assessmentBank.findMany({ orderBy: { id: "asc" }, include: { versions: { orderBy: { version: "asc" }, include: { items: { include: { options: true } } } } } }); }
async function login(f) {
  const challenge = crypto.randomBytes(32).toString("hex");
  const response = await fetch("http://127.0.0.1:5019/__oauth-local/admin-status?challenge=" + challenge, { redirect: "error", signal: AbortSignal.timeout(5000) });
  check(response.ok, "The dedicated administrator backend is unavailable.");
  const s = await response.json(), value = { instanceId: s.instanceId, challenge: s.challenge, passwordAdminConfigured: s.passwordAdminConfigured };
  const expected = crypto.createHmac("sha256", f.env.JWT_SECRET).update(JSON.stringify(value)).digest("hex");
  check(s.instanceId === f.owner.instanceId && s.challenge === challenge && s.passwordAdminConfigured === true && typeof s.proof === "string" && s.proof.length === expected.length && crypto.timingSafeEqual(Buffer.from(s.proof), Buffer.from(expected)), "Running API instance proof failed.");
  const account = await admin.credentials(f);
  let token;
  const call = async (method, route, body, status = 200) => {
    const r = await fetch("http://127.0.0.1:5019/api" + route, { method, redirect: "error", signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    check(r.status === status, `Local authenticated collection operation returned ${r.status}; expected ${status}. Progress retained; no automatic reset.`); return r.json();
  };
  const result = await call("POST", "/auth/login", { email: account.user.email, password: account.password });
  token = result.token; check(result.user.id === account.user.id && result.user.role === "ADMIN", "Administrator authentication failed.");
  return { call, close: async () => { await call("POST", "/auth/logout", {}); token = null; } };
}
function dpapi(text, decrypt = false) {
  check(process.platform === "win32", "Use the authorized Windows user's local environment.");
  const script = decrypt
    ? "$ErrorActionPreference='Stop'; [void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([Console]::In.ReadToEnd()),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); try {[Console]::Write([Text.Encoding]::UTF8.GetString($b))} finally {[Array]::Clear($b,0,$b.Length)}"
    : "$ErrorActionPreference='Stop'; [void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); try {[Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))} finally {[Array]::Clear($b,0,$b.Length)}";
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { input: text, encoding: "utf8", windowsHide: true, maxBuffer: 32*1024*1024, stdio: ["pipe", "pipe", "pipe"] });
}
async function counts(db) {
  const tables = await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`;
  const result = {};
  for (const {name} of tables) { check(/^[A-Za-z0-9_]+$/.test(name), "Unexpected table identifier."); result[name] = Number((await db.$queryRawUnsafe("SELECT COUNT(*) AS n FROM `" + name + "`"))[0].n); }
  return result;
}
function verifyBackup(f) {
  const receipt = read("backup.private.json", f), encrypted = fs.readFileSync(path.join(folder, receipt.file), "utf8");
  check(hash(encrypted) === receipt.encryptedHash && hash(dpapi(encrypted, true)) === receipt.sqlHash && receipt.rowCountsVerified === true, "Backup verification failed; no content writes permitted."); return receipt;
}
function verifySources(plan, sources) {
  check(plan.levels.length === 30 && new Set(plan.levels.map(e => e.key + e.level)).size === 30, "Incomplete/duplicate collection manifest.");
  for (const entry of plan.levels) {
    const source = sources.find(s => s.key === entry.key);
    check(source && source.sourceHash === entry.sourceHash && fingerprint(payloadFor(source, entry.skillId, entry.level)) === entry.payloadHash, "Reviewed source or import payload changed; stop for renewed review.");
  }
}
async function verifyTargets(plan, sources, db) {
  const rows = await db.skill.findMany();
  const { existingPresetSkill } = require(path.join(root, "knoxite-backend/dist/services/skillCatalog.js"));
  for (const entry of plan.levels) {
    const source = sources.find(s => s.key === entry.key);
    check(source && existingPresetSkill(rows, source.preset)?.id === entry.skillId,
      "Canonical target name/category/UUID drifted after the manifest. No import/publication permitted.");
  }
}
function verifyApproval(approval, plan, journal) {
  check(approval.manifestHash === hash(plan) && approval.reviewOrganization === "KNOXITE Research Team" && approval.basis === "PROJECT_OWNER_CHAT_ATTESTATION" &&
    typeof approval.evidenceReference === "string" && approval.evidenceReference.length > 20 &&
    typeof approval.quotedDecision === "string" && approval.quotedDecision.includes("Our team has already checked it") &&
    approval.entries?.length === 30 && Number.isFinite(Date.parse(approval.recordedAt)), "A real research-team decision, evidence reference and exact 30-version review record are required. No automatic approval.");
  for (const entry of plan.levels) {
    const matches = approval.entries.filter(a => a.key === entry.key && a.level === entry.level);
    check(matches.length === 1 && matches[0].decision === "APPROVED_FOR_LOCAL_PILOT" && matches[0].sourceHash === entry.sourceHash && matches[0].payloadHash === entry.payloadHash &&
      matches[0].versionId === journal.versions[entry.key + ":" + entry.level]?.versionId, "Review does not cover this exact source/payload/version; publication stopped.");
  }
}
async function run(command) {
  check(["backup", "plan", "import-drafts", "publish-approved", "check"].includes(command), "Use backup, plan, import-drafts, publish-approved or check. No automatic approval command exists.");
  const sources = loadSources(), f = await admin.open(); let api;
  try {
    if (command === "backup") {
      if (read("backup.private.json", f, true)) { verifyBackup(f); console.log("Existing signed encrypted backup verified; retained without replacement."); return; }
      const before = await counts(f.db), u = new URL(f.env.DATABASE_URL);
      const result = spawnSync("docker", ["exec", "-i", local.layout.container, "sh", "-c", "IFS= read -r MYSQL_PWD; export MYSQL_PWD; exec mysqldump --user=knoxite_oauth --single-transaction --skip-lock-tables --no-tablespaces --set-gtid-purged=OFF --hex-blob --skip-extended-insert --skip-add-locks --routines --triggers --default-character-set=utf8mb4 knoxite_google_local_dev"],
        { input: decodeURIComponent(u.password) + "\n", encoding: "utf8", windowsHide: true, maxBuffer: 32*1024*1024 });
      check(result.status === 0 && result.stdout?.includes("CREATE TABLE `User`"), "Dedicated dump failed; no content writes attempted. Raw SQL/credentials suppressed.");
      const sql = result.stdout, after = await counts(f.db);
      check(JSON.stringify(before) === JSON.stringify(after), "Concurrent database activity changed row counts during backup; retry without replacing existing records.");
      for (const [table, n] of Object.entries(before)) {
        check(sql.includes("CREATE TABLE `" + table + "`"), "Backup is missing a table definition.");
        check(sql.split(/\r?\n/).filter(line => line.startsWith("INSERT INTO `" + table + "` ")).length === n, "Dump row count does not match the verified target.");
      }
      check(sql.includes("`lastInteractiveAt` datetime(3)"), "Backup does not preserve the SQL-only session overlay.");
      const encrypted = dpapi(sql); check(hash(dpapi(encrypted, true)) === hash(sql), "Encrypted backup round-trip failed.");
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, "before-collection.sql.dpapi"), encrypted, { flag: "wx", mode: 0o600 });
      write("backup.private.json", { instanceId: f.owner.instanceId, createdAt: new Date().toISOString(), file: "before-collection.sql.dpapi", encryptedHash: hash(encrypted), sqlHash: hash(sql), counts: before, rowCountsVerified: true, restoreRehearsed: false, protected: await admin.snapshot(f.db) }, f, true);
      console.log("Dedicated encrypted backup verified: all table definitions/row counts, SQL-only session column, byte-exact decrypt/readback and signed checksums. No restore or content write performed."); return;
    }
    verifyBackup(f);
    api = await login(f);
    if (command === "plan") {
      const existing = read("manifest.private.json", f, true);
      if (existing) { verifySources(existing, sources); console.log("Existing frozen 30-level manifest retained."); return; }
      const initial = await f.db.skill.findMany();
      check(initial.every(row => !sources.some(s => s.preset.name.toLowerCase() === row.name.trim().toLowerCase()) || sources.some(s => s.preset.name.toLowerCase() === row.name.trim().toLowerCase() && s.preset.category === row.category.toLowerCase())), "A canonical category conflicts; no initializer run.");
      // Reuse the existing authenticated, idempotent canonical initializer. This
      // materializes the SAME 80 approved presets; no student associations change.
      const catalog = await api.call("POST", "/admin/skill-catalog/initialize", {});
      const rows = await f.db.skill.findMany(), allBanks = await banks(f.db), levels = [];
      const { existingPresetSkill } = require(path.join(root, "knoxite-backend/dist/services/skillCatalog.js"));
      for (const source of sources) {
        const row = existingPresetSkill(rows, source.preset); check(row, "Canonical target UUID unresolved.");
        for (const level of ["BASIC", "ADVANCED"]) {
          check(!allBanks.some(b => b.skillId === row.id && b.level === level), "An existing bank needs explicit version reconciliation; no version overwritten.");
          levels.push({ key: source.key, name: source.preset.name, category: source.preset.category, skillId: row.id, level, sourceHash: source.sourceHash, payloadHash: fingerprint(payloadFor(source, row.id, level)), expectedVersion: 1, expectedInitialStatus: "DRAFT", questionCount: level === "BASIC" ? 10 : 6 });
        }
      }
      const manifest = { instanceId: f.owner.instanceId, createdAt: new Date().toISOString(), target: { frontend: "http://localhost:5181", api: "http://127.0.0.1:5019/api", database: "knoxite_google_local_dev", mysqlPort: 3319 }, catalogInitialization: catalog, levels };
      write("manifest.private.json", manifest, f, true); verifySources(manifest, sources);
      console.log(JSON.stringify({ manifestFrozen: true, skills: 15, levels: 30, questions: 240, canonicalRowsCreated: catalog.created, studentAssociationsChanged: false })); return;
    }
    const plan = read("manifest.private.json", f); verifySources(plan, sources); await verifyTargets(plan, sources, f.db);
    let journal = read("progress.private.json", f, true) || { instanceId: f.owner.instanceId, manifestHash: hash(plan), versions: {} };
    check(journal.manifestHash === hash(plan), "Progress journal belongs to a different manifest.");
    if (command === "publish-approved") verifyApproval(read("review-approved.private.json", f), plan, journal);
    for (const entry of plan.levels) {
      const key = entry.key + ":" + entry.level, payload = payloadFor(sources.find(s => s.key === entry.key), entry.skillId, entry.level);
      let bank = (await banks(f.db)).find(b => b.skillId === entry.skillId && b.level === entry.level);
      if (!bank && command === "import-drafts") {
        await api.call("POST", "/admin/assessments/versions", payload, 201);
        bank = (await banks(f.db)).find(b => b.skillId === entry.skillId && b.level === entry.level);
      }
      check(bank?.versions.length === 1, "Expected exactly one collection version; no competing version was overwritten.");
      let v = bank.versions[0];
      check(v.version === entry.expectedVersion && fingerprint(versionPayload(bank, v)) === entry.payloadHash, "Stored version does not match frozen content.");
      if (journal.versions[key]) check(journal.versions[key].versionId === v.id, "Stored version identity differs from journal.");
      if (command === "import-drafts") check(v.status === "DRAFT" && !v.validatedAt && !v.validatedById && !v.validationNotes, "Import cannot silently reuse reviewed/published content.");
      if (command === "publish-approved") {
        const approval = read("review-approved.private.json", f);
        const notes = `LOCAL PILOT ONLY. ${approval.reviewOrganization}; approval relayed by project owner, recorded ${approval.recordedAt}. Basis: ${approval.basis}. Evidence: ${approval.evidenceReference}. Decision: ${approval.quotedDecision}. Source SHA-256 ${entry.sourceHash}; payload SHA-256 ${entry.payloadHash}; exact version ${v.id}. No named faculty reviewer/formal review date supplied; not independently verified faculty/psychometric approval. Knowledge/applied-scenario assessment only, not hands-on/professional certification.`;
        check(v.status === "DRAFT" || v.status === "PUBLISHED", "Retired or unknown state requires explicit review.");
        if (v.validatedAt || v.validatedById || v.validationNotes) check(v.validatedAt && v.validatedById && v.validationNotes === notes, "Existing validation evidence differs/incomplete; no review record overwritten.");
        else { check(v.status === "DRAFT", "Published content has no validation evidence."); await api.call("POST", `/admin/assessments/versions/${v.id}/validate`, { validationNotes: notes }); }
        if (v.status !== "PUBLISHED") await api.call("POST", `/admin/assessments/versions/${v.id}/publish`, {});
        bank = (await banks(f.db)).find(b => b.id === bank.id); v = bank.versions[0];
      }
      if (command === "check") check(v.status === "PUBLISHED" && v.validatedAt && v.validatedById && v.validationNotes, "Collection is not fully published/review-recorded.");
      journal.versions[key] = { bankId: bank.id, versionId: v.id, version: v.version, status: v.status, itemIds: v.items.map(i => ({ key: i.prompt.split(": ")[0], itemId: i.id })) };
      write("progress.private.json", journal, f);
    }
    check(Object.keys(journal.versions).length === 30, "Collection progress incomplete.");
    console.log(JSON.stringify({ operation: command, versions: 30, questions: 240, states: Object.values(journal.versions).reduce((a,v) => ({ ...a, [v.status]: (a[v.status] || 0) + 1 }), {}), studentTiersAwardedByThisCommand: 0 }));
  } finally { if (api) await api.close(); await f.db.$disconnect(); }
}
module.exports = { KEYS, folder, hash, sign, read, write, loadSources, payloadFor, fingerprint, versionPayload, verifySources, verifyTargets, verifyApproval, banks, run };
if (require.main === module) run(process.argv[2]).catch(e => { console.error(e.safeMessage || "Collection stopped safely. Private backup/progress retained; SQL, credentials and tokens suppressed."); process.exitCode = 1; });
