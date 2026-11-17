import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateBankInput } from "../services/bankValidation";
import { presetSkills } from "../services/skillCatalog";

test("fifteen unreviewed draft envelopes contain 240 schema-valid items without fabricated approval", () => {
  const directory = join(process.cwd(), "content/drafts");
  const files = readdirSync(directory).filter(
  (f) => f.endsWith(".json") && f !== "qa-owner.private.json"
);
  assert.equal(files.length, 15);
  const seen = new Set<string>(); let count = 0;
  for (const file of files) {
    const draft = JSON.parse(readFileSync(join(directory, file), "utf8"));
    assert.equal(draft.draftStatus, "DRAFT_UNREVIEWED_NOT_FOR_STUDENT_PUBLICATION");
    assert.deepEqual(draft.review, { status: "NOT_REVIEWED", reviewer: null, reviewedAt: null, evidence: null });
    assert.ok(presetSkills.find((p) => p.key === draft.presetKey && p.name === draft.skillName && (p.priority || p.category === "technology")));
    seen.add(draft.presetKey);
    for (const [body, level, required] of [[draft.basic, "BASIC", 10], [draft.advanced, "ADVANCED", 6]] as const) {
      const validated = validateBankInput(body);
      assert.equal(validated.level, level); assert.equal(validated.questionCount, required); assert.equal(validated.passingPercent, 80);
      assert.equal(body.items.length, required); assert.equal(body.skillId, "REPLACE_WITH_CANONICAL_SKILL_UUID");
      for (const item of body.items) {
        assert.equal(item.options.length, 4); assert.equal(item.options.filter((o: any) => o.isCorrect).length, 1);
        assert.ok(item.competency && item.rubric); count++;
      }
    }
    // The wrapper is deliberately not an import payload. No draft is imported
    // or published by this test; a human must resolve the canonical skill ID.
    assert.throws(() => validateBankInput(draft));
  }
  assert.equal(seen.size, 15); assert.equal(count, 240);
  assert.ok(presetSkills.filter((p) => p.category === "technology").every((p) => seen.has(p.key)));
});
test("all 16 JavaScript draft programming answers execute correctly offline", () => {
  const { verifyJavaScriptDraft } = require(resolve(process.cwd(), "../tools/verify_javascript_draft.cjs"));
  assert.equal(verifyJavaScriptDraft(), 16);
});
