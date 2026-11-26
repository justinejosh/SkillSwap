import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { Prisma, PrismaClient } from "@prisma/client";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
import { legacyCliFixture } from "./legacyCliFixture";
import {
  captureLegacyData,
  assertLegacyDataPreserved,
} from "../../scripts/localRecoverySafety";
import { once } from "node:events";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";

// This fixture intentionally never receives today's release columns. Select
// only the complete historical User scalars, including in post-upgrade reads.
const historicalUserSelect = {
  id: true, name: true, email: true, passwordHash: true, bio: true,
  gender: true, avatarUrl: true, location: true, role: true,
  isSuspended: true, emailVerifiedAt: true, tokenVersion: true,
  programId: true, yearLevelId: true, createdAt: true,
} satisfies Prisma.UserSelect;

test("Google migration preserves all populated legacy rows and enforces case-sensitive identities", async () => {
  const rootUrl = requireOwnedFixtureDatabase(true);
  const historical = legacyCliFixture();
  const backendRoot = historical.root;
  assert.match(new URL(rootUrl).pathname, /_test$/);
  const root = new PrismaClient({ datasources: { db: { url: rootUrl } } });
  const name = `knoxite_google_migration_${randomUUID().replaceAll("-", "")}_test`;
  assert.match(name, /^knoxite_google_migration_[a-f0-9]+_test$/);
  const url = new URL(rootUrl);
  url.pathname = `/${name}`;
  await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);
  const env = {
    ...process.env,
    LOCALAPPDATA: historical.localAppData,
    DATABASE_URL: url.toString(),
    KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
  };
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  async function assertHistoricalReleaseBoundaries() {
    const columns = await db.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND (
        (TABLE_NAME='User' AND COLUMN_NAME='activeSuspensionId') OR
        (TABLE_NAME='AuthSession' AND COLUMN_NAME='lastInteractiveAt') OR
        (TABLE_NAME='SwapSession' AND COLUMN_NAME='endsAt') OR
        (TABLE_NAME='SessionConfirmation' AND COLUMN_NAME='actualCompletedAt'))`;
    assert.equal(Number(columns[0].count), 0, "Later release fields must not leak into the historical fixture");
    const duration = await db.$queryRaw<Array<{ IS_NULLABLE: string; COLUMN_DEFAULT: string | null }>>`
      SELECT IS_NULLABLE,COLUMN_DEFAULT FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Swap' AND COLUMN_NAME='duration'`;
    assert.deepEqual(duration, [{ IS_NULLABLE: "NO", COLUMN_DEFAULT: "1" }]);
  }
  try {
    const baseline = spawnSync(
      process.execPath,
      [
        require.resolve("prisma/build/index.js"),
        "db",
        "execute",
        "--file",
        "prisma/baseline/empty.sql",
        "--schema",
        "prisma/schema.prisma",
      ],
      { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(baseline.status, 0, baseline.stderr);
    await assertHistoricalReleaseBoundaries();
    const hash = await bcrypt.hash("synthetic-preserved-password", 4);
    const a = await db.user.create({
      data: {
        name: "Preserved student A",
        email: "synthetic-alag@fixture.example",
        bio: "Preserved bio",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
      },
      select: historicalUserSelect,
    });
    const b = await db.user.create({
      data: {
        name: "Preserved student B",
        email: "synthetic-blag@fixture.example",
        passwordHash: hash,
      },
      select: historicalUserSelect,
    });
    const one = await db.skill.create({
      data: {
        name: "Synthetic preserved skill A",
        category: "academic",
        offeredBy: { connect: { id: a.id } },
        wantedBy: { connect: { id: b.id } },
      },
    });
    const two = await db.skill.create({
      data: {
        name: "Synthetic preserved skill B",
        category: "academic",
        offeredBy: { connect: { id: b.id } },
        wantedBy: { connect: { id: a.id } },
      },
    });
    await db.userOfferedSkill.create({
      data: { userId: a.id, skillId: one.id, tier: "AMATEUR" },
    });
    const request = await db.swapRequest.create({
      data: {
        requesterId: a.id,
        receiverId: b.id,
        offeredSkillId: one.id,
        wantedSkillId: two.id,
        status: "ACCEPTED",
      },
    });
    const swap = await db.swap.create({
      data: {
        requesterId: a.id,
        receiverId: b.id,
        offeredSkillId: one.id,
        wantedSkillId: two.id,
        requestId: request.id,
        status: "COMPLETED",
        sessions: 1,
        // The historical schema requires this value and defaults it to 1;
        // today's nullable-duration client no longer supplies that default.
        duration: 1,
      },
      select: { id: true },
    });
    await db.review.createMany({
      data: [
        { swapId: swap.id, reviewerId: a.id, revieweeId: b.id, rating: 4 },
        { swapId: swap.id, reviewerId: b.id, revieweeId: a.id, rating: 5 },
      ],
    });
    await db.message.create({
      data: {
        swapId: swap.id,
        senderId: a.id,
        receiverId: b.id,
        content: "Synthetic preserved conversation",
      },
    });
    assert.equal(await bcrypt.compare("synthetic-preserved-password", a.passwordHash!), true);
    // Retain populated legacy session-history coverage without running today's
    // suspension-aware middleware against an incompatible historical schema.
    await db.authSession.create({
      data: { userId: a.id, userAgent: "Synthetic preserved historical session", expiresAt: new Date(Date.now() + 86400_000) },
      select: { id: true },
    });
    const before = await captureLegacyData(db);
    const history = spawnSync(
      process.execPath,
      [
        require.resolve("prisma/build/index.js"),
        "migrate",
        "resolve",
        "--applied",
        "20261107000000_integrity_assessments_wrmr",
        "--schema",
        "prisma/schema.prisma",
      ],
      { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(history.status, 0, history.stderr);
    const failedId = randomUUID();
    await db.$executeRaw`INSERT INTO _prisma_migrations (id,checksum,migration_name,started_at,applied_steps_count) VALUES (${failedId},${"0".repeat(64)},'synthetic_unresolved',NOW(3),0)`;
    const blocked = spawnSync(
      process.execPath,
      [resolve(backendRoot, "dist/scripts/migrate-google.js")],
      { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
    );
    assert.notEqual(blocked.status, 0);
    const tables = await db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ExternalIdentity'`;
    assert.equal(
      Number(tables[0].count),
      0,
      "Failed history must block before schema mutation",
    );
    await db.$executeRaw`UPDATE _prisma_migrations SET rolled_back_at=NOW(3) WHERE id=${failedId}`;
    const upgrade = spawnSync(
      process.execPath,
      [resolve(backendRoot, "dist/scripts/migrate-google.js")],
      { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
    );
    assert.equal(upgrade.status, 0, upgrade.stdout + upgrade.stderr);
    await assertHistoricalReleaseBoundaries();
    assertLegacyDataPreserved(before, await captureLegacyData(db, before));
    const preservedUser = await db.user.findUniqueOrThrow({ where: { id: a.id }, select: historicalUserSelect });
    assert.deepEqual(preservedUser, a);
    assert.equal(preservedUser.passwordHash, hash);

    // Current auth intentionally requires the current release schema. Exercise
    // its real login/methods endpoints with the untouched historical credentials
    // copied into the runner's separate, fully migrated disposable database.
    // Do not add release columns to the historical Google-upgrade target.
    await root.user.create({ data: preservedUser, select: { id: true } });
    const config = loadConfig({
      JWT_SECRET: "synthetic-old-schema-key-".repeat(3),
      INSTITUTION_EMAIL_DOMAINS: "fixture.example",
    });
    const server = createApp(root, config, async () => {}).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
    try {
      assert.deepEqual(await (await fetch(`${base}/providers`)).json(), {
        google: { enabled: false },
      });
      const rejected = await fetch(`${base}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: a.email, password: "wrong-synthetic-password" }),
      });
      assert.equal(rejected.status, 401);
      const login = await fetch(`${base}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: a.email,
          password: "synthetic-preserved-password",
        }),
      });
      assert.equal(login.status, 200);
      const authenticated = (await login.json()) as any;
      assert.equal(authenticated.user.id, a.id);
      assert.equal(authenticated.user.email, a.email);
      const token = authenticated.token;
      const methods = await fetch(`${base}/methods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(methods.status, 200);
      assert.equal(((await methods.json()) as any).hasPassword, true);
    } finally {
      server.close();
      await once(server, "close");
    }
    assert.equal(
      await db.externalIdentity.count(),
      0,
      "Migration must not auto-link users",
    );
    assert.equal(await db.googleAuthChallenge.count(), 0);
    const identity = {
      provider: "GOOGLE",
      subject: "CaseSensitiveSubject",
      verifiedEmail: a.email,
      hostedDomain: "workspace.fixture.example",
      policyVersion: "synthetic-v1",
    };
    await db.externalIdentity.create({ data: { ...identity, userId: a.id } });
    await assert.rejects(
      () => db.externalIdentity.create({ data: { ...identity, userId: b.id } }),
      (e: any) => e.code === "P2002",
    );
    await db.externalIdentity.create({
      data: { ...identity, subject: "casesensitivesubject", userId: b.id },
    });
    assert.equal(await db.externalIdentity.count(), 2);
    const repeated = spawnSync(
      process.execPath,
      [resolve(backendRoot, "dist/scripts/migrate-google.js")],
      { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
    );
    assert.notEqual(
      repeated.status,
      0,
      "Already-applied or partial upgrades must stop rather than replay DDL",
    );
    assertLegacyDataPreserved(before, await captureLegacyData(db, before));
  } finally {
    await db.$disconnect();
    assert.match(name, /^knoxite_google_migration_[a-f0-9]+_test$/);
    await root.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
    await root.$disconnect();
    historical.dispose();
  }
});
