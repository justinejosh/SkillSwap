import test from "node:test";
import assert from "node:assert/strict";
import { legacyCliResult } from "./integration/legacyCliFixture";

test("historical CLI timeout diagnostics retain status, signal and error code without leaking secrets", () => {
  const password = "synthetic/pwd@only", encoded = encodeURIComponent(password);
  const url = `mysql://synthetic:${encoded}@127.0.0.1:45678/owned_test`;
  const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.signature";
  const secret = "synthetic-signing-secret-only", key = "synthetic-api-key-only";
  const r = legacyCliResult({ status: null, signal: "SIGTERM", error: Object.assign(new Error("private error message"), { code: "ETIMEDOUT" }), stdout: `${url} ${password} ${encoded} ${token}`, stderr: `${secret} ${key}` }, { DATABASE_URL: url, JWT_SECRET: secret, RESEND_API_KEY: key }, 60_005);
  assert.equal(r.status, null); assert.equal(r.signal, "SIGTERM"); assert.equal(r.errorCode, "ETIMEDOUT"); assert.equal(r.elapsedMs, 60_005);
  for (const value of [url, password, encoded, token, secret, key, "private error message"]) assert.ok(!r.diagnostic.includes(value));
  assert.match(r.diagnostic, /REDACTED/);
});

test("validation failures and successful CLI exits remain distinguishable from timeout failures", () => {
  const failure = legacyCliResult({ status: 1, signal: null, error: undefined, stdout: "", stderr: "Duplicate reviews found. Upgrade blocked." }, {}, 100);
  assert.equal(failure.errorCode, null); assert.equal(failure.status, 1); assert.equal(failure.signal, null); assert.match(failure.stderr, /Duplicate reviews found/);
  const success = legacyCliResult({ status: 0, signal: null, error: undefined, stdout: "Verified historical rows", stderr: "" }, {}, 80_000);
  assert.equal(success.status, 0); assert.equal(success.errorCode, null); assert.equal(success.signal, null); assert.match(success.diagnostic, /Verified historical rows/);
});

test("CLI diagnostics strip unrelated database URLs and terminal escapes, redact before bounding output", () => {
  const secret = "synthetic-private-value", output = `\x1b[31m${"x".repeat(6000)} ${secret} mysql://other:private@host/db\x1b[0m`;
  const r = legacyCliResult({ status: null, signal: null, error: Object.assign(new Error("not printed"), { code: "ENOBUFS" }), stdout: output, stderr: output }, { API_KEY: secret }, 20);
  assert.equal(r.errorCode, "ENOBUFS"); assert.ok(r.stdout.length <= 4000); assert.ok(r.stderr.length <= 4000);
  assert.ok(!r.diagnostic.includes(secret)); assert.ok(!r.diagnostic.includes("mysql://")); assert.ok(!r.diagnostic.includes("\x1b"));
});
