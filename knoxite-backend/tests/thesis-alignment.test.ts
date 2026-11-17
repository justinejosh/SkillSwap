import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { academicProximity } from "../services/academicProximity";
import { aggregateMetrics, MetricOutcome } from "../services/userMetrics";
import { compareMatches, wrmr, WRMR_WEIGHTS } from "../services/wrmr";
import { leaderboardEligibility } from "../services/leaderboards";
import { analyticsRouter } from "../routes/analytics";
import { errorHandler } from "../lib/http";

function outcome(overrides: Partial<MetricOutcome> = {}): MetricOutcome {
  return {
    requesterId: "fixture-a", receiverId: "fixture-b", status: "COMPLETED",
    integrityVerified: true, requesterApprovedAt: new Date(), receiverApprovedAt: new Date(),
    completedAt: new Date(), sessions: 1, requesterSessions: 1, receiverSessions: 1,
    reviews: [
      { reviewerId: "fixture-a", revieweeId: "fixture-b", rating: 5, isValidated: true },
      { reviewerId: "fixture-b", revieweeId: "fixture-a", rating: 4, isValidated: true },
    ], ...overrides,
  };
}
test("thesis Table 1 arithmetic is B=92.5, D=92, C=86 under unchanged WRMR weights", () => {
  const rows = [
    { id: "B", matchScore: wrmr(4.8, 0.95, 0.8).score },
    { id: "C", matchScore: wrmr(4.2, 0.8, 1).score },
    { id: "D", matchScore: wrmr(5, 1, 0.6).score },
  ];
  for (const [i, expected] of [92.5, 86, 92].entries())
    assert.ok(Math.abs(rows[i].matchScore! - expected) < 1e-10);
  assert.deepEqual(rows.sort(compareMatches).map((r) => r.id), ["B", "D", "C"]);
  assert.deepEqual(WRMR_WEIGHTS, { rating: 0.5, completion: 0.3, proximity: 0.2 });
});
test("approved cancellation policy affects both participants equally only after bilateral approval", () => {
  const completed = outcome();
  const cancelled = outcome({ status: "CANCELLED", completedAt: null, reviews: [], requesterSessions: 0, receiverSessions: 0 });
  for (const person of ["fixture-a", "fixture-b"]) {
    const metric = aggregateMetrics([person], [completed, cancelled]).get(person)!;
    assert.equal(metric.completionRate, 0.5);
    assert.equal(metric.eligibleConcludedSwaps, 2);
    const early = aggregateMetrics([person], [completed, { ...cancelled, receiverApprovedAt: null }]).get(person)!;
    assert.equal(early.completionRate, 1); assert.equal(early.eligibleConcludedSwaps, 1);
    const open = aggregateMetrics([person], [completed, outcome({ status: "CONFIRMED" })]).get(person)!;
    assert.equal(open.completionRate, 1); assert.equal(open.eligibleConcludedSwaps, 1);
    const legacy = aggregateMetrics([person], [completed, { ...cancelled, integrityVerified: false }]).get(person)!;
    assert.equal(legacy.completionRate, null); assert.equal(legacy.legacyConcludedSwaps, 1);
  }
});
test("one newly completed validated exchange can supply WRMR evidence without a waiting period or leaderboard eligibility", () => {
  const metric = aggregateMetrics(["fixture-a"], [outcome({ completedAt: new Date() })]).get("fixture-a")!;
  const proximity = academicProximity({ departmentId: "fixture-dept", yearLevelId: "fixture-year" }, { departmentId: "fixture-dept", yearLevelId: "fixture-year" });
  assert.equal(metric.averageRating, 4); assert.equal(metric.completionRate, 1);
  assert.equal(wrmr(metric.averageRating, metric.completionRate, proximity.value).score, 90);
  assert.equal(leaderboardEligibility(metric).eligible, false);
  assert.equal(wrmr(metric.averageRating, metric.completionRate, null).score, null);
});
test("monthly analytics reuse WRMR outcome eligibility instead of counting invalid completed flags", async () => {
  const date = new Date();
  const rows = [
    outcome(),
    outcome({ status: "CANCELLED", completedAt: null, reviews: [] }),
    outcome({ status: "CANCELLED", completedAt: null, receiverApprovedAt: null, reviews: [] }),
    outcome({ requesterSessions: 0 }), outcome({ reviews: [] }),
    outcome({ integrityVerified: false }), outcome({ receiverId: "fixture-a" }),
  ].map((s) => ({ ...s, cancelledAt: s.status === "CANCELLED" ? date : null }));
  const db = {
    user: { findMany: async () => [{ id: "fixture-a" }, { id: "fixture-b" }] },
    swap: { findMany: async () => rows }, skill: { findMany: async () => [] }, review: { count: async () => 0 },
  } as unknown as PrismaClient;
  let role: "USER" | "ADMIN" = "USER";
  const app = express();
  // Test-only caller fixture. Production authentication remains untouched.
  app.use((req, _res, next) => { req.userId = "fixture-admin"; req.userRole = role; next(); });
  app.use(analyticsRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
  try {
    let response = await fetch(url); assert.equal(response.status, 403); await response.json();
    role = "ADMIN"; response = await fetch(url); assert.equal(response.status, 200);
    const body: any = await response.json();
    const current = body.monthlyCompletion.find((m: any) => m.period === date.toISOString().slice(0, 7));
    assert.deepEqual(current, { period: date.toISOString().slice(0, 7), rate: 50, completed: 1, eligibleConcluded: 2, eligibleCancelled: 1, excludedConcluded: 5 });
    assert.equal(body.swapMetrics.completedSwaps, 1);
    assert.equal(body.swapMetrics.eligibleConcludedSwaps, 2);
    // Unvalidated concluded history still makes the overall rate unavailable.
    assert.equal(body.swapMetrics.completionRate, null);
  } finally { server.close(); await once(server, "close"); }
});
