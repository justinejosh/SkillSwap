"""Read-only source review artifact generator. Never imports/validates/publishes banks."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/assessment-review"
OUT.mkdir(parents=True, exist_ok=True)
DRAFTS = ROOT / "knoxite-backend/content/drafts"

# Technical reviewer observations. These are recommendations, not fabricated
# human decisions, measured difficulty, or reasons to silently rewrite questions.
FLAGS = {
    "chess-fundamentals-A04": "Near-restatement of B06 (stalemate definition); advanced discrimination remains a reviewer concern.",
    "chess-fundamentals-A05": "Applies essentially the same promotion rule as B08; practical playing strength is not measured.",
    "english-grammar-B07": "Several distractors are nonsensical rather than plausible article errors; low discrimination risk.",
    "english-grammar-A02": "Distractors are clearly malformed; scenario context adds little difficulty beyond B03.",
    "english-grammar-A06": "Plural possessive application is valid but close to B05's foundational construct.",
    "introductory-statistics-A04": "Same percentage operation as B10 with new values; limited added advanced reasoning.",
    "java-programming-fundamentals-A02": "For the stated identical content, hashCode equality also returns true. 'Reliably checks content' distinguishes equals in general, but reviewers should clarify arbitrary-content comparison to reduce ambiguity.",
    "html-css-fundamentals-A04": "Direct application of B04 label/id rule; useful repair scenario but modest advanced difficulty.",
    "sql-fundamentals-A04": "Repair of the same null-test construct as B06; applied context is narrow.",
    "sql-fundamentals-A06": "Application repeats B10 prepared-value binding; validate desired advanced breadth.",
    "database-management-basics-A02": "Assumes ordinary positive purchase quantities; reviewers can make that precondition explicit without claiming validation of arbitrary client inputs.",
    "database-management-basics-A06": "Update-anomaly scenario closely repeats B05's normalization construct.",
    "python-programming-fundamentals-A06": "Same price-filter arithmetic as JavaScript A01 in a different language; intentional related-skill transfer, not an exact duplicate.",
    "javascript-fundamentals-A01": "Same price-filter scenario as Python A06 in a different language; cross-bank answer exposure should be considered.",
    "computer-networking-basics-A03": "Shares name-versus-IP diagnostic pattern with Troubleshooting A02; reasonable overlapping domain, not independent practical proof.",
    "computer-troubleshooting-A02": "Related DNS reasoning overlaps Networking A03. Testing by raw IP is a heuristic, not proof of a DNS fault; wording asks what to investigate first.",
}

def flags(key, level):
    result = [FLAGS[key]] if key in FLAGS else []
    if key.startswith("food-safety-and-hygiene-"):
        result.append("Research-team review must not be described as food-handler certification; local Philippine/institutional procedure applicability and a qualified topic review remain recommended. No numeric safety standard is invented.")
    if key.startswith("git-github-basics-B") or key.startswith("computer-troubleshooting-B"):
        result.append("Several alternatives are plainly irrelevant or destructive; plausible misconception-based distractors would improve discrimination. No empirical item analysis exists.")
    if key.startswith("computer-networking-basics-B"):
        result.append("Review distractor plausibility; several unrelated enrollment/password/display choices make elimination easy.")
    if level == "ADVANCED":
        result.append("Applied/scenario-choice reasoning only. 'Advanced' is a tier label, not calibrated expert difficulty or observed hands-on performance.")
    return result

def main():
    documents, items, stem_groups = [], [], {}
    for file in sorted(DRAFTS.glob("*.json")):
        text = file.read_text(encoding="utf-8")
        d = json.loads(text)
        assert d["review"]["status"] == "NOT_REVIEWED"  # preserve historical source metadata
        documents.append({"key": d["presetKey"], "name": d["skillName"], "path": str(file.relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "scope": d["scope"], "sources": d["sources"]})
        for level in ["BASIC", "ADVANCED"]:
            bank = d[level.lower()]
            for item in bank["items"]:
                key, prompt = item["prompt"].split(": ", 1)
                answer = d["answerKey"][key]
                stem = re.sub(r"\s+", " ", prompt.lower()).strip()
                stem_groups.setdefault(stem, []).append(key)
                assert answer["answer"] == next(o["text"] for o in item["options"] if o["isCorrect"])
                items.append({"key": key, "skillKey": d["presetKey"], "level": level, "prompt": prompt, "options": item["options"], "answer": answer, "technicalReading": "KEY_AND_RATIONALE_CONSISTENT_UNDER_STATED_SCOPE", "difficulty": "Foundational recall/understanding or bounded application" if level == "BASIC" else "Scaffolded application/reasoning; not empirically calibrated", "reviewNotes": flags(key, level), "namedSubjectReviewer": None, "actualSubjectReviewDate": None, "formalSubjectReviewEvidence": None})
    duplicates = [v for v in stem_groups.values() if len(v) > 1]
    assert len(documents) == 15 and len(items) == 240 and not duplicates
    artifact = {"scope": "Dedicated localhost:5181 pilot only", "automatedOrAssistantAuditIsAcademicValidation": False, "sourcesUnchanged": True, "demonstrableKeyCorrections": [], "exactDuplicateStems": duplicates, "questionCounts": {"skills": 15, "basic": 150, "advanced": 90, "total": 240}, "approvalBasis": "Project owner relayed KNOXITE Research Team approval in chat on 2026-11-15; not independently verified faculty approval", "documents": documents, "items": items}
    (OUT / "COLLECTION_CONTENT_REVIEW.json").write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["# Consolidated 15-skill subject-review package", "", "Scope: localhost:5181 / dedicated OAuth development database only. Source collection: 15 files, 30 levels, 240 original questions (150 Basic, 90 Advanced). No source question/key was rewritten during this audit.", "", "## Approval provenance and limits", "", "The project owner stated in this chat on 2026-11-15: 'Our team has already checked it and you may now proceed. After that, proceed with the authorized publication workflow rather than restarting the development process.' The surrounding message expressly covers all 15 existing files, all 30 versions, local publication after genuine review, and preservation of security and methodology.", "", "This is recorded as **research-team approval relayed by the project owner**, bound to the unchanged source/payload hashes and exact local version IDs in the import manifest. It is not independent verification of faculty qualifications, named subject-reviewer signatures, a formal review date, institutional endorsement, psychometric validation or production permission. No such evidence was supplied. Blank fields below remain blank for the team to complete; they are not silently filled by automation.", "", "Source `review.status=NOT_REVIEWED` envelopes remain historical draft artifacts. The later local approval receipt is separate; source questions, answer keys and stable question identifiers are preserved. Import payload titles identify the local pilot instead of claiming the source files themselves were officially validated. The old JavaScript synthetic-only *metadata* prefix is removed only from the target payload and replaced with the accurately limited local review provenance; its questions remain byte-for-byte identical.", "", "## Comprehensive technical audit findings", "", "All 240 prompts, four-choice sets, keys, objectives and explanations were read for factual consistency, ambiguity, duplication and Basic/Advanced distinction. No demonstrable incorrect key was found under the stated scopes. All 30 level payloads pass the existing backend bank validator. Structural/numerical execution checks are reported separately from this qualitative reading and are not proof of complete subject validity.", "", "There are zero exact duplicate stems after removing stable ID prefixes and normalizing whitespace/case. Semantic overlaps remain and are itemized below. Some Basic distractors are plainly irrelevant; some Advanced scenarios are near-restatements of Basic constructs, particularly Chess A04 and Statistics A04. Java A02's same-content wording deserves clarification even though equals is the reliable general content-comparison operation. These concerns are not automatically marked resolved by the owner's approval.", "", "All pools equal the questions served: Basic 10/10 and Advanced 6/6. Randomization changes order, not membership. Answer keys already exist in review/source material; these are low-stakes local prototype assessments, not confidential/high-stakes examinations. Larger pools, stronger distractors and empirical item analysis remain recommendations. No retake/threshold policy changed.", "", "80% means at least 8/10 Basic and 5/6 Advanced with these one-point items; 5/6 is about 83.33%, the first attainable score meeting the unchanged 80% threshold. Verified measures knowledge/scenario reasoning only, not practical or professional competence.", "", "## Source hash manifest and topic-review fields", "", "| Skill / stable key | Source SHA-256 | Named reviewer | Review date | Evidence / decision |", "| --- | --- | --- | --- | --- |"]
    for d in documents:
        lines.append(f"| {d['name']} / `{d['key']}` | `{d['sha256']}` | Not supplied | Not supplied | Owner-relayed team approval for local pilot; formal topic record pending |")
    lines.extend(["", "## Reviewer checklist", "", "For every exact skill/level/version/hash in the import manifest, record the reviewer name and subject role, actual review date, scope/dialect/locale assumptions, every key and rationale checked, ambiguity/distractor/difficulty decisions, safety limits, and evidence reference. Mark any requested change and obtain review of the changed hash before replacing a published version. Do not overwrite existing attempted versions or change earned tiers.", "", "The actual named reviewer/date/evidence fields below are deliberately unfilled. They support a more formal future review record; current local publication is attributed only to the owner's explicit organizational attestation.", "", "## Primary references checked during this audit", "", "- [Python data structures](https://docs.python.org/3/tutorial/datastructures.html), [Java operators](https://docs.oracle.com/javase/tutorial/java/nutsandbolts/operators.html), [JavaScript promise scheduling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then).", "- [MySQL 8.4 documentation](https://dev.mysql.com/doc/refman/8.4/en/), [Git staging](https://git-scm.com/docs/git-add), [Excel relative/mixed references](https://support.microsoft.com/en-us/excel/switch-between-relative-absolute-and-mixed-references), [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918).", "- [OpenStax accounting equation](https://openstax.org/books/principles-financial-accounting/pages/3-2-define-and-describe-the-expanded-accounting-equation-and-its-relationship-to-analyzing-transactions), [WHO safer-food principles](https://www.who.int/activities/promoting-safe-food-handling/five-key-to-safer-food/), [FDA produce cleaning](https://www.fda.gov/consumers/consumer-updates/7-tips-cleaning-fruits-vegetables), [FIDE Laws of Chess](https://handbook.fide.com/chapter/E012023).", "", "These corroborate bounded concepts; US guidance is not asserted to be Philippine legal/institutional policy. No quotation or copied external item pool was used.", "", "## Complete question/answer/objective review", ""])
    by_key = {d["key"]: d for d in documents}
    previous = None
    for q in items:
        if previous != q["skillKey"]:
            d = by_key[q["skillKey"]]
            lines += [f"## {d['name']}", "", d["scope"], "", "Source: `" + d["path"] + "`. SHA-256: `" + d["sha256"] + "`.", "", "Source references: " + ", ".join(f"[reference {i+1}]({url})" for i,url in enumerate(d["sources"])) + ".", ""]
            previous = q["skillKey"]
        a = q["answer"]
        lines += [f"### {q['key']} — {q['level']}", "", "````text", q["prompt"], *[f"{'ABCD'[i]}. {o['text']}" for i,o in enumerate(q["options"])], "````", "", f"Key: **{a['choice']}**. Answer: `{a['answer']}`.", "", "Explanation: " + a["explanation"], "", "Learning objective: " + a["learningObjective"], "", "Technical finding: key/rationale consistent under stated scope. Difficulty: " + q["difficulty"] + ".", "", "Review observations: " + (" ".join(q["reviewNotes"]) if q["reviewNotes"] else "No additional technical issue identified; subject judgment and empirical difficulty remain unverified."), "", "Named reviewer: ______; actual review date: ______; evidence: ______; decision/change request: ______.", ""]
    (OUT / "CONSOLIDATED_SUBJECT_REVIEW_PACKAGE.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"skills": 15, "levels": 30, "questions": len(items), "exactDuplicateStems": len(duplicates), "itemsWithReviewObservations": sum(bool(q["reviewNotes"]) for q in items), "questionsChanged": 0, "academicValidationClaimed": False}))

if __name__ == "__main__":
    main()
