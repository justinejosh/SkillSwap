import test from "node:test";
import assert from "node:assert/strict";
import { resendMailer } from "../services/resendEmail";
test("Resend adapter requires approved sender, protects links, and sends both purpose-specific messages", async (t) => {
  const env = {
    RESEND_API_KEY: "synthetic-provider-test-key",
    EMAIL_FROM: "knoxite@sender.example",
    EMAIL_SENDER_APPROVED: "true",
    PUBLIC_APP_URL: "https://app.fixture.example",
  };
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(init.body as string) });
    return new Response(JSON.stringify({ id: "synthetic-provider-message" }), {
      status: 200,
    });
  });
  const mailer = resendMailer(env);
  assert.equal(mailer.isConfigured!(), true);
  const verification = `https://app.fixture.example/verify-email#token=${"v".repeat(43)}`;
  await mailer("studentlag@fixture.example", verification);
  await mailer(
    "studentlag@fixture.example",
    `https://app.fixture.example/reset-password#token=${"r".repeat(43)}`,
    "password-reset",
  );
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].body.from, env.EMAIL_FROM);
  assert.match(calls[0].body.subject, /Verify/);
  assert.match(calls[1].body.subject, /Reset/);
  assert.ok(calls[0].body.text.includes(verification));
  assert.ok(!JSON.stringify(calls[0].body).includes(env.RESEND_API_KEY));
  await assert.rejects(() =>
    mailer(
      "studentlag@fixture.example",
      verification.replace("app.fixture.example", "attacker.example"),
    ),
  );
  const unapproved = resendMailer({ ...env, EMAIL_SENDER_APPROVED: "false" });
  assert.equal(unapproved.isConfigured!(), false);
  await assert.rejects(() =>
    unapproved("studentlag@fixture.example", verification),
  );
  assert.equal(calls.length, 2);
});
test("provider rejection and network failures expose no credentials or provider response details", async (t) => {
  const env = {
    RESEND_API_KEY: "synthetic-provider-private-sentinel",
    EMAIL_FROM: "knoxite@sender.example",
    EMAIL_SENDER_APPROVED: "true",
    PUBLIC_APP_URL: "https://app.fixture.example",
  };
  const mailer = resendMailer(env);
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ message: env.RESEND_API_KEY }), {
        status: 403,
      }),
  );
  const link = `https://app.fixture.example/verify-email#token=${"a".repeat(43)}`;
  await assert.rejects(
    () => mailer("studentlag@fixture.example", link),
    (e: any) => e.status === 503 && !e.message.includes(env.RESEND_API_KEY),
  );
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error(env.RESEND_API_KEY);
  });
  await assert.rejects(
    () => mailer("studentlag@fixture.example", link),
    (e: any) => e.status === 503 && !e.message.includes(env.RESEND_API_KEY),
  );
});
