import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { requireLocalDatabase } from "../../scripts/safeDatabase";
import { seedAcademicCatalog } from "../../services/academics";

test("isolated MySQL API, assessment and exchange regression suite", async (t) => {
  const databaseUrl = requireLocalDatabase();
  assert.match(new URL(databaseUrl).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const config = loadConfig({
    JWT_SECRET: "synthetic-test-secret-".repeat(3),
    INSTITUTION_EMAIL_DOMAINS: "fixture.example",
    CAMPUS_EMAIL_SUFFIX: "lag",
    EMAIL_VERIFICATION_REQUIRED: "true",
  });
  const deliveries: { email: string; link: string }[] = [];
  const server = createApp(db, config, async (email, link) => {
    deliveries.push({ email, link });
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const prefix = `fixture-${randomUUID().slice(0, 8)}`;
  async function call(
    method: string,
    path: string,
    token?: string,
    body?: unknown,
  ) {
    const res = await fetch(`http://127.0.0.1:${port}/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: (await res.json()) as any };
  }
  async function tokenFor(userId: string) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const session = await db.authSession.create({
      data: {
        userId,
        userAgent: "Synthetic integration test",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    return jwt.sign({ tokenVersion: user.tokenVersion }, config.jwtSecret, {
      subject: userId,
      jwtid: session.id,
      issuer: "knoxite-api",
      audience: "knoxite",
      expiresIn: "1h",
      algorithm: "HS256",
    });
  }
  function assertPublic(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      assert.ok(
        ![
          "email",
          "password",
          "passwordHash",
          "token",
          "isCorrect",
          "rubric",
          "tokenVersion",
          "validationNotes",
          "attempts",
        ].includes(key),
        `Private field exposed: ${key}`,
      );
      assertPublic(entry);
    }
  }
  try {
    await seedAcademicCatalog(db);
    await db.program.updateMany({
      where: { mappingNotes: { startsWith: "Synthetic integration fixture;" } },
      data: {
        departmentId: null,
        mappingValidatedAt: null,
        mappingValidatedById: null,
        mappingNotes: null,
      },
    });
    const program = await db.program.findUniqueOrThrow({
      where: { code: "BSCS" },
      include: { yearLevels: { orderBy: { order: "asc" } } },
    });
    const otherProgram = await db.program.findUniqueOrThrow({
      where: { code: "BSIT" },
    });
    const year = program.yearLevels[0];
    const hash = await bcrypt.hash("fixture-password-123", 4);
    const makeUser = (name: string, role: "USER" | "ADMIN" = "USER") =>
      db.user.create({
        data: {
          name: `${prefix}-${name}`,
          email: `${prefix}-${name}lag@fixture.example`,
          passwordHash: hash,
          role,
          emailVerifiedAt: new Date(),
          programId: program.id,
          yearLevelId: year.id,
        },
      });
    const [a, b, c, admin] = await Promise.all([
      makeUser("a"),
      makeUser("b"),
      makeUser("c"),
      makeUser("admin", "ADMIN"),
    ]);
    const [ta, tb, tc, tad] = await Promise.all([
      tokenFor(a.id),
      tokenFor(b.id),
      tokenFor(c.id),
      tokenFor(admin.id),
    ]);
    const [skillA, skillB, extra] = await Promise.all(
      ["a", "b", "extra"].map((s) =>
        db.skill.create({
          data: { name: `${prefix}-${s}`, category: "technology" },
        }),
      ),
    );
    await call("POST", "/profile/skills/offer", ta, {
      name: skillA.name,
      category: "technology",
    });
    await call("POST", "/profile/skills/want", ta, {
      name: skillB.name,
      category: "technology",
    });
    await call("POST", "/profile/skills/offer", tb, {
      name: extra.name,
      category: "technology",
    });
    await call("POST", "/profile/skills/offer", tb, {
      name: skillB.name,
      category: "technology",
    });
    await call("POST", "/profile/skills/want", tb, {
      name: extra.name,
      category: "technology",
    });
    await call("POST", "/profile/skills/want", tb, {
      name: skillA.name,
      category: "technology",
    });
    const offering = await db.userOfferedSkill.findUniqueOrThrow({
      where: { userId_skillId: { userId: a.id, skillId: skillA.id } },
    });
    await t.test(
      "institutional academic catalogue and unconfirmed mappings",
      async () => {
        const options = await call("GET", "/auth/academic-options");
        assert.equal(options.status, 200);
        assert.deepEqual(
          options.data.programs.map((p: any) => p.label).sort(),
          [
            "BSACC",
            "BSAIS",
            "BSCRIM",
            "BSCS",
            "BSIHM-CA",
            "BSIHM-HACLO",
            "BSIT",
            "BSMLS",
            "BSN",
            "BSPT",
            "BSTom",
            "BS PHARM",
            "BS PSYCH",
          ].sort(),
        );
        assert.deepEqual(
          options.data.yearLevels.map((y: any) => y.name),
          ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        );
        const matches = await call("GET", "/matches", ta);
        const peer = matches.data.find((p: any) => p.id === b.id);
        assert.equal(peer.matchScore, null);
        assert.equal(peer.matchDetails.proximity.value, null);
        assert.deepEqual(
          peer.matchingOfferedSkills.map((s: any) => s.id),
          [skillB.id],
        );
        assert.deepEqual(
          peer.matchingWantedSkills.map((s: any) => s.id),
          [skillA.id],
        );
        assertPublic(peer);
      },
    );
    await t.test(
      "new unassessed students can request and accept a swap without a WRMR score",
      async () => {
        const before = await call("GET", "/matches", ta);
        const peer = before.data.find((p: any) => p.id === b.id);
        assert.ok(peer, "A cold-start reciprocal match must remain visible");
        assert.equal(peer.matchScore, null);
        assert.equal(peer.metrics.ratingCount, 0);
        assert.equal(peer.metrics.averageRating, null);
        assert.equal(peer.metrics.completedSwaps, 0);
        assert.equal(peer.metrics.eligibleConcludedSwaps, 0);
        assert.equal(peer.metrics.completionRate, null);
        assert.ok(
          peer.offeredSkills.every((s: any) => s.tier === "NOT_ASSESSED"),
        );
        const request = await call("POST", "/swaps/request", ta, {
          receiverId: b.id,
          offeredSkillId: skillA.id,
          wantedSkillId: skillB.id,
        });
        assert.equal(request.status, 201);
        const accepted = await call(
          "PATCH",
          `/swap-requests/${request.data.id}/status`,
          tb,
          { newStatus: "ACCEPTED" },
        );
        assert.equal(accepted.status, 200);
        assert.ok(accepted.data.redirectId);
        assert.equal(
          (
            await db.swap.findUniqueOrThrow({
              where: { id: accepted.data.redirectId },
            })
          ).status,
          "PENDING_AGREEMENT",
        );
        // End this pre-confirmation fixture without creating a concluded teaching outcome.
        assert.equal(
          (
            await call(
              "DELETE",
              `/swaps/cancel/swap/${accepted.data.redirectId}`,
              ta,
            )
          ).status,
          200,
        );
        const after = (await call("GET", "/matches", ta)).data.find(
          (p: any) => p.id === b.id,
        );
        assert.ok(after);
        assert.equal(after.matchScore, null);
        assert.equal(after.metrics.eligibleConcludedSwaps, 0);
      },
    );
    await t.test(
      "authentication, administrator and profile privacy boundaries",
      async () => {
        assert.equal((await call("GET", "/admin/dashboard-data")).status, 401);
        assert.equal(
          (await call("GET", "/admin/dashboard-data", ta)).status,
          403,
        );
        assert.equal(
          (await call("DELETE", `/admin/users/${c.id}`, ta)).status,
          403,
        );
        assert.equal((await call("GET", "/analytics", ta)).status, 403);
        assert.equal((await call("GET", "/forum/posts")).status, 401);
        const portfolio = await call("GET", `/users/${a.id}/profile`, tb);
        assert.equal(portfolio.status, 200);
        assertPublic(portfolio.data);
        assert.equal(portfolio.data.program.label, "BSCS");
        assert.equal(portfolio.data.yearLevel.name, "1st Year");
        assert.equal(portfolio.data.department, null);
        assert.equal(
          (await call("PUT", "/profile/update", ta, { departmentId: "forged" }))
            .status,
          422,
        );
        assert.equal(
          (
            await call("POST", "/profile/skills/offer", ta, {
              name: extra.name,
              tier: "VERIFIED",
            })
          ).status,
          422,
        );
      },
    );
    await t.test(
      "different programs can share one officially confirmed department",
      async () => {
        const department = await db.department.create({
          data: {
            code: prefix.toUpperCase(),
            name: "Synthetic fixture department",
          },
        });
        assert.equal(
          (
            await call(
              "POST",
              `/admin/academic-programs/${program.id}/department`,
              ta,
              {
                departmentId: department.id,
                officiallyConfirmed: true,
                validationNotes: "Synthetic test evidence",
              },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              "POST",
              `/admin/academic-programs/${program.id}/department`,
              tad,
              {
                departmentId: department.id,
                officiallyConfirmed: false,
                validationNotes: "Synthetic test evidence",
              },
            )
          ).status,
          422,
        );
        for (const id of [program.id, otherProgram.id])
          assert.equal(
            (
              await call(
                "POST",
                `/admin/academic-programs/${id}/department`,
                tad,
                {
                  departmentId: department.id,
                  officiallyConfirmed: true,
                  validationNotes:
                    "Synthetic integration fixture; not an actual institutional mapping",
                },
              )
            ).status,
            200,
          );
        assert.equal(
          (
            await call("PUT", "/profile/update", tb, {
              programId: otherProgram.id,
              yearLevelId: year.id,
            })
          ).status,
          200,
        );
        const peer = (await call("GET", "/matches", ta)).data.find(
          (p: any) => p.id === b.id,
        );
        assert.equal(peer.program.label, "BSIT");
        assert.equal(peer.matchDetails.proximity.value, 1);
      },
    );
    let swapId = "";
    await t.test(
      "reciprocal requests, bilateral versioned consent, sessions and reviews",
      async () => {
        assert.equal(
          (
            await call("POST", "/swaps/request", ta, {
              receiverId: a.id,
              offeredSkillId: skillA.id,
              wantedSkillId: skillB.id,
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call("POST", "/swaps/request", ta, {
              receiverId: b.id,
              offeredSkillId: extra.id,
              wantedSkillId: skillB.id,
            })
          ).status,
          422,
        );
        const request = await call("POST", "/swaps/request", ta, {
          receiverId: b.id,
          offeredSkillId: skillA.id,
          wantedSkillId: skillB.id,
        });
        assert.equal(request.status, 201);
        assert.equal(
          await db.swap.count({ where: { requestId: request.data.id } }),
          0,
        );
        assert.equal(
          (
            await call(
              "PATCH",
              `/swap-requests/${request.data.id}/status`,
              tc,
              { newStatus: "ACCEPTED" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await call(
              "PATCH",
              `/swap-requests/${request.data.id}/status`,
              tb,
              { newStatus: "COMPLETED" },
            )
          ).status,
          422,
        );
        const accepted = await call(
          "PATCH",
          `/swap-requests/${request.data.id}/status`,
          tb,
          { newStatus: "ACCEPTED" },
        );
        assert.equal(accepted.status, 200);
        swapId = accepted.data.redirectId;
        assert.ok(swapId);
        assert.equal(
          (
            await call(
              "PATCH",
              `/swap-requests/${request.data.id}/status`,
              tb,
              { newStatus: "ACCEPTED" },
            )
          ).data.redirectId,
          swapId,
        );
        assert.equal(
          await db.swap.count({ where: { requestId: request.data.id } }),
          1,
        );
        for (const method of ["GET", "POST"] as const)
          assert.equal(
            (
              await call(
                method,
                method === "GET"
                  ? `/swaps/${swapId}`
                  : `/swaps/${swapId}/log-session`,
                tc,
                method === "POST" ? { sessionNumber: 1 } : undefined,
              )
            ).status,
            403,
          );
        const approved = await call("POST", `/swaps/${swapId}/agreement`, ta, {
          sessions: 1,
          duration: 1,
          agreementVersion: 1,
          agreedToTerms: true,
        });
        assert.equal(approved.status, 200);
        assert.equal(approved.data.swap.status, "PENDING_AGREEMENT");
        const version = approved.data.swap.agreementVersion;
        assert.equal(
          (
            await call("POST", `/swaps/${swapId}/agreement`, tb, {
              sessions: 1,
              duration: 1,
              agreementVersion: version - 1,
              agreedToTerms: true,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await call("POST", `/swaps/${swapId}/agreement`, tb, {
              sessions: 1,
              duration: 1,
              agreementVersion: version,
              agreedToTerms: true,
            })
          ).data.swap.status,
          "CONFIRMED",
        );
        assert.equal(
          (await call("POST", "/reputation/submit", ta, { swapId, rating: 5 }))
            .status,
          409,
        );
        assert.equal(
          (
            await call("POST", "/chat/send", tc, {
              swapId,
              receiverId: b.id,
              content: "Not a participant",
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("POST", "/chat/send", ta, {
              swapId,
              receiverId: c.id,
              content: "Wrong recipient",
            })
          ).status,
          422,
        );
        assert.equal(
          (
            await call("POST", "/chat/send", ta, {
              swapId,
              receiverId: b.id,
              content: "Synthetic message",
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await call("POST", "/sessions", ta, {
              swapId,
              sessionNumber: 1,
              scheduledAt: new Date(Date.now() + 86400_000).toISOString(),
              meetingLink: "https://example.invalid/fixture",
            })
          ).status,
          201,
        );
        for (const token of [ta, tb]) {
          const results = await Promise.all([
            call("POST", `/swaps/${swapId}/log-session`, token, {
              sessionNumber: 1,
            }),
            call("POST", `/swaps/${swapId}/log-session`, token, {
              sessionNumber: 1,
            }),
          ]);
          assert.ok(results.every((r) => [200, 409].includes(r.status)));
        }
        assert.equal(
          await db.sessionConfirmation.count({ where: { swapId } }),
          2,
        );
        assert.equal(
          (
            await call("POST", "/sessions", ta, {
              swapId,
              sessionNumber: 1,
              scheduledAt: new Date(Date.now() + 86400_000).toISOString(),
            })
          ).status,
          409,
        );
        assert.equal(
          (await call("POST", "/reputation/submit", ta, { swapId, rating: 6 }))
            .status,
          422,
        );
        assert.equal(
          (await call("POST", "/reputation/submit", tc, { swapId, rating: 5 }))
            .status,
          403,
        );
        assert.equal(
          (
            await call("POST", "/reputation/submit", ta, {
              swapId,
              partnerId: c.id,
              rating: 5,
            })
          ).status,
          422,
        );
        const first = await call("POST", "/reputation/submit", ta, {
          swapId,
          rating: 5,
        });
        assert.equal(first.status, 200);
        assert.equal(
          (await call("POST", "/reputation/submit", ta, { swapId, rating: 5 }))
            .data.id,
          first.data.id,
        );
        assert.equal(
          (await db.swap.findUniqueOrThrow({ where: { id: swapId } })).status,
          "CONFIRMED",
        );
        assert.equal(
          (await call("POST", "/reputation/submit", tb, { swapId, rating: 5 }))
            .status,
          200,
        );
        const finished = await db.swap.findUniqueOrThrow({
          where: { id: swapId },
        });
        assert.equal(finished.status, "COMPLETED");
        assert.ok(finished.completedAt);
        const peer = (await call("GET", "/matches", ta)).data.find(
          (p: any) => p.id === b.id,
        );
        assert.equal(peer.matchScore, 100);
        assert.equal(
          (await call("DELETE", `/swaps/cancel/swap/${swapId}`, tc)).status,
          403,
        );
      },
    );
    async function importBank(level: "BASIC" | "ADVANCED", threshold = 80) {
      const input = {
        skillId: skillA.id,
        level,
        title: "Synthetic fixture bank",
        learningOutcomes: `Synthetic test-only ${level} learning outcomes for threshold ${threshold}.`,
        questionCount: level === "BASIC" ? 10 : 5,
        passingPercent: threshold,
        items: Array.from({ length: level === "BASIC" ? 12 : 7 }, (_, i) => ({
          kind: level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE",
          prompt: `Synthetic ${level} fixture item ${i}`,
          competency: "Fixture only",
          rubric: "One point for the configured synthetic choice",
          points: 1,
          options: [
            { text: "Synthetic correct choice", isCorrect: true },
            { text: "Synthetic incorrect choice", isCorrect: false },
          ],
        })),
      };
      const imported = await call(
        "POST",
        "/admin/assessments/versions",
        tad,
        input,
      );
      assert.equal(imported.status, 201);
      assert.equal(
        (
          await call(
            "POST",
            `/admin/assessments/versions/${imported.data.id}/publish`,
            tad,
            {},
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            "POST",
            `/admin/assessments/versions/${imported.data.id}/validate`,
            tad,
            { validationNotes: "Synthetic test-only validation fixture" },
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await call(
            "POST",
            `/admin/assessments/versions/${imported.data.id}/publish`,
            tad,
            {},
          )
        ).status,
        200,
      );
      return imported.data.id;
    }
    async function responseFor(id: string, correct: number) {
      const attempt = await db.assessmentAttempt.findUniqueOrThrow({
        where: { id },
        include: {
          items: {
            orderBy: { position: "asc" },
            include: { item: { include: { options: true } } },
          },
        },
      });
      return attempt.items.map((q, i) => ({
        questionId: q.id,
        optionId: q.item.options.find((o) => o.isCorrect === i < correct)!.id,
      }));
    }
    await t.test(
      "assessment ownership, version snapshots, secure grading and monotonic tiers",
      async () => {
        assert.equal((await call("GET", "/admin/assessments", ta)).status, 403);
        assert.equal(
          (
            await call(
              "POST",
              `/assessments/offerings/${offering.id}/attempts`,
              ta,
              { level: "ADVANCED" },
            )
          ).status,
          403,
        );
        assert.equal(
          (await call("GET", `/assessments/offerings/${offering.id}`, tb))
            .status,
          404,
        );
        await importBank("BASIC");
        await importBank("ADVANCED");
        const starts = await Promise.all([
          call("POST", `/assessments/offerings/${offering.id}/attempts`, ta, {
            level: "BASIC",
          }),
          call("POST", `/assessments/offerings/${offering.id}/attempts`, ta, {
            level: "BASIC",
          }),
        ]);
        assert.ok(starts.every((r) => [201, 409].includes(r.status)));
        const started = await call(
          "POST",
          `/assessments/offerings/${offering.id}/attempts`,
          ta,
          { level: "BASIC" },
        );
        assert.equal(started.status, 201);
        const id = started.data.id;
        assert.equal(started.data.questions.length, 10);
        assert.equal(
          await db.assessmentAttempt.count({
            where: { offeringId: offering.id, level: "BASIC" },
          }),
          1,
        );
        const repeated = await call("GET", `/assessments/attempts/${id}`, ta);
        assert.deepEqual(repeated.data.questions, started.data.questions);
        assertPublic({ questions: repeated.data.questions });
        assert.equal(
          (await call("GET", `/assessments/attempts/${id}`, tb)).status,
          404,
        );
        assert.equal(
          (
            await call("POST", `/assessments/attempts/${id}/submit`, ta, {
              answers: [],
              score: 100,
              tier: "VERIFIED",
            })
          ).status,
          422,
        );
        await importBank("BASIC", 100);
        const passed = await call(
          "POST",
          `/assessments/attempts/${id}/submit`,
          ta,
          { answers: await responseFor(id, 8) },
        );
        assert.equal(passed.status, 200);
        assert.equal(passed.data.passingPercent, 80);
        assert.equal(
          passed.data.learningOutcomes,
          "Synthetic test-only BASIC learning outcomes for threshold 80.",
        );
        assert.equal(passed.data.score, 80);
        assert.equal(passed.data.tier, "AMATEUR");
        assert.equal(
          (
            await call("POST", `/assessments/attempts/${id}/submit`, ta, {
              answers: [],
            })
          ).data.score,
          80,
        );
        const advanced = await call(
          "POST",
          `/assessments/offerings/${offering.id}/attempts`,
          ta,
          { level: "ADVANCED" },
        );
        assert.equal(advanced.status, 201);
        const failed = await call(
          "POST",
          `/assessments/attempts/${advanced.data.id}/submit`,
          ta,
          { answers: await responseFor(advanced.data.id, 3) },
        );
        assert.equal(failed.data.status, "FAILED");
        assert.equal(failed.data.tier, "AMATEUR");
        assert.equal(
          (
            await call(
              "POST",
              `/assessments/offerings/${offering.id}/attempts`,
              ta,
              { level: "ADVANCED" },
            )
          ).status,
          429,
        );
        await importBank("ADVANCED");
        await call(
          "PATCH",
          `/profile/skills/offer/${offering.id}/prompts`,
          ta,
          { level: "ADVANCED" },
        );
        await call("DELETE", `/profile/skills/offer/${skillA.id}`, ta);
        const restored = await call("POST", "/profile/skills/offer", ta, {
          name: skillA.name,
          category: "technology",
        });
        assert.equal(restored.data.offering.id, offering.id);
        assert.equal(restored.data.offering.tier, "AMATEUR");
        assert.equal(
          (
            await call(
              "POST",
              `/assessments/offerings/${offering.id}/attempts`,
              ta,
              { level: "ADVANCED" },
            )
          ).status,
          429,
        );
        await db.assessmentAttempt.update({
          where: { id: advanced.data.id },
          data: { gradedAt: new Date(Date.now() - 25 * 3600_000) },
        });
        const next = await call(
          "POST",
          `/assessments/offerings/${offering.id}/attempts`,
          ta,
          { level: "ADVANCED" },
        );
        assert.equal(next.status, 201);
        assert.equal(
          (
            await call(
              "POST",
              `/assessments/attempts/${next.data.id}/submit`,
              ta,
              { answers: await responseFor(next.data.id, 4) },
            )
          ).data.tier,
          "VERIFIED",
        );
        const sameSkill = await call("POST", "/profile/skills/offer", tb, {
          name: skillA.name,
          category: "technology",
        });
        assert.equal(sameSkill.data.offering.tier, "NOT_ASSESSED");
        const publicProfile = await call("GET", `/users/${a.id}/profile`, tb);
        assertPublic(publicProfile.data);
        assert.equal(
          publicProfile.data.offeredSkills.find((s: any) => s.id === skillA.id)
            .tier,
          "VERIFIED",
        );
        assert.equal(
          (await call("GET", "/matches", ta)).data.find(
            (p: any) => p.id === b.id,
          ).matchScore,
          100,
        );
      },
    );
    await t.test(
      "expiry and retake limits cannot be bypassed by new bank versions",
      async () => {
        const saved = await call("POST", "/profile/skills/offer", tc, {
          name: skillA.name,
          category: "technology",
        });
        const id = saved.data.offering.id;
        for (let i = 0; i < 3; i++) {
          const started = await call(
            "POST",
            `/assessments/offerings/${id}/attempts`,
            tc,
            { level: "BASIC" },
          );
          assert.equal(started.status, 201);
          if (i === 0) {
            await db.assessmentAttempt.update({
              where: { id: started.data.id },
              data: { expiresAt: new Date(Date.now() - 1000) },
            });
            assert.equal(
              (
                await call(
                  "POST",
                  `/assessments/attempts/${started.data.id}/submit`,
                  tc,
                  { answers: [] },
                )
              ).data.status,
              "EXPIRED",
            );
          } else
            assert.equal(
              (
                await call(
                  "POST",
                  `/assessments/attempts/${started.data.id}/submit`,
                  tc,
                  { answers: [] },
                )
              ).data.status,
              "FAILED",
            );
          await db.assessmentAttempt.update({
            where: { id: started.data.id },
            data: {
              gradedAt: new Date(Date.now() - 25 * 3600_000),
              expiresAt: new Date(Date.now() - 25 * 3600_000),
            },
          });
        }
        await importBank("BASIC");
        assert.equal(
          (
            await call("POST", `/assessments/offerings/${id}/attempts`, tc, {
              level: "BASIC",
            })
          ).status,
          429,
        );
        assert.equal(
          await db.assessmentAttempt.count({ where: { offeringId: id } }),
          3,
        );
      },
    );
    await t.test(
      "stale requests, withdrawal, and confirmed cancellations preserve eligibility and outcomes",
      async () => {
        const request = await call("POST", "/swaps/request", ta, {
          receiverId: b.id,
          offeredSkillId: skillA.id,
          wantedSkillId: skillB.id,
        });
        assert.equal(request.status, 201);
        await call("DELETE", `/profile/skills/offer/${skillA.id}`, ta);
        assert.equal(
          (
            await call(
              "PATCH",
              `/swap-requests/${request.data.id}/status`,
              tb,
              { newStatus: "ACCEPTED" },
            )
          ).status,
          409,
        );
        assert.equal(
          (await call("DELETE", `/swaps/cancel/request/${request.data.id}`, ta))
            .status,
          200,
        );
        assert.equal(
          await db.swap.count({ where: { requestId: request.data.id } }),
          0,
        );
        const restored = await call("POST", "/profile/skills/offer", ta, {
          name: skillA.name,
          category: "technology",
        });
        assert.equal(restored.data.offering.tier, "VERIFIED");
        const next = await call("POST", "/swaps/request", ta, {
          receiverId: b.id,
          offeredSkillId: skillA.id,
          wantedSkillId: skillB.id,
        });
        assert.equal(next.status, 201);
        const accepted = await call(
          "PATCH",
          `/swap-requests/${next.data.id}/status`,
          tb,
          { newStatus: "ACCEPTED" },
        );
        assert.equal(accepted.status, 200);
        const id = accepted.data.redirectId;
        for (const token of [ta, tb])
          assert.equal(
            (
              await call("POST", `/swaps/${id}/agreement`, token, {
                sessions: 4,
                duration: 1,
                agreedToTerms: true,
                agreementVersion: 1,
              })
            ).status,
            200,
          );
        assert.equal(
          (await call("DELETE", `/swaps/cancel/swap/${id}`, ta)).status,
          200,
        );
        assert.equal(
          (await call("DELETE", `/swaps/cancel/swap/${id}`, ta)).status,
          200,
        );
        assert.equal(
          (await db.swap.findUniqueOrThrow({ where: { id } })).status,
          "CANCELLED",
        );
        const peer = (await call("GET", "/matches", ta)).data.find(
          (p: any) => p.id === b.id,
        );
        assert.equal(peer.metrics.completionRate, 0.5);
        assert.equal(peer.matchScore, 85);
      },
    );
    await t.test(
      "institutional verification fallback, reporting and suspension retain records",
      async () => {
        const email = `${prefix}-newlag@fixture.example`;
        const registration = await call("POST", "/auth/register", undefined, {
          name: "Synthetic registered student",
          email,
          password: "fixture-password-123",
          programId: program.id,
          yearLevelId: year.id,
        });
        assert.equal(registration.status, 201);
        assert.equal(
          (
            await call("POST", "/auth/login", undefined, {
              email,
              password: "fixture-password-123",
            })
          ).status,
          403,
        );
        const delivery = deliveries.find((d) => d.email === email)!;
        assert.ok(delivery);
        const token = new URLSearchParams(
          new URL(delivery.link).hash.slice(1),
        ).get("token");
        assert.equal(
          (await call("POST", "/auth/verify-email", undefined, { token }))
            .status,
          200,
        );
        assert.equal(
          (await call("POST", "/auth/verify-email", undefined, { token }))
            .status,
          422,
        );
        const login = await call("POST", "/auth/login", undefined, {
          email,
          password: "fixture-password-123",
        });
        assert.equal(login.status, 200);
        assert.ok(login.data.token);
        assert.equal(
          (
            await call("POST", "/auth/register", undefined, {
              name: "Wrong campus",
              email: `${prefix}@fixture.example`,
              password: "fixture-password-123",
              programId: program.id,
              yearLevelId: year.id,
            })
          ).status,
          422,
        );
        const report = await call("POST", "/reports", tc, {
          targetId: b.id,
          reason: "NO_SHOW",
          description: "Synthetic test report",
        });
        assert.equal(report.status, 201);
        assert.equal(
          (
            await call("PATCH", `/admin/reports/${report.data.id}`, tad, {
              status: "DISMISSED",
              resolution: "Synthetic test resolution",
            })
          ).status,
          200,
        );
        assert.equal(
          (await call("DELETE", `/admin/users/${c.id}`, tad)).status,
          200,
        );
        assert.ok(await db.user.findUnique({ where: { id: c.id } }));
        assert.equal((await call("GET", "/profile", tc)).status, 401);
        assert.equal(
          (
            await call("POST", "/auth/password", login.data.token, {
              currentPassword: "fixture-password-123",
              newPassword: "fixture-new-password-123",
            })
          ).status,
          200,
        );
        assert.equal(
          (await call("GET", "/profile", login.data.token)).status,
          401,
        );
        assert.equal(
          (await call("GET", "/admin/dashboard-data", tad)).status,
          200,
        );
      },
    );
  } finally {
    server.close();
    await once(server, "close");
    await db.$disconnect();
  }
});
