// Offline developer check of trusted, authored repository examples. Node vm is
// not a security boundary and this is NOT an untrusted/student-code service.
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const assert = require("node:assert/strict");

function verifyJavaScriptDraft() {
  const draft = JSON.parse(readFileSync(resolve(__dirname, "../knoxite-backend/content/drafts/javascript-fundamentals.json"), "utf8"));
  assert.equal(draft.review.status, "NOT_REVIEWED");
  assert.equal(draft.verification.length, 16);
  for (const check of draft.verification) {
    assert.equal(check.kind, "javascript");
    const lines = [];
    runInNewContext(check.code, {
      console: { log: (...args) => lines.push(args.map((v) => typeof v === "string" ? v : JSON.stringify(v)).join(" ")) },
    }, { timeout: 1000, microtaskMode: "afterEvaluate", contextCodeGeneration: { strings: false, wasm: false } });
    assert.equal(lines.join("\n"), check.expected, check.item);
  }
  return draft.verification.length;
}
module.exports = { verifyJavaScriptDraft };
if (require.main === module) console.log(JSON.stringify({ javascriptAnswersExecuted: verifyJavaScriptDraft(), academicReview: "still required", publication: "none" }));
