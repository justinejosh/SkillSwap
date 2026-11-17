import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { sessionDeadlines, sessionLimits, SESSION_POLICY } from "../services/sessionPolicy";
import { loadConfig } from "../lib/config";
const migration = require(resolve(process.cwd(), "development/sessionTimeoutMigration.cjs"));
const start = new Date("2026-11-15T00:00:00Z");
for (const role of ["USER", "ADMIN"] as const) {
  const limits = sessionLimits(role);
  const claims = { sessionPolicy: SESSION_POLICY, sessionRole: role };
  const session = { createdAt: start, expiresAt: new Date(+start + limits.absoluteMs) };
  test(`${role} idle deadline is server-enforced at its exact boundary`, () => {
    const before = sessionDeadlines(session, role, claims, start, new Date(+start + limits.idleMs - 1));
    assert.equal(Date.parse(before.idleExpiresAt), +start + limits.idleMs);
    assert.equal(before.warningSeconds, 300);
    assert.throws(() => sessionDeadlines(session, role, claims, start, new Date(+start + limits.idleMs)), /expired/);
  });
  test(`${role} activity can never exceed absolute lifetime`, () => {
    const last = new Date(+session.expiresAt - 60_000);
    assert.equal(sessionDeadlines(session, role, claims, last, new Date(+session.expiresAt - 1)).absoluteExpiresAt, session.expiresAt.toISOString());
    assert.throws(() => sessionDeadlines(session, role, claims, last, session.expiresAt), /expired/);
  });
  test(`${role} legacy/null, role changes and client/future timestamps cannot grant a session`, () => {
    for (const [claim, last] of [[{}, start], [claims, null], [{ ...claims, sessionRole: role === "USER" ? "ADMIN" : "USER" }, start], [claims, new Date(+start + 1000)]] as const)
      assert.throws(() => sessionDeadlines(session, role, claim, last, start));
  });
}
test("timeouts require explicit activation, production cannot fall back, and synthetic mode stays protected", () => {
  const env={JWT_SECRET:"synthetic-session-test-key-".repeat(3)};
  assert.equal(loadConfig(env).sessionTimeouts,undefined);
  assert.equal(loadConfig({...env,SESSION_TIMEOUTS_ENABLED:"true"}).sessionTimeouts,true);
  assert.throws(()=>loadConfig({...env,KNOXITE_SYNTHETIC_SANDBOX:"true",SESSION_TIMEOUTS_ENABLED:"true"}),/restricted/);
  const production={...env,NODE_ENV:"production",CAMPUS_EMAIL_RULE_CONFIRMED:"true",PUBLIC_APP_URL:"https://fixture.example",CORS_ORIGINS:"https://fixture.example"};
  assert.throws(()=>loadConfig(production),/requires/);
  assert.throws(()=>loadConfig({...production,SESSION_TIMEOUTS_ENABLED:"true"}),/notice/);
});

test("migration preconditions reject nonempty/conflicting targets rather than reset records", () => {
  assert.doesNotThrow(() => migration.empty({ counts: { User: 0, AuthSession: 0, GoogleAuthChallenge: 0 } }));
  for (const key of ["User", "AuthSession", "GoogleAuthChallenge"])
    assert.throws(() => migration.empty({ counts: { User: 0, AuthSession: 0, GoogleAuthChallenge: 0, [key]: 1 } }));
  assert.equal(migration.columnState({ columns: [] }), false);
  assert.equal(migration.columnState({ columns: [{ t: "AuthSession", c: "lastInteractiveAt", ty: "datetime(3)", n: "YES", d: null }] }), true);
  assert.throws(() => migration.columnState({ columns: [{ t: "AuthSession", c: "lastInteractiveAt", ty: "varchar(191)", n: "YES", d: null }] }));
});
