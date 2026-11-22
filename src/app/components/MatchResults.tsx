import { MatchCard, PeerMatch } from "./MatchCard";
import { MetricPolicyNotice } from "./MetricPolicyNotice";

export function MatchResults({
  matches,
  onRequest,
  idPrefix,
}: {
  matches: PeerMatch[];
  onRequest: (peer: PeerMatch) => void;
  idPrefix: string;
}) {
  const awaitingEvidence = matches.filter((peer) => peer.matchScore === null);
  const scored = matches.filter((peer) => peer.matchScore !== null);
  // Presentation groups only. Keep the server's order within each group;
  // a null score is never treated as zero or compared with a calculated score.
  return (
    <div className="space-y-6">
      <MetricPolicyNotice matching />
      <p className="text-sm text-slate-600 dark:text-slate-300">Every listed student meets your reciprocal skill requirements. A missing score means there is not enough validated evidence to calculate a match score. You can still request a swap.</p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 pb-3 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Compatible peers</h3>
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{matches.length} {matches.length === 1 ? "match" : "matches"} found</p>
      </div>
      {awaitingEvidence.length > 0 && (
        <section aria-labelledby={`${idPrefix}-awaiting`} className="space-y-3">
          <h3
            id={`${idPrefix}-awaiting`}
            className={scored.length && awaitingEvidence.length ? "text-sm font-semibold" : "sr-only"}
          >
            Matches awaiting enough evidence ({awaitingEvidence.length})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            New students can appear here before their first completed exchange
            or review. These matches have no compatibility rank yet; their
            display order is not a quality rating.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {awaitingEvidence.map((peer) => (
              <MatchCard
                key={peer.id}
                peer={peer}
                onRequest={() => onRequest(peer)}
              />
            ))}
          </div>
        </section>
      )}
      {scored.length > 0 && (
        <section aria-labelledby={`${idPrefix}-scored`} className="space-y-3">
          <h3
            id={`${idPrefix}-scored`}
            className={scored.length && awaitingEvidence.length ? "text-sm font-semibold" : "sr-only"}
          >
            Peers with match scores ({scored.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {scored.map((peer) => (
              <MatchCard
                key={peer.id}
                peer={peer}
                onRequest={() => onRequest(peer)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
