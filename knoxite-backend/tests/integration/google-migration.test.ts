import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
import { backendRoot } from "../../scripts/preflight";
import {
  captureLegacyData,
  assertLegacyDataPreserved,
} from "../../scripts/localRecoverySafety";
import { once } from "node:events";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";

test("Google migration preserves all populated legacy rows and enforces case-sensitive identities", async () => {
  const rootUrl = requireOwnedFixtureDatabase(true);
  assert.match(new URL(rootUrl).pathname, /_test$/);
  const root = new PrismaClient({ datasources: { db: { url: rootUrl } } });
  const name = `knoxite_google_migration_${randomUUID().replaceAll("-", "")}_test`;
  assert.match(name, /^knoxite_google_migration_[a-f0-9]+_test$/);
  const url = new URL(rootUrl);
  url.pathname = `/${name}`;
  await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
  };
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
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
    const hash = await bcrypt.hash("synthetic-preserved-password", 4);
    const a = await db.user.create({
      data: {
        name: "Preserved student A",
        email: "synthetic-alag@fixture.example",
        bio: "Preserved bio",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
      },
    });
    const b = await db.user.create({
      data: {
        name: "Preserved student B",
        email: "synthetic-blag@fixture.example",
        passwordHash: hash,
      },
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
      },
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
    // Prove password auth remains usable against the unmigrated prior schema.
    const config = loadConfig({
      JWT_SECRET: "synthetic-old-schema-key-".repeat(3),
      INSTITUTION_EMAIL_DOMAINS: "fixture.example",
    });
    const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth`;
    try {
      assert.deepEqual(await (await fetch(`${base}/providers`)).json(), {
        google: { enabled: false },
      });
      const login = await fetch(`${base}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: a.email,
          password: "synthetic-preserved-password",
        }),
      });
      assert.equal(login.status, 200);
      const token = ((await login.json()) as any).token;
      const methods = await fetch(`${base}/methods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(methods.status, 200);
      assert.equal(((await methods.json()) as any).hasPassword, true);
    } finally {
      server.close();
      await once(server, "close");
    }
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
    assertLegacyDataPreserved(before, await captureLegacyData(db, before));
    assert.deepEqual(
      await db.user.findUniqueOrThrow({ where: { id: a.id } }),
      a,
    );
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
  }
});
