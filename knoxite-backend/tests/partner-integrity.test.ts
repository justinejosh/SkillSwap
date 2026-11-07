import test from "node:test";
import assert from "node:assert/strict";
import { aggregateMetrics, MetricOutcome } from "../services/userMetrics";
import {
  leaderboardEligibility,
  compareActivity,
} from "../services/leaderboards";
import { exchangeIntegritySignals } from "../services/exchangeIntegrity";
import {
  reviewedDepartmentDraft,
  proposedDepartment,
} from "../services/departmentDraft";
import { wrmr, WRMR_WEIGHTS } from "../services/wrmr";

function outcome(
  id: string,
  partner = "b",
  rating = 5,
  overrides: Partial<MetricOutcome> = {},
) {
  return {
    id,
    requesterId: "a",
    receiverId: partner,
    status: "COMPLETED",
    integrityVerified: true,
    requesterApprovedAt: new Date("2026-01-01"),
    receiverApprovedAt: new Date("2026-01-01"),
    completedAt: new Date(
      `2026-01-${String(Number(id) + 1).padStart(2, "0")}T10:00:00Z`,
    ),
    sessions: 1,
    requesterSessions: 1,
    receiverSessions: 1,
    reviews: [
      { reviewerId: "a", revieweeId: partner, rating: 5, isValidated: true },
      { reviewerId: partner, revieweeId: "a", rating, isValidated: true },
    ],
    ...overrides,
  };
}

test("the provisional draft covers exact catalog codes across nine colleges", () => {
  const draft = reviewedDepartmentDraft();
  assert.equal(draft.status, "PROVISIONAL");
  assert.equal(draft.departments.length, 9);
  assert.equal(draft.departments.flatMap((d) => d.programCodes).length, 13);
  assert.equal(
    proposedDepartment("BSTOM")?.name,
    "College of Hospitality and Institutional Management",
  );
  assert.equal(proposedDepartment("BS_PHARM")?.name, "College of Pharmacy");
  assert.deepEqual(proposedDepartment("BSCS"), proposedDepartment("BSIT"));
  assert.equal(proposedDepartment("SHS"), null);
});

test("repeating a five-star partner does not outweigh an independent partner", () => {
  const independent = outcome("1", "c", 1);
  const before = aggregateMetrics(["a"], [outcome("0"), independent]).get("a")!;
  const repeated = Array.from({ length: 10 }, (_, i) => outcome(String(i + 2)));
  const after = aggregateMetrics(
    ["a"],
    [outcome("0"), independent, ...repeated],
  ).get("a")!;
  assert.equal(before.averageRating, 3);
  assert.equal(after.averageRating, 3);
  assert.ok(after.rawAverageRating! > before.rawAverageRating!);
  assert.equal(after.ratingCount, 12);
  assert.equal(after.uniqueRatingPartners, 2);
  assert.equal(after.completedSwaps, 12);
  assert.equal(
    wrmr(before.averageRating, before.completionRate, 1).score,
    wrmr(after.averageRating, after.completionRate, 1).score,
  );
  assert.deepEqual(WRMR_WEIGHTS, {
    rating: 0.5,
    completion: 0.3,
    proximity: 0.2,
  });
});

test("completion is balanced across partners, including confirmed cancellations", () => {
  const cancelled = outcome("11", "c", 1, {
    status: "CANCELLED",
    completedAt: null,
    reviews: [],
  });
  const rows = [outcome("0"), outcome("1", "c", 1), cancelled];
  const first = aggregateMetrics(["a"], rows).get("a")!;
  const second = aggregateMetrics(
    ["a"],
    [...rows, ...Array.from({ length: 9 }, (_, i) => outcome(String(i + 2)))],
  ).get("a")!;
  assert.equal(first.completionRate, 0.75);
  assert.equal(second.completionRate, 0.75);
  assert.equal(first.rawCompletionRate, 2 / 3);
  assert.equal(second.rawCompletionRate, 11 / 12);
  assert.equal(second.uniqueConcludedPartners, 2);
  assert.equal(
    wrmr(second.averageRating, second.completionRate, 1).score,
    72.5,
  );
});

