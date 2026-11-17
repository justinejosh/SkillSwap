# Thesis alignment and pending revisions

Review date: 2026-11-13 (Asia/Manila). Checkout: `C:\KNOXITE\SkillSwap`, branch `dev-justine`.

This is a software audit and a separate list of suggested manuscript corrections. It is **not a revised thesis**, a new research protocol, institutional approval, or student-evaluation evidence. The attached working PDF was read only. No manuscript source, schema, migration, production resource, original `knoxite` database, Git branch or remote was changed. Existing uncommitted implementation work was retained.

## Evidence and limits

- Research reference: the user-supplied revised Knoxite thesis PDF in Downloads. It has 49 PDF pages. References below use the printed page number; PDF viewer page numbers are supplied where useful. Chapter pages in this copy have a seven-page offset.
- Source: current TypeScript/React/Prisma implementation, tests, local commit history and implementation records. Recent commits include `2d02411` (Google/recovery), `11a00bf` (local recovery), `04054e0` (registration options), `7c1f2b5` (partner-metric UI), and `9075ac7` (partner integrity). Earlier work was not rebuilt or replaced.
- Database: **only** the verified synthetic `recovery-1` instance at `127.0.0.1:3311/knoxite_sandbox_recovery_1_dev`. Container and volume ownership, exact mount, loopback binding, private checkpoint and signed API identity passed before a SELECT-only catalog inspection. No original/production database state is inferred from this sandbox.
- The backend/frontend processes were started by the user's terminal. Launcher diagnostics cannot establish process ownership in this tool session (`owned:false`), so no process was stopped or adopted. Signed backend identity and database ownership still verified independently.
- No provider dashboard, production endpoint, real student mailbox or real Google identity was accessed. No actual participant responses, learning gains, empirical matching effectiveness or institutional approval is claimed.
- Status vocabulary: **Verified** means supported by inspected source/manuscript or an executed local check; **Pending** means external evidence/configuration is missing; **Requires Decision** means policy/research approval is needed. A verified discrepancy can still require adviser approval for its eventual manuscript revision.

Paths below are repository-relative to the checkout stated above. Recommendations concerning the manuscript are for the research team to review separately.

## Current approved algorithm, exactly as implemented

Reciprocal eligibility is established first: a candidate offers an active skill the requesting student wants, and wants a skill the requesting student offers. Current institutional account, suspension and verification restrictions apply. Pending requests/active exchanges with that peer are excluded. Scores do not create reciprocal eligibility. See `knoxite-backend/routes/matches.ts` and `routes/swaps.ts`.

The existing normalized formula in `knoxite-backend/services/wrmr.ts` is:

```text
S = 100 * (0.50 * AR_bal / 5 + 0.30 * CR_bal + 0.20 * P)
```

`AR_bal` is on 1–5, `CR_bal` and `P` are on 0–1, and `S` is a score out of 100. No missing term is replaced with an invented default and weights are never redistributed. Assessment tiers, geographical distance, confidence multipliers and overlap counts do not enter this formula. Equal scores use stable user IDs for deterministic ordering.

For a student, let `R` be distinct partners who supplied qualifying received reviews; `r_pj` the ratings from partner `p`; and `n_p` their count:

```text
AR_bal = mean over p in R of (sum_j r_pj / n_p)
```

Let `T` be distinct partners with qualifying concluded outcomes, `C_p` their validated completed outcomes and `N_p` their qualifying completed plus cancelled outcomes:

```text
CR_bal = mean over p in T of (C_p / N_p)
```

These formulas are implemented in `knoxite-backend/services/userMetrics.ts` (`partner-balanced-outcomes-v1`). A partner with ten exchanges has the same aggregation weight as a partner with one. Additional exchanges can change that partner's own mean/rate; they do not freeze the score. Partners with only a cancellation enter completion aggregation but have no rating to contribute. Raw rating means, raw counts and pooled system completion statistics are separate descriptive measures.

