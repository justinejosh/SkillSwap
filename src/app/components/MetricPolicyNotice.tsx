export function MetricPolicyNotice({
  leaderboard = false,
}: {
  leaderboard?: boolean;
}) {
  return (
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      Ratings and completion rates are averaged for each partner first, then
      equally across partners. Repeated exchanges retain their history without
      giving one partner extra weight. WRMR uses 50% rating, 30% completion, and
      20% academic proximity.
      {leaderboard &&
        " Leaderboards require completed exchanges with at least two distinct partners. This requirement does not restrict reciprocal matching or swaps."}
    </p>
  );
}
