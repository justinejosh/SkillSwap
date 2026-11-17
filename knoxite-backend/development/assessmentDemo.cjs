// Explicit local developer command only. No startup hook or production import.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const profiles = require("./sandboxProfiles.cjs");
const ownership = require("./databaseIdentity.cjs");
const identity = require("./identity.cjs");
const root = path.resolve(__dirname, "../..");
const LABEL = "SYNTHETIC TESTING ONLY — NOT SUBJECT-REVIEWED";
const KEYS = ["python-programming-fundamentals", "bookkeeping-fundamentals", "introductory-statistics", "english-grammar", "food-safety-and-hygiene", "chess-fundamentals", "javascript-fundamentals"];
const hash = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");
function requireCondition(ok, message) {
  if (!ok) { const error = new Error(message); error.safeMessage = message; throw error; }
}
function loadDrafts() {
  return KEYS.map((key) => {
    const text = fs.readFileSync(path.join(root, "knoxite-backend/content/drafts", key + ".json"), "utf8");
    const draft = JSON.parse(text);
    requireCondition(draft.presetKey === key && draft.draftStatus === "DRAFT_UNREVIEWED_NOT_FOR_STUDENT_PUBLICATION" && draft.review.status === "NOT_REVIEWED" && draft.review.reviewer === null && draft.review.evidence === null, "Only the explicitly unreviewed demonstration drafts are supported.");
    return { ...draft, sourceHash: hash(text) };
  });
}
function payloadFor(draft, skillId, level) {
  const body = structuredClone(draft[level.toLowerCase()]);
  requireCondition(body.level === level && body.passingPercent === 80 && body.questionCount === (level === "BASIC" ? 10 : 6), "Draft assessment parameters differ from the authorized demonstration.");
  return { ...body, skillId, title: `${LABEL} | ${draft.skillName} | ${level}`,
    learningOutcomes: `${LABEL}\nPersistent local software demonstration only. No faculty, institutional or professional approval is claimed.\n${draft.scope}`,
    items: body.items.map((item) => ({ ...item, prompt: `${LABEL}\n${item.prompt}` })),
  };
}
function contentFingerprint(body) {
  return hash({ questionCount: body.questionCount, passingPercent: body.passingPercent, durationMinutes: body.durationMinutes, learningOutcomes: body.learningOutcomes,
    items: body.items.map((i) => ({ kind: i.kind, prompt: i.prompt, competency: i.competency, rubric: i.rubric, points: i.points,
      options: i.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })).sort((a, b) => a.text.localeCompare(b.text)),
    })).sort((a, b) => a.prompt.localeCompare(b.prompt)),
  });
}
function validationNotes(body, profile) {
  return `${LABEL}\nAdministrative software-fixture validation for the verified ${profile} loopback sandbox only: structured items, keys/rationales and applied-choice format checked for demonstration. NOT an academic subject-expert review, faculty qualification, campus content approval or professional certification. User authorized persistent synthetic demonstration. Real-student publication remains unauthorized. Content fingerprint: ${contentFingerprint(body)}.`;
}
function existingVersion(banks, body, adminId, notes) {
  const bank = banks.find((b) => b.skillId === body.skillId && b.level === body.level);
  if (!bank) return null;
  requireCondition(bank.title === body.title && bank.versions.length === 1, "An existing assessment bank requires manual review; no version was overwritten or retired.");
  const version = bank.versions[0];
  requireCondition(version.createdById === adminId && contentFingerprint(version) === contentFingerprint(body), "Existing bank content/ownership differs; existing assessment history was retained.");
  requireCondition(version.status === "DRAFT" || version.status === "PUBLISHED", "A retired demonstration requires explicit administrator review.");
  if (version.validatedAt || version.validatedById || version.validationNotes)
    requireCondition(version.validatedById === adminId && !!version.validatedAt && version.validationNotes === notes, "Existing validation metadata differs; no approval was replaced.");
  if (version.status === "PUBLISHED") requireCondition(!!version.validatedAt && version.validationNotes === notes, "Published test metadata is incomplete.");
  return version;
}
async function openVerifiedSandbox() {
  requireCondition(process.env.NODE_ENV !== "production", "The demonstration command is prohibited in production.");
  const branch = spawnSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8", windowsHide: true });
  requireCondition(branch.status === 0 && branch.stdout.trim() === "dev-justine", "Use the existing dev-justine checkout.");
  const base = path.join(process.env.LOCALAPPDATA || "", "Knoxite/sandbox");
  const selection = path.join(base, "active-profile.json");
  const profile = profiles.layout(fs.existsSync(selection) ? JSON.parse(fs.readFileSync(selection, "utf8")).profile : "legacy");
  const directory = path.join(base, profile.folder);
  const settingsText = fs.readFileSync(path.join(directory, "settings.json"), "utf8");
  const settings = JSON.parse(settingsText);
  const checkpoint = JSON.parse(fs.readFileSync(path.join(directory, "settings.verified.json"), "utf8"));
  requireCondition(profiles.forSettings(settings).name === profile.name, "Selected sandbox profile and private settings differ.");
  const inspect = (args) => {
    const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
    requireCondition(r.status === 0, "Docker ownership metadata is unavailable; no import attempted.");
    return JSON.parse(r.stdout)[0];
  };
  const metadata = { container: inspect(["inspect", profile.container]), volume: inspect(["volume", "inspect", profile.volume]) };
  requireCondition(ownership.ownsDatabase(ownership.ownershipReport(settings, metadata.container, metadata.volume)) && ownership.checkpointMatches(checkpoint, metadata) && checkpoint.settingsText === settingsText, "Container/volume/checkpoint ownership failed; no import attempted.");
  const { requireSyntheticEnvironment } = require(path.join(root, "knoxite-backend/dist/development/safety.js"));
  const url = requireSyntheticEnvironment(settings.environment);
  const api = `http://127.0.0.1:${profile.apiPort}/api`;
  const challenge = crypto.randomBytes(32).toString("hex");
  const response = await fetch(`http://127.0.0.1:${profile.apiPort}/__synthetic/status?challenge=${challenge}`, { redirect: "error", signal: AbortSignal.timeout(5000) });
  const health = await response.json();
  requireCondition(response.ok && health.synthetic === true && health.instanceId === settings.instanceId && identity.verify(settings, challenge, health), "Signed backend ownership proof failed; no import attempted.");
  const { PrismaClient } = require(path.join(root, "knoxite-backend/node_modules/@prisma/client"));
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    requireCondition((await db.user.findMany({ select: { email: true } })).every((u) => /\.(test|example)$/i.test(u.email)), "This database contains a non-synthetic email address; publication refused.");
  } catch (error) { await db.$disconnect(); throw error; }
  async function call(method, endpoint, status, token, body) {
    const r = await fetch(api + endpoint, { method, redirect: "error", signal: AbortSignal.timeout(15000), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    requireCondition(r.status === status, `${method} ${endpoint} returned ${r.status}; expected ${status}. No checks were bypassed.`);
    return r.json();
  }
  return { settings, settingsText, profile, directory, db, api, call };
}
async function protectedSnapshot(db) {
  return hash(await Promise.all([
    db.user.findMany({ orderBy: { id: "asc" }, include: { offeredSkills: { orderBy: { id: "asc" } }, wantedSkills: { orderBy: { id: "asc" } } } }),
    db.skill.findMany({ orderBy: { id: "asc" } }), db.userOfferedSkill.findMany({ orderBy: { id: "asc" } }),
    db.assessmentAttempt.findMany({ orderBy: { id: "asc" } }), db.assessmentAttemptItem.findMany({ orderBy: { id: "asc" } }),
    db.program.findMany({ orderBy: { id: "asc" }, include: { yearLevels: { orderBy: { id: "asc" } } } }), db.department.findMany({ orderBy: { id: "asc" } }),
    db.swap.findMany({ orderBy: { id: "asc" } }), db.swapRequest.findMany({ orderBy: { id: "asc" } }), db.swapSession.findMany({ orderBy: { id: "asc" } }),
    db.sessionConfirmation.findMany({ orderBy: { id: "asc" } }), db.review.findMany({ orderBy: { id: "asc" } }),
  ]));
}
async function run(command) {
  requireCondition(command === "prepare" || command === "check", "Use assessmentDemo.cjs prepare or check. No arbitrary database/API targets are accepted.");
  const f = await openVerifiedSandbox();
  let token, lock;
  const lockPath = path.join(f.directory, "assessment-demo.lock");
  try {
    // Exclusive local lock. A stale lock is retained for manual review, never
    // removed by guessing its owner or resetting the database.
    if (command === "prepare") lock = fs.openSync(lockPath, "wx");
    const before = await protectedSnapshot(f.db);
    const admin = f.settings.accounts.find((a) => a.role === "ADMIN");
    requireCondition(!!admin && admin.email.endsWith("@students.knoxite.test"), "An existing synthetic administrator is required.");
    const login = await f.call("POST", "/auth/login", 200, undefined, { email: admin.email, password: admin.password });
    token = login.token; requireCondition(login.user.role === "ADMIN", "The signed-in account is not an administrator.");
    const catalog = await f.call("GET", "/profile/skill-catalog", 200, token);
    const { validateBankInput } = require(path.join(root, "knoxite-backend/dist/services/bankValidation.js"));
    const banks = await f.call("GET", "/admin/assessments", 200, token);
    const plans = loadDrafts().flatMap((draft) => {
      const p = catalog.presets.find((p) => p.key === draft.presetKey);
      requireCondition(p && p.skillId && !p.conflict && p.name === draft.skillName, "A canonical preset is missing or conflicting; no skills were created.");
      return ["BASIC", "ADVANCED"].map((level) => {
        const body = payloadFor(draft, p.skillId, level); validateBankInput(body);
        const notes = validationNotes(body, f.profile.name);
        return { key: draft.presetKey, sourceHash: draft.sourceHash, body, notes, previous: existingVersion(banks, body, login.user.id, notes) };
      });
    }); // Preflight every target before any bank write.
    let created = 0, reused = 0;
    const manifest = [];
    for (const plan of plans) {
      let version = plan.previous;
      if (command === "check") requireCondition(version?.status === "PUBLISHED", "One or more demonstration levels are not published. Run prepare only after reviewing the documented scope.");
      else {
        if (!version) { version = await f.call("POST", "/admin/assessments/versions", 201, token, plan.body); created++; }
        else reused++;
        if (version.status === "DRAFT") {
          if (!version.validatedAt) await f.call("POST", `/admin/assessments/versions/${version.id}/validate`, 200, token, { validationNotes: plan.notes });
          await f.call("POST", `/admin/assessments/versions/${version.id}/publish`, 200, token, {});
        }
      }
      manifest.push({ presetKey: plan.key, skillId: plan.body.skillId, level: plan.body.level, versionId: version.id, questionCount: plan.body.questionCount, sourceHash: plan.sourceHash, contentFingerprint: contentFingerprint(plan.body) });
    }
    const final = await f.call("GET", "/admin/assessments", 200, token);
    for (const plan of plans) requireCondition(existingVersion(final, plan.body, login.user.id, plan.notes)?.status === "PUBLISHED", "Final bank verification failed; existing records were retained.");
    requireCondition(await protectedSnapshot(f.db) === before && fs.readFileSync(path.join(f.directory, "settings.json"), "utf8") === f.settingsText, "Protected sandbox state changed during the operation; manual review is required.");
    const report = { syntheticOnly: true, academicReview: "NOT SUBJECT-REVIEWED", profile: f.profile.name, skills: KEYS.length, banks: manifest.length, questions: 112, createdVersions: created, reusedVersions: reused, protectedRecordsUnchanged: true, versions: manifest };
    if (command === "prepare") fs.writeFileSync(path.join(f.directory, "assessment-demo.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
    console.log(JSON.stringify({ ...report, versions: manifest.map(({ presetKey, level, questionCount }) => ({ presetKey, level, questionCount })) }));
    return report;
  } finally {
    if (token) await f.call("POST", "/auth/logout", 200, token).catch(() => {});
    await f.db.$disconnect();
    if (lock !== undefined) { fs.closeSync(lock); fs.unlinkSync(lockPath); }
  }
}
module.exports = { LABEL, KEYS, payloadFor, contentFingerprint, existingVersion, loadDrafts, validationNotes, openVerifiedSandbox, protectedSnapshot, run };
if (require.main === module) run(process.argv[2]).catch((error) => {
  console.error(`[SANDBOX_ASSESSMENTS] ${error.safeMessage || "Operation failed safely; check the verified sandbox, build and private configuration. No credentials were printed."}`);
  process.exitCode = 1;
});