Qualifying completion requires distinct participants, `integrityVerified`, both agreement approvals, a completion date, a positive session count acknowledged fully by both sides, and exactly two validated, correctly directed, integer 1–5 reviews from distinct participants. Ratings come only from these completions. A verified cancellation enters the denominator only when both approvals exist. Unreliable concluded history increments `legacyConcludedSwaps` and makes completion rate and the complete-history completed total unavailable; the known validated-completion count remains separately available. Open exchanges do not enter a concluded-outcome denominator.

These rules are descriptions of existing code, **not policy changes made by this review**.

## Discrepancy and decision register

### A1. Worked WRMR example and ranking

**Classification:** Manuscript error. **Priority:** High. **Status:** Verified. **Source modification:** No formula change; regression test added. **Approval:** Research team/adviser reviews the manuscript correction.

- **Manuscript:** §3.3.3, printed pp.25–26 (PDF pp.32–33), Table 1 gives User B 88.5 and the explanation selects D as highest.
- **Actual code:** `services/wrmr.ts` gives B = `48 + 28.5 + 16 = 92.5`, D = `50 + 30 + 12 = 92.0`, C = `42 + 24 + 20 = 86.0`. `compareMatches` orders B, D, C. New `tests/thesis-alignment.test.ts` verifies all values/order and unchanged weights; browser fixtures verify presentation order.
- **Suggested revision:** Correct B's total and the corresponding winner/ranking explanation. A worked example demonstrates arithmetic; it does not prove reliability, academic quality or real-world effectiveness.

### A2. Formula normalization and completion terminology

**Classification:** Manuscript ambiguity / implemented rule insufficiently documented. **Priority:** High. **Status:** Requires Decision. **Source modification:** None. **Approval:** Adviser confirms the precise written variable definitions; any software definition change requires separate approval.

- **Manuscript:** §3.3.3, printed p.25, Figure 10 displays a weighted sum without explicit scale conversion while AR is described on 1–5 and CR as a percentage of accepted swaps from successful matching.
- **Actual code:** `services/wrmr.ts` normalizes AR by five and uses fractional CR/P before multiplying by 100. CR is partner-balanced validated completions/concluded outcomes, not request acceptance frequency.
- **Suggested revision:** Write the normalized equation and ranges explicitly, and distinguish accepted requests, bilateral agreements and successful concluded exchanges. Do not change correct arithmetic to reproduce the printed table error or silently substitute acceptance rate for completion rate.

### A3. WRMR score presentation

**Classification:** Code defect, corrected. **Priority:** Medium. **Status:** Verified. **Source modification:** Yes, presentation only. **Approval:** Within current authorized scope.

- **Manuscript:** §3.3.3, printed pp.25–26, labels the derived value a WRMR score; it is not a measured probability of success.
- **Actual code before correction:** `src/app/components/MatchCard.tsx` displayed `% WRMR`, which invited a percentage/probability interpretation of the combined score.
- **Correction applied:** Show e.g. `92.5/100 WRMR`. Component percentages remain percentages where they describe actual normalized factors, and 50/30/20 labels remain weights. Browser regressions cover desktop/mobile Dashboard and KnoxHub.

### A4. Cold-start access, first score and limited evidence

**Classification:** Implemented rule missing explanation. **Priority:** High. **Status:** Verified. **Source modification:** Small evidence notice only; no eligibility change. **Approval:** Adviser reviews manuscript explanation; any new minimum/waiting period requires approval.

- **Manuscript:** §3.3.3, printed pp.23–26, does not specify first-score eligibility, missing-data handling or a waiting period.
- **Actual code:** `routes/matches.ts`, `services/userMetrics.ts`, `services/academicProximity.ts`, `services/academics.ts`, `src/app/components/MatchResults.tsx` and `MatchCard.tsx` retain reciprocal students with a null score. Unranked matches are visible in a separate group and can request/accept swaps. One fully validated successful exchange can immediately provide rating and completion evidence, provided both students have usable academics and no blocking unreliable history exists. There is no three/five-swap minimum or time delay. Fresh requests recalculate scores; an already rendered page still needs refetching.
- **Suggested revision:** Explain null as unavailable evidence, not zero compatibility. Describe the first qualifying exchange and subsequent recalculation. The added one-partner notice explains limited feedback without penalizing the score or imposing an eligibility barrier. Two-partner eligibility is a leaderboard rule, not a matching requirement.

