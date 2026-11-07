import { UserMetrics, METRIC_POLICY } from "./userMetrics";

export const LEADERBOARD_POLICY = Object.freeze({
  id: "distinct-partner-leaderboards-v1",
  metricPolicy: METRIC_POLICY,
  minimumCompletedPartners: 2,
  activityOrder:
    "distinct completed partners, then partner-balanced completion rate, then stable ID",
});

export function leaderboardEligibility(metrics: UserMetrics) {
  const reasons: string[] = [];
  if (metrics.completedSwaps === null || metrics.completionRate === null)
    reasons.push("Reliable concluded-exchange history is not yet available.");
  if (metrics.averageRating === null)
    reasons.push("No validated peer rating is available.");
  if (
    metrics.uniqueCompletedPartners <
    LEADERBOARD_POLICY.minimumCompletedPartners
  )
    reasons.push(
      "Complete exchanges with at least two distinct partners for leaderboard eligibility.",
    );
  return { eligible: reasons.length === 0, reasons };
}

export function compareActivity(
  a: { id: string; uniqueCompletedPartners: number; completionRate: number },
  b: { id: string; uniqueCompletedPartners: number; completionRate: number },
) {
  return (
    b.uniqueCompletedPartners - a.uniqueCompletedPartners ||
    b.completionRate - a.completionRate ||
    a.id.localeCompare(b.id)
  );
}
