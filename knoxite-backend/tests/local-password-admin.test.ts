import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { loadConfig, pilotAccountAllowed, pilotSessionAccountAllowed } from "../lib/config";
import { assertAccountAllowed } from "../services/authSessions";
const tool = require(resolve(process.cwd(), "development/oauthLocalAdmin.cjs"));
const env = {
  JWT_SECRET: "synthetic-admin-key-".repeat(3), NODE_ENV: "development", HOST: "127.0.0.1", PORT: "5019",
  DATABASE_URL: "mysql://knoxite_oauth:synthetic-only@127.0.0.1:3319/knoxite_google_local_dev",
  PUBLIC_APP_URL: "http://localhost:5181", CORS_ORIGINS: "http://localhost:5181",
  KNOXITE_LOCAL_OAUTH_PILOT: "true", GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: "aasample1234lag@student.fatima.edu.ph",
  KNOXITE_LOCAL_PASSWORD_ADMIN_ID: randomUUID(), KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: "admin-0123456789abcdef@admin.knoxite.test",
};
test("password administrator exception is exact ID/email/role and never changes Google/student allowlisting", () => {
  const config = loadConfig(env), user = { id: env.KNOXITE_LOCAL_PASSWORD_ADMIN_ID, email: env.KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL, role: "ADMIN" };
  assert.equal(pilotSessionAccountAllowed(user, config), true);
  assert.equal(pilotAccountAllowed(user.email, config), false);
  assert.equal(pilotAccountAllowed(env.GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL, config), true);
  for (const changes of [{ id: randomUUID() }, { id: undefined }, { email: "other@admin.knoxite.test" }, { role: "USER" }])
    assert.equal(pilotSessionAccountAllowed({ ...user, ...changes }, config), false);
  const noAdmin = loadConfig({ ...env, KNOXITE_LOCAL_PASSWORD_ADMIN_ID: "", KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: "" });
  assert.equal(pilotSessionAccountAllowed(user, noAdmin), false);
});
test("admin override cannot activate on production, recovery-1 or original database and partial config fails closed", () => {
  for (const change of [{ NODE_ENV: "production" }, { KNOXITE_LOCAL_OAUTH_PILOT: "false" },
    { KNOXITE_SYNTHETIC_SANDBOX: "true" }, { DATABASE_URL: env.DATABASE_URL.replace(":3319/knoxite_google_local_dev", ":3306/knoxite") },
    { PUBLIC_APP_URL: "http://localhost:5180" }, { HOST: "0.0.0.0" }, { PORT: "5012" },
    { KNOXITE_LOCAL_PASSWORD_ADMIN_ID: "" }, { KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: "" },
    { KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: env.GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL }])
    assert.throws(() => loadConfig({ ...env, ...change }));
});
test("suspension and verified-status checks still apply to an explicitly configured local administrator", () => {
  const config = loadConfig(env), user = { id: env.KNOXITE_LOCAL_PASSWORD_ADMIN_ID, email: env.KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL, role: "ADMIN" as const, emailVerifiedAt: new Date(), isSuspended: false };
  assert.doesNotThrow(() => assertAccountAllowed(user, config));
  assert.throws(() => assertAccountAllowed({ ...user, isSuspended: true }, config), /suspended/);
  assert.throws(() => assertAccountAllowed({ ...user, emailVerifiedAt: null }, config), /Verify/);
});
test("private administrator manifest is bound to its dedicated instance and signed metadata", () => {
  const owner = { instanceId: "synthetic-owned-instance" };
  const value = { format: 1, instanceId: owner.instanceId, userId: env.KNOXITE_LOCAL_PASSWORD_ADMIN_ID, email: env.KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL, createdAt: new Date().toISOString(), passwordCiphertext: "01".repeat(100) };
  const record = { value, proof: tool.sign(value, env) };
  assert.deepEqual(tool.verifyManifest(record, env, owner), record);
  assert.throws(() => tool.verifyManifest(record, env, { instanceId: "foreign" }));
  assert.throws(() => tool.verifyManifest(record, { JWT_SECRET: "different" }, owner));
  for (const changes of [{ userId: randomUUID() }, { email: "admin-fedcba9876543210@admin.knoxite.test" }, { passwordCiphertext: "plain-text-is-forbidden" }])
    assert.throws(() => tool.verifyManifest({ ...record, value: { ...value, ...changes } }, env, owner));
});
