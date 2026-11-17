# Student workflow integrity check

2026-11-16 · `dev-justine` · frontend target localhost:5181

Scope: the direct student-workflow request, not the separate administrator checklist attachment. No visual redesign or backend policy changes were made.

## Confirmed high-priority gap — approval required

**Unscheduled and premature session confirmations are currently accepted.** This is a server-side gap, not just stale UI.

- `C:/KNOXITE/SkillSwap/src/app/pages/SwapDetailsPage.tsx`: enables the next confirmation from CONFIRMED status, the integrity flag and the student's confirmation count. It never loads/checks a matching schedule or end time.
- `C:/KNOXITE/SkillSwap/knoxite-backend/routes/swaps.ts`, `POST /api/swaps/:id/log-session`: locks and rereads the exchange, verifies participant/status/integrity and sequential limits, then creates that participant's confirmation. It never reads `SwapSession`, checks approval timestamps directly, or compares start/end time.
- `C:/KNOXITE/SkillSwap/knoxite-backend/routes/sessions.ts`, `GET /api/sessions`: returns actual schedules for the authenticated participant. Its list is account-wide, not restricted by the calendar's selected exchange. With no schedules it correctly returns an empty list.

Reproduced in rollback-only MySQL with two independently authenticated synthetic students: A's Tracking showed **Confirm Session 1** while B's Calendar, opened for the same exchange ID, showed **No sessions scheduled yet**. A confirmed session 1 without any schedule; refresh still showed no schedule. A then confirmed session 2 whose start was a day in the future. B confirmed independently. Both counters reached the agreed limit and reviews became available, while the exchange correctly remained CONFIRMED until reviews were submitted.

Thus the existing completion checks can establish bilateral self-attestation without establishing that scheduled teaching time elapsed. Passing characterization tests document this exposure; they do **not** mean the timing requirement is satisfied. Treat the gap as unresolved before production preparation.

### Proposed minimal correction — not implemented

Subject to your approval, require each **new** confirmation to have:

1. The existing confirmed/integrity-verified exchange and both recorded approvals.
2. A valid `SwapSession` with the same exchange ID and agreed session number.
3. Server time at or beyond `scheduledAt + duration × 60 × 60 × 1000`. The current agreement summary explicitly defines duration as hours per session; do not reinterpret it.

Enforce these checks inside the existing exchange-locked transaction, retaining participant isolation, sequential limits, uniqueness and no-op duplicate behavior. Expose the same authoritative eligibility/reason/end-time to Tracking so it cannot offer contradictory controls. No new attendance service or schema is required for this proposal. Time eligibility still would not prove actual attendance.

**Decisions needed:** authorize the schedule/end-time gate and decide how already-recorded confirmations without matching schedules should be treated. Preserve historical confirmations, reviews, earned tiers and outcomes; do not automatically invalidate them. The future gate would block remaining unscheduled confirmations until scheduling is resolved, and may change when new outcomes become eligible for review/metrics. This behavioral impact needs explicit approval; no WRMR or cancellation formula change is proposed.

## Other integrity findings

| Check | Actual behavior / result |
| --- | --- |
| Independent participants | Server derives the participant from authentication; A cannot record B's confirmation. Outsiders receive 403; forged participant fields receive 422. |
| Sequence and bounds | Positive integer, next unlogged number, agreed maximum enforced. |
| Duplicates | Exact replay returns the existing state without another confirmation or count increment. An already-recorded confirmation replay can return 200 after closure; it performs no mutation and does not reopen the exchange. |
| Closed/stale requests | New confirmations on non-CONFIRMED exchanges are rejected. Locking and current server reads protect against stale status changes; refresh cannot add the missing time gate. |
| Review/completion stages | Both confirmation counters are required before reviews. One participant's review does not complete the exchange; two validated reviews do. Duplicate reviews cannot inflate counts; historical agreement remains read-only. |
| Scheduling | `POST /api/sessions` requires participation, CONFIRMED/integrity status, both recorded approvals, a valid agreed number and a future start after both approvals. Completed/cancelled/pending exchanges and acknowledged-session rescheduling are rejected. Checks run after the exchange lock. |
| Time zones/history | `lib/scheduling.ts` requires explicit ISO offsets, validates real calendar dates, compares epoch time and retains the existing 366-day horizon. Calendar converts browser-local input to ISO UTC. Asia/Manila +08:00 conversion, equivalent offsets, stale forms and historical reads were tested. Existing historical sessions were not modified. |

## Applied changes and exact files

- `C:/KNOXITE/SkillSwap/src/app/pages/MySkillsPage.tsx`: Add Skill dialog now says **Add a skill you can teach or want to learn.**
- `C:/KNOXITE/SkillSwap/src/app/pages/ChatPage.tsx`: **View Deal** → **View Exchange**; existing agreement navigation unchanged.
- `C:/KNOXITE/SkillSwap/src/app/pages/LeaderboardPage.tsx`: uses the supplied eligibility reasons once, removes identical repeated reasons and keeps a fallback instruction. Other reasons and continued match/swap access remain visible. No leaderboard eligibility changes.
- `C:/KNOXITE/SkillSwap/tests/browser/workflows.spec.ts`: verifies a single eligibility instruction while retaining other missing-evidence reasons.
- `C:/KNOXITE/SkillSwap/tests/browser/surface-scheduling.spec.ts`: same-exchange Calendar/Tracking characterization and targeted wording/navigation checks.
- `C:/KNOXITE/SkillSwap/tests/sandbox/student-lifecycle.spec.ts`: rollback-only real-API/browser characterization of unscheduled/future confirmation, independent identities, replay protection and unchanged lifecycle stages.
- `C:/KNOXITE/SkillSwap/docs/STUDENT_WORKFLOW_INTEGRITY_CHECK.md`: this report.

## Fresh verification

- **12 backend scheduling tests passed**, including invalid dates/offsets, past/final-approval boundaries, forged callers, closed exchanges, acknowledged-session locks and historical reads. Backend build passed.
- **3 rollback-only MySQL tests passed**: full two-student negotiation → approvals → confirmations → individual reviews → completion/history; current-policy gap reproduction; scheduling rejection/preservation checks.
- Browser run: **14 passed, 2 failed** because the new wording test initially looked for dialog text without opening the Add Skill dialog. After correcting that test, **both desktop/mobile cases passed**. All 16 selected cases therefore have passing results; no application change was made to mask the test error. Light/dark Tracking, Calendar, stale forms, Asia/Manila conversion, leaderboard wording and navigation were covered.
- Frontend type check and build passed. Existing Vite large-chunk warning remains.

MySQL tests used the existing synthetic fixture's Docker/settings/checkpoint/health ownership guards and one uncommitted transaction per test. Fixture writes were rolled back; shared-data snapshots and private settings preservation checks passed. Real OAuth student accounts and their history were not used. No connection to the dedicated OAuth database, original database or production was made. No migration, reset, synchronization, policy activation, commit, push, merge or deployment occurred. Backend/auth/session/WRMR/assessment/academic sources remain unchanged.

## Local use

Refresh localhost:5181 for the wording changes. No backend restart is needed. The scheduling/confirmation gap intentionally remains visible until the proposed policy is approved; do not interpret these wording changes as resolving it.
