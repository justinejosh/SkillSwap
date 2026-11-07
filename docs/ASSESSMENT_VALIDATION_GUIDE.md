# Validating Knoxite assessments before student testing

This guide is a review protocol, not a validated question bank. No real bank is supplied or published by these changes. Content quality still needs the thesis team's subject reviewers and adviser.

## What the current formats can support

| Tier | Current assessment | Defensible interpretation |
| --- | --- | --- |
| Amateur | Ten skill-specific foundational multiple-choice questions; initially 80% | The student passed the knowledge assessment for the stated outcomes and version. |
| Verified | Five to ten skill-specific applied scenario choices with a predefined grading rubric; initially 80%, after Amateur | The student passed scenario-based reasoning questions for the stated outcomes and version. |

For programming, diagnosing a bug, interpreting code, or choosing an appropriate query may measure reasoning about the presented situation. Selecting an answer does not demonstrate independently writing, executing, testing, or deploying a program. For nontechnical skills, choosing a response does not establish observed practical performance either.

Do not claim complete coding proficiency, observed hands-on skill, or professional certification. A passing threshold and an `APPLIED_CHOICE` item label do not themselves establish assessment validity. The engine's automated tests validate authorization, scoring, and record integrity, not the educational quality of real content.

## Before importing a bank

1. Choose an existing catalogue skill ID. Unsupported skills stay unavailable; do not attach an unrelated bank by similarity of names.
2. Define narrow, observable learning outcomes. Identify which outcomes can be assessed with choices and which require another format. Avoid broad claims such as professional expertise.
3. Produce an item blueprint linking every question to a stated outcome and an intended level of reasoning. Basic questions should cover the approved foundational scope; advanced questions should require applying concepts to the situation rather than recalling a definition.
4. For every item, record its intended competency, correct choice, grading rationale/rubric, and why the alternatives are unsuitable. Check whether more than one answer could be defensible because of unstated assumptions.
5. Record content provenance and any permission required for material reused in the bank. Do not invent institutional endorsements or external credentials.

## Human validation and publishing

Have an appropriate subject reviewer inspect correctness, outcome coverage, ambiguity, prerequisite knowledge, reading load, accessibility, and the adequacy of the applied reasoning. For programming, check language/version assumptions and the intended behavior of any code examples in a controlled reviewer environment. Knoxite does not execute students' submissions.

Record the reviewer, bank version, validation date, reviewed outcomes/items, remaining limitations, and approval evidence in the existing validation notes. A human review acknowledgement should reflect completed review, not merely the fact that an import succeeded. Unresolved questions stay in draft. Use a second reviewer where the team can provide one; an administrator account alone is not evidence of subject expertise.

Published versions are immutable. Any revision to prompts, answer keys, rubric, threshold, or outcomes requires another reviewed version. Active attempts retain the original version and outcomes. An unsupported advanced format should remain unavailable rather than being replaced by an arbitrary quiz.

## Pilot evidence and thesis reporting

Before using tiers as meaningful trust signals, run an adviser-approved content pilot. Review completion time, misunderstood wording, ambiguous choices, unexpectedly easy/difficult items, and whether students can solve items through clues rather than the intended reasoning. Preserve the version associated with each attempt. Consider retake exposure and assistance as limitations when interpreting results.

Describe the measured construct as scenario-based reasoning for the approved outcomes. Report the available evidence and limitations; do not infer actual coding performance or learning gains solely from a passing percentage. If the thesis later needs independent programming performance, propose an appropriate practical assessment and validation study separately.

## Future practical execution

An executable coding format would need separate approval, an isolated runner outside the production application server, restricted network/filesystem access, resource and time limits, secure grading cases, and a suitable review protocol. Do not add execution or broaden Verified's claims simply because the current quiz engine passes its software tests.