### A5. Partner-balanced aggregation and remaining manipulation limits

**Classification:** Implemented approved methodology insufficiently documented. **Priority:** High. **Status:** Verified. **Source modification:** None to aggregation. **Approval:** Adviser reviews the expanded description; new controls affecting scores need approval.

- **Manuscript:** §3.3.3, printed p.25, briefly mentions partner-balanced aggregation but omits its formulas and full application to WRMR inputs.
- **Actual code:** `services/userMetrics.ts`, `services/leaderboards.ts`, `routes/integrity.ts`, `services/exchangeIntegrity.ts`, `app.ts` and `docs/PARTNER_INTEGRITY_POLICY.md` implement the formulas above. Top Mentors uses balanced rating; Most Active uses distinct completed partners, then balanced completion rate, then stable ID. Both leaderboards require two distinct completed partners. Integrity observations allow administrator review without deleting history or automatically accusing/penalizing accounts.
- **Suggested revision:** Include both partner formulas and distinguish raw history from balanced inputs. One partner can still supply all available WRMR evidence, and two cooperating groups can still collude; balancing reduces volume dominance, not all fraud. Two-partner leaderboard qualification does not establish statistical reliability or independent truth of an exchange.

### A6. Post-approval cancellations affect both participants

**Classification:** Methodological fairness decision. **Priority:** High. **Status:** Requires Decision. **Source modification:** None; characterization test added. **Approval:** Required before changing attribution, denominator or associated schema.

- **Manuscript:** §3.3.3, printed p.25, leaves cancellation responsibility undefined.
- **Actual code:** `services/userMetrics.ts` applies every qualifying post-bilateral cancellation to both participants' partner denominators. `routes/swaps.ts` permits participant cancellation; the schema records cancellation time but not adjudicated fault. The rate does not depend on which participant clicked Cancel or a claimed reason. Regression tests confirm symmetric treatment.
- **Suggested revision/decision:** Document the current symmetric outcome policy and its limitation: a student may receive a lower rate for a partner-caused or mutually reasonable cancellation. Decide whether this is acceptable for the study. Any future responsibility-based approach needs approved evidence/adjudication rules, preservation of historical uncertainty, and potentially a separately approved schema change. No blame is inferred here.

### A7. Early cancellations, open exchanges and legacy uncertainty

**Classification:** Implemented rule requiring explicit methodological documentation. **Priority:** High. **Status:** Verified. **Source modification:** None; regression coverage added. **Approval:** Adviser reviews description; changing these rules requires approval.

- **Manuscript:** §3.3.3, printed p.25, does not delimit the eligible denominator or incomplete/legacy treatment.
- **Actual code:** `services/userMetrics.ts` excludes verified cancellations missing either approval from the denominator. PENDING_AGREEMENT/CONFIRMED exchanges are not concluded. Invalid completed rows and unvalidated legacy concluded rows are not assumed successes/failures: they make the complete-history completion metric unavailable. An unvalidated historical cancellation is uncertain history even if approval timestamps are absent; absence of old evidence is not proof of a verified pre-approval cancellation.
- **Suggested revision:** State these cases separately. Open exchanges do not reduce a concluded-outcome rate, so unfinished work is a limitation of that definition. Do not introduce an automatic timeout, waiting period, fabricated historical approval or silent legacy cleanup. Decide any future reconciliation protocol separately.

### A8. Consistent outcome validation in monthly analytics

**Classification:** Code defect, corrected. **Priority:** High. **Status:** Verified. **Source modification:** Yes, existing validation reused. **Approval:** Within current technical scope; metric definitions unchanged.

