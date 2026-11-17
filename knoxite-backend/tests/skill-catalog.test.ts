import test from "node:test";
import assert from "node:assert/strict";
import { presetSkills, resolveSkill, resolveStudentPreset, ensureSkillCatalog, listSkillCatalog, existingPresetSkill } from "../services/skillCatalog";
import { assessmentAvailability, startAssessment } from "../services/assessmentService";

const expected: Record<string, string> = {
  technology: "Python Programming Fundamentals|Java Programming Fundamentals|JavaScript Fundamentals|HTML & CSS Fundamentals|SQL Fundamentals|Database Management Basics|Computer Networking Basics|Computer Troubleshooting|Git & GitHub Basics|Microsoft Excel Fundamentals",
  creative: "Graphic Design Basics|Digital Illustration|Sketching and Drawing|Photography Fundamentals|Photo Editing|Video Editing|Digital Poster Design|Presentation Design|Canva Design|Creative Writing",
  music: "Acoustic Guitar Basics|Piano/Keyboard Basics|Ukulele Basics|Music Theory Fundamentals|Reading Musical Notes|Vocal Techniques Basics|Songwriting Basics|Rhythm and Timing|Basic Music Production|Music Arrangement Basics",
  language: "English Conversation|English Grammar|Academic English Writing|Filipino Communication|Filipino Creative Writing|Public Speaking|Basic Spanish Conversation|Basic Japanese Conversation|Basic Korean Conversation|Presentation and Communication Skills",
  lifestyle: "Time Management|Study Techniques|Personal Budgeting|Basic Cooking|Baking Fundamentals|Food Safety and Hygiene|Meal Planning Basics|Stress Management Techniques|Personal Organization|Healthy Habit Planning",
  business: "Bookkeeping Fundamentals|Financial Accounting Basics|Cost Accounting Basics|Financial Statement Interpretation|Accounting Information Systems Basics|Entrepreneurship Fundamentals|Marketing Fundamentals|Inventory Management Basics|Customer Service Fundamentals|Tourism and Hospitality Operations Basics",
  academic: "College Algebra|Introductory Statistics|General Biology|General Chemistry|Anatomy and Physiology Fundamentals|Microbiology Concepts|Psychology Fundamentals|Criminal Justice System Fundamentals|Human Movement Science Basics|Pharmaceutical Science Fundamentals",
  other: "Chess Fundamentals|Debate Fundamentals|Peer Mentoring Basics|Teamwork and Collaboration|Project Planning Basics|Community Event Organizing|Leadership Fundamentals|Interview Preparation|Resume and Portfolio Building|Problem-Solving Techniques",
};
test("all 80 exact preset names belong to the eight approved categories", () => {
  assert.equal(presetSkills.length, 80);
  for (const [category, names] of Object.entries(expected))
    assert.deepEqual(presetSkills.filter((p) => p.category === category).map((p) => p.name), names.split("|"));
  assert.equal(new Set(presetSkills.map((p) => p.key)).size, 80);
  assert.equal(new Set(presetSkills.map((p) => p.name.toLowerCase())).size, 80);
  assert.deepEqual(["A", "B", "C"].map((g) => presetSkills.filter((p) => p.assessmentPlanningGroup === g).length), [45, 21, 14]);
  assert.deepEqual(presetSkills.filter((p) => p.priority).map((p) => p.name).sort(), ["Python Programming Fundamentals", "Bookkeeping Fundamentals", "Introductory Statistics", "English Grammar", "Food Safety and Hygiene", "Chess Fundamentals"].sort());
});
function fixture(initial: any[] = []) {
  const rows = initial.map((s) => ({ ...s }));
  const tx = { skill: {
    findMany: async () => rows,
    create: async ({ data }: any) => { const row = { id: `synthetic-skill-${rows.length}`, ...data }; rows.push(row); return row; },
    upsert: async ({ where, create }: any) => rows.find((s) => s.name.toLowerCase() === where.name.toLowerCase()) ?? tx.skill.create({ data: create }),
  } };
  return { rows, tx, db: { ...tx, $transaction: async (fn: any, options: any) => { assert.equal(options.isolationLevel, "Serializable"); return fn(tx); } } as any };
}
test("catalog initialization is repeatable and preserves existing skill IDs/names/categories", async () => {
  const legacy = { id: "existing-python", name: "python programming fundamentals", category: "technology" };
  const custom = { id: "custom-python", name: "python", category: "general" };
  const f = fixture([legacy, custom]);
  assert.deepEqual(await ensureSkillCatalog(f.db), { total: 80, created: 79, reused: 1 });
  assert.deepEqual(await ensureSkillCatalog(f.db), { total: 80, created: 0, reused: 80 });
  assert.equal(f.rows.length, 81); assert.deepEqual(f.rows[0], legacy); assert.deepEqual(f.rows[1], custom);
  const listed = await listSkillCatalog(f.db);
  assert.equal(listed.presets[0].skillId, legacy.id);
  assert.ok(listed.presets.every((p) => p.skillId && !p.conflict));
});
test("legacy administrator resolution still supports exact names and preserves canonical IDs", async () => {
  const f = fixture(); const p = presetSkills[0];
  const selected = await resolveSkill(f.tx as any, { presetKey: p.key });
  const typed = await resolveSkill(f.tx as any, { name: "  PYTHON PROGRAMMING FUNDAMENTALS ", category: "other" });
  assert.equal(selected.id, typed.id); assert.equal(typed.category, "technology"); assert.equal(f.rows.length, 1);
});
test("legacy administrator custom names do not inherit similarly named preset IDs", async () => {
  const f = fixture();
  const custom = await resolveSkill(f.tx as any, { name: "Python", category: "technology" });
  const preset = await resolveSkill(f.tx as any, { presetKey: presetSkills[0].key });
  assert.notEqual(custom.id, preset.id); assert.equal(custom.name, "python");
  assert.equal((await resolveSkill(f.tx as any, { name: "PYTHON", category: "other" })).id, custom.id);
  assert.equal(custom.category, "technology");
});
test("students can associate all 80 presets by key or verified canonical ID without duplicates", async () => {
  const custom = { id: "historical-custom", name: "Python", category: "technology" };
  const f = fixture([custom]);
  for (const p of presetSkills) {
    const first = await resolveStudentPreset(f.tx as any, { presetKey: p.key });
    const again = await resolveStudentPreset(f.tx as any, { skillId: first.id });
    assert.equal(first.id, again.id); assert.equal(first.name, p.name); assert.equal(first.category, p.category);
  }
  assert.equal(f.rows.length, 81); assert.deepEqual(f.rows[0], custom);
});
test("student resolver rejects names, unknown keys, forged and historical custom IDs, and mixed references", async () => {
  const f = fixture([{ id: "custom", name: "Python", category: "technology" }]);
  const before = structuredClone(f.rows);
  for (const input of [{}, { name: "Asd" }, { presetKey: "unknown" }, { skillId: "forged" }, { skillId: "custom" }, { skillId: "custom", presetKey: presetSkills[0].key }, { skillId: null }, { presetKey: {} }])
    await assert.rejects(resolveStudentPreset(f.tx as any, input as any), (e: any) => e.status === 422);
  assert.deepEqual(f.rows, before);
});
test("student canonical ID cannot bypass category or ambiguous-identity safeguards", async () => {
  const p = presetSkills[0];
  const f = fixture([{ id: "wrong", name: p.name, category: "other" }]);
  await assert.rejects(resolveStudentPreset(f.tx as any, { skillId: "wrong" }), (e: any) => e.status === 409);
  assert.equal(f.rows[0].category, "other");
});
test("identity/category conflicts stop initialization without transforming historical skills", async () => {
  const original = { id: "old", name: presetSkills[79].name, category: "music" };
  const f = fixture([original]);
  await assert.rejects(ensureSkillCatalog(f.db), (e: any) => e.status === 409);
  assert.deepEqual(f.rows, [original]);
  assert.throws(() => existingPresetSkill([{ ...original, name: presetSkills[0].name, category: "technology" }, { ...original, id: "another", name: presetSkills[0].name, category: "technology" }], presetSkills[0]), (e: any) => e.status === 409);
  assert.equal((await listSkillCatalog(f.db)).presets[79].conflict, true);
});
test("unknown preset IDs, mixed references and invalid custom categories are rejected", async () => {
  const f = fixture();
  for (const input of [{ presetKey: "not-a-preset" }, { presetKey: presetSkills[0].key, name: "spoof" }, { name: "custom", category: "invalid" }])
    await assert.rejects(resolveSkill(f.tx as any, input), (e: any) => e.status === 422);
  assert.equal(f.rows.length, 0);
});
test("only exact skill-linked published/validated fixtures provide assessment availability", async () => {
  let skillId = "canonical-python", tier = "NOT_ASSESSED", passed = false;
  const banks = ["BASIC", "ADVANCED"].map((level) => ({ bank: { level, skillId: "canonical-python" }, status: "PUBLISHED", validatedAt: new Date(), validatedById: "synthetic-reviewer", passingPercent: 80, questionCount: level === "BASIC" ? 10 : 5 }));
  const db = {
    userOfferedSkill: { findFirst: async () => ({ id: "offering", skillId, skill: { name: "Synthetic fixture" }, tier, isActive: true }) },
    assessmentAttempt: { findMany: async () => passed ? [{ level: "BASIC", status: "PASSED", startedAt: new Date(), expiresAt: new Date(Date.now() + 1000), gradedAt: new Date() }] : [] },
    assessmentVersion: { findMany: async ({ where }: any) => { assert.equal(where.status, "PUBLISHED"); assert.deepEqual(where.validatedAt, { not: null }); assert.deepEqual(where.validatedById, { not: null }); return banks.filter((b) => b.bank.skillId === where.bank.skillId); } },
  } as any;
  let available = await assessmentAvailability(db, "offering", "owner");
  assert.equal(available.levels[0].eligible, true); assert.equal(available.levels[1].eligible, false);
  tier = "AMATEUR"; passed = true;
  assert.equal((await assessmentAvailability(db, "offering", "owner")).levels[1].eligible, true);
  skillId = "custom-python"; tier = "NOT_ASSESSED"; passed = false;
  available = await assessmentAvailability(db, "offering", "owner");
  assert.equal(available.levels[0].supported, false); assert.match(available.levels[0].reason, /unavailable/);
  // Group C is advisory: a future reviewed knowledge bank can use the same
  // engine. No actual bank, content, approval or tier is stored by this fixture.
  assert.equal(presetSkills.find((p) => p.name === "Acoustic Guitar Basics")!.assessmentPlanningGroup, "C");
  skillId = "synthetic-guitar-id"; banks.forEach((b) => { b.bank.skillId = skillId; }); tier = "AMATEUR"; passed = true;
  assert.equal((await assessmentAvailability(db, "offering", "owner")).levels[1].eligible, true);
});
test("advanced starts require both Amateur and actual basic-pass evidence; no bank remains unavailable", async () => {
  let tier = "NOT_ASSESSED", passed = 0;
  const tx = { $queryRaw: async () => [], userOfferedSkill: { findFirst: async () => ({ id: "offering", skillId: "skill", tier, isActive: true }) }, assessmentAttempt: { findMany: async () => [], count: async () => passed }, assessmentVersion: { findFirst: async () => null } };
  const db = { $transaction: async (fn: any) => fn(tx) } as any;
  await assert.rejects(startAssessment(db, "offering", "owner", "ADVANCED"), (e: any) => e.status === 403);
  tier = "AMATEUR";
  await assert.rejects(startAssessment(db, "offering", "owner", "ADVANCED"), (e: any) => e.status === 403);
  passed = 1;
  await assert.rejects(startAssessment(db, "offering", "owner", "ADVANCED"), (e: any) => e.status === 404);
});