test("one repeated partner cannot qualify an account for either leaderboard", () => {
  const metric = aggregateMetrics(
    ["a"],
    Array.from({ length: 20 }, (_, i) => outcome(String(i))),
  ).get("a")!;
  assert.equal(metric.averageRating, 5);
  assert.equal(metric.completedSwaps, 20);
  assert.equal(metric.uniqueCompletedPartners, 1);
  assert.equal(leaderboardEligibility(metric).eligible, false);
  assert.equal(wrmr(metric.averageRating, metric.completionRate, 1).score, 100);
});

test("new users have no invented factors and leaderboard rules are separate from matching", () => {
  const metric = aggregateMetrics(["new"], []).get("new")!;
  assert.equal(metric.averageRating, null);
  assert.equal(metric.completionRate, null);
  assert.equal(metric.rawAverageRating, null);
  assert.equal(metric.rawCompletionRate, null);
  assert.equal(leaderboardEligibility(metric).eligible, false);
  assert.equal(
    wrmr(metric.averageRating, metric.completionRate, 1).score,
    null,
  );
});

test("legitimate repeated exchanges retain all history and do not imply misconduct", () => {
  const rows = [
    outcome("0", "b", 4),
    outcome("1", "b", 3),
    outcome("2", "c", 2),
  ];
  const metric = aggregateMetrics(["a"], rows).get("a")!;
  assert.equal(metric.completedSwaps, 3);
  assert.equal(metric.uniqueCompletedPartners, 2);
  assert.equal(metric.averageRating, 2.75);
  assert.equal(leaderboardEligibility(metric).eligible, true);
  const signals = exchangeIntegritySignals(rows);
  assert.equal(signals.length, 1);
  assert.deepEqual(signals[0].signals, ["REPEATED_PARTNER"]);
  assert.equal(signals[0].reciprocalFiveStarExchanges, 0);
});

test("mutual five-star repetition produces private observations without speed thresholds", () => {
  const signals = exchangeIntegritySignals([
    outcome("0"),
    outcome("1"),
    outcome("2", "c", 2),
    outcome("3", "b", 5, { integrityVerified: false }),
  ]);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].completedExchanges, 2);
  assert.equal(signals[0].reciprocalFiveStarExchanges, 2);
  assert.deepEqual(signals[0].signals, [
    "REPEATED_PARTNER",
    "REPEATED_RECIPROCAL_FIVE_STAR",
  ]);
  assert.equal(signals[0].medianGapMs, 86400000);
  assert.equal(signals[0].fastestGapMs, 86400000);
});

test("activity ordering cannot be farmed with raw counts or a volume tie-breaker", () => {
  const farmed = {
    id: "b",
    uniqueCompletedPartners: 2,
    completionRate: 0.75,
    totalSwaps: 1000,
  };
  const diverse = {
    id: "c",
    uniqueCompletedPartners: 3,
    completionRate: 0.5,
    totalSwaps: 3,
  };
  assert.deepEqual(
    [farmed, diverse].sort(compareActivity).map((p) => p.id),
    ["c", "b"],
  );
  const tied = {
    id: "a",
    uniqueCompletedPartners: 2,
    completionRate: 0.75,
    totalSwaps: 2,
  };
  assert.deepEqual(
    [farmed, tied].sort(compareActivity).map((p) => p.id),
    ["a", "b"],
  );
});

test("legacy or invalid outcomes cannot establish diversity or repeat-review evidence", () => {
  const rows = [
    outcome("0"),
    outcome("1", "c", 5, { integrityVerified: false }),
    outcome("2", "b", 5, { requesterSessions: 0 }),
  ];
  const metric = aggregateMetrics(["a"], rows).get("a")!;
  assert.equal(metric.uniqueCompletedPartners, 1);
  assert.equal(metric.completionRate, null);
  assert.equal(metric.completedSwaps, null);
  assert.equal(leaderboardEligibility(metric).eligible, false);
  assert.equal(exchangeIntegritySignals(rows).length, 0);
});
