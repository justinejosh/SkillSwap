import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";

test("password recovery against isolated MySQL", async (t) => {
  const url = requireOwnedFixtureDatabase();
  assert.match(new URL(url).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const config = loadConfig({
    JWT_SECRET: "synthetic-recovery-key-".repeat(3),
    INSTITUTION_EMAIL_DOMAINS: "fixture.example",
    EMAIL_VERIFICATION_REQUIRED: "true",
  });
  const prefix = `recovery-${randomUUID()}`;
  const initialPassword = "synthetic-original-password";
  const nextPassword = "synthetic-replacement-password";
  const hash = await bcrypt.hash(initialPassword, 4);
  async function fixture(verified = true, failDelivery = false) {
    const user = await db.user.create({
      data: {
        name: "Synthetic recovery account",
        email: `${prefix}-${randomUUID()}lag@fixture.example`,
        passwordHash: hash,
        emailVerifiedAt: verified ? new Date() : null,
      },
    });
    const deliveries: { link: string; purpose: string }[] = [];
    const server = createApp(db, config, async (_email, link, purpose) => {
      deliveries.push({ link, purpose: purpose || "verification" });
      if (failDelivery) throw new Error("Synthetic unavailable mailbox");
    }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
    const call = async (path: string, body: unknown, token?: string) => {
      const response = await fetch(`${base}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: (await response.json()) as any };
    };
    const request = () => call("request-password-reset", { email: user.email });
    const token = () =>
      new URLSearchParams(new URL(deliveries.at(-1)!.link).hash.slice(1)).get(
        "token",
      )!;
    const close = async () => {
      server.close();
      await once(server, "close");
    };
    return { user, deliveries, call, request, token, close };
  }
  try {
    await t.test(
      "requests conceal account existence and tokens cannot cross purposes",
      async () => {
        const f = await fixture();
        try {
          assert.deepEqual(
            await f.request(),
            await f.call("request-password-reset", {
              email: "missinglag@fixture.example",
            }),
          );
          assert.equal(f.deliveries.length, 1);
          const token = f.token();
          assert.equal(f.deliveries[0].purpose, "password-reset");
          assert.equal(
            await db.emailVerificationToken.count({
              where: { tokenHash: token },
            }),
            0,
          );
          assert.equal(
            await db.emailVerificationToken.count({
              where: {
                tokenHash: createHash("sha256")
                  .update(`knoxite:password-reset:v1:${token}`)
                  .digest("hex"),
              },
            }),
            0,
          );
          assert.equal((await f.call("verify-email", { token })).status, 422);
          assert.equal(
            (
              await f.call("verify-email", {
                token: `knoxite:password-reset:v1:${token}`,
              })
            ).status,
            422,
          );
          await f.call("request-verification", { email: f.user.email });
          // A verified account is not sent another verification message.
          assert.equal(f.deliveries.length, 1);
          const verification = randomBytes(32).toString("base64url");
          await db.emailVerificationToken.create({
            data: {
              userId: f.user.id,
              tokenHash: createHash("sha256")
                .update(verification)
                .digest("hex"),
              expiresAt: new Date(Date.now() + 60000),
            },
          });
          assert.equal(
            (
              await f.call("reset-password", {
                token: verification,
                newPassword: nextPassword,
              })
            ).status,
            422,
          );
          assert.equal(
            (await f.call("reset-password", { token, newPassword: "short" }))
              .status,
            422,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "reset revokes sessions and other links while preserving account fields",
      async () => {
        const f = await fixture();
        try {
          const login = await f.call("login", {
            email: f.user.email,
            password: initialPassword,
          });
          assert.equal(login.status, 200);
          await f.request();
          const oldToken = f.token();
          await f.request();
          const token = f.token();
          assert.equal(
            (
              await f.call("reset-password", {
                token,
                newPassword: nextPassword,
                userId: "another-account",
              })
            ).status,
            422,
          );
          assert.equal(
            (
              await f.call("reset-password", {
                token,
                newPassword: nextPassword,
              })
            ).status,
            200,
          );
          const after = await db.user.findUniqueOrThrow({
            where: { id: f.user.id },
          });
          for (const key of [
            "id",
            "email",
            "name",
            "role",
            "emailVerifiedAt",
            "programId",
            "yearLevelId",
          ] as const)
            assert.deepEqual(after[key], f.user[key]);
          assert.equal(after.tokenVersion, f.user.tokenVersion + 1);
          assert.ok(after.passwordHash);
          assert.ok(await bcrypt.compare(nextPassword, after.passwordHash));
          assert.equal(
            await db.authSession.count({
              where: { userId: f.user.id, revokedAt: null },
            }),
            0,
          );
          assert.equal(
            (await f.call("logout", {}, login.body.token)).status,
            401,
          );
          assert.equal(
            (
              await f.call("reset-password", {
                token: oldToken,
                newPassword: initialPassword,
              })
            ).status,
            422,
          );
          assert.equal(
            (
              await f.call("reset-password", {
                token,
                newPassword: initialPassword,
              })
            ).status,
            422,
          );
          assert.equal(
            (
              await f.call("login", {
                email: f.user.email,
                password: initialPassword,
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await f.call("login", {
                email: f.user.email,
                password: nextPassword,
              })
            ).status,
            200,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "password reset never marks an unverified email verified",
      async () => {
        const f = await fixture(false);
        try {
          await f.request();
          assert.equal(
            (
              await f.call("reset-password", {
                token: f.token(),
                newPassword: nextPassword,
              })
            ).status,
            200,
          );
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: f.user.id } }))
              .emailVerifiedAt,
            null,
          );
          assert.equal(
            (
              await f.call("login", {
                email: f.user.email,
                password: nextPassword,
              })
            ).status,
            403,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "simultaneous reset links can change the account only once",
      async () => {
        const f = await fixture();
        try {
          await f.request();
          const first = f.token();
          await f.request();
          const second = f.token();
          const results = await Promise.all(
            [first, first, second].map((token) =>
              f.call("reset-password", { token, newPassword: nextPassword }),
            ),
          );
          assert.deepEqual(
            results.map((r) => r.status).sort(),
            [200, 422, 422],
          );
          assert.equal(
            (await db.user.findUniqueOrThrow({ where: { id: f.user.id } }))
              .tokenVersion,
            1,
          );
        } finally {
          await f.close();
        }
      },
    );
    await t.test(
      "expired tokens, suspended accounts and failed delivery cannot reset",
      async () => {
        const f = await fixture();
        const failed = await fixture(true, true);
        try {
          await f.request();
          const expired = f.token();
          await db.emailVerificationToken.updateMany({
            where: { userId: f.user.id },
            data: { expiresAt: new Date(Date.now() - 1000) },
          });
          assert.equal(
            (
              await f.call("reset-password", {
                token: expired,
                newPassword: nextPassword,
              })
            ).status,
            422,
          );
          await f.request();
          const active = f.token();
          await db.user.update({
            where: { id: f.user.id },
            data: { isSuspended: true },
          });
          assert.equal(
            (
              await f.call("reset-password", {
                token: active,
                newPassword: nextPassword,
              })
            ).status,
            422,
          );
          await f.request();
          assert.equal(f.deliveries.length, 2);
          assert.equal((await failed.request()).status, 202);
          assert.equal(
            (
              await failed.call("reset-password", {
                token: failed.token(),
                newPassword: nextPassword,
              })
            ).status,
            422,
          );
        } finally {
          await f.close();
          await failed.close();
        }
      },
    );
    await t.test(
      "an authenticated password change invalidates pending recovery links",
      async () => {
        const f = await fixture();
        try {
          const login = await f.call("login", {
            email: f.user.email,
            password: initialPassword,
          });
          await f.request();
          assert.equal(
            (
              await f.call(
                "password",
                { currentPassword: initialPassword, newPassword: nextPassword },
                login.body.token,
              )
            ).status,
            200,
          );
          assert.equal(
            (
              await f.call("reset-password", {
                token: f.token(),
                newPassword: initialPassword,
              })
            ).status,
            422,
          );
        } finally {
          await f.close();
        }
      },
    );
  } finally {
    const users = { email: { startsWith: prefix } };
    await db.emailVerificationToken.deleteMany({ where: { user: users } });
    await db.authSession.deleteMany({ where: { user: users } });
    await db.user.deleteMany({ where: users });
    await db.$disconnect();
  }
});
