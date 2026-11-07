import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { seedAcademicCatalog } from "../../services/academics";
import { requireLocalDatabase } from "../../scripts/safeDatabase";

test("registered student journey and authorization review on isolated MySQL", async (t) => {
  const url = requireLocalDatabase();
  assert.match(new URL(url).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const prefix = `journey-${randomUUID().slice(0, 8)}`;
  const domain = "journey.fixture.example";
  const password = "synthetic-journey-password";
  const config = loadConfig({
    JWT_SECRET: "synthetic-journey-signing-key-".repeat(3),
    INSTITUTION_EMAIL_DOMAINS: domain,
    CAMPUS_EMAIL_SUFFIX: "lag",
    EMAIL_VERIFICATION_REQUIRED: "true",
  });
  const deliveries = new Map<string, string>();
  const server = createApp(db, config, async (email, link) => {
    deliveries.set(email, link);
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  async function call(
    method: string,
    path: string,
    expected: number,
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
    assert.equal(response.status, expected, `${method} ${path}`);
    return (await response.json()) as any;
  }
  function assertPublic(value: unknown) {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.ok(
        ![
          "email",
          "passwordHash",
          "token",
          "tokenVersion",
          "isCorrect",
          "rubric",
          "attempts",
          "validationNotes",
        ].includes(key),
        `Private field ${key}`,
      );
      assertPublic(child);
    }
  }
  let ta = "",
    tb = "",
    tad = "",
    aId = "",
    bId = "",
    offeringId = "",
    skillA = "",
    skillB = "",
    swapId = "";
  try {
    await seedAcademicCatalog(db);
    const programA = await db.program.findUniqueOrThrow({
      where: { code: "BSCS" },
      include: { yearLevels: { orderBy: { order: "asc" } } },
    });
    const programB = await db.program.findUniqueOrThrow({
      where: { code: "BSIT" },
    });
    const year = programA.yearLevels[0];
    const admin = await db.user.create({
      data: {
        name: `${prefix}-admin`,
        email: `${prefix}-adminlag@${domain}`,
        passwordHash: await bcrypt.hash(password, 4),
        role: "ADMIN",
        emailVerifiedAt: new Date(),
      },
    });
    tad = (
      await call("POST", "/auth/login", 200, undefined, {
        email: admin.email,
        password,
      })
    ).token;

    await t.test(
      "registration, mailbox verification and login use the real APIs",
      async () => {
        for (const [name, programId] of [
          ["a", programA.id],
          ["b", programB.id],
        ]) {
          const email = `${prefix}-${name}lag@${domain}`;
          const registered = await call(
            "POST",
            "/auth/register",
            201,
            undefined,
            {
              name: `${prefix}-${name}`,
              email,
              password,
              programId,
              yearLevelId: year.id,
            },
          );
          assert.equal(registered.verificationSent, true);
          assert.equal(registered.token, undefined);
          await call("POST", "/auth/login", 403, undefined, {
            email,
            password,
          });
          const token = new URL(deliveries.get(email)!).hash.slice(
            "#token=".length,
          );
          await call("POST", "/auth/verify-email", 200, undefined, { token });
          await call("POST", "/auth/verify-email", 422, undefined, { token });
          const login = await call("POST", "/auth/login", 200, undefined, {
            email,
            password,
          });
          if (name === "a") {
            ta = login.token;
            aId = login.user.id;
          } else {
            tb = login.token;
            bId = login.user.id;
          }
        }
      },
    );

    await t.test(
      "every administrative route rejects anonymous and student callers",
      async () => {
        const endpoints = [
          ["POST", "/admin/academic-options/initialize"],
          ["GET", "/admin/academic-programs"],
          ["POST", "/admin/academic-programs"],
          ["PATCH", `/admin/academic-programs/${programA.id}/year-levels`],
          ["POST", `/admin/academic-programs/${programA.id}/department`],
          ["GET", "/admin/dashboard-data"],
          ["DELETE", `/admin/users/${bId}`],
          ["POST", "/admin/academic-options"],
          ["GET", "/admin/assessment-catalog"],
          ["GET", "/admin/assessments"],
          ["POST", "/admin/assessments/versions"],
          ["POST", "/admin/assessments/versions/missing/validate"],
          ["POST", "/admin/assessments/versions/missing/publish"],
          ["POST", "/admin/assessments/versions/missing/retire"],
          ["GET", "/admin/reports"],
          ["PATCH", "/admin/reports/missing"],
          ["GET", "/analytics"],
          ["DELETE", "/forum/posts/missing"],
        ];
        for (const [method, path] of endpoints) {
          const body = ["POST", "PATCH"].includes(method) ? {} : undefined;
          await call(method, path, 401, undefined, body);
          await call(method, path, 403, ta, body);
        }
        const claims = jwt.decode(ta) as jwt.JwtPayload;
        const forgedRole = jwt.sign(
          { ...claims, role: "ADMIN" },
          config.jwtSecret,
          { algorithm: "HS256" },
        );
        await call("GET", "/admin/dashboard-data", 403, forgedRole);
        const retiredKey = jwt.sign(
          claims,
          "synthetic-retired-signing-key-".repeat(3),
          { algorithm: "HS256" },
        );
        await call("GET", "/profile", 401, retiredKey);
        await db.user.update({
          where: { id: admin.id },
          data: { role: "USER" },
        });
        try {
          await call("GET", "/admin/dashboard-data", 403, tad);
        } finally {
          await db.user.update({
            where: { id: admin.id },
            data: { role: "ADMIN" },
          });
        }
      },
    );

    await t.test(
      "live account eligibility is checked and malformed legacy identifiers stay private",
      async () => {
        const original = await db.user.findUniqueOrThrow({
          where: { id: aId },
        });
        try {
          for (const data of [
            { isSuspended: true },
            { emailVerifiedAt: null },
            { email: `${prefix}@outside.invalid` },
            { email: `lag@${domain}` },
          ]) {
            await db.user.update({
              where: { id: aId },
              data: {
                email: original.email,
                emailVerifiedAt: original.emailVerifiedAt,
                isSuspended: false,
                ...data,
              },
            });
            await call("GET", "/profile", 403, ta);
            await call("GET", `/users/${aId}/profile`, 404, tb);
            const board = await call("GET", "/leaderboard", 200, tb);
            assert.ok(!board.topMentors.some((p: any) => p.id === aId));
            const swapsBoard = await call("GET", "/leaderboard/swaps", 200, tb);
            assert.ok(!swapsBoard.some((p: any) => p.id === aId));
          }
        } finally {
          await db.user.update({
            where: { id: aId },
            data: {
              email: original.email,
              emailVerifiedAt: original.emailVerifiedAt,
              isSuspended: false,
            },
          });
        }
      },
    );

    await t.test(
      "academic mapping, skill creation and cold-start discovery integrate",
      async () => {
        const department = await call(
          "POST",
          "/admin/academic-options",
          201,
          tad,
          {
            type: "department",
            code: prefix.toUpperCase(),
            name: "Synthetic journey department",
          },
        );
        for (const id of [programA.id, programB.id])
          await call(
            "POST",
            `/admin/academic-programs/${id}/department`,
            200,
            tad,
            {
              departmentId: department.id,
              officiallyConfirmed: true,
              validationNotes:
                "Synthetic integration fixture; no actual institutional approval",
            },
          );
        const offeringA = await call("POST", "/profile/skills/offer", 201, ta, {
          name: `${prefix}-skill-a`,
          category: "technology",
        });
        const offeringB = await call("POST", "/profile/skills/offer", 201, tb, {
          name: `${prefix}-skill-b`,
          category: "technology",
        });
        offeringId = offeringA.offering.id;
        skillA = offeringA.skill.id;
        skillB = offeringB.skill.id;
        assert.equal(offeringA.offering.tier, "NOT_ASSESSED");
        await call("POST", "/profile/skills/want", 201, ta, {
          name: offeringB.skill.name,
        });
        await call("POST", "/profile/skills/want", 201, tb, {
          name: offeringA.skill.name,
        });
        await call(
          "POST",
          `/assessments/offerings/${offeringId}/attempts`,
          404,
          ta,
          { level: "BASIC" },
        );
        const peer = (await call("GET", "/matches", 200, ta)).find(
          (p: any) => p.id === bId,
        );
        assert.ok(peer);
        assert.equal(peer.matchScore, null);
        assert.equal(peer.matchDetails.proximity.value, 1);
        assertPublic(peer);
      },
    );

    await t.test(
      "published synthetic banks award Amateur then Verified through backend grading",
      async () => {
        await call(
          "POST",
          `/assessments/offerings/${offeringId}/attempts`,
          403,
          ta,
          { level: "ADVANCED" },
        );
        for (const level of ["BASIC", "ADVANCED"]) {
          const count = level === "BASIC" ? 10 : 5;
          const version = await call(
            "POST",
            "/admin/assessments/versions",
            201,
            tad,
            {
              skillId: skillA,
              level,
              title: "Synthetic journey bank; not student content",
              learningOutcomes: `Synthetic ${level} scenario test outcomes only`,
              questionCount: count,
              passingPercent: 80,
              items: Array.from({ length: count + 2 }, (_, i) => ({
                kind: level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE",
                prompt: `Synthetic ${level} fixture ${i}`,
                competency: "Synthetic fixture only",
                rubric:
                  "One point for the synthetic key; not educational validation",
                points: 1,
                options: [
                  { text: "Synthetic keyed option", isCorrect: true },
                  { text: "Synthetic distractor", isCorrect: false },
                ],
              })),
            },
          );
          await call(
            "POST",
            `/admin/assessments/versions/${version.id}/publish`,
            409,
            tad,
            {},
          );
          await call(
            "POST",
            `/admin/assessments/versions/${version.id}/validate`,
            200,
            tad,
            {
              validationNotes:
                "Synthetic automated-test acknowledgement only; not real subject review",
            },
          );
          await call(
            "POST",
            `/admin/assessments/versions/${version.id}/publish`,
            200,
            tad,
            {},
          );
          const attempt = await call(
            "POST",
            `/assessments/offerings/${offeringId}/attempts`,
            201,
            ta,
            { level },
          );
          assertPublic(attempt.questions);
          await call("GET", `/assessments/attempts/${attempt.id}`, 404, tb);
          const stored = await db.assessmentAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
            include: {
              items: {
                orderBy: { position: "asc" },
                include: { item: { include: { options: true } } },
              },
            },
          });
          const answers = stored.items.map((q, i) => ({
            questionId: q.id,
            optionId: q.item.options.find(
              (o) => o.isCorrect === i < count * 0.8,
            )!.id,
          }));
          await call(
            "POST",
            `/assessments/attempts/${attempt.id}/submit`,
            422,
            ta,
            { answers, score: 100, tier: "VERIFIED" },
          );
          const result = await call(
            "POST",
            `/assessments/attempts/${attempt.id}/submit`,
            200,
            ta,
            { answers },
          );
          assert.equal(result.score, 80);
          assert.equal(result.status, "PASSED");
          assert.equal(result.tier, level === "BASIC" ? "AMATEUR" : "VERIFIED");
        }
        const publicStudent = await call(
          "GET",
          `/users/${aId}/profile`,
          200,
          tb,
        );
        assert.equal(
          publicStudent.offeredSkills.find((s: any) => s.id === skillA).tier,
          "VERIFIED",
        );
        assertPublic(publicStudent);
        assert.equal(
          (await call("GET", "/matches", 200, tb)).find(
            (p: any) => p.id === aId,
          ).matchScore,
          null,
        );
      },
    );

    await t.test(
      "unranked reciprocal exchange reaches bilateral completion and reliable WRMR analytics",
      async () => {
        const request = await call("POST", "/swaps/request", 201, ta, {
          receiverId: bId,
          offeredSkillId: skillA,
          wantedSkillId: skillB,
        });
        const accepted = await call(
          "PATCH",
          `/swap-requests/${request.id}/status`,
          200,
          tb,
          { newStatus: "ACCEPTED" },
        );
        swapId = accepted.redirectId;
        const first = await call(
          "POST",
          `/swaps/${swapId}/agreement`,
          200,
          ta,
          {
            sessions: 1,
            duration: 1,
            agreementVersion: 1,
            agreedToTerms: true,
          },
        );
        assert.equal(first.swap.status, "PENDING_AGREEMENT");
        await call("POST", `/swaps/${swapId}/agreement`, 409, tb, {
          sessions: 1,
          duration: 1,
          agreementVersion: first.swap.agreementVersion - 1,
          agreedToTerms: true,
        });
        const confirmed = await call(
          "POST",
          `/swaps/${swapId}/agreement`,
          200,
          tb,
          {
            sessions: 1,
            duration: 1,
            agreementVersion: first.swap.agreementVersion,
            agreedToTerms: true,
          },
        );
        assert.equal(confirmed.swap.status, "CONFIRMED");
        await call("POST", "/sessions", 201, ta, {
          swapId,
          sessionNumber: 1,
          scheduledAt: new Date(Date.now() + 86400_000).toISOString(),
          meetingLink: "https://example.invalid/synthetic-session",
        });
        await call("POST", "/reputation/submit", 409, ta, {
          swapId,
          rating: 5,
        });
        for (const token of [ta, tb])
          await call("POST", `/swaps/${swapId}/log-session`, 200, token, {
            sessionNumber: 1,
          });
        await call("POST", "/reputation/submit", 200, ta, {
          swapId,
          rating: 5,
        });
        assert.equal(
          (await call("GET", `/swaps/${swapId}`, 200, ta)).status,
          "CONFIRMED",
        );
        await call("POST", "/reputation/submit", 200, tb, {
          swapId,
          rating: 4,
        });
        assert.equal(
          (await call("GET", `/swaps/${swapId}`, 200, ta)).status,
          "COMPLETED",
        );
        assert.equal(await db.review.count({ where: { swapId } }), 2);
        const analytics = await call("GET", "/analytics/me", 200, ta);
        assert.equal(analytics.metrics.completedSwaps, 1);
        assert.equal(analytics.metrics.averageRating, 4);
        assert.equal(analytics.metrics.ratingCount, 1);
        assert.equal(analytics.metrics.completionRate, 1);
        assert.equal(
          analytics.skills.find((s: any) => s.skill.id === skillA).tier,
          "VERIFIED",
        );
        assert.equal(
          analytics.exchanges.find((s: any) => s.id === swapId).status,
          "COMPLETED",
        );
        const fromA = (await call("GET", "/matches", 200, ta)).find(
          (p: any) => p.id === bId,
        );
        const fromB = (await call("GET", "/matches", 200, tb)).find(
          (p: any) => p.id === aId,
        );
        assert.equal(fromA.matchScore, 100);
        assert.equal(fromB.matchScore, 90);
        assertPublic(fromA);
        assertPublic(fromB);
        assert.ok(
          (await call("GET", "/analytics", 200, tad)).swapMetrics
            .completedSwaps >= 1,
        );
      },
    );
  } finally {
    server.close();
    await once(server, "close");
    await db.$disconnect();
  }
});
