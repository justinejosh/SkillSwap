# Academic configuration approval record

## Review update — 2026-11-13

The research team now reports confirmation of the 13 program-to-department relationships. Supporting campus evidence was not supplied to this audit, so the dated draft below is retained as provenance, not a rejection of that report. Record the confirming authority, evidence, date and reviewer before using the existing validated-mapping administration action.

A read-only query of the independently verified **synthetic recovery-1** database at port 3311 found all 13 active program labels and four active year levels, but **0/13 assigned departments and 0/13 validated mappings**. All mapping dates/reviewers/evidence are absent and versions are zero. One active College of Computer Studies department row exists without program assignments. There are no assessment bank versions. These are sandbox facts only; the original `knoxite` and production databases were not inspected. No mapping, approval flag or question bank was changed. See `THESIS_ALIGNMENT_AND_PENDING_REVISIONS.md` for the full evidence boundaries and follow-up.

Historical status on 2026-11-07: **pending institutional and subject review**. That record contained no approved department assignments or validated student question banks. The application remains scoped to OLFU Santa Rosa college students.

## Institutional eligibility

| Rule | Proposed value | Evidence required before activation |
| --- | --- | --- |
| Institutional domain | `student.fatima.edu.ph` | Institutional IT confirmation of the supported college-student account domain. |
| Santa Rosa/Laguna campus suffix | A nonempty student identifier followed immediately by `lag@` | Confirmation that the suffix reliably identifies the intended campus, including exceptions and whether accounts from other education levels share it. |
| College-student eligibility | Standardized college program and year selections plus the approved account policy | Confirm whether mailbox ownership and the suffix sufficiently establish the study's eligibility; self-declared program selections alone do not verify current enrollment. |
| Email delivery | Configured HTTPS institutional delivery service | Approved sending identity, delivery integration, and successful real mailbox/resend/expiry testing. |

The official [OLFU Canvas page](https://fatima.edu.ph/canvas/) directs OLFU Gmail credential issues to its IT help centre and links a Gmail FAQ. The reviewed page does not establish the proposed campus suffix rule. The linked FAQ redirected to a Google Drive document that could not be retrieved in this review; its contents have not been treated as evidence. The [official contact directory](https://fatima.edu.ph/contact-us/) identifies the Laguna campus offices. No office was contacted or message sent by this work.

Record the confirming office/person, date, source/document identifier, exact rule, exceptions, and responsible administrator before changing the production confirmation flag. Keep the domain and suffix configurable. Do not infer a current-college-enrollment guarantee from mailbox ownership.

## Program-to-department sign-off

The team supplied the working draft below: all 13 existing program labels across nine colleges. The draft is configurable and is not campus-validated. An institutionally confirmed department ID/name, evidence, reviewer, and date are required before any assignment contributes to WRMR. Multiple programs may share a department. No student is assigned a department merely because a program label resembles a department name.

| Program label | Proposed college/department | Official approval |
| --- | --- | --- |
| BSACC | College of Business and Accountancy | Pending campus evidence |
| BSAIS | College of Business and Accountancy | Pending campus evidence |
| BSCRIM | College of Criminal Justice | Pending campus evidence |
| BSCS | College of Computer Studies | Pending campus evidence |
| BSIHM-CA | College of Hospitality and Institutional Management | Pending campus evidence |
| BSIHM-HACLO | College of Hospitality and Institutional Management | Pending campus evidence |
| BSIT | College of Computer Studies | Pending campus evidence |
| BSMLS | College of Medical Laboratory Science | Pending campus evidence |
| BSN | College of Nursing | Pending campus evidence |
| BSPT | College of Physical Therapy | Pending campus evidence |
| BSTom | College of Hospitality and Institutional Management | Pending campus evidence |
| BS PHARM | College of Pharmacy | Pending campus evidence |
| BS PSYCH | College of Arts and Sciences | Pending campus evidence |

Initial years are 1st Year through 4th Year. Record any approved extra years per program through configuration; do not introduce SHS strands or year options. Use `/admin/assessments` to review or import the provisional draft without overwriting existing assignments. Provisional edits never set validation evidence. Use the separate confirmed-mapping action only after actual campus sign-off. Missing/unvalidated mappings leave proximity unavailable.

## Question-bank sign-off

For each supported teaching skill, supply its catalogue skill ID, basic/advanced scope, versioned learning outcomes, item blueprint, questions/options/keys, rubrics, subject reviewer, provenance, validation date and notes, limitations, and pilot approval. Do not use the automated tests' synthetic banks as student content.

Basic uses ten foundational MCQs and initially 80%. Advanced uses five to ten applied scenario choices with a predefined rubric and initially 80%, after that student's basic pass for the same skill. The current advanced format measures reasoning about scenarios, not independently writing/executing a program or observed hands-on performance. Unsupported practical formats remain unavailable.

Follow `ASSESSMENT_VALIDATION_GUIDE.md`. Import as draft, complete actual subject review, record evidence, and then publish through the administrator interface. Draft imports and automated engine tests are not content validation. No skill-specific content has been generated or marked approved by this record.

## Thesis policies already documented

The team separately reported adviser approval for partner-balanced rating/completion inputs, two completed partners for leaderboard eligibility, and distinct-partner activity ordering; see `PARTNER_INTEGRITY_POLICY.md`. This does not officially validate academic mappings. Reciprocal filtering precedes 50/30/20 WRMR ranking; the team-approved proximity cases are 100/80/60/40 for department/year similarities. There is no geographic calculation or assessment contribution. Missing evidence leaves students unranked but eligible to discover reciprocal peers and initiate swaps. An entirely new-student pilot tests that flow; it cannot establish WRMR ranking quality before reliable history exists.
