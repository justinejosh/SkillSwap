import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { loadConfig } from "../lib/config";
import { assertScheduledSessionEnded } from "../lib/scheduling";
import { seedAcademicCatalog } from "../services/academics";
import { resendMailer } from "../services/resendEmail";

const production = {
  NODE_ENV: "production", JWT_SECRET: "synthetic-production-config-test-".repeat(2),
  SESSION_TIMEOUTS_ENABLED:"true",REGISTRATION_CONSENT_ENABLED:"true",REGISTRATION_NOTICE_APPROVED:"true",REGISTRATION_NOTICE_VERSION:"TEST_NOTICE_v1",
  CAMPUS_EMAIL_RULE_CONFIRMED: "true", PUBLIC_APP_URL: "https://app.example.invalid",
  CORS_ORIGINS: "https://app.example.invalid", EMAIL_VERIFICATION_REQUIRED: "true",
};
test("production backend rejects implicit, insecure, malformed or synthetic origins while local config is retained", () => {
  assert.equal(loadConfig(production).google.enabled, false);
  for (const origins of [undefined, "", "*", "http://app.example.invalid", "https://app.example.invalid/path", "https://user@api.example.invalid", "https://localhost", "https://*.example.invalid", "not a URL"]) {
    assert.throws(() => loadConfig({ ...production, CORS_ORIGINS: origins ? `${production.CORS_ORIGINS},${origins}` : origins }));
  }
  assert.throws(() => loadConfig({ ...production, PUBLIC_APP_URL: "https://app.example.invalid/path" }));
  assert.throws(() => loadConfig({ ...production, KNOXITE_SYNTHETIC_SANDBOX: "true" }));
  assert.deepEqual(loadConfig({ JWT_SECRET: production.JWT_SECRET }).origins, ["http://localhost:5173", "http://127.0.0.1:5173"]);
  assert.equal(loadConfig(production).sessionTimeouts,true);
  assert.throws(() => loadConfig({ ...production, SESSION_TIMEOUTS_ENABLED: "false" }), /requires/);
});

test("production frontend refuses local HTTP API fallbacks; safe HTTPS and development remain compatible", () => {
  const source = readFileSync(resolve(__dirname, "../../../src/config.ts"), "utf8").replaceAll("import.meta.env", "testEnvironment");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const evaluate = (url: string | undefined, prod = true) => {
    const exports: Record<string, unknown> = {};
    runInNewContext(code, { exports, URL, window: { location: { port: "" } }, testEnvironment: { PROD: prod, DEV: !prod, VITE_API_BASE_URL: url } });
    return exports;
  };
  for (const url of [undefined, "http://localhost:5000/api", "https://localhost/api", "https://api.example.invalid/api?token=bad", "https://user:password@api.example.invalid/api", "not a URL"])
    assert.throws(() => evaluate(url));
  assert.equal(evaluate("https://api.example.invalid/api").API_BASE_URL, "https://api.example.invalid/api");
  assert.equal(evaluate(undefined, false).API_BASE_URL, "http://localhost:5000/api");
});

function academicFixture(existing: Record<string, any> = {}) {
  const records = new Map(Object.entries(existing));
  const tx: any = {
    yearLevel: { upsert: async ({ create, update }: any) => { assert.deepEqual(update, {}); return { ...create, id: create.code }; } },
    program: { upsert: async ({ where, create, update }: any) => {
      assert.deepEqual(update, {});
      if (!records.has(where.code)) records.set(where.code, structuredClone(create));
      return records.get(where.code);
    } },
  };
  return { records, db: { $transaction: async (fn: any) => fn(tx) } as any };
}
test("fresh academic initialization limits the three newly offered programs to first year and remains idempotent", async () => {
  const f = academicFixture(); await seedAcademicCatalog(f.db);
  assert.equal(f.records.size, 13);
  for (const [code, record] of f.records) assert.equal(record.yearLevels.connect.length, ["BSIT", "BSIHM-CA", "BSIHM-HACLO"].includes(code) ? 1 : 4);
  for (const code of ["BSIT", "BSIHM-CA", "BSIHM-HACLO"]) assert.deepEqual(f.records.get(code).yearLevels.connect, [{ id: "YEAR_1" }]);
  const before = JSON.stringify([...f.records]); await seedAcademicCatalog(f.db);
  assert.equal(JSON.stringify([...f.records]), before);
});
test("academic initialization never repairs or overwrites existing years, labels or mapping evidence", async () => {
  const original = { label: "Existing label", yearLevels: { connect: [{ id: "existing-year" }] }, departmentId: "existing-department", mappingValidatedAt: "existing-date", mappingNotes: "retained evidence" };
  const f = academicFixture({ BSIT: structuredClone(original), BSCS: structuredClone(original) });
  await seedAcademicCatalog(f.db);
  assert.deepEqual(f.records.get("BSIT"), original); assert.deepEqual(f.records.get("BSCS"), original);
});

test("session-end guard rejects no schedule, future and in-progress sessions with exact boundary coverage", () => {
  const start = new Date("2030-01-01T00:00:00Z"), end = start.getTime() + 3600_000;
  for (const now of [start.getTime() - 1, start.getTime(), end - 1]) assert.throws(() => assertScheduledSessionEnded(start, 1, now));
  assert.doesNotThrow(() => assertScheduledSessionEnded(start, 1, end));
  assert.doesNotThrow(() => assertScheduledSessionEnded(start, 1, end + 1));
  for (const duration of [0, -1, 1.5, 9, NaN]) assert.throws(() => assertScheduledSessionEnded(start, duration, end));
  assert.throws(() => assertScheduledSessionEnded(null, 1, end));
  assert.throws(() => assertScheduledSessionEnded(new Date(NaN), 1, end));
});
test("unconfigured or unapproved Resend remains unavailable without any network delivery", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("No live delivery permitted in this test"); });
  for (const env of [{}, { EMAIL_FROM: "notifications@sender.example.invalid", EMAIL_SENDER_APPROVED: "false" }]) {
    const mailer = resendMailer(env); assert.equal(mailer.isConfigured!(), false);
    await assert.rejects(() => mailer("synthetic@student.example.invalid", "https://app.example.invalid/verify-email"));
  }
  assert.equal(calls, 0);
});
