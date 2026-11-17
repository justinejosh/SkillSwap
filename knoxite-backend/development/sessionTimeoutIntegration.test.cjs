// Explicit-only MySQL integration: guards the dedicated owned OAuth DB before
// creating temporary synthetic fixtures. Never loaded by normal npm test/start.
const { test, before, after } = require("node:test"), assert = require("node:assert/strict");
const { once } = require("node:events"), { randomUUID, randomBytes, createHmac } = require("node:crypto");
const bcrypt = require("../node_modules/bcrypt"), jwt = require("../node_modules/jsonwebtoken");
const local = require("./oauthLocal.cjs"), migration = require("./sessionTimeoutMigration.cjs");
const { createApp } = require("../dist/app"), { loadConfig } = require("../dist/lib/config");
const { issueSession } = require("../dist/services/authSessions");
const { sessionLimits } = require("../dist/services/sessionPolicy");
let db, server, base, config, baseline; const users = {}, ids = [];
before(async () => {
  const settings = local.verifiedSettings();
  assert.equal(settings.config.google.enabled, false); assert.equal(settings.config.sessionTimeouts, true);
  db = local.client(settings.env); baseline = await migration.snapshot(db); migration.empty(baseline);
  config = { ...loadConfig({ JWT_SECRET: randomBytes(48).toString("hex"), INSTITUTION_EMAIL_DOMAINS: "session.fixture.test", CORS_ORIGINS: "http://127.0.0.1:5174" }), sessionTimeouts: true };
  for (const role of ["USER", "ADMIN"]) {
    const user = await db.user.create({ data: { name: "Temporary synthetic session fixture", email: randomUUID() + "lag@session.fixture.test", role, emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash("synthetic-password-only", 4) } });
    users[role] = user; ids.push(user.id);
  }
  const mailer = Object.assign(async () => { throw new Error("Synthetic mail disabled"); }, { isConfigured: () => false });
  server = createApp(db, config, mailer).listen(0, "127.0.0.1"); await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  if (server) { server.close(); await once(server, "close"); }
  if (db) {
    try {
      // Delete only records created for these two exact run-owned fixture IDs.
      await db.emailVerificationToken.deleteMany({ where: { userId: { in: ids } } });
      await db.authSession.deleteMany({ where: { userId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
      if (baseline) assert.equal(migration.digest((await migration.snapshot(db)).rows), migration.digest(baseline.rows), "Original OAuth database rows must be identical after fixture cleanup");
    } finally { await db.$disconnect(); }
  }
});
async function session(role) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${users[role].id} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: users[role].id } });
    const result = await issueSession(tx, config, user, "Synthetic session test");
    return { ...result, id: jwt.decode(result.token).jti };
  });
}
async function call(path, s, body, method = body ? "POST" : "GET") {
  const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${s.token}`, Origin: config.origins[0], ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
async function row(s) { return (await db.$queryRaw`SELECT * FROM AuthSession WHERE id = ${s.id}`)[0]; }
for (const role of ["USER", "ADMIN"]) {
  test(`${role}: MySQL session/JWT limits and read-only polling`, async () => {
    const s = await session(role), first = await row(s), limits = sessionLimits(role);
    const claims = jwt.decode(s.token); assert.equal(claims.exp - claims.iat, limits.absoluteMs / 1000);
    assert.equal(+first.expiresAt - +first.createdAt, limits.absoluteMs);
    assert.equal(+first.expiresAt, claims.exp * 1000);
    assert.equal(+first.lastInteractiveAt, +first.createdAt);
    for (let i = 0; i < 3; i++) assert.equal((await call("/auth/session-status", s)).status, 200);
    // Same authentication path used by chat polling: no request-side touch.
    await call("/chat/conversation/absent-fixture", s);
    assert.equal(+(await row(s)).lastInteractiveAt, +first.lastInteractiveAt);
  });
  test(`${role}: explicit activity renews idle only; forged timestamp/body rejected`, async () => {
    const s = await session(role), now = new Date(), last = new Date(+now - 5 * 60_000), created = new Date(+now - 10 * 60_000);
    await db.$executeRaw`UPDATE AuthSession SET createdAt = ${created}, lastInteractiveAt = ${last} WHERE id = ${s.id}`;
    const first = await row(s), prior = await call("/auth/session-status", s);
    assert.equal((await call("/auth/session-activity", s, { interaction: "key", timestamp: "2099-01-01" })).status, 422);
    const renewed = await call("/auth/session-activity", s, { interaction: "key" }); assert.equal(renewed.status, 200);
    assert.ok(+(await row(s)).lastInteractiveAt > +last);
    assert.equal(+(await row(s)).expiresAt, +first.expiresAt);
    assert.equal(renewed.body.absoluteExpiresAt, prior.body.absoluteExpiresAt);
  });
  test(`${role}: idle expiry and absolute expiry cannot be revived`, async () => {
    const limits = sessionLimits(role);
    for (const kind of ["idle", "absolute"]) {
      const s = await session(role), now = new Date();
      const created = new Date(+now - (kind === "idle" ? limits.idleMs + 10_000 : limits.absoluteMs + 10_000));
      const last = new Date(+now - (kind === "idle" ? limits.idleMs + 1000 : 1000));
      await db.$executeRaw`UPDATE AuthSession SET createdAt = ${created}, lastInteractiveAt = ${last} WHERE id = ${s.id}`;
      assert.equal((await call("/auth/session-status", s)).status, 401);
      assert.equal((await call("/auth/session-activity", s, { interaction: "stay" })).status, 401);
      assert.equal(+(await row(s)).lastInteractiveAt, +last);
    }
  });
  test(`${role}: logout/activity race always ends in a revoked session`, async () => {
    const s = await session(role);
    const [activity, logout] = await Promise.all([call("/auth/session-activity", s, { interaction: "stay" }), call("/auth/logout", s, {}, "POST")]);
    assert.ok([200, 401].includes(activity.status)); assert.equal(logout.status, 200);
    assert.ok((await row(s)).revokedAt); assert.equal((await call("/auth/session-status", s)).status, 401);
  });
  test(`${role}: password reset revokes policy sessions`, async () => {
    const s = await session(role), token = randomBytes(32).toString("base64url");
    const tokenHash = createHmac("sha256", config.jwtSecret).update(`knoxite:password-reset:v1:${token}`).digest("hex");
    await db.emailVerificationToken.create({ data: { userId: users[role].id, tokenHash, expiresAt: new Date(Date.now() + 60_000) } });
    const reset = await call("/auth/reset-password", s, { token, newPassword: "synthetic-new-password" }); assert.equal(reset.status, 200);
    assert.equal((await call("/auth/session-status", s)).status, 401); assert.ok((await row(s)).revokedAt);
  });
}
test("expired signed JWT, null legacy timestamp and missing policy claim are denied", async () => {
  const s = await session("USER");
  const claims = jwt.decode(s.token);
  const expired = { ...s, token: jwt.sign({ ...claims, exp: Math.floor(Date.now()/1000) - 1 }, config.jwtSecret) };
  assert.equal((await call("/auth/session-status", expired)).status, 401);
  const legacyClaims = { ...claims }; delete legacyClaims.sessionPolicy;
  assert.equal((await call("/auth/session-status", { ...s, token: jwt.sign(legacyClaims, config.jwtSecret) })).status, 401);
  await db.$executeRaw`UPDATE AuthSession SET lastInteractiveAt = NULL WHERE id = ${s.id}`;
  assert.equal((await call("/auth/session-status", s)).status, 401);
});
test("suspension revokes student sessions without deleting account/history", async () => {
  const student = await session("USER"), admin = await session("ADMIN");
  assert.equal((await call("/admin/users/" + users.USER.id, admin, undefined, "DELETE")).status, 200);
  assert.equal((await call("/auth/session-status", student)).status, 401);
  assert.equal(await db.user.count({ where: { id: users.USER.id } }), 1);
  await db.user.update({ where: { id: users.USER.id }, data: { isSuspended: false } });
});
test("observed role changes permanently revoke the old session", async () => {
  const s = await session("USER");
  await db.user.update({ where: { id: users.USER.id }, data: { role: "ADMIN" } });
  assert.equal((await call("/auth/session-status", s)).status, 401);
  await db.user.update({ where: { id: users.USER.id }, data: { role: "USER" } });
  assert.equal((await call("/auth/session-status", s)).status, 401);
});
