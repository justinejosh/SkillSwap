"""Offline developer check of these authored draft snippets, never a student code runner."""
from pathlib import Path
import contextlib
import io
import json
import math
import statistics
import subprocess

root = Path(__file__).resolve().parents[1]
drafts = sorted((root / "knoxite-backend/content/drafts").glob("*.json"))
assert len(drafts) == 15
programs = numerical = items = 0
for path in drafts:
    d = json.loads(path.read_text(encoding="utf-8"))
    assert d["review"]["status"] == "NOT_REVIEWED" and d["review"]["reviewer"] is None
    for level, count in [("basic", 10), ("advanced", 6)]:
        bank = d[level]
        assert bank["questionCount"] == count and bank["passingPercent"] == 80
        assert len(bank["items"]) == count
        for q in bank["items"]:
            assert len(q["options"]) == 4 and sum(o["isCorrect"] for o in q["options"]) == 1
            assert q["competency"] and q["rubric"]
            ident = q["prompt"].split(": ", 1)[0]
            keyed = next(o["text"] for o in q["options"] if o["isCorrect"])
            assert d["answerKey"][ident]["answer"] == keyed
            assert q["options"]["ABCD".index(d["answerKey"][ident]["choice"])]["isCorrect"]
            items += 1
    for check in d["verification"]:
        if check["kind"] == "python":
            # Only fixed, locally authored draft fragments; no imports, files,
            # network or production execution facility is provided.
            builtins = {"print": print, "type": type, "int": int, "len": len, "list": list,
                        "range": range, "sum": sum, "ValueError": ValueError}
            stream = io.StringIO()
            with contextlib.redirect_stdout(stream):
                exec(check["code"], {"__builtins__": builtins})
            assert stream.getvalue().strip() == check["expected"], check["item"]
            programs += 1
        elif check["kind"] == "javascript":
            continue  # Executed together below in Node, including promise jobs.
        else:
            v = check["values"]
            operations = {
                "subtract": lambda: v[0] - v[1], "mean": lambda: statistics.mean(v),
                "median": lambda: statistics.median(v), "mode": lambda: statistics.mode(v),
                "range": lambda: max(v) - min(v), "ratio": lambda: v[0] / v[1],
                "percent": lambda: v[0] / v[1] * 100,
                "weightedMean": lambda: (v[0]*v[1] + v[2]*v[3]) / (v[0]+v[2]),
                "sampleVariance": lambda: statistics.variance(v), "product": lambda: math.prod(v),
            }
            assert math.isclose(operations[check["operation"]](), check["expected"], abs_tol=1e-12), check["item"]
            numerical += 1
assert statistics.mean([10, 11, 12, 13, 104]) == 30
assert sorted([abs(ord("c")-ord("b")), abs(3-1)]) == [1, 2]  # b1-c3 knight pattern
assert (ord("d")-ord("c"), 2-1) == (1, 1)  # c1-g5 diagonal first crosses d2
subprocess.run(["node", str(root / "tools/verify_javascript_draft.cjs")], check=True)
print(json.dumps({"draftFiles": len(drafts), "itemsChecked": items,
                  "pythonAnswersExecuted": programs, "numericalAnswersRecomputed": numerical,
                  "additionalChecks": 3, "publication": "none", "academicReview": "still required"}))
