import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";
import { configuredMailer, VerificationMailer } from "../services/email";

test("unconfigured delivery is reported equally without looking up accounts", async () => {
  const mailer: VerificationMailer = async () => {
    throw new Error("Must not send");
  };
  mailer.isConfigured = () => false;
  const server = createApp(
    {} as PrismaClient,
    loadConfig({ JWT_SECRET: "synthetic-delivery-test-key-".repeat(3) }),
    mailer,
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
  try {
    const options = await fetch(`${base}/recovery-options`);
    assert.deepEqual(await options.json(), { emailDeliveryAvailable: false });
    for (const path of ["request-verification", "request-password-reset"]) {
      for (const email of [
        "knownlag@fixture.example",
        "unknownlag@fixture.example",
      ]) {
        const res = await fetch(`${base}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        assert.equal(res.status, 503);
        assert.match(
          ((await res.json()) as any).error,
          /Email delivery is not configured/,
        );
      }
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("configured mail delivery separates verification and recovery templates", async (t) => {
  const previousUrl = process.env.EMAIL_DELIVERY_URL;
  const previousToken = process.env.EMAIL_DELIVERY_TOKEN;
  const sent: any[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_input: unknown, init: RequestInit) => {
      assert.equal(
        init.redirect,
        "error",
        "Never forward private account links through redirects",
      );
      sent.push(JSON.parse(init.body as string));
      return new Response(null, { status: 202 });
    },
  );
  try {
    process.env.EMAIL_DELIVERY_URL = "not-a-url";
    process.env.EMAIL_DELIVERY_TOKEN = "synthetic-test-delivery-token";
    const mailer = configuredMailer();
    assert.equal(mailer.isConfigured!(), false);
    process.env.EMAIL_DELIVERY_URL = "https://mail.fixture.example/send";
    assert.equal(mailer.isConfigured!(), true);
    await mailer(
      "syntheticlag@fixture.example",
      "https://app.fixture.example/verify-email#token=synthetic",
    );
    await mailer(
      "syntheticlag@fixture.example",
      "https://app.fixture.example/reset-password#token=synthetic",
      "password-reset",
    );
    assert.equal(sent[0].template, "knoxite-email-verification");
    assert.ok(sent[0].verificationLink);
    assert.equal(sent[0].resetLink, undefined);
    assert.equal(sent[1].template, "knoxite-password-reset");
    assert.ok(sent[1].resetLink);
    assert.equal(sent[1].verificationLink, undefined);
  } finally {
    if (previousUrl === undefined) delete process.env.EMAIL_DELIVERY_URL;
    else process.env.EMAIL_DELIVERY_URL = previousUrl;
    if (previousToken === undefined) delete process.env.EMAIL_DELIVERY_TOKEN;
    else process.env.EMAIL_DELIVERY_TOKEN = previousToken;
  }
});

test("recovery requests are rate limited even for unknown accounts", async () => {
  const db = {
    user: { findUnique: async () => null },
  } as unknown as PrismaClient;
  const server = createApp(
    db,
    loadConfig({ JWT_SECRET: "synthetic-recovery-limit-key-".repeat(3) }),
    async () => {},
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth/request-password-reset`;
  try {
    for (let i = 0; i < 11; i++) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "unknownlag@fixture.example" }),
      });
      assert.equal(response.status, i < 10 ? 202 : 429);
      if (i === 10) assert.ok(Number(response.headers.get("Retry-After")) > 0);
      await response.json();
    }
  } finally {
    server.close();
    await once(server, "close");
  }
});
