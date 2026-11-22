import { Info, ChevronDown } from "lucide-react";

export function MetricPolicyNotice({ leaderboard = false, matching = false }: { leaderboard?: boolean; matching?: boolean }) {
  return <details className="group text-sm leading-relaxed text-slate-600 dark:text-slate-300">
    <summary className="flex w-fit max-w-full cursor-pointer list-none items-center gap-2 rounded-lg py-2 font-medium text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-300 [&::-webkit-details-marker]:hidden">
      <Info className="size-4 shrink-0" aria-hidden="true" />{matching ? "How matching works" : "About ratings and exchanges"}<ChevronDown className="size-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div className="mt-2 space-y-2">
      {matching && <p>Compatible peers offer a skill you want to learn and want a skill you can teach. All listed students meet these reciprocal requirements, including students without a match score.</p>}
      <p>Ratings and completion rates are averaged for each partner first, then equally across partners. Repeated exchanges retain their history without giving one partner extra weight.</p>
      {matching && <><p>Match scores combine peer ratings (50%), completion (30%), and academic similarity (20%). The percentage represents a share of the maximum 100-point ranking score, not a probability of swap success. Assessment badges do not affect scores.</p><p>A missing score means there is not enough validated evidence to calculate a match score. These students remain eligible for swaps; their display order is not a quality rating.</p></>}
      {leaderboard && <p>Leaderboards require completed exchanges with at least two distinct partners. This requirement does not restrict reciprocal matching or swaps.</p>}
    </div>
  </details>;
}
