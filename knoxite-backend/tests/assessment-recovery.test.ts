import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { assessmentAvailability } from "../services/assessmentService";
import { profileRouter } from "../routes/profile";
import { errorHandler } from "../lib/http";

function fixture(active = true, banks: any[] = []) {
  const offering = { id: "offering", userId: "owner", skillId: "skill", isActive: active, tier: "NOT_ASSESSED", skill: { id: "skill", name: "Synthetic skill", category: "technology" } };
  const db: any = {
    userOfferedSkill: { findFirst: async ({ where }: any) => where.userId === "owner" && (where.isActive === undefined || where.isActive === active) ? offering : null },
    assessmentAttempt: { findMany: async () => [] }, assessmentVersion: { findMany: async () => banks },
  };
  return { db, offering };
}
test("unpublished/missing Advanced content is unavailable, not merely locked behind Amateur", async () => {
  const { db } = fixture(); const result = await assessmentAvailability(db, "offering", "owner");
  const advanced = result.levels.find((l) => l.level === "ADVANCED")!;
  assert.equal(advanced.supported, false); assert.equal(advanced.eligible, false);
  assert.match(advanced.reason, /unavailable/i);
});
test("removed owned skills retain readable eligibility/history without permitting an assessment", async () => {
  const { db } = fixture(false);
  db.assessmentAttempt.findMany = async () => [{ id: "past", level: "BASIC", status: "PASSED", startedAt: new Date(), expiresAt: new Date(), gradedAt: new Date(), earnedPoints: 10, possiblePoints: 10, attemptNumber: 1 }];
  const result = await assessmentAvailability(db, "offering", "owner") as any;
  assert.equal(result.isActive, false); assert.equal(result.attempts[0].id, "past");
  assert.ok(result.levels.every((l: any) => !l.eligible && /restore/i.test(l.reason)));
  await assert.rejects(() => assessmentAvailability(db, "offering", "other"), /not found/i);
});
test("profile exposes a resumable attempt even when its bank is retired for new starts", async () => {
  const { offering } = fixture();
  const db: any = {
    user: { findUnique: async () => ({ id: "owner", name: "Synthetic", email: "ownerlag@fixture.test", role: "USER", bio: "", program: null, yearLevel: null, yearLevelId: null, offeringLinks: [offering], wantedSkills: [] }) },
    assessmentBank: { findMany: async () => [] },
    assessmentAttempt: { findMany: async () => [{ id: "active", offeringId: offering.id, level: "BASIC", status: "IN_PROGRESS", expiresAt: new Date(Date.now() + 60_000) }] },
    swap: { findMany: async () => [] },
  };
  const app = express(); app.use((req, _res, next) => { req.userId = "owner"; req.userRole = "USER"; next(); });
  app.use("/profile", profileRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/profile`);
    assert.equal(response.status, 200); const body: any = await response.json();
    assert.equal(body.offeredSkills[0].basicAvailable, false);
    assert.equal(body.offeredSkills[0].activeBasicAttemptId, "active");
  } finally { server.close(); await once(server, "close"); }
});
