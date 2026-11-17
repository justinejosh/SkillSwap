import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { privateSandbox } from "./state";

// Test-only: all fixture writes stay inside one uncommitted transaction. Nested
// application transactions reuse that connection; teardown rolls back ONLY
// fixture work. No schema commands, shared publication or production bypass.
export async function isolatedAssessmentApp() {
  const root = process.cwd(), require = createRequire(join(root, "package.json"));
  const { settings, directory, profile } = privateSandbox();
  const dev = join(root, "knoxite-backend/development");
  const ownership = require(join(dev, "databaseIdentity.cjs")), identity = require(join(dev, "identity.cjs"));
  function check(ok: boolean) { if (!ok) throw new Error("Isolated assessment fixture guard failed"); }
  check(spawnSync("git", ["branch", "--show-current"], { encoding: "utf8" }).stdout.trim() === "dev-justine");
  const inspect = (args: string[]) => { const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true }); check(r.status === 0); return JSON.parse(r.stdout)[0]; };
  const metadata = { container: inspect(["inspect", profile.container]), volume: inspect(["volume", "inspect", profile.volume]) };
  const text = readFileSync(join(directory, "settings.json"), "utf8");
  const checkpoint = JSON.parse(readFileSync(join(directory, "settings.verified.json"), "utf8"));
  check(ownership.ownsDatabase(ownership.ownershipReport(settings, metadata.container, metadata.volume)) && ownership.checkpointMatches(checkpoint, metadata) && checkpoint.settingsText === text);
  const u = new URL(settings.environment.DATABASE_URL);
  check(u.hostname === "127.0.0.1" && u.port === String(profile.dbPort) && u.pathname === "/" + profile.dbName && profile.dbName.endsWith("_dev") && settings.environment.KNOXITE_SYNTHETIC_SANDBOX === "true");
  const challenge = randomBytes(32).toString("hex");
  const health = await (await fetch(`http://127.0.0.1:${profile.apiPort}/__synthetic/status?challenge=${challenge}`, { redirect: "error" })).json();
  check(health.instanceId === settings.instanceId && identity.verify(settings, challenge, health));
  const { PrismaClient } = require(join(root, "knoxite-backend/node_modules/@prisma/client"));
  const shared = new PrismaClient({ datasources: { db: { url: settings.environment.DATABASE_URL } } });
  const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  const snapshot = async () => hash(await Promise.all([
    shared.assessmentBank.findMany({ orderBy: { id: "asc" } }), shared.assessmentVersion.findMany({ orderBy: { id: "asc" } }),
    shared.assessmentAttempt.findMany({ orderBy: { id: "asc" } }), shared.userOfferedSkill.findMany({ orderBy: { id: "asc" } }),
    shared.program.findMany({ orderBy: { id: "asc" }, include: { yearLevels: { orderBy: { id: "asc" } } } }),
    shared.department.findMany({ orderBy: { id: "asc" } }), shared.swap.findMany({ orderBy: { id: "asc" } }), shared.review.findMany({ orderBy: { id: "asc" } }),
    shared.userReport.findMany({ orderBy: { id: "asc" } }), shared.swapRequest.findMany({ orderBy: { id: "asc" } }),
    shared.swapSession.findMany({ orderBy: { id: "asc" } }), shared.sessionConfirmation.findMany({ orderBy: { id: "asc" } }),
    shared.assessmentAttemptItem.findMany({ orderBy: { id: "asc" } }),
    shared.skill.findMany({ orderBy: { id: "asc" } }),
    shared.user.findMany({ orderBy: { id: "asc" }, include: { offeredSkills: { orderBy: { id: "asc" } }, wantedSkills: { orderBy: { id: "asc" } } } }),
  ]));
  const before = await snapshot();
  let release!: () => void, resolve!: (db: any) => void, reject!: (e: unknown) => void, failure: unknown;
  const gate = new Promise<void>((r) => { release = r; });
  const ready = new Promise<any>((r, j) => { resolve = r; reject = j; });
  const rollback = new Error("INTENTIONAL_TEST_FIXTURE_ROLLBACK");
  const finished = shared.$transaction(async (tx: any) => {
    let proxy: any;
    proxy = new Proxy(tx, { get(target, prop) {
      if (prop === "$transaction") return async (fn: any) => fn(proxy);
      const value = target[prop]; return typeof value === "function" ? value.bind(target) : value;
    } });
    resolve(proxy); await gate; throw rollback;
  }, { isolationLevel: "Serializable", timeout: 240000, maxWait: 10000 }).catch((e: unknown) => { if (e !== rollback) { failure = e; reject(e); } });
  let server: any;
  try {
  const db = await ready;
  const bcrypt = require(join(root, "knoxite-backend/node_modules/bcrypt"));
  const password = randomBytes(32).toString("base64url");
  const admin = await db.user.create({ data: { name: "SYNTHETIC FIXTURE ADMIN - NOT FACULTY", email: `admin-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`, role: "ADMIN", emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password, 4) } });
  const { loadConfig } = require(join(root, "knoxite-backend/dist/lib/config.js"));
  const { createApp } = require(join(root, "knoxite-backend/dist/app.js"));
  const deliveries = new Map<string, string>();
  const config = loadConfig({ NODE_ENV: "development", JWT_SECRET: randomBytes(48).toString("base64url"), INSTITUTION_EMAIL_DOMAINS: "assessment.knoxite.test", CAMPUS_EMAIL_SUFFIX: "lag", EMAIL_VERIFICATION_REQUIRED: "true", PUBLIC_APP_URL: "http://localhost:5180", CORS_ORIGINS: "http://localhost:5180,http://localhost:5181,http://127.0.0.1:5174", GOOGLE_SIGN_IN_ENABLED: "false" });
  server = createApp(db, config, async (email: string, link: string) => { deliveries.set(email, link); }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const api = `http://127.0.0.1:${server.address().port}/api`;
  async function call(method: string, path: string, status: number, token?: string, body?: unknown) {
    const r = await fetch(api + path, { method, redirect: "error", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.status !== status) throw new Error(`${method} ${path} expected ${status}, received ${r.status}`);
    return r.json() as Promise<any>;
  }
  return { db, api, call, password, admin, deliveries,
    async sharedUnchanged() { check(await snapshot() === before); },
    async close() {
      try {
        await new Promise<void>((r, j) => server.close((e: unknown) => e ? j(e) : r()));
      } finally { release(); await finished; }
      try { check(!failure); check(await snapshot() === before); check(readFileSync(join(directory, "settings.json"), "utf8") === text); }
      finally { await shared.$disconnect(); }
    },
  };
  } catch (error) {
    if (server?.listening) await new Promise<void>((r) => server.close(() => r()));
    release(); await finished; await shared.$disconnect(); throw error;
  }
}
