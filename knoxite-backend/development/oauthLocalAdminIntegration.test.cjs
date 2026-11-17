// Explicit operator test: verifies the owned OAuth DB, then rolls ALL fixtures
// back. No real Google account login, session mutation or content publication.
const test = require("node:test"), assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const { once } = require("node:events");
const local = require("./oauthLocalAdmin.cjs");
const bcrypt = require("../node_modules/bcrypt");
test("verified OAuth MySQL rollback fixture: separate student/admin, password checks, owner privacy and session controls", async () => {
  const f = await local.open(), before = await local.snapshot(f.db);
  const marker = new Error("ROLLBACK_LOCAL_ADMIN_FIXTURES");
  let rolledBack = false;
  try {
    try {
      await f.db.$transaction(async tx => {
        let db;
        db = new Proxy(tx, { get(target, prop) {
          if (prop === "$transaction") return async fn => fn(db);
          const v = target[prop]; return typeof v === "function" ? v.bind(target) : v;
        } });
        const password = randomBytes(32).toString("base64url"), passwordHash = await bcrypt.hash(password, 4);
        const student = await db.user.create({ data: { name: "UNCOMMITTED ADMIN TEST STUDENT", email: randomBytes(8).toString("hex") + "lag@admin-fixture.knoxite.test", passwordHash, emailVerifiedAt: new Date() } });
        const admin = await db.user.create({ data: { name: "UNCOMMITTED ADMIN TEST", email: "admin-" + randomBytes(8).toString("hex") + "@admin.knoxite.test", role: "ADMIN", passwordHash, emailVerifiedAt: new Date() } });
        assert.notEqual(student.id, admin.id);
        const config = { ...f.config, google: { ...f.config.google, enabled: false }, institutionDomains: ["admin-fixture.knoxite.test"],
          localOAuthPilot: { email: student.email, passwordAdmin: { id: admin.id, email: admin.email } } };
        const mailer = Object.assign(async () => { throw new Error("No fixture delivery"); }, { isConfigured: () => false });
        const server = require("../dist/app.js").createApp(db, config, mailer).listen(0, "127.0.0.1");
        await once(server, "listening");
        const api = `http://127.0.0.1:${server.address().port}/api`;
        const call = async (method, route, body, token, status) => {
          const r = await fetch(api + route, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
          assert.equal(r.status, status, "Unexpected fixture HTTP status"); return r.json();
        };
        try {
          await call("POST", "/auth/login", { email: admin.email, password: "incorrect-fixture-only" }, null, 401);
          const a = await call("POST", "/auth/login", { email: admin.email, password }, null, 200);
          const s = await call("POST", "/auth/login", { email: student.email, password }, null, 200);
          assert.equal(a.user.role, "ADMIN"); assert.equal(s.user.role, "USER"); assert.equal(a.user.passwordHash, undefined);
          await call("GET", "/admin/assessments", null, a.token, 200);
          await call("GET", "/admin/assessments", null, s.token, 403);
          await call("GET", "/assessments/attempts/" + randomUUID(), null, a.token, 403);
          await call("GET", "/assessments/attempts/" + randomUUID(), null, s.token, 404);
          // This isolated fixture keeps Google disabled; enabled-path ADMIN
          // rejection is exercised separately by mocked signed-identity tests.
          await call("POST", "/auth/google/link/challenge", {}, a.token, 503);
          const profile = await call("GET", "/profile", null, a.token, 200); assert.equal(profile.id, admin.id); assert.equal(profile.passwordHash, undefined);
          const timing = await call("GET", "/auth/session-status", null, a.token, 200);
          assert.ok(Math.abs(Date.parse(timing.idleExpiresAt) - Date.parse(timing.serverNow) - 15*60_000) < 3000);
          assert.ok(Math.abs(Date.parse(timing.absoluteExpiresAt) - Date.parse(timing.serverNow) - 4*3600_000) < 3000);
          await call("POST", "/auth/logout", {}, a.token, 200);
          await call("GET", "/admin/assessments", null, a.token, 401);
          const current = await call("POST", "/auth/login", { email: admin.email, password }, null, 200);
          await db.user.update({ where: { id: admin.id }, data: { isSuspended: true } });
          await call("GET", "/admin/assessments", null, current.token, 403);
          await db.user.update({ where: { id: admin.id }, data: { isSuspended: false } });
          await db.$executeRaw`UPDATE AuthSession SET lastInteractiveAt = ${new Date(Date.now() - 16*60_000)} WHERE userId = ${admin.id}`;
          await call("GET", "/admin/assessments", null, current.token, 401);
        } finally { await new Promise((r,j) => server.close(e => e ? j(e) : r())); }
        throw marker;
      }, { timeout: 30000, isolationLevel: "Serializable" });
    } catch (e) { if (e !== marker) throw e; rolledBack = true; }
    assert.equal(rolledBack, true);
    assert.deepEqual(await local.snapshot(f.db), before, "Existing database records changed outside the rollback fixture");
  } finally { await f.db.$disconnect(); }
});
