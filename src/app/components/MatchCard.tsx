import { Link } from "react-router";
import { useId, useState } from "react";
import { ReciprocalExchange } from "./ReciprocalExchange";
import { Button } from "@/app/components/ui/button";
import { AssessmentBadge, AssessmentTier } from "./AssessmentBadge";
export interface PeerMatch {
  id: string;
  name: string;
  avatarUrl: string | null;
  matchScore: number | null;
  offeredSkills: { id: string; name: string; tier: AssessmentTier }[];
  wantedSkills: { id: string; name: string }[];
  matchingOfferedSkills?: { id: string; name: string }[];
  matchingWantedSkills?: { id: string; name: string }[];
  matchDetails: {
    averageRating: number | null;
    ratingCount: number;
    uniqueRatingPartners?: number;
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
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  return (
    <article
      aria-label={`${peer.name} reciprocal match`}
      className="@container flex flex-col justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      {detail.uniqueRatingPartners !== undefined && (
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Peer feedback from {detail.uniqueRatingPartners} distinct{" "}
          {detail.uniqueRatingPartners === 1 ? "partner" : "partners"}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
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
          <h3 className="min-w-0 break-words font-bold">{peer.name}</h3>
        </div>
        <p className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          {peer.matchScore === null
            ? "Unranked"
            : `${peer.matchScore.toFixed(1)}% Match Score`}
        </p>
      </div>
      {!!peer.matchingOfferedSkills?.length && !!peer.matchingWantedSkills?.length && (
        <ReciprocalExchange learn={peer.matchingOfferedSkills} teach={peer.matchingWantedSkills} />
      )}
      <div className="space-y-2 text-xs leading-relaxed">
        <p>
          Peer rating:{" "}
          {detail.averageRating === null
            ? "No validated ratings"
            : `${detail.averageRating.toFixed(1)}/5 (${detail.ratingCount} reviews)`}
        </p>
        <p>
          Exchange completion:{" "}
          {detail.completionRate === null
            ? "Insufficient reliable history"
            : `${(detail.completionRate * 100).toFixed(1)}%`}
        </p>
        <p>
          Academic similarity:{" "}
          {detail.proximity.value === null
            ? "Unavailable"
            : `${Math.round(detail.proximity.value * 100)}%`}
          . {detail.proximity.reason}
        </p>
        {detail.uniqueRatingPartners === 1 && (
          <p>
            Limited evidence: peer feedback comes from one partner. The score
            can change as more validated exchanges are recorded.
          </p>
        )}
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
        <ul id={`${listId}-teaches`} className="space-y-2">
          {(expanded?peer.offeredSkills:peer.offeredSkills.slice(0,3)).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm capitalize">{s.name}</span>
              <AssessmentBadge tier={s.tier} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-bold">Wants to learn</h4>
        <p id={`${listId}-wants`} className="break-words text-sm capitalize">
          {(expanded?peer.wantedSkills:peer.wantedSkills.slice(0,3)).map((s) => s.name).join(", ")}
        </p>
        {(peer.offeredSkills.length>3||peer.wantedSkills.length>3)&&<button type="button" aria-expanded={expanded} aria-controls={`${listId}-teaches ${listId}-wants`} className="mt-3 rounded text-sm font-semibold text-blue-700 underline focus-visible:outline-2 dark:text-blue-300" onClick={()=>setExpanded(v=>!v)}>{expanded?"Show fewer skills":`Show all skills (${peer.offeredSkills.length} teaching, ${peer.wantedSkills.length} learning)`}</button>}
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
