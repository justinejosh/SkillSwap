import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { validateBankInput } from "../services/bankValidation";

const demo = require(resolve(process.cwd(), "development/assessmentDemo.cjs"));
test("sandbox demonstration prepares 14 labelled compatible payloads without approving draft sources", () => {
  const drafts = demo.loadDrafts(); assert.equal(drafts.length, 7);
  let questions = 0;
  for (const draft of drafts) for (const level of ["BASIC", "ADVANCED"]) {
    const body = demo.payloadFor(draft, `synthetic-canonical-${draft.presetKey}`, level);
    const valid = validateBankInput(body); questions += valid.items.length;
    assert.ok(body.title.startsWith(demo.LABEL)); assert.ok(body.learningOutcomes.startsWith(demo.LABEL));
    assert.ok(body.items.every((i: any) => i.prompt.startsWith(demo.LABEL)));
    assert.equal(draft.review.status, "NOT_REVIEWED"); assert.equal(draft.review.reviewer, null);
    assert.equal(draft.basic.skillId, "REPLACE_WITH_CANONICAL_SKILL_UUID");
    const notes = demo.validationNotes(body, "recovery-1");
    assert.match(notes, /NOT an academic subject-expert review/); assert.match(notes, /Real-student publication remains unauthorized/);
  }
  assert.equal(questions, 112);
});
test("repeat preparation reuses exact content despite database question ordering", () => {
  const body = demo.payloadFor(demo.loadDrafts()[0], "canonical", "BASIC");
  const notes = demo.validationNotes(body, "recovery-1");
  const version = { ...structuredClone(body), id: "version", createdById: "admin", validatedById: "admin", validatedAt: new Date(), validationNotes: notes, status: "PUBLISHED" };
  version.items.reverse(); version.items.forEach((i: any) => i.options.reverse());
  const banks = [{ skillId: body.skillId, level: body.level, title: body.title, versions: [version] }];
  assert.equal(demo.existingVersion(banks, body, "admin", notes).id, "version");
  assert.equal(demo.existingVersion([], body, "admin", notes), null);
});
test("sandbox preparation refuses different, retired, duplicated or unlabelled historical banks", () => {
  const body = demo.payloadFor(demo.loadDrafts()[0], "canonical", "BASIC");
  const notes = demo.validationNotes(body, "recovery-1");
  const version = { ...structuredClone(body), id: "version", createdById: "admin", status: "DRAFT" };
  const bank = { skillId: body.skillId, level: body.level, title: body.title, versions: [version] };
  for (const altered of [
    { ...bank, title: "Historical subject-reviewed bank" },
    { ...bank, versions: [version, version] },
    { ...bank, versions: [{ ...version, status: "RETIRED" }] },
    { ...bank, versions: [{ ...version, createdById: "someone-else" }] },
    { ...bank, versions: [{ ...version, learningOutcomes: "different" }] },
    { ...bank, versions: [{ ...version, validatedById: "admin", validatedAt: new Date(), validationNotes: "different evidence" }] },
    { ...bank, versions: [{ ...version, status: "PUBLISHED" }] },
  ]) assert.throws(() => demo.existingVersion([altered], body, "admin", notes));
});
test("demonstration command rejects unsupported operations before sandbox access", async () => {
  await assert.rejects(demo.run("production"), /prepare or check/);
  await assert.rejects(demo.run("reset"), /prepare or check/);
});
