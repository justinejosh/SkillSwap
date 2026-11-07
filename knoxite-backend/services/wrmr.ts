export const WRMR_POLICY = "wrmr-50-30-20-academic-v1";
export const WRMR_WEIGHTS = Object.freeze({
  rating: 0.5,
  completion: 0.3,
  proximity: 0.2,
});
export function wrmr(
  averageRating: number | null,
  completionRate: number | null,
  proximity: number | null,
) {
  const missing: string[] = [];
  if (averageRating === null) missing.push("No validated peer ratings");
  if (completionRate === null)
    missing.push("Completion-rate evidence unavailable");
  if (proximity === null) missing.push("Incomplete academic information");
  if (
    averageRating !== null &&
    (!Number.isFinite(averageRating) || averageRating < 1 || averageRating > 5)
  )
    throw new RangeError("Invalid average rating");
  for (const v of [completionRate, proximity])
    if (v !== null && (!Number.isFinite(v) || v < 0 || v > 1))
      throw new RangeError("Invalid normalized factor");
  const contributions = {
    rating: averageRating === null ? null : (averageRating / 5) * 50,
    completion: completionRate === null ? null : completionRate * 30,
    proximity: proximity === null ? null : proximity * 20,
  };
  const score = missing.length
    ? null
    : contributions.rating! +
      contributions.completion! +
      contributions.proximity!;
  return { score, contributions, missing, policy: WRMR_POLICY };
}
export function compareMatches(
  a: { id: string; matchScore: number | null },
  b: { id: string; matchScore: number | null },
) {
  if (a.matchScore === null && b.matchScore !== null) return 1;
  if (a.matchScore !== null && b.matchScore === null) return -1;
  return (b.matchScore ?? 0) - (a.matchScore ?? 0) || a.id.localeCompare(b.id);
}
