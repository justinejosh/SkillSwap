import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import { AssessmentBadge, AssessmentTier } from "./AssessmentBadge";
export interface PeerMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
  matchScore: number | null;
  offeredSkills: { id: string; name: string; tier: AssessmentTier }[];
  wantedSkills: { id: string; name: string }[];
  matchDetails: {
    averageRating: number | null;
    ratingCount: number;
    completionRate: number | null;
    proximity: { value: number | null; reason: string };
    missing: string[];
  };
}
export function MatchCard({
  peer,
  onRequest,
}: {
  peer: PeerMatch;
  onRequest: () => void;
}) {
  const detail = peer.matchDetails;
  return (
    <article
      aria-label={`${peer.name} reciprocal match`}
      className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {peer.avatarUrl ? (
            <img
              src={peer.avatarUrl}
              referrerPolicy="no-referrer"
              className="size-11 rounded-xl object-cover"
              alt=""
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-900"
            >
              {peer.name[0]}
            </span>
          )}
          <h3 className="font-bold">{peer.name}</h3>
        </div>
        <p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {peer.matchScore === null
            ? "Unranked"
            : `${peer.matchScore.toFixed(1)}% WRMR`}
        </p>
      </div>
      <div className="space-y-2 text-xs leading-relaxed">
        <p>
          Rating (50%):{" "}
          {detail.averageRating === null
            ? "No validated ratings"
            : `${detail.averageRating.toFixed(1)}/5 (${detail.ratingCount} reviews)`}
        </p>
        <p>
          Completion (30%):{" "}
          {detail.completionRate === null
            ? "Insufficient reliable history"
            : `${(detail.completionRate * 100).toFixed(1)}%`}
        </p>
        <p>
          Academic proximity (20%):{" "}
          {detail.proximity.value === null
            ? "Unavailable"
            : `${Math.round(detail.proximity.value * 100)}%`}
          . {detail.proximity.reason}
        </p>
        {peer.matchScore === null && (
          <div className="space-y-1">
            <p>
              Reciprocal match; ranking awaits: {detail.missing.join("; ")}.
            </p>
            <p>You can request a swap while this score is unavailable.</p>
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold">Teaches</h4>
        <ul className="space-y-2">
          {peer.offeredSkills.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm capitalize">{s.name}</span>
              <AssessmentBadge tier={s.tier} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold">Wants to learn</h4>
        <p className="break-words text-sm capitalize">
          {peer.wantedSkills.map((s) => s.name).join(", ")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/students/${peer.id}`}
          className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-700 focus-visible:ring-2 dark:text-blue-300"
        >
          View Profile
        </Link>
        <Button onClick={onRequest}>Request Swap</Button>
      </div>
    </article>
  );
}
