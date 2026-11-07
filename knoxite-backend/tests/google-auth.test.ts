import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { generateKeyPairSync } from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";
import {
  googleVerifier,
  eligibleGoogleIdentity,
} from "../services/googleIdentity";
import { googleTestConfig, googleTestEnvironment } from "./googleFixture";

test("Google is off by default and approval gates apply in development too", () => {
  assert.equal(
    loadConfig({ JWT_SECRET: "synthetic-default-off-key-".repeat(3) }).google
      .enabled,
    false,
  );
  const configured = googleTestEnvironment();
  for (const missing of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_ALLOWED_HOSTED_DOMAINS",
    "GOOGLE_WORKSPACE_ACCESS_CONFIRMED",
    "GOOGLE_ELIGIBILITY_RULES_CONFIRMED",
    "GOOGLE_SECURITY_REVIEW_CONFIRMED",
    "GOOGLE_ELIGIBILITY_POLICY_VERSION",
    "CAMPUS_EMAIL_RULE_CONFIRMED",
  ])
    assert.throws(
      () => loadConfig({ ...configured, [missing]: "" }),
      /Google Sign-In requires/,
    );
  assert.throws(
    () => loadConfig({ ...configured, EMAIL_VERIFICATION_REQUIRED: "false" }),
    /Google Sign-In requires/,
  );
  assert.equal(googleTestConfig().google.enabled, true);
});

test("disabled Google routes fail before database access or token verification", async () => {
  const config = loadConfig({
    JWT_SECRET: "synthetic-default-off-key-".repeat(3),
  });
  const server = createApp(
    {} as PrismaClient,
    config,
    async () => {},
    undefined,
    async () => {
      throw new Error("Must not verify");
    },
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
  try {
    assert.deepEqual(await (await fetch(`${base}/providers`)).json(), {
      google: { enabled: false },
    });
    for (const path of [
      "challenge",
      "login",
      "onboard",
      "link/challenge",
      "link",
    ]) {
      const response = await fetch(`${base}/google/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      assert.equal(response.status, 503);
    }
    assert.equal(
      (await fetch(`${base}/google/link`, { method: "DELETE" })).status,
      503,
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("real Google library verifies RSA signatures, issuer, audience, expiry and key rotation offline", async (t) => {
  const config = googleTestConfig();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const wrongKey = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  }).privateKey;
  const rotated = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const client = new OAuth2Client();
  const certificates: Record<string, string> = {
    fixture: publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
  t.mock.method(client, "getFederatedSignonCertsAsync", async () => ({
    certs: certificates,
    format: "PEM",
  }));
  const verify = googleVerifier(client);
  const claims: TokenPayload = {
    iss: "https://accounts.google.com",
    aud: config.google.clientId,
    sub: "synthetic-subject",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "studentlag@fixture.example",
    email_verified: true,
    hd: "workspace.fixture.example",
  };
  const signed = (changes = {}, key = privateKey, kid = "fixture") =>
    jwt.sign({ ...claims, ...changes }, key, {
      algorithm: "RS256",
      keyid: kid,
    });
  assert.equal(
    (await verify(signed(), config.google.clientId)).sub,
    claims.sub,
  );
  for (const bad of [
    signed({}, wrongKey),
    signed({ aud: "attacker.apps.googleusercontent.com" }),
    signed({ iss: "https://attacker.example" }),
    signed({ exp: Math.floor(Date.now() / 1000) - 3600 }),
    signed({}, privateKey, "unknown-rotation-key"),
    "not-a-jwt",
  ])
    await assert.rejects(
      () => verify(bad, config.google.clientId),
      (e: any) => e.status === 401 && !e.message.includes(bad),
    );
  certificates.rotated = rotated.publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  assert.equal(
    (
      await verify(
        signed({}, rotated.privateKey, "rotated"),
        config.google.clientId,
      )
    ).sub,
    claims.sub,
  );
  for (const changes of [
    { email_verified: false },
    { hd: undefined },
    { hd: "other.example" },
    { email: "personal@gmail.com" },
    { email: "studentlag@fixture.example.attacker.example" },
    { email: "othercampus@fixture.example" },
    { sub: "" },
    { iat: claims.iat + 3600 },
  ])
    assert.throws(
      () => eligibleGoogleIdentity({ ...claims, ...changes }, config),
      (e: any) => e.status === 403,
    );
  assert.equal(
    eligibleGoogleIdentity(claims, config).hostedDomain,
    "workspace.fixture.example",
  );
});
