import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
import { legacyCliFixture } from "./legacyCliFixture";
test("migration rehearsal preserves historical data and blocks unsafe legacy rows", async (t) => {
  const rootUrl = requireOwnedFixtureDatabase(true);
  const historical = legacyCliFixture();
  const backendRoot = historical.root;
  assert.match(new URL(rootUrl).pathname, /_test$/);
  const root = new PrismaClient({ datasources: { db: { url: rootUrl } } });
  const created: string[] = [];
  async function fixture(duplicate = false) {
    const name = `knoxite_migration_${randomUUID().replaceAll("-", "")}_test`;
    assert.match(name, /^knoxite_migration_[a-f0-9]+_test$/);
    await root.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);
    created.push(name);
    const url = new URL(rootUrl);
    url.pathname = `/${name}`;
    const env = {
      ...process.env,
    LOCALAPPDATA: historical.localAppData,
      DATABASE_URL: url.toString(),
      KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
    };
    const initial = spawnSync(
      process.execPath,
      [
        require.resolve("prisma/build/index.js"),
        "db",
        "execute",
        "--file",
        "prisma/baseline/pre-upgrade.sql",
        "--schema",
        "prisma/schema.prisma",
      ],
      { cwd: backendRoot, env, encoding: "utf8" },
    );
    assert.equal(initial.status, 0, initial.stderr);
    const db = new PrismaClient({
      datasources: { db: { url: url.toString() } },
    });
    await db.$executeRaw`INSERT INTO User (id, name, email, passwordHash, role) VALUES ('u1','Synthetic one','synthetic-one@example.invalid','synthetic-only','USER'), ('u2','Synthetic two','synthetic-two@example.invalid','synthetic-only','USER')`;
    await db.$executeRaw`INSERT INTO Skill (id, name, category) VALUES ('s1','Synthetic shared skill','academic'),('s2','Synthetic other skill','academic')`;
    await db.$executeRaw`INSERT INTO _OfferedSkills (A,B) VALUES ('s1','u1'),('s1','u2'),('s2','u2')`;
    await db.$executeRaw`INSERT INTO _WantedSkills (A,B) VALUES ('s2','u1'),('s1','u2')`;
    await db.$executeRaw`INSERT INTO SwapRequest (id,status,requesterId,receiverId,offeredSkillId,wantedSkillId,updatedAt) VALUES ('r1','ACCEPTED','u1','u2','s1','s2',NOW(3))`;
    await db.$executeRaw`INSERT INTO Swap (id,status,requesterId,receiverId,offeredSkillId,wantedSkillId,sessions,requesterSessions,receiverSessions,updatedAt) VALUES ('w1','COMPLETED','u1','u2','s1','s2',1,1,1,NOW(3))`;
    await db.$executeRaw`INSERT INTO Review (id,swapId,reviewerId,revieweeId,rating) VALUES ('review-1','w1','u1','u2',4),('review-2','w1','u2','u1',5)`;
    await db.$executeRaw`INSERT INTO Message (id,swapId,senderId,receiverId,content) VALUES ('message-1','w1','u1','u2','Synthetic preserved message')`;
    if (duplicate)
      await db.$executeRaw`INSERT INTO Review (id,swapId,reviewerId,revieweeId,rating) VALUES ('duplicate-review','w1','u1','u2',5)`;
    return { db, env };
  }
  try {
    await t.test(
      "additive upgrade, nullable academics, and repeatable offering backfill",
      async () => {
        const { db, env } = await fixture();
        try {
          const before =
            await db.$queryRaw`SELECT id,name,email,passwordHash FROM User ORDER BY id`;
          const upgrade = spawnSync(
            process.execPath,
            [resolve(backendRoot, "dist/scripts/migrate-local.js"), "upgrade"],
            { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
          );
          assert.equal(upgrade.status, 0, upgrade.stderr + upgrade.stdout);
          assert.deepEqual(
            await db.$queryRaw`SELECT id,name,email,passwordHash FROM User ORDER BY id`,
            before,
          );
          assert.equal(await db.user.count(), 2);
          assert.equal(await db.skill.count(), 2);
          assert.equal(await db.userOfferedSkill.count(), 3);
          assert.equal(await db.swap.count(), 1);
          assert.equal(await db.swapRequest.count(), 1);
          assert.equal(await db.review.count(), 2);
          assert.equal(await db.message.count(), 1);
          const users = await db.user.findMany({
            select: {
              programId: true,
              yearLevelId: true,
              emailVerifiedAt: true,
            },
          });
          assert.ok(
            users.every(
              (u) =>
                u.programId === null &&
                u.yearLevelId === null &&
                u.emailVerifiedAt === null,
            ),
          );
          assert.equal(await db.program.count(), 13);
          assert.equal(
            await db.program.count({ where: { departmentId: { not: null } } }),
            0,
          );
          assert.equal(
            await db.review.count({ where: { isValidated: true } }),
            0,
          );
          assert.equal(
            (await db.swap.findUniqueOrThrow({ where: { id: "w1" } }))
              .integrityVerified,
            false,
          );
          const first = await db.userOfferedSkill.findFirstOrThrow();
          await db.userOfferedSkill.update({
            where: { id: first.id },
            data: { tier: "AMATEUR" },
          });
          const backfill = spawnSync(
            process.execPath,
            [resolve(backendRoot, "dist/scripts/backfill.js")],
            { cwd: backendRoot, env, encoding: "utf8" },
          );
          assert.equal(backfill.status, 0, backfill.stderr);
          assert.equal(
            (
              await db.userOfferedSkill.findUniqueOrThrow({
                where: { id: first.id },
              })
            ).tier,
            "AMATEUR",
          );
          assert.equal(await db.userOfferedSkill.count(), 3);
          assert.equal(
            Number(
              (
                await db.$queryRaw<
                  Array<{ count: bigint }>
                >`SELECT COUNT(*) count FROM _WantedSkills`
              )[0].count,
            ),
            2,
          );
        } finally {
          await db.$disconnect();
        }
      },
    );
    await t.test(
      "duplicate review preflight stops before any schema or data mutation",
      async () => {
        const { db, env } = await fixture(true);
        try {
          const upgrade = spawnSync(
            process.execPath,
            [resolve(backendRoot, "dist/scripts/migrate-local.js"), "upgrade"],
            { cwd: backendRoot, env, encoding: "utf8", timeout: 60000 },
          );
          assert.notEqual(upgrade.status, 0);
          assert.match(upgrade.stderr, /Duplicate reviews found/);
          const newTables = await db.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*) count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UserOfferedSkill'`;
          assert.equal(Number(newTables[0].count), 0);
          assert.equal(
            Number(
              (
                await db.$queryRaw<
                  Array<{ count: bigint }>
                >`SELECT COUNT(*) count FROM Review`
              )[0].count,
            ),
            3,
          );
        } finally {
          await db.$disconnect();
        }
      },
    );
  } finally {
    // Only databases created by this fixture are dropped; the isolated root test database is retained.
    for (const name of created) {
      assert.match(name, /^knoxite_migration_[a-f0-9]+_test$/);
      await root.$executeRawUnsafe(`DROP DATABASE \`${name}\``);
    }
    await root.$disconnect();
    historical.dispose();
  }
});
