export function MetricPolicyNotice({
  leaderboard = false,
}: {
  leaderboard?: boolean;
}) {
  return (
    <details className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-blue-600">About peer ratings and exchange statistics</summary>
      <p className="mt-2">
      Ratings and completion rates are averaged for each partner first, then
      equally across partners. Repeated exchanges retain their history without
      giving one partner extra weight. Match scores use peer ratings (50%),
      completion (30%), and academic similarity (20%). The percentage represents
      a share of the maximum 100-point ranking score, not a probability of swap success.
      {leaderboard &&
        " Leaderboards require completed exchanges with at least two distinct partners. This requirement does not restrict reciprocal matching or swaps."}
      </p>
    </details>
  );
}
