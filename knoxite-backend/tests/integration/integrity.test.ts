import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
import { seedAcademicCatalog } from "../../services/academics";
import { INTEGRITY_REVIEW_REASON } from "../../services/exchangeIntegrity";

test("isolated partner-balanced ranking, provisional mapping and private integrity review", async (t) => {
  const url = requireOwnedFixtureDatabase();
  assert.match(new URL(url).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const prefix = `integrity-${randomUUID().slice(0, 8)}`;
  const config = loadConfig({
    JWT_SECRET: "synthetic-integrity-test-key-".repeat(3),
    INSTITUTION_EMAIL_DOMAINS: "integrity.fixture.example",
    CAMPUS_EMAIL_SUFFIX: "lag",
    EMAIL_VERIFICATION_REQUIRED: "true",
  });
  const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  async function call(
    method: string,
    path: string,
    status: number,
    token?: string,
    body?: unknown,
  ) {
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(response.status, status, `${method} ${path}`);
    return (await response.json()) as any;
  }
  try {
    await seedAcademicCatalog(db);
    const program = await db.program.findUniqueOrThrow({
      where: { code: "BSN" },
      include: { yearLevels: { orderBy: { order: "asc" } } },
    });
    const users = await Promise.all(
      ["a", "b", "c", "d", "new", "admin"].map((name) =>
        db.user.create({
          data: {
            name: `${prefix}-${name}`,
            email: `${prefix}-${name}lag@integrity.fixture.example`,
            passwordHash: "synthetic-unused-login-hash",
            role: name === "admin" ? "ADMIN" : "USER",
            emailVerifiedAt: new Date(),
            programId: program.id,
            yearLevelId: program.yearLevels[0].id,
          },
        }),
      ),
    );
    const [a, b, c, d, newbie, admin] = users;
    const tokens = await Promise.all(
      users.map(async (u) => {
        const session = await db.authSession.create({
          data: {
            userId: u.id,
            userAgent: "Synthetic integrity test",
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        return jwt.sign({ tokenVersion: u.tokenVersion }, config.jwtSecret, {
          subject: u.id,
          jwtid: session.id,
          issuer: "knoxite-api",
          audience: "knoxite",
          expiresIn: "1h",
        });
      }),
    );
    const [ta, tb, tc, td, tn, tad] = tokens;
    const skills = await Promise.all(
      ["one", "two"].map((s) =>
        db.skill.create({
          data: { name: `${prefix}-${s}`, category: "technology" },
        }),
      ),
    );
    for (const user of users.filter((u) => u.role === "USER")) {
      await db.user.update({
        where: { id: user.id },
        data: {
          offeredSkills: { connect: skills.map((s) => ({ id: s.id })) },
          wantedSkills: { connect: skills.map((s) => ({ id: s.id })) },
        },
      });
      await db.userOfferedSkill.createMany({
        data: skills.map((s) => ({ userId: user.id, skillId: s.id })),
      });
    }
    let sequence = 0;
    async function exchange(
      first: string,
      second: string,
      receivedByFirst = 5,
      completed = true,
      validated = true,
    ) {
      const date = new Date(Date.now() - 86400000 + sequence++ * 1000);
      return db.swap.create({
        data: {
          requesterId: first,
          receiverId: second,
          offeredSkillId: skills[0].id,
          wantedSkillId: skills[1].id,
          status: completed ? "COMPLETED" : "CANCELLED",
          integrityVerified: validated,
          sessions: 1,
          requesterSessions: completed ? 1 : 0,
          receiverSessions: completed ? 1 : 0,
          requesterApprovedAt: date,
          receiverApprovedAt: date,
          createdAt: date,
          completedAt: completed ? date : null,
          cancelledAt: completed ? null : date,
          ...(completed
            ? {
                reviews: {
                  create: [
                    {
                      reviewerId: first,
                      revieweeId: second,
                      rating: 5,
                      isValidated: validated,
                    },
                    {
                      reviewerId: second,
                      revieweeId: first,
                      rating: receivedByFirst,
                      isValidated: validated,
                    },
                  ],
                },
                sessionLogs: {
                  create: [
                    {
                      participantId: first,
                      sessionNumber: 1,
                      confirmedAt: date,
                    },
                    {
                      participantId: second,
                      sessionNumber: 1,
                      confirmedAt: date,
                    },
                  ],
                },
              }
            : {}),
        },
      });
    }

    await t.test(
      "draft imports preserve catalog labels, existing mappings and unranked proximity",
      async () => {
        const oldPrograms = await db.program.findMany({
          select: {
            code: true,
            label: true,
            departmentId: true,
            mappingValidatedAt: true,
          },
        });
        await call(
          "POST",
          "/admin/academic-programs/provisional-mapping",
          403,
          ta,
          {},
        );
        const first = await call(
          "POST",
          "/admin/academic-programs/provisional-mapping",
          200,
          tad,
          {},
        );
        assert.equal(first.status, "PROVISIONAL");
        assert.equal(first.imported + first.skipped, 13);
        assert.equal(
          (
            await call(
              "POST",
              "/admin/academic-programs/provisional-mapping",
              200,
              tad,
              {},
            )
          ).imported,
          0,
        );
        const after = await db.program.findMany({
          select: { code: true, label: true },
        });
        assert.deepEqual(
          after.sort((x, y) => x.code.localeCompare(y.code)),
          oldPrograms
            .map(({ code, label }) => ({ code, label }))
            .sort((x, y) => x.code.localeCompare(y.code)),
        );
        for (const previous of oldPrograms.filter((p) => p.departmentId))
          assert.equal(
            (
              await db.program.findUniqueOrThrow({
                where: { code: previous.code },
              })
            ).departmentId,
            previous.departmentId,
          );
        const nursing = await db.program.findUniqueOrThrow({
          where: { id: program.id },
          include: { department: true },
        });
        assert.equal(nursing.department?.name, "College of Nursing");
        assert.equal(nursing.mappingValidatedAt, null);
        assert.equal(nursing.mappingValidatedById, null);
        const publicA = await call("GET", `/users/${a.id}/profile`, 200, tb);
        assert.equal(publicA.department, null);
        assert.equal(publicA.proposedDepartment.name, "College of Nursing");
        assert.equal(
          (await call("GET", "/matches", 200, ta)).find(
            (p: any) => p.id === b.id,
          ).matchDetails.proximity.value,
          null,
        );
        await call(
          "PATCH",
          `/admin/academic-programs/${program.id}/department-draft`,
          409,
          tad,
          {
            departmentId: nursing.departmentId,
            proposalNotes: "Synthetic stale draft",
            mappingVersion: nursing.mappingVersion - 1,
          },
        );
        await call(
          "POST",
          `/admin/academic-programs/${program.id}/department`,
          200,
          tad,
          {
            departmentId: nursing.departmentId,
            officiallyConfirmed: true,
            validationNotes:
              "Synthetic integration fixture; this is test evidence, not institutional validation",
          },
        );
        const validated = await db.program.findUniqueOrThrow({
          where: { id: program.id },
        });
        await call(
          "PATCH",
          `/admin/academic-programs/${program.id}/department-draft`,
          409,
          tad,
          {
            departmentId: nursing.departmentId,
            proposalNotes: "Must not replace validated mapping",
            mappingVersion: validated.mappingVersion,
          },
        );
      },
    );

    await t.test(
      "two-account five-star farming does not grant leaderboard eligibility",
      async () => {
        for (let i = 0; i < 10; i++) await exchange(a.id, b.id);
        const profile = await call("GET", `/users/${a.id}/profile`, 200, tb);
        assert.equal(profile.metrics.completedSwaps, 10);
        assert.equal(profile.metrics.averageRating, 5);
        assert.equal(profile.metrics.uniqueCompletedPartners, 1);
        const board = await call("GET", "/leaderboard", 200, ta);
        assert.equal(board.viewer.eligible, false);
        assert.equal(board.topMentors.length, 0);
        assert.equal(
          (await call("GET", "/leaderboard/swaps", 200, ta)).length,
          0,
        );
        assert.ok(
          (await call("GET", "/matches", 200, ta)).some(
            (p: any) => p.id === b.id,
          ),
        );
        const emptyPeer = (await call("GET", "/matches", 200, ta)).find(
          (p: any) => p.id === newbie.id,
        );
        assert.equal(emptyPeer.matchScore, null);
        const request = await call("POST", "/swaps/request", 201, tn, {
          receiverId: b.id,
          offeredSkillId: skills[0].id,
          wantedSkillId: skills[1].id,
        });
        await call("DELETE", `/swaps/cancel/request/${request.id}`, 200, tn);
      },
    );

    await t.test(
      "legitimate repeat history survives while balanced inputs and activity resist volume farming",
      async () => {
        await exchange(a.id, c.id, 1);
        await exchange(a.id, c.id, 1, false);
        for (const other of [b, c, newbie]) await exchange(d.id, other.id, 3);
        const before = await call("GET", `/users/${a.id}/profile`, 200, tb);
        assert.equal(before.metrics.averageRating, 3);
        assert.equal(before.metrics.completionRate, 0.75);
        assert.equal(before.metrics.uniqueCompletedPartners, 2);
        assert.equal(before.metrics.rawCompletionRate, 11 / 12);
        for (let i = 0; i < 10; i++) await exchange(a.id, b.id);
        const after = await call("GET", `/users/${a.id}/profile`, 200, tb);
        assert.equal(after.metrics.completedSwaps, 21);
        assert.equal(after.metrics.averageRating, 3);
        assert.equal(after.metrics.completionRate, 0.75);
        assert.ok(
          after.metrics.rawAverageRating > before.metrics.rawAverageRating,
        );
        const matched = (await call("GET", "/matches", 200, tb)).find(
          (p: any) => p.id === a.id,
        );
        assert.equal(matched.matchScore, 72.5);
        const activity = await call("GET", "/leaderboard/swaps", 200, ta);
        assert.equal(activity[0].id, d.id);
        assert.equal(activity[0].uniqueCompletedPartners, 3);
        assert.ok(activity.findIndex((p: any) => p.id === a.id) > 0);
        assert.equal(
          (await call("GET", "/leaderboard", 200, ta)).viewer.eligible,
          true,
        );
        // New users do not receive a rating or matching restriction merely from leaderboard rules.
        assert.ok(
          (await call("GET", "/matches", 200, tn)).some(
            (p: any) => p.id === a.id,
          ),
        );
      },
    );

    await t.test(
      "review signals stay private and concurrent case creation retains evidence and history",
      async () => {
        await call("GET", "/admin/integrity/signals", 401);
        await call("GET", "/admin/integrity/signals", 403, ta);
        const queue = await call("GET", "/admin/integrity/signals", 200, tad);
        const pair = queue.signals.find(
          (s: any) => s.userIds.includes(a.id) && s.userIds.includes(b.id),
        );
        assert.equal(pair.completedExchanges, 20);
        assert.equal(pair.reciprocalFiveStarExchanges, 20);
        assert.ok(pair.fastestGapMs >= 0);
        assert.ok(
          !JSON.stringify(
            await call("GET", `/users/${a.id}/profile`, 200, tb),
          ).includes("signals"),
        );
        const snapshots = await db.swap.count({
          where: { requesterId: a.id, receiverId: b.id },
        });
        const body = {
          userIds: [a.id, b.id],
          notes:
            "Synthetic private review; independent evidence is still needed.",
        };
        const results = await Promise.all([
          call("POST", "/admin/integrity/reviews", 201, tad, body),
          call("POST", "/admin/integrity/reviews", 201, tad, body),
        ]);
        assert.equal(results[0].id, results[1].id);
        const id = results[0].id;
        assert.equal(
          await db.userReport.count({
            where: { reason: INTEGRITY_REVIEW_REASON },
          }),
          1,
        );
        assert.equal((await call("GET", "/reports", 200, ta)).length, 0);
        assert.ok(
          !(await call("GET", "/admin/reports", 200, tad)).some(
            (r: any) => r.id === id,
          ),
        );
        await call("PATCH", `/admin/reports/${id}`, 409, tad, {
          status: "DISMISSED",
          resolution: "Cannot bypass case audit history",
        });
        await call("PATCH", `/admin/integrity/reviews/${id}`, 403, ta, {
          revision: 1,
          disposition: "NO_ACTION",
          notes: "Unauthorized",
        });
        await call("PATCH", `/admin/integrity/reviews/${id}`, 200, tad, {
          revision: 1,
          disposition: "NO_ACTION",
          notes:
            "Synthetic review finds no sufficient basis for action; repeat exchanges are allowed.",
        });
        await call("PATCH", `/admin/integrity/reviews/${id}`, 409, tad, {
          revision: 1,
          disposition: "REVIEWED",
          notes: "Stale update",
        });
        const review = (
          await call("GET", "/admin/integrity/reviews", 200, tad)
        )[0];
        assert.equal(review.status, "DISMISSED");
        assert.equal(review.details.events.length, 2);
        assert.equal(review.details.evidence.completedExchanges, 20);
        assert.equal(
          await db.swap.count({
            where: { requesterId: a.id, receiverId: b.id },
          }),
          snapshots,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: a.id } }))
            .isSuspended,
          false,
        );
        assert.equal(
          (await call("GET", `/users/${a.id}/profile`, 200, tb)).metrics
            .averageRating,
          3,
        );
      },
    );

    await t.test(
      "unvalidated extra partners cannot manufacture diversity or review signals",
      async () => {
        await exchange(newbie.id, a.id, 5, true, false);
        await exchange(newbie.id, a.id, 5, true, false);
        const profile = await call(
          "GET",
          `/users/${newbie.id}/profile`,
          200,
          ta,
        );
        assert.equal(profile.metrics.uniqueCompletedPartners, 1);
        assert.equal(profile.metrics.completionRate, null);
        const board = await call("GET", "/leaderboard", 200, tn);
        assert.equal(board.viewer.eligible, false);
        assert.ok(!board.topMentors.some((p: any) => p.id === newbie.id));
        const queue = await call("GET", "/admin/integrity/signals", 200, tad);
        assert.ok(
          !queue.signals.some(
            (s: any) =>
              s.userIds.includes(newbie.id) && s.userIds.includes(a.id),
          ),
        );
      },
    );
  } finally {
    server.close();
    await once(server, "close");
    await db.$disconnect();
  }
});
