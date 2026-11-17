import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { randomBytes, createHash } from "node:crypto";
import { once } from "node:events";
import { eligibleGoogleIdentity } from "../services/googleIdentity";
const local = require(resolve(process.cwd(), "development/oauthLocal.cjs"));
const env = {
  NODE_ENV: "development", HOST: "127.0.0.1", PORT: "5019", DATABASE_URL: "mysql://knoxite_oauth:synthetic-fixture-only@127.0.0.1:3319/knoxite_google_local_dev",
  JWT_SECRET: "synthetic-local-config-key-".repeat(3), PUBLIC_APP_URL: "http://localhost:5181", CORS_ORIGINS: "http://localhost:5181", INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph", CAMPUS_EMAIL_SUFFIX: "lag", EMAIL_VERIFICATION_REQUIRED: "true", GOOGLE_SIGN_IN_ENABLED: "false", GOOGLE_CLIENT_ID: "synthetic.apps.googleusercontent.com",
};
test("local OAuth guard rejects protected, remote, production and weakened email configurations", () => {
  assert.equal(local.verifyEnvironment(env).google.enabled, false);
  for (const change of [{ NODE_ENV: "production" }, { PORT: "5012" }, { PUBLIC_APP_URL: "http://localhost:5180" }, { KNOXITE_SYNTHETIC_SANDBOX: "true" }, { EMAIL_VERIFICATION_REQUIRED: "false" }, { INSTITUTION_EMAIL_DOMAINS: "gmail.com" }, { DATABASE_URL: env.DATABASE_URL.replace(":3319/knoxite_google_local_dev", ":3306/knoxite") }, { DATABASE_URL: env.DATABASE_URL.replace("127.0.0.1", "remote.example") }])
    assert.throws(() => local.verifyEnvironment({ ...env, ...change }));
});
test("an observed hosted-domain allowlist cannot activate Google without explicit policy/security approvals", () => {
  const prepared = { ...env, GOOGLE_ALLOWED_HOSTED_DOMAINS: "student.fatima.edu.ph", CAMPUS_EMAIL_RULE_CONFIRMED: "true", GOOGLE_ELIGIBILITY_POLICY_VERSION: "local-pilot-pending", GOOGLE_WORKSPACE_ACCESS_CONFIRMED: "false", GOOGLE_ELIGIBILITY_RULES_CONFIRMED: "false", GOOGLE_SECURITY_REVIEW_CONFIRMED: "false" };
  const config = local.verifyEnvironment(prepared);
  assert.deepEqual(config.google.hostedDomains, ["student.fatima.edu.ph"]); assert.equal(config.google.enabled, false);
  assert.throws(() => local.verifyEnvironment({ ...prepared, GOOGLE_SIGN_IN_ENABLED: "true" }), /Google Sign-In requires/);
  const syntheticApproved = { ...prepared, GOOGLE_SIGN_IN_ENABLED: "true", GOOGLE_WORKSPACE_ACCESS_CONFIRMED: "true", GOOGLE_ELIGIBILITY_RULES_CONFIRMED: "true", GOOGLE_SECURITY_REVIEW_CONFIRMED: "true" };
  for (const key of ["GOOGLE_WORKSPACE_ACCESS_CONFIRMED", "GOOGLE_ELIGIBILITY_RULES_CONFIRMED", "GOOGLE_SECURITY_REVIEW_CONFIRMED"])
    assert.throws(() => local.verifyEnvironment({ ...syntheticApproved, [key]: "false" }), /Google Sign-In requires/);
});
test("local OAuth ownership binds independent labels, exact volume, resource IDs and loopback port", () => {
  const owner = { format: 1, instanceId: "synthetic-instance", containerId: "fixture-container", volumeCreatedAt: "fixture-created" };
  const meta = { container: { Id: owner.containerId, Name: "/knoxite-google-local-mysql", Config: { Image: "mysql:8.4", Labels: { "knoxite.oauth-local": owner.instanceId } }, Mounts: [{ Destination: "/var/lib/mysql", Type: "volume", Name: "knoxite-google-local-mysql-data", RW: true }], HostConfig: { PortBindings: { "3306/tcp": [{ HostIp: "127.0.0.1", HostPort: "3319" }] } } }, volume: { Name: "knoxite-google-local-mysql-data", CreatedAt: owner.volumeCreatedAt, Labels: { "knoxite.oauth-local": owner.instanceId } } };
  assert.doesNotThrow(() => local.verifyOwnership(owner, meta));
  const wrong = structuredClone(meta); wrong.volume.Labels["knoxite.oauth-local"] = "foreign";
  assert.throws(() => local.verifyOwnership(owner, wrong));
  const exposed = structuredClone(meta); exposed.container.HostConfig.PortBindings["3306/tcp"][0].HostIp = "0.0.0.0";
  assert.throws(() => local.verifyOwnership(owner, exposed));
});
test("claim inspection observes signed-payload hd without granting access or changing hosted-domain trust", () => {
  const claims = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, sub: "synthetic-subject", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, email: "aasample1234lag@student.fatima.edu.ph", email_verified: true, hd: "unknown-workspace.fixture.example", nonce: "synthetic-nonce" };
  const result = local.inspectClaims(claims, env, claims.nonce);
  assert.equal(result.hostedDomain, claims.hd); assert.equal(result.knoxiteAccessGranted, false);
  assert.deepEqual(Object.keys(result).sort(), ["hostedDomain", "institutionalEmailFormatValid", "knoxiteAccessGranted", "note"].sort());
  const config = local.verifyEnvironment(env); assert.deepEqual(config.google.hostedDomains, []);
  assert.throws(() => eligibleGoogleIdentity(claims, config));
  for (const change of [{ exp: 1 }, { nonce: "wrong" }, { email_verified: false }, { email: "aasample1234lag@gmail.com" }, { hd: undefined }, { aud: "wrong-client" }, { iss: "https://attacker.example" }])
    assert.throws(() => local.inspectClaims({ ...claims, ...change }, env, claims.nonce));
});
test("local inspection page compiles and never calls platform login or stores credentials", () => {
  const html = local.probePage(env.GOOGLE_CLIENT_ID);
  new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  assert.ok(html.includes("does not sign you into Knoxite"));
  assert.ok(!/localStorage|sessionStorage|console\.|\/auth\/google\/login/.test(html));
});
test("mocked local inspection binds origin, browser proof, nonce and single use without issuing a session", async () => {
  let claims: any;
  const app = local.inspectionApp(env, async (credential: string) => { assert.equal(credential, "synthetic-google-credential"); return claims; });
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const origin = `http://127.0.0.1:${(server.address() as any).port}`;
  const call = async (p: string, body: unknown, approvedOrigin = env.PUBLIC_APP_URL) => {
    const r = await fetch(origin + p, { method: "POST", headers: { Origin: approvedOrigin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: r.headers.get("Content-Type")?.includes("json") ? await r.json() as any : null };
  };
  try {
    const browserProof = randomBytes(32).toString("base64url"), browserProofHash = createHash("sha256").update(browserProof).digest("hex");
    assert.equal((await call("/challenge", { browserProofHash }, "https://attacker.example")).status, 403);
    const challenge = (await call("/challenge", { browserProofHash })).body;
    claims = { iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, sub: "synthetic-subject", email: "aasample1234lag@student.fatima.edu.ph", email_verified: true, hd: "observed.fixture.example", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, nonce: challenge.nonce };
    const body = { id: challenge.id, browserProof, credential: "synthetic-google-credential" };
    assert.equal((await call("/inspect", { ...body, browserProof: "x".repeat(43) })).status, 422);
    const accepted = await call("/inspect", body); assert.equal(accepted.status, 200); assert.equal(accepted.body.knoxiteAccessGranted, false);
    assert.equal(accepted.body.hostedDomain, "observed.fixture.example");
    for (const field of ["token", "credential", "email", "sub", "session", "user"]) assert.equal(accepted.body[field], undefined);
    assert.equal((await call("/inspect", body)).status, 422);
    assert.equal(local.verifyEnvironment(env).google.enabled, false);
  } finally { server.close(); await once(server, "close"); }
});

test("pilot configuration is local-only, exact-account, private and fail-closed before activation", () => {
  const { loadConfig, pilotAccountAllowed } = require("../lib/config");
  const account = { email: "  AaSample1234lag@student.fatima.edu.ph  " };
  const configured = local.pilotEnvironment(env, account);
  const config = local.verifyEnvironment(configured);
  assert.equal(config.google.enabled, false);
  assert.equal(config.localOAuthPilot.email, account.email.trim().toLowerCase());
  assert.equal(pilotAccountAllowed(account.email, config), true);
  assert.equal(pilotAccountAllowed("bbsample1234lag@student.fatima.edu.ph", config), false);
  const missing = local.verifyEnvironment(local.pilotEnvironment(env, null));
  assert.equal(pilotAccountAllowed(account.email, missing), false);
  const approved = { ...configured, GOOGLE_SIGN_IN_ENABLED: "true", GOOGLE_ALLOWED_HOSTED_DOMAINS: "student.fatima.edu.ph", CAMPUS_EMAIL_RULE_CONFIRMED: "true", GOOGLE_ELIGIBILITY_POLICY_VERSION: "synthetic-only", GOOGLE_WORKSPACE_ACCESS_CONFIRMED: "true", GOOGLE_ELIGIBILITY_RULES_CONFIRMED: "true", GOOGLE_SECURITY_REVIEW_CONFIRMED: "true" };
  assert.equal(local.verifyEnvironment(approved).google.enabled, true);
  assert.throws(() => local.verifyEnvironment({ ...approved, KNOXITE_LOCAL_OAUTH_PILOT: undefined, GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: undefined, GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON: undefined }), /private exact-account/);
  assert.throws(() => local.verifyEnvironment({ ...approved, GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: "" }), /exactly one/);
  for (const change of [{ NODE_ENV: "production" }, { KNOXITE_LOCAL_OAUTH_PILOT: "false" }, { DATABASE_URL: env.DATABASE_URL.replace(":3319/knoxite_google_local_dev", ":3306/knoxite") }, { PORT: "5012" }, { PUBLIC_APP_URL: "http://localhost:5180" }, { GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: "aasample1234lag@gmail.com" }, { GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: account.email + ",bbsample1234lag@student.fatima.edu.ph" }])
    assert.throws(() => loadConfig({ ...configured, ...change }));
  assert.throws(() => local.pilotEnvironment(env, { email: account.email, approved: true }));
  assert.equal(loadConfig(env).localOAuthPilot, undefined);
});
