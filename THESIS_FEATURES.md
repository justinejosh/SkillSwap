# Knoxite thesis feature status

Knoxite supports OLFU Santa Rosa college students. Its primary objectives remain student profiling and skill management, reciprocal WRMR matching, and analytics for successful exchanges, performance, and progress. This document describes the implemented code, not a production deployment or completed research evaluation.

## Implemented core

| Objective | Implementation | Validation |
| --- | --- | --- |
| Student profiling | Authenticated settings, standardized college program/year selections, biography/avatar, complete offered/wanted skill portfolios | API privacy and browser portfolio/registration tests |
| Skill management and trust | Explicit per-user offered skills; Not Assessed → Amateur → Verified; backend grading; versioned curated banks; prerequisites, cooldowns, and persistent skip decisions | Grading, concurrency, authorization, lifecycle, and UI tests |
| Reciprocal matching | Two-way skill eligibility before 50% rating, 30% completion rate, and 20% academic proximity ranking | Four proximity cases, formula fixtures, reciprocal selection, data-gap, and API tests |
| Exchange analytics | Shared validated user metrics, bilateral completion outcomes, actual dated activity, per-skill assessment progress | Aggregate rules, exchange lifecycle, migration, and API tests |

The team-supplied nine-college draft covers all 13 programs and is shown as provisional. Departments used in proximity derive only from an officially validated, configurable program-to-department mapping. Different programs may share a department. Missing or unconfirmed data is not inferred, and proximity never measures physical distance. Candidates without required evidence remain reciprocal matches with an explicit unranked result. Assessment tiers do not enter WRMR. The team-reported adviser-approved rating and completion inputs average within each partner first, then equally across partners; raw totals remain descriptive history.

Cold-start handling deliberately preserves discovery and requests without inventing rating or completion history. Dashboard and KnoxHub separate unranked candidates from candidates with calculated scores. A new-student cohort can evaluate reciprocal discovery and the exchange workflow, but cannot establish ranking effectiveness while everyone lacks evidence. The continuous local journey verifies that students can begin unranked, complete an exchange, and subsequently receive scores from reliable stored outcomes.

Leaderboards require two distinct completed-exchange partners, separately from matching eligibility. Most Active ranks distinct completed partners and partner-balanced completion rate, not repeat volume. Private administrator review records repeated-partner observations without automatic penalties or deleted records. See `docs/PARTNER_INTEGRITY_POLICY.md` for methodology, approvals, and limitations.

## Supporting workflows

- Password authentication with institutional email ownership verification, revocable sessions, account suspension, and password change.
- Database-backed marketplace matches, reciprocal requests, separate bilateral agreement approvals, version checks, session acknowledgements, and unique participant reviews.
- Participant-scoped chat and session scheduling/calendar.
- Notifications from actual request states, history-preserving withdrawals/cancellations, and completed-exchange leaderboards.
- Persisted reports and administrator dispositions, protected forum moderation, and protected administrative metrics.
- Public student portfolios are available to authenticated eligible users; account and assessment internals remain private.

## Deliberate limits and release gates

- The email domain and `lag` campus suffix are configurable proposals. Production activation requires official confirmation; proving mailbox ownership alone is not a claim of current college enrollment.
- The initial program labels and years are team-supplied configurable records. Official department mapping remains unassigned until validated.
- No real student question banks are invented or seeded. Administrators must curate, validate, and publish content.
- Advanced assessments initially support applied scenario choices with predefined rubrics. Arbitrary code/SQL execution, subjective free-text grading, and unsupported performance formats are unavailable.
- Verified therefore describes a passing result in scenario-based reasoning for the version's stated outcomes. It does not demonstrate independently writing/executing a program or observed hands-on performance. The interface and content-validation guide make this distinction explicit.
- Assessment badges describe Knoxite assessment results, not professional certifications.
- Legacy outcomes remain unvalidated until a sanitized record audit and explicit reconciliation. No historical consent or completion date is fabricated.
- Google OAuth is a documented feasibility review only. Two-factor authentication, automatic institutional-directory enrollment checks, and external certification verification are not claimed as implemented.
- Automated testing does not replace adviser review, participant usability evaluation, or validation of question-bank quality.

See [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for file architecture, APIs, policies, migration safeguards, local configuration, and validation commands. See [MY_SKILLS_FEATURE.md](MY_SKILLS_FEATURE.md) for the assessment user flow and [Google OAuth feasibility](docs/GOOGLE_OAUTH_FEASIBILITY.md) for the deferred option.