- **Manuscript:** §1.2 printed p.3 and §3.3.3 printed p.25 describe exchange analytics and successful outcomes.
- **Actual code before correction:** `routes/analytics.ts` monthly data required integrity/approval/date flags but did not check completed sessions and bilateral valid reviews, unlike `services/userMetrics.ts`. An inconsistent completed record could inflate the chart while being excluded from WRMR and headline metrics.
- **Correction applied:** Fetch the fields required by the existing aggregator and use its same concluded-outcome gate for monthly rows. A route regression excludes missing sessions/reviews, early cancellations, legacy and self-exchanges; a valid completion plus a valid cancellation gives 50%. Overall legacy-unavailability behavior remains intact.
- **Interpretation limit:** Monthly and overall system rates are pooled descriptive completion rates; personal WRMR input remains partner-balanced. Monthly values describe known qualifying outcomes dated in that month, whereas a complete-history headline can be unavailable because of uncertain legacy records. Administrative `totalReviews` remains a stored validated-review count with a completed/integrity status filter, not a count of fully eligible bilateral completions. Do not substitute that descriptive count for scoring evidence. All metrics are calculated on requests, but multiple queries are not a guaranteed single transactional reporting snapshot.

### A9. Four academic proximity categories and validation evidence

**Classification:** Configuration / external validation requirement. **Priority:** High. **Status:** Pending. **Source modification:** None. **Approval:** Supporting institutional mapping evidence and authorized administration required; values already approved and unchanged.

- **Manuscript:** §3.3.3, printed pp.25–26, describes department/year proximity but needs the full operational table and unavailable-data case.
- **Actual code:** `services/academicProximity.ts` uses 1.0 same department/same year; 0.8 same department/different year; 0.6 different department/same year; 0.4 different department/different year. `services/academics.ts` ignores inactive programs/departments/years and mappings without a validation date. Missing required academic information produces unavailable proximity, not a default. Different departments/years do not alone exclude reciprocal peers.
- **Suggested revision:** State the four values, their existing 20% weight, standardized selections and mapping evidence requirement. The team reports mapping confirmation; the sandbox inspection below proves it is not recorded there. No inference is made about other databases and no validation flag was set.

### A10. College-only population and obsolete strands

**Classification:** Manuscript error. **Priority:** Medium. **Status:** Verified. **Source modification:** None. **Approval:** Research team/adviser handles scope wording correction.

- **Manuscript:** §1.3 printed pp.3–4 and §3.4.1 printed p.26 target Santa Rosa college students; §3.4.1 still mentions academic strands.
- **Actual code:** `config/academic-catalog.json`, `services/academics.ts`, registration/profile forms and academic administration use college programs and year levels, without SHS strands. Exact 13 labels are retained.
- **Suggested revision:** Replace the study-population strand reference with the approved college terminology. SHS references in author CVs at the end of the PDF are biographical history, not conflicting population requirements; they should not trigger software changes.

### A11. Objectives and boundaries of analytics

**Classification:** Manuscript clarification / optional scope expansion excluded. **Priority:** Medium. **Status:** Verified. **Source modification:** None. **Approval:** Adviser reviews objective wording; any expansion needs separate approval.

- **Manuscript:** §1.2 printed p.3 and §1.3 printed pp.3–4 establish profiling/skill management, reciprocal WRMR, and descriptive exchange/progress analytics.
- **Actual code:** `routes/profile.ts`, `routes/assessments.ts`, `routes/matches.ts`, `routes/swaps.ts` and `routes/analytics.ts` support those objectives. Counts, ratings, sessions and assessments describe recorded platform activity, not measured academic learning gains or causal WRMR effectiveness.
- **Suggested revision:** Keep all three objectives. Explain what each analytics measure actually represents. AI recommendations, external professional certification and causal learning-gain claims remain outside this task and approved scope.

### A12. Assessment tiers and what Verified measures

**Classification:** Approved implementation extension not fully described in manuscript; external content validation requirement. **Priority:** High. **Status:** Pending. **Source modification:** None. **Approval:** Subject reviewers validate banks; adviser confirms the study description and limits.

