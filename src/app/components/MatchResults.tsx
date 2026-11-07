import { MatchCard, PeerMatch } from "./MatchCard";

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
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Every listed student meets your reciprocal skill requirements. A missing
        score means there is not enough validated evidence to calculate WRMR.
        You can still request a swap.
      </p>
      <nav aria-label="Match groups" className="flex flex-wrap gap-3 text-sm">
        {awaitingEvidence.length > 0 && (
          <a
            className="rounded-lg border border-slate-300 px-3 py-2 text-blue-700 underline dark:border-slate-700 dark:text-blue-300"
            href={`#${idPrefix}-awaiting`}
          >
            Awaiting evidence ({awaitingEvidence.length})
          </a>
        )}
        {scored.length > 0 && (
          <a
            className="rounded-lg border border-slate-300 px-3 py-2 text-blue-700 underline dark:border-slate-700 dark:text-blue-300"
            href={`#${idPrefix}-scored`}
          >
            With WRMR scores ({scored.length})
          </a>
        )}
      </nav>
      {awaitingEvidence.length > 0 && (
        <section aria-labelledby={`${idPrefix}-awaiting`} className="space-y-3">
          <h3
            id={`${idPrefix}-awaiting`}
            className="scroll-mt-28 text-lg font-bold"
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
            className="scroll-mt-28 text-lg font-bold"
          >
            Matches with WRMR scores ({scored.length})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Ordered by the backend's 50% rating, 30% completion, and 20%
            academic proximity calculation.
          </p>
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
