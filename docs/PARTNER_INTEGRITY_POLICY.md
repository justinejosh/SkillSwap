# Partner-balanced evidence and leaderboard integrity

## Review findings and approved scope

The earlier implementation enforces one review per participant per swap, current reciprocal skills, bilateral agreement consent, and participant session acknowledgements. Those checks prevent duplicate reviews and unilateral completion, but two cooperating accounts can satisfy them repeatedly. Every additional completed swap previously added another equally weighted rating and completion outcome; the activity leaderboard sorted raw completed counts, and accounts without sufficient evidence still received leaderboard positions.

In this conversation on 2026-11-07 the team explicitly reported adviser approval for partner-balanced rating/completion inputs and a minimum of two distinct completed-exchange partners for leaderboard eligibility. The team separately approved ordering Most Active by distinct completed partners, then partner-balanced completion rate. This records the approval communicated by the team; it is not an invented institutional endorsement.

## Active metric definitions

For student `u` and partner `p`, let `R(u,p)` be the mean of validated ratings received from `p` on eligible completed exchanges. The rating input is the unweighted mean of those partner means. Partners without a validated received rating do not supply a rating value.

For each partner with eligible concluded exchanges, let `C(u,p)` be validated completed exchanges divided by eligible concluded exchanges with that partner. The completion input is the unweighted mean of those partner completion rates. Confirmed cancellations contribute to their partner's denominator; pre-confirmation cancellations do not. Legacy/unvalidated concluded history still makes completion evidence unavailable, rather than being silently removed to improve a score.

The formula remains:

`WRMR = 100 × (0.50 × partnerBalancedRating / 5 + 0.30 × partnerBalancedCompletionRate + 0.20 × academicProximity)`

Reciprocal skills and account eligibility are checked before ranking. Academic proximity retains the 100/80/60/40 department/year cases and requires validated mapping. Assessment tiers have no weight. Missing required factors produce a null score with explanations, not zero or redistributed weights. There is no two-partner prerequisite for WRMR, discovery, requests, or acceptance.

`UserMetrics.metricPolicy` identifies `partner-balanced-outcomes-v1`. `averageRating` and `completionRate` now carry the approved partner-balanced inputs. `rawAverageRating`, `rawCompletionRate`, review counts, validated completion counts, and raw completed-swap history remain available as descriptive statistics. System-wide analytics continue to report raw exchange totals and the pooled system completion rate; that aggregate is not the individual WRMR completion input. Historical records and earned tiers are unchanged.

Example: ten five-star ratings from one partner and one one-star rating from another produce a raw mean of 51/11, but a partner-balanced mean of `(5 + 1)/2 = 3`. If the first partner has 10/10 completed outcomes and the second 1/2, the completion input is `(1 + 0.5)/2 = 0.75`, rather than 11/12. With proximity 1, WRMR is 72.5. Repeating an unchanged five-star/100%-completion partner does not increase that partner's weight. New feedback can still change a partner's own mean; it is not discarded.

## Leaderboards

- Both boards require reliable metrics and validated completed exchanges with at least two distinct partners. Failed/unvalidated exchanges cannot manufacture qualifying diversity.
- Top Mentors sorts the partner-balanced rating, then stable ID for exact ties. Review volume does not break ties.
- Most Active sorts distinct completed partners, then partner-balanced completion rate, then stable ID. Raw swap count is displayed as history and is not a ranking factor or tie-breaker.
- APIs enforce eligibility and ordering. The client preserves server ordering and explains the distinction from matching eligibility.

Two partners is the explicitly approved methodological minimum, not a claim of statistical reliability or proof of independent learning. Do not change it, introduce time windows, add priors, or alter metric/weight definitions without another documented adviser decision.

## Private review signals and cases

`exchangeIntegritySignals` reuses the same outcome eligibility checks as the metrics. It identifies repeated completed exchanges between a pair and repeated reciprocal five-star exchanges. Here "repeated" means more than one observation; it is not an empirical fraud threshold. It reports completion counts, dates, shortest and median inter-completion intervals, and a digest of source exchange IDs. Timing is observed without an arbitrary hours/days cutoff or a misconduct probability.

At `/admin/integrity`, server-verified administrators can review these observations, open a private case with context, and record FOLLOW_UP, NO_ACTION, or REVIEWED dispositions. Evidence is recomputed server-side; clients cannot submit a fabricated snapshot. User-row locking prevents concurrent duplicate open cases. Review revisions prevent stale dispositions from overwriting later review. Events retain administrator IDs, timestamps, notes, and the original evidence snapshot.

Cases reuse `UserReport` with the reserved `EXCHANGE_INTEGRITY_REVIEW` reason and versioned JSON in its existing text field. Both participant IDs are part of the case; `targetId` is a stable storage anchor, not a finding against that person. Generic report listing/disposition endpoints exclude these cases so their audit history cannot be bypassed through the ordinary report form. No Prisma schema change or migration is needed.

Signals and cases are private. They do not automatically delete exchanges, invalidate reviews, suspend accounts, change badges, or alter scoring validation flags. Legitimate repeat exchanges remain allowed. Any later enforcement or reconciliation requires separately supported evidence and an authorized, history-preserving procedure. The text field has a technical size guard; this is a lightweight case workflow, not an unlimited audit-log service.

## Limits and thesis evaluation

The controls reduce repeated-partner volume influence and prevent a two-account pair from qualifying one another for leaderboards by themselves. They cannot prove sessions occurred, prevent assistance or organized multi-account collusion, or turn scenario quizzes into observed performance. A single partner can still supply a five-star mean and 100% completion input for WRMR; show partner diversity transparently instead of inventing evidence or blocking legitimate matching.

Test both concentrated and diverse histories, confirmed cancellations, legitimate repeats, missing history, invalid legacy outcomes, unchanged WRMR weights, cold-start discovery, server ordering, private case ownership/roles, concurrency, and preserved history. The integrated fixture verifies that another ten five-star exchanges change raw totals but not the existing partner-balanced inputs or the activity advantage of a more diverse student. Pilot interpretation and any frequency thresholds need a suitable research design, not assumptions based on synthetic tests.
