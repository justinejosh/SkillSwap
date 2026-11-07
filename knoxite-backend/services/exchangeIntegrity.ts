import { createHash } from "node:crypto";
import { aggregateMetrics, MetricOutcome } from "./userMetrics";

export const INTEGRITY_REVIEW_REASON = "EXCHANGE_INTEGRITY_REVIEW";
export const INTEGRITY_SIGNAL_POLICY = "repeated-partner-review-signals-v1";
type Outcome = MetricOutcome & { id: string };

export function exchangeIntegritySignals(outcomes: Outcome[]) {
  const pairs = new Map<
    string,
    { userIds: string[]; concluded: number; completed: Outcome[] }
  >();
  for (const outcome of outcomes) {
    const userIds = [outcome.requesterId, outcome.receiverId].sort();
    const metric = aggregateMetrics([userIds[0]], [outcome]).get(userIds[0])!;
    // Reuse the production outcome checks; legacy/unvalidated/open exchanges are not evidence.
    if (metric.eligibleConcludedSwaps !== 1) continue;
    const key = JSON.stringify(userIds);
    const pair = pairs.get(key) ?? { userIds, concluded: 0, completed: [] };
    pair.concluded++;
    if (metric.validatedCompletedSwaps === 1) pair.completed.push(outcome);
    pairs.set(key, pair);
  }
  return [...pairs.values()]
    .filter((p) => p.completed.length > 1)
    .map((pair) => {
      const dates = pair.completed
        .map((s) => s.completedAt!.getTime())
        .sort((a, b) => a - b);
      const gaps = dates
        .slice(1)
        .map((value, i) => value - dates[i])
        .sort((a, b) => a - b);
      const mid = Math.floor(gaps.length / 2);
      const medianGapMs =
        gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
      const reciprocalFiveStarExchanges = pair.completed.filter((s) =>
        s.reviews.every((r) => r.isValidated && r.rating === 5),
      ).length;
      return {
        userIds: pair.userIds,
        concludedExchanges: pair.concluded,
        completedExchanges: pair.completed.length,
        reciprocalFiveStarExchanges,
        firstCompletedAt: new Date(dates[0]).toISOString(),
        lastCompletedAt: new Date(dates[dates.length - 1]).toISOString(),
        fastestGapMs: gaps[0],
        medianGapMs,
        exchangeIdsDigest: createHash("sha256")
          .update(JSON.stringify(pair.completed.map((s) => s.id).sort()))
          .digest("hex"),
        signals: [
          "REPEATED_PARTNER",
          ...(reciprocalFiveStarExchanges > 1
            ? ["REPEATED_RECIPROCAL_FIVE_STAR"]
            : []),
        ],
      };
    })
    .sort(
      (a, b) =>
        b.completedExchanges - a.completedExchanges ||
        a.medianGapMs - b.medianGapMs ||
        JSON.stringify(a.userIds).localeCompare(JSON.stringify(b.userIds)),
    );
}

export function parseIntegrityCase(description: string): any | null {
  try {
    const value = JSON.parse(description);
    return value.kind === INTEGRITY_SIGNAL_POLICY &&
      Array.isArray(value.userIds) &&
      value.userIds.length === 2 &&
      Number.isInteger(value.revision) &&
      Array.isArray(value.events)
      ? value
      : null;
  } catch {
    return null;
  }
}
