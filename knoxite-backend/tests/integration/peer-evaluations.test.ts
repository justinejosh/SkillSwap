import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { issueSession } from "../../services/authSessions";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";

test("peer evaluation reporting matches Overview and preserves stored reviews on disposable MySQL", async t => {
  const db = new PrismaClient({ datasources: { db: { url: requireOwnedFixtureDatabase() } } });
  const config = loadConfig({ JWT_SECRET: "synthetic-review-directory-key-".repeat(3), EMAIL_VERIFICATION_REQUIRED: "false", INSTITUTION_EMAIL_DOMAINS: "fixture.invalid" });
  const users = await Promise.all(["Alice", "Bob", "Admin"].map((name, i) => db.user.create({ data: { name: `Synthetic ${name}`, email: `synthetic${randomUUID().replaceAll("-", "")}lag@fixture.invalid`, role: i === 2 ? "ADMIN" : "USER" } })));
  const sessions = await Promise.all(users.map(user => db.$transaction(tx => issueSession(tx, config, user, "Synthetic evaluation test session"))));
  const skills = await Promise.all(["Python", "SQL"].map(name => db.skill.create({ data: { name: `Synthetic ${name}`, category: "technology" } })));
  const baseSwap = { requesterId: users[0].id, receiverId: users[1].id, offeredSkillId: skills[0].id, wantedSkillId: skills[1].id, sessions: 1, duration: null };
  for (let i = 0; i < 25; i++) {
    const swap = await db.swap.create({ data: { ...baseSwap, status: "COMPLETED", integrityVerified: true } });
    await db.review.create({ data: { reviewerId: i % 2 ? users[1].id : users[0].id, revieweeId: i % 2 ? users[0].id : users[1].id, swapId: swap.id, rating: i % 5 + 1, isValidated: true, comment: i === 0 ? null : `Synthetic feedback ${i}`, createdAt: new Date(Date.UTC(2026, 10, 1, 0, i)) } });
  }
  for (const [isValidated, status, integrityVerified] of [[false, "COMPLETED", true], [true, "CONFIRMED", true], [true, "COMPLETED", false]] as const) {
    const swap = await db.swap.create({ data: { ...baseSwap, status, integrityVerified } });
    await db.review.create({ data: { reviewerId: users[0].id, revieweeId: users[1].id, swapId: swap.id, rating: 2, isValidated, comment: "Synthetic outside Overview population" } });
  }
  const digest = async () => createHash("sha256").update(JSON.stringify(await db.review.findMany({ orderBy: { id: "asc" } }))).digest("hex");
  const before = await digest();
  const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1"); await once(server, "listening"); const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  const get = async (path: string, status = 200, as: number | null = 2) => { const response = await fetch(base + path, { headers: as === null ? {} : { Authorization: `Bearer ${sessions[as].token}` } }); assert.equal(response.status, status, path); return response.json() as Promise<any>; };
  const endpoint = "/admin/peer-evaluations";
  function assertPrivate(value: any) { if (!value || typeof value !== "object") return; for (const [key, item] of Object.entries(value)) { assert.ok(!["email", "passwordHash", "token", "tokenVersion", "sessionId", "isSuspended"].includes(key), key); assertPrivate(item); } }
  try {
    await t.test("anonymous/student denial and the exact all-time Overview population", async () => {
      await get(endpoint, 401, null); await get(endpoint, 403, 0);
      const overview = await get("/analytics"), first = await get(endpoint); assert.equal(overview.systemHealth.totalReviews, 25); assert.equal(first.total, overview.systemHealth.totalReviews); assert.equal(first.reviews.length, 20); assert.equal(first.validation, "COUNTED"); assert.ok(first.reviews.every((r: any) => r.isValidated && r.countedInOverview)); assertPrivate(first);
      const second = await get(endpoint + "?page=2"); assert.equal(second.reviews.length, 5); assert.equal(new Set([...first.reviews, ...second.reviews].map(r => r.id)).size, 25);
    });
    await t.test("names, ratings, validation and stable date ordering filter on the server", async () => {
      const rating = await get(endpoint + "?rating=4&search=Synthetic%20Alice&sort=oldest"); assert.equal(rating.total, 5); assert.ok(rating.reviews.every((r: any) => r.rating === 4 && (r.reviewer.name === "Synthetic Alice" || r.reviewee.name === "Synthetic Alice"))); assert.ok(rating.reviews.every((r: any, i: number) => !i || r.createdAt >= rating.reviews[i-1].createdAt));
      const all = await get(endpoint + "?validation=ALL&pageSize=50"); assert.equal(all.total, 28); assert.equal(all.reviews.filter((r: any) => !r.countedInOverview).length, 3); assertPrivate(all);
      assert.equal((await get(endpoint + "?validation=VALIDATED")).total, 27); const unvalidated = await get(endpoint + "?validation=UNVALIDATED"); assert.equal(unvalidated.total, 1); assert.equal(unvalidated.reviews[0].isValidated, false);
      const oldest = await get(endpoint + "?sort=oldest&pageSize=50"); assert.equal(oldest.reviews[0].comment, null); assert.equal(oldest.reviews[0].reviewer.name, "Synthetic Alice"); assert.equal(oldest.reviews[0].reviewee.name, "Synthetic Bob"); assert.equal(oldest.reviews[0].swap.offeredSkill.name, "Synthetic Python");
    });
    await t.test("empty/out-of-range pages, invalid requests and no evaluation mutation", async () => {
      const empty = await get(endpoint + "?search=AbsentStudent"); assert.equal(empty.total, 0); assert.deepEqual(empty.reviews, []); const outside = await get(endpoint + "?page=100"); assert.equal(outside.total, 25); assert.deepEqual(outside.reviews, []);
      for (const query of ["page=0", "pageSize=51", "rating=6", "validation=unrecognised", "sort=unrecognised"]) await get(endpoint + "?" + query, 422);
      for (const method of ["POST", "PATCH", "DELETE"]) { const response = await fetch(base + endpoint, { method, headers: { Authorization: `Bearer ${sessions[2].token}` } }); assert.equal(response.status, 404); }
      assert.equal(await digest(), before); assert.equal(config.reportEvidence, undefined);
    });
  } finally { server.close(); await once(server, "close"); await db.$disconnect(); }
});
