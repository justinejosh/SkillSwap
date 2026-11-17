import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { TokenPayload } from "google-auth-library";
import { createApp } from "../../app";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
import { seedAcademicCatalog } from "../../services/academics";
import { googleTestConfig } from "../googleFixture";
import { HttpError } from "../../lib/http";

test("isolated Google authentication and account preservation", async (t) => {
  const url = requireOwnedFixtureDatabase();
  assert.match(new URL(url).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const config = googleTestConfig();
  await seedAcademicCatalog(db);
  const program = await db.program.findUniqueOrThrow({
    where: { code: "BSCS" },
    include: { yearLevels: true },
  });
  const password = "synthetic-current-password";
  const hash = await bcrypt.hash(password, 4);
  const prefix = `google-${randomUUID()}`;
  async function fixture() {
    const tokens = new Map<string, TokenPayload & { nonce?: string }>();
    const deliveries: string[] = [];
    const server = createApp(
      db,
      config,
      async (_email, link) => {
        deliveries.push(link);
      },
      undefined,
      async (credential) => {
        const payload = tokens.get(credential);
        if (!payload) throw new HttpError(401, "Invalid Google sign-in");
        return payload;
      },
    ).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
    async function call(
      path: string,
      body?: unknown,
      token?: string,
      method = "POST",
      origin = config.origins[0],
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          Origin: origin,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: (await response.json()) as any };
    }
    const email = `${prefix}-${randomUUID()}lag@fixture.example`;
    const subject = randomUUID();
    async function start(linkToken?: string, currentPassword = password) {
      const proof = randomBytes(32).toString("base64url");
      const response = await call(
        linkToken ? "/auth/google/link/challenge" : "/auth/google/challenge",
        {
          browserProofHash: createHash("sha256").update(proof).digest("hex"),
          ...(linkToken ? { currentPassword } : {}),
        },
        linkToken,
      );
      assert.equal(response.status, 200);
      const credential = randomUUID();
      tokens.set(credential, {
        iss: "https://accounts.google.com",
        aud: config.google.clientId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: subject,
        email,
        email_verified: true,
        hd: config.google.hostedDomains[0],
        nonce: response.data.nonce,
        name: "Synthetic Google name",
      });
      return {
        challengeId: response.data.challengeId,
        credential,
        browserProof: proof,
      };
    }
    async function local(verified = true, role: "USER" | "ADMIN" = "USER") {
      return db.user.create({
        data: {
          name: "Preserved local display name",
          bio: "Preserved biography",
          email,
          passwordHash: hash,
          emailVerifiedAt: verified ? new Date() : null,
          role,
        },
      });
    }
    const login = () => call("/auth/login", { email, password });
    const complete = (body: unknown, token?: string) =>
      call(token ? "/auth/google/link" : "/auth/google/login", body, token);
    const onboarding = (id: string, proof: string, extra = {}) =>
      call("/auth/google/onboard", {
        onboardingId: id,
        browserProof: proof,
        name: "Chosen display name",
        programId: program.id,
        yearLevelId: program.yearLevels[0].id,
        termsAccepted: true,
        noticeVersion: config.registrationConsent!.version,
        ...extra,
      });
    return {
      call,
      start,
      local,
      login,
      complete,
      onboarding,
      tokens,
      deliveries,
      email,
      subject,
      close: async () => {
        server.close();
        await once(server, "close");
      },
    };
  }
  try {
    await t.test(
      "origin and JSON validation stop unauthenticated linking and request forgery",
      async () => {
        const f = await fixture();
        try {
          assert.equal(
            (
              await f.call(
                "/auth/google/challenge",
                { browserProofHash: "a".repeat(64) },
                undefined,
                "POST",
                "https://attacker.example",
              )
            ).status,
            403,
          );
          assert.equal(
            (await f.call("/auth/google/challenge", undefined)).status,
            415,
          );
          assert.equal(
            (
              await f.call("/auth/google/link/challenge", {
                browserProofHash: "a".repeat(64),
                currentPassword: password,
              })
            ).status,
            401,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "new Google users require academic onboarding, then can establish password fallback",
      async () => {
        const f = await fixture();
        try {
          const input = await f.start();
          const pending = await f.complete(input);
          assert.equal(pending.status, 200);
          assert.equal(pending.data.requiresOnboarding, true);
          assert.equal(pending.data.token, undefined);
          assert.equal(await db.user.count({ where: { email: f.email } }), 0);
          assert.equal(
            (
              await f.onboarding(
                pending.data.onboardingId,
                input.browserProof,
                { programId: "not-real" },
              )
            ).status,
            422,
          );
          assert.equal(
            (
              await f.onboarding(
                pending.data.onboardingId,
                input.browserProof,
                { termsAccepted: false },
              )
            ).status,
            422,
          );
          const joined = await f.onboarding(
            pending.data.onboardingId,
            input.browserProof,
          );
          assert.equal(joined.status, 201);
          const user = await db.user.findUniqueOrThrow({
            where: { id: joined.data.user.id },
          });
          assert.equal(user.passwordHash, null);
          assert.ok(user.emailVerifiedAt);
          assert.equal(user.role, "USER");
          assert.equal((await f.login()).status, 401);
          assert.equal(
            (
              await f.call(
                "/auth/password",
                { currentPassword: password, newPassword: password },
                joined.data.token,
              )
            ).status,
            422,
          );
          assert.equal(
            (
              await f.call(
                "/auth/google/link",
                { currentPassword: password },
                joined.data.token,
                "DELETE",
              )
            ).status,
            422,
          );
          const repeat = await f.complete(await f.start());
          assert.equal(repeat.status, 200);
          assert.equal(repeat.data.user.id, user.id);
          assert.equal(
            (await f.onboarding(pending.data.onboardingId, input.browserProof))
              .status,
            422,
          );
          await f.call("/auth/request-password-reset", { email: f.email });
          const token = new URLSearchParams(
            new URL(f.deliveries.at(-1)!).hash.slice(1),
          ).get("token");
          assert.equal(
            (
              await f.call("/auth/reset-password", {
                token,
                newPassword: password,
              })
            ).status,
            200,
          );
          assert.equal(
            (await f.call("/profile", undefined, repeat.data.token, "GET"))
              .status,
            401,
          );
          const fallback = await f.login();
          assert.equal(fallback.status, 200);
          assert.equal(fallback.data.user.id, user.id);
          assert.equal(
            (
              await f.call(
                "/auth/google/link",
                { currentPassword: password },
                fallback.data.token,
                "DELETE",
              )
            ).status,
            200,
          );
          assert.equal(
            await db.externalIdentity.count({ where: { userId: user.id } }),
            0,
          );
          assert.equal(
            (await f.call("/profile", undefined, fallback.data.token, "GET"))
              .status,
            401,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "matching emails never auto-link; explicit linking preserves account and skill data",
      async () => {
        const f = await fixture();
        try {
          const user = await f.local();
          const skill = await db.skill.create({
            data: {
              name: `${prefix}-${randomUUID()}`,
              category: "academic",
              offeredBy: { connect: { id: user.id } },
            },
          });
          await db.userOfferedSkill.create({
            data: { userId: user.id, skillId: skill.id },
          });
          assert.equal((await f.complete(await f.start())).status, 409);
          assert.equal(
            await db.externalIdentity.count({ where: { userId: user.id } }),
            0,
          );
          const login = await f.login();
          const session = login.data.token;
          assert.equal(
            (
              await f.call(
                "/auth/google/link/challenge",
                { browserProofHash: "a".repeat(64), currentPassword: "wrong" },
                session,
              )
            ).status,
            403,
          );
          const input = await f.start(session);
          assert.equal(
            (await f.complete({ ...input, userId: "another-user" }, session))
              .status,
            422,
          );
          assert.equal((await f.complete(input, session)).status, 200);
          assert.equal((await f.complete(input, session)).status, 422);
          const after = await db.user.findUniqueOrThrow({
            where: { id: user.id },
          });
          assert.deepEqual(after, user);
          assert.equal(
            await db.userOfferedSkill.count({
              where: { userId: user.id, skillId: skill.id },
            }),
            1,
          );
          const google = await f.complete(await f.start());
          assert.equal(google.data.user.id, user.id);
          assert.equal((await f.login()).status, 200);
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "unverified and administrator accounts cannot bypass existing authentication or link",
      async () => {
        const f = await fixture();
        const admin = await fixture();
        try {
          const unverified = await f.local(false);
          assert.equal((await f.complete(await f.start())).status, 409);
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: unverified.id } }))
              .emailVerifiedAt,
            null,
          );
          assert.equal((await f.login()).status, 403);
          await admin.local(true, "ADMIN");
          const login = await admin.login();
          assert.equal(login.status, 200);
          assert.equal(
            (
              await admin.call(
                "/auth/google/link/challenge",
                { browserProofHash: "a".repeat(64), currentPassword: password },
                login.data.token,
              )
            ).status,
            403,
          );
        } finally {
          await f.close();
          await admin.close();
        }
      },
    );
    await t.test(
      "wrong browser proofs, nonce, purpose, expired challenges and policy changes fail closed",
      async () => {
        const f = await fixture();
        try {
          const input = await f.start();
          assert.equal(
            (
              await f.complete({
                ...input,
                credential: "invalid-google-credential",
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await f.complete({
                ...input,
                browserProof: randomBytes(32).toString("base64url"),
              })
            ).status,
            422,
          );
          const claims = f.tokens.get(input.credential)!;
          const nonce = claims.nonce;
          claims.nonce = randomBytes(32).toString("base64url");
          assert.equal((await f.complete(input)).status, 422);
          claims.nonce = nonce;
          await db.googleAuthChallenge.update({
            where: { id: input.challengeId },
            data: { purpose: "LINK" },
          });
          assert.equal((await f.complete(input)).status, 422);
          await db.googleAuthChallenge.update({
            where: { id: input.challengeId },
            data: { purpose: "LOGIN", policyVersion: "unapproved-policy" },
          });
          assert.equal((await f.complete(input)).status, 422);
          await db.googleAuthChallenge.update({
            where: { id: input.challengeId },
            data: {
              policyVersion: config.google.policyVersion,
              expiresAt: new Date(Date.now() - 1000),
            },
          });
          assert.equal((await f.complete(input)).status, 422);
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "Workspace and campus claims are enforced on every Google login",
      async () => {
        const f = await fixture();
        try {
          const input = await f.start();
          const original = { ...f.tokens.get(input.credential)! };
          for (const changes of [
            { email_verified: false },
            { hd: undefined },
            { hd: "attacker.example" },
            { email: "personal@gmail.com" },
            { email: "student@fixture.example" },
            { aud: "other.apps.googleusercontent.com" },
            { exp: 1 },
          ]) {
            f.tokens.set(input.credential, { ...original, ...changes });
            assert.equal((await f.complete(input)).status, 403);
          }
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "pending onboarding rechecks current Workspace policy before creating a user",
      async () => {
        const f = await fixture();
        const domains = config.google.hostedDomains;
        try {
          const input = await f.start();
          const pending = await f.complete(input);
          assert.equal(pending.data.requiresOnboarding, true);
          config.google.hostedDomains = ["changed.fixture.example"];
          assert.equal(
            (await f.onboarding(pending.data.onboardingId, input.browserProof))
              .status,
            422,
          );
          assert.equal(await db.user.count({ where: { email: f.email } }), 0);
        } finally {
          config.google.hostedDomains = domains;
          await f.close();
        }
      },
    );
    await t.test(
      "concurrent credentials/onboarding do not create duplicate identities or users",
      async () => {
        const f = await fixture();
        try {
          const input = await f.start();
          const results = await Promise.all([
            f.complete(input),
            f.complete(input),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 422]);
          const pending = results.find((r) => r.status === 200)!;
          const joined = await Promise.all([
            f.onboarding(pending.data.onboardingId, input.browserProof),
            f.onboarding(pending.data.onboardingId, input.browserProof),
          ]);
          assert.deepEqual(joined.map((r) => r.status).sort(), [201, 422]);
          assert.equal(await db.user.count({ where: { email: f.email } }), 1);
          assert.equal(
            await db.externalIdentity.count({
              where: { provider: "GOOGLE", subject: f.subject },
            }),
            1,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "password changes invalidate pending links; suspension and email changes block Google login",
      async () => {
        const f = await fixture();
        try {
          const user = await f.local();
          const login = await f.login();
          const pending = await f.start(login.data.token);
          await f.call(
            "/auth/password",
            {
              currentPassword: password,
              newPassword: "synthetic-next-password",
            },
            login.data.token,
          );
          assert.equal(
            (await f.complete(pending, login.data.token)).status,
            401,
          );
          await db.externalIdentity.create({
            data: {
              provider: "GOOGLE",
              subject: f.subject,
              userId: user.id,
              verifiedEmail: user.email,
              hostedDomain: config.google.hostedDomains[0],
              policyVersion: config.google.policyVersion,
            },
          });
          await db.user.update({
            where: { id: user.id },
            data: { isSuspended: true },
          });
          assert.equal((await f.complete(await f.start())).status, 403);
          await db.user.update({
            where: { id: user.id },
            data: { isSuspended: false, email: `renamed-${f.email}` },
          });
          assert.equal((await f.complete(await f.start())).status, 403);
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "link challenges cannot be used by another signed-in account or mismatched Google identity",
      async () => {
        const f = await fixture();
        const other = await fixture();
        try {
          await f.local();
          await other.local();
          const login = await f.login();
          const peer = await other.login();
          const pending = await f.start(login.data.token);
          assert.equal(
            (await f.complete(pending, peer.data.token)).status,
            422,
          );
          const claims = f.tokens.get(pending.credential)!;
          claims.email = other.email;
          assert.equal(
            (await f.complete(pending, login.data.token)).status,
            403,
          );
          claims.email = f.email;
          assert.equal(
            (await f.complete(pending, login.data.token)).status,
            200,
          );
          assert.equal(
            await db.externalIdentity.count({ where: { subject: f.subject } }),
            1,
          );
        } finally {
          await f.close();
          await other.close();
        }
      },
    );
    await t.test(
      "concurrent explicit link requests create one identity and request limits apply",
      async () => {
        const f = await fixture();
        try {
          const user = await f.local();
          const login = await f.login();
          const a = await f.start(login.data.token);
          const b = await f.start(login.data.token);
          const results = await Promise.all([
            f.complete(a, login.data.token),
            f.complete(b, login.data.token),
          ]);
          assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
          assert.equal(
            await db.externalIdentity.count({ where: { userId: user.id } }),
            1,
          );
          for (let i = 0; i < 11; i++) {
            const response = await f.call("/auth/google/challenge", {
              browserProofHash: "a".repeat(64),
            });
            assert.equal(response.status, i < 10 ? 200 : 429);
          }
        } finally {
          await f.close();
        }
      },
    );
  } finally {
    await db.$disconnect();
  }
});