- **Manuscript:** §1.3 printed pp.3–4 excludes formal/professionally regulated skill certification; §3.3 implementation description does not fully define the later approved tier workflow.
- **Actual code:** `services/assessmentRules.ts`, `assessmentService.ts`, `bankValidation.ts`, `routes/assessments.ts`, `prisma/schema.prisma` and `src/app/components/AssessmentBadge.tsx` store tiers per offered user-skill, grade on the backend, enforce Amateur before advanced, retain Amateur after advanced failure/postponement and preserve attempt/version history. Basic is ten MCQs, initially 80%; advanced is five to ten applied scenario-choice items with rubrics, initially 80%. There is no production execution of untrusted submitted programs and no observed hands-on coding measurement. The inspected sandbox has zero assessment versions.
- **Suggested revision:** Describe Not Assessed → Amateur → Verified as Knoxite assessment results, not credentials. State the actual advanced format and limits. Unsupported/unpublished skills remain unavailable. Synthetic engine fixtures are not validated student question banks and were not published by this audit.

### A13. Sample size and normality

**Classification:** Manuscript statistical error / research decision. **Priority:** High. **Status:** Requires Decision. **Source modification:** None. **Approval:** Adviser/statistical reviewer must approve corrected interpretation.

- **Manuscript:** §3.4.1.3, printed pp.27–28, proposes alpha 5 IT experts plus 10 fourth-year CS students and beta 30 college students; it asserts that 30 makes the dataset approximately normal.
- **Actual code/evidence:** Automated synthetic tests neither draw this research sample nor establish its distribution, representativeness or survey outcomes. There is no application requirement to force normality or change sample size.
- **Suggested revision:** Preserve the proposed populations pending adviser review; remove the automatic dataset-normality/representativeness inference. The central limit theorem concerns a sampling distribution of means under applicable conditions, not a guarantee that observed responses become normal at n=30. See the [NIST definition](https://csrc.nist.gov/glossary/term/central_limit_theorem). Do not silently change the sampling design or analysis protocol.

### A14. ISO/IEC edition and evidence categories

**Classification:** Unspecified research instrument edition / methodological decision. **Priority:** High. **Status:** Requires Decision. **Source modification:** None. **Approval:** Adviser chooses and approves the instrument/edition before evaluation.

- **Manuscript:** §3.4.1.5 printed pp.28–29 lists functional suitability, compatibility, reliability, performance efficiency, security, maintainability, portability and usability without an edition. §3.4.2 printed p.30 distinguishes alpha/beta; §3.4.3 printed pp.31–32 describes survey analysis.
- **Actual evidence:** These eight names correspond to the 2011 product-quality model. ISO describes [25010:2011](https://www.iso.org/standard/35733.html) as an eight-characteristic model, now withdrawn, and [25010:2023](https://www.iso.org/standard/78176.html) as a nine-characteristic product model. The existing eight-characteristic questionnaire cannot simply be relabelled as a complete 2023 instrument.
- **Suggested revision:** State the chosen edition and justify it with the adviser. If adopting 2023, map/review the instrument against that model and obtain approval rather than changing only the citation. Record objective technical checks separately from perceived quality/usability questionnaire answers and from actual exchange-outcome evidence. A survey does not certify authentication security, load performance or algorithm correctness; automated tests do not replace user acceptance.

### A15. Consent, retention and responsible contact

**Classification:** Configuration / study-governance requirement; potential future implementation work. **Priority:** High. **Status:** Requires Decision. **Source modification:** None here; persistent consent/schema or retention changes require approval. **Approval:** Institutional/research privacy owner and adviser.

- **Manuscript:** §3.4.1.4 printed p.28 describes Google Forms/Messenger collection, consent and survey storage/deletion one year after study; §3.4.1.6 printed pp.29–30 describes confidentiality and withdrawal.
- **Actual code:** `src/app/pages/PrivacyPolicyPage.tsx` accurately lists public/private fields and preserved histories but defers the approved retention arrangements and responsible contact. `src/app/pages/SignupPage.tsx` requires a UI terms checkbox; `routes/auth.ts` registration does not persist versioned consent evidence. Google onboarding checks acceptance in `routes/google.ts`, without a durable consent-version/timestamp record. Account deletion/export are not self-service. Cancelling/suspending does not erase exchange history.
- **Suggested revision/decision:** Separate research survey files from operational accounts, messages, assessments and backups. Confirm controller/contact, notices, actual recipients/processors, withdrawal/deletion exceptions, consent evidence and retention schedule before real student collection. Do not automatically apply survey deletion wording to all operational records or invent a contact/approval. Implement any durable consent/retention change only after its policy and schema are approved.

### A16. Eligibility claims, mail delivery and disabled Google

**Classification:** Configuration / external validation requirement; stale technical documentation corrected. **Priority:** Critical for real-student activation. **Status:** Pending. **Source modification:** Documentation only. **Approval:** Institutional IT/eligibility owner and release/security owners.

- **Manuscript:** §1.3 printed pp.3–4 and implementation description printed p.6 restrict the platform to verified intended students; mailbox ownership alone does not demonstrate current college enrollment.
- **Actual code:** `lib/config.ts`, `middleware/authMiddleware.ts`, `services/authSessions.ts`, `routes/auth.ts`, `routes/google.ts` and `services/googleIdentity.ts` retain backend verification, suspension, session and origin/nonce controls. Production startup requires confirmation/verification configuration; Google defaults off and requires separate Workspace/eligibility/security approvals. Email/password fallback uses single-use verification/reset workflows. `services/email.ts` supports the configured webhook and `services/resendEmail.ts` prepares Resend delivery; the synthetic sandbox captures mail locally and uses `.test` accounts.
- **Suggested revision/action:** Confirm official domain, campus convention and current-college eligibility including SHS/alumni/staff/other-campus exclusions. Supply approved sender/domain credentials, validate real delivery and recovery, and complete Google activation gates separately. Source guards and synthetic mail are not proof of university approval or live delivery. `GOOGLE_OAUTH_FEASIBILITY.md` and the obsolete implementation-notes paragraph were corrected to implemented-but-disabled; the feature was not rebuilt or enabled.

### A17. Results remain uncollected

**Classification:** Manuscript gap, requiring actual research evidence. **Priority:** High. **Status:** Pending. **Source modification:** None. **Approval:** Research team/adviser handles collection and analysis.

- **Manuscript:** Chapter 4, printed pp.33–34 (PDF pp.40–41), still contains unfilled results sections.
- **Actual evidence:** Executed tests below concern software behavior using synthetic or mocked data. An initially unranked cohort can assess reciprocal discovery and swap usability, but cannot establish ranking quality before qualifying history exists. The stated single-session beta tasks do not themselves guarantee enough completed bilateral outcomes to evaluate ranking effectiveness.
- **Suggested revision:** Report actual participant findings only after authorized study collection. Do not transfer automated test pass rates into satisfaction, successful-exchange, academic improvement or empirical WRMR-effectiveness claims. Keep software verification, user acceptance and exchange-outcome analysis distinguishable.

### A18. Production containment and data readiness

**Classification:** External release requirement. **Priority:** Critical. **Status:** Pending. **Source modification:** None. **Approval:** Deployment/database owners and explicit release authorization.

- **Manuscript:** §3.4 testing and ethics, printed pp.26–32, presupposes a secure system for actual participants; it does not establish deployment readiness.
- **Actual source:** `middleware/authMiddleware.ts`, public portfolio projections, swap participant checks, bilateral/session/review constraints and Google nonce/linking controls remain present. Backend tests exercise negative authorization cases. Earlier notes record an exposed signing key; current source no longer uses it, but this audit has no evidence of effective production key rotation or old-token rejection.
- **Required action:** Independently verify the running production artifact and secret rotation when release access is authorized. Identify production database host/owner, backup/restore, sanitized migration rehearsal, legacy reconciliation and rollback. The prior local original-database recovery is historical evidence only; this review did not access it. No current deployment, mail, privacy or production-database readiness is asserted.

## Academic catalog audit: all 13 programs and nine relationships

The source draft in `knoxite-backend/config/provisional-departments.json` covers each catalog program once across nine colleges; labels match `academic-catalog.json`, including mixed-case `BSTom` and spaced `BS PHARM` / `BS PSYCH`. Internal codes `BSTOM`, `BS_PHARM` and `BS_PSYCH` are identifiers, not label changes.

Read-only database snapshot: **2026-11-13 12:48 UTC**, verified synthetic recovery-1 only. Each listed program is active, has all four initial year levels, and has **no assigned department, no validation timestamp/reviewer/evidence, mapping version 0**.

| Exact program label | Team-reported college relationship | Sandbox mapping validated? |
| --- | --- | --- |
| BSACC | College of Business and Accountancy | No; unassigned |
| BSAIS | College of Business and Accountancy | No; unassigned |
| BSCRIM | College of Criminal Justice | No; unassigned |
| BSCS | College of Computer Studies | No; unassigned |
| BSIHM-CA | College of Hospitality and Institutional Management | No; unassigned |
| BSIHM-HACLO | College of Hospitality and Institutional Management | No; unassigned |
| BSIT | College of Computer Studies | No; unassigned |
| BSMLS | College of Medical Laboratory Science | No; unassigned |
| BSN | College of Nursing | No; unassigned |
| BSPT | College of Physical Therapy | No; unassigned |
| BSTom | College of Hospitality and Institutional Management | No; unassigned |
| BS PHARM | College of Pharmacy | No; unassigned |
| BS PSYCH | College of Arts and Sciences | No; unassigned |

Four active years are 1st, 2nd, 3rd and 4th Year; each program has the four associations. One active College of Computer Studies department row exists, but no program points to it. Zero assessment versions exist. Therefore this sandbox currently cannot produce a fully populated academic-proximity input or real Amateur/Verified progression through published banks. These are configuration gaps, not failed WRMR mathematics. Neither mappings nor test question banks were inserted to make results appear complete.

The team's confirmation report is acknowledged. It is distinct from having supporting evidence recorded through the existing academic administrator workflow and from the database's actual validation flags. Supply evidence and authorize that existing workflow separately. Do not automatically copy a draft into validated assignments. Original and production states remain **unverified**.

## Small changes made in this review

| File | Change and reason |
| --- | --- |
| `src/app/components/MatchCard.tsx` | WRMR `/100` label; explicitly balanced component labels; factual one-partner evidence notice. No scoring, request or ordering rules changed. |
| `knoxite-backend/routes/analytics.ts` | Reuse existing outcome validator for monthly chart counts; retrieve its necessary fields. No WRMR or completion-policy changes. |
| `knoxite-backend/tests/thesis-alignment.test.ts` | Four regressions for correct thesis arithmetic/order, existing symmetric cancellation/legacy rules, immediate one-exchange evidence, and monthly/admin consistency. |
| `tests/browser/workflows.spec.ts` | Update old score-text assertion; add Dashboard/KnoxHub score-order, limited-evidence and request-access regressions on desktop/mobile. |
| `docs/GOOGLE_OAUTH_FEASIBILITY.md` | Replace superseded not-implemented claim with actual local implementation/default-disabled state and remaining gates. |
| `docs/ACADEMIC_CONFIGURATION_APPROVAL.md` | Distinguish new team confirmation report, absent evidence and actual sandbox flags from the dated draft. |
| `docs/DEPLOYMENT_READINESS.md` | Current evidence boundaries and unresolved release/privacy gates. |
| `IMPLEMENTATION_NOTES.md` | Correct stale Google status and reference this limited audit. |
| `VALIDATION.md` | Record newly executed checks separately from historical results. |
| `docs/THESIS_ALIGNMENT_AND_PENDING_REVISIONS.md` | This technical report; no manuscript edits. |

## Verification performed in this review

All commands ran locally on `dev-justine`. No schema migration, original-database command or production request was executed. Backend unit/HTTP tests use in-memory fixtures/database doubles. Real-browser sandbox tests use only the verified synthetic instance, captured local email and generated test accounts; their registration journey creates a synthetic record and normal sessions, not real-student data. Seeded passwords are not reset. Test traces/screenshots/video are disabled for the real-credential sandbox suite.

| Command/check | Newly executed result |
| --- | --- |
| `npm --prefix knoxite-backend test` | 83 passed, 0 failed, including four new alignment tests; backend build passed. |
| `npm run typecheck` | Passed. |
| `npm run build` | Passed; existing large-bundle warning remains, no new dependency added. |
| `npm --prefix knoxite-backend run typecheck` | Passed; existing generated Prisma Client matches schema, no migration/generation needed. |
| `PLAYWRIGHT_BROWSER_CHANNEL=msedge npm run test:browser -- workflows.spec.ts` | Final run: 40 passed, 0 failed, desktop/mobile. First run: 36 passed/4 failed because the new test selector included the group heading; selector corrected to card articles, then all 40 rerun successfully. This was a test defect, not evidence of incorrect app ranking. |
| `PLAYWRIGHT_BROWSER_CHANNEL=msedge npm run test:browser -- google-auth.spec.ts account-recovery.spec.ts` | 30 passed, 0 failed, desktop/mobile. Mocked-provider/UI checks include default-off Google/password fallback, explicit linking, standardized onboarding, unavailable email, recovery and throttling. No real Google credential or activation was used. |
| `npm run test:sandbox -- authentication.spec.ts account-switching.spec.ts` | 4 passed, 0 failed against actual synthetic API/frontend. Includes twelve alternating Alice/Bob login/logout cycles, seeded login, frontend API-routing guard, registration, blocked unverified login, captured verification, recovery and session revocation. Google remained disabled. |
| `npm run sandbox:check` and `npm run sandbox:diagnose` | Passed identity/volume/checkpoint/API checks; four seeded accounts exist, password hashes match, verified and unsuspended. No credentials printed. |
| Catalog SELECT-only inspection | 13 active programs, four years; 0 assigned/validated mappings; zero assessment versions; no database update. |
| Preservation checks | PDF SHA-256 unchanged; all 234 pre-review public Git files retained, eight documented existing-file edits and two new files only; no unexpected changes/deletions. Schema and scoring-policy files unchanged. Credential-pattern scan of task files returned no flags; `git diff --check` passed. |

Final suites total **157 passing tests**: 83 backend, 70 desktop/mobile mocked-API browser, and 4 real-sandbox browser tests. The initial selector failure is recorded above rather than hidden. The separate migration/destructive-fixture integration suite was **not** run against the interactive sandbox or original database. It requires its own authorized disposable target. This review does not repeat a database migration rehearsal or assert all historical integration results were freshly executed. Final preservation checks are recorded in `VALIDATION.md`.

## Risks, approvals and next task

The monthly-chart correction can reduce counts previously inflated by inconsistent completed rows; records are not removed. Additional selected review/session fields modestly increase administrative analytics query work. Existing aggregation remains request-based, not a new reporting snapshot or cache. The one-partner notice adds card height, covered at desktop/mobile widths. No authentication, schema, formula, metric version, cancellation rule or historical record was changed.

Await separate approval for any change to cancellation attribution, open/legacy denominator treatment, cold-start minima, normalization definitions, proximity values, consent schema/retention policy or research instrument. Existing weight and partner-balancing approvals remain in force. No new thresholds or automatic penalties were introduced.

**Next recommended development task:** obtain the actual mapping evidence and approve recording it through existing academic administration, first in a separately authorized synthetic configuration exercise. Then validate a small skill-specific question-bank pilot and real email delivery under approved institutional access/privacy rules. This enables meaningful end-to-end student testing without inventing scores, tiers or approvals. Production release remains blocked by the independent security, eligibility, delivery, privacy and database-readiness gates above.
