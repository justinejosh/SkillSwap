import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const collection = require(resolve(process.cwd(), "development/assessmentCollection.cjs"));
test("authorized collection contains exactly 15 skills, 30 compatible levels and 240 unchanged keyed questions", () => {
  const sources = collection.loadSources();
  assert.equal(sources.length, 15); assert.equal(new Set(sources.map((s: any) => s.key)).size, 15);
  let total = 0;
  for (const source of sources) for (const level of ["BASIC", "ADVANCED"]) {
    const payload = collection.payloadFor(source, "synthetic-target-id", level);
    assert.deepEqual(payload.items, source.source[level.toLowerCase()].items);
    assert.equal(payload.questionCount, level === "BASIC" ? 10 : 6);
    assert.equal(payload.passingPercent, 80); assert.equal(payload.skillId, "synthetic-target-id");
    assert.ok(!payload.title.includes("UNREVIEWED")); assert.match(payload.learningOutcomes, /not|no independently/i);
    if (source.key === "javascript-fundamentals") assert.ok(!payload.learningOutcomes.includes("SYNTHETIC TESTING ONLY"));
    total += payload.items.length;
  }
  assert.equal(total, 240);
});
function fixture() {
  const sources = collection.loadSources();
  const plan = { levels: sources.flatMap((s: any) => ["BASIC", "ADVANCED"].map(level => ({ key: s.key, level, skillId: "synthetic-target-id", sourceHash: s.sourceHash, payloadHash: collection.fingerprint(collection.payloadFor(s, "synthetic-target-id", level)) }))) };
  const journal = { versions: Object.fromEntries(plan.levels.map((e: any, i: number) => [e.key+":"+e.level, { versionId: "synthetic-version-"+i }])) };
  const approval = { manifestHash: collection.hash(plan), reviewOrganization: "KNOXITE Research Team", basis: "PROJECT_OWNER_CHAT_ATTESTATION", evidenceReference: "SYNTHETIC TEST ONLY approval fixture, not real review", quotedDecision: "TEST FIXTURE: Our team has already checked it", recordedAt: new Date().toISOString(), entries: plan.levels.map((e: any) => ({ ...e, versionId: journal.versions[e.key+":"+e.level].versionId, decision: "APPROVED_FOR_LOCAL_PILOT" })) };
  return { sources, plan, journal, approval };
}
test("collection fingerprint ignores generated IDs/order but detects changed keys/questions or target UUID", () => {
  const s = collection.loadSources()[0], p = collection.payloadFor(s, "synthetic-target-id", "BASIC");
  const clone = structuredClone(p); clone.items.reverse(); clone.items[0].options.reverse(); clone.items[0].id = "database-generated";
  assert.equal(collection.fingerprint(clone), collection.fingerprint(p));
  clone.items[0].options[0].isCorrect = !clone.items[0].options[0].isCorrect;
  assert.notEqual(collection.fingerprint(clone), collection.fingerprint(p));
  assert.notEqual(collection.fingerprint({ ...p, skillId: "foreign-target" }), collection.fingerprint(p));
});
test("publication requires evidence covering every exact approved source/payload/version, not an approval boolean", () => {
  const { plan, journal, approval } = fixture();
  assert.doesNotThrow(() => collection.verifyApproval(approval, plan, journal));
  for (const a of [{ approved: true }, { ...approval, entries: approval.entries.slice(1) }, { ...approval, evidenceReference: "" }, { ...approval, quotedDecision: "" }, { ...approval, manifestHash: "changed" }, { ...approval, entries: approval.entries.map((e: any, i: number) => i ? e : { ...e, versionId: "unapproved-version" }) }])
    assert.throws(() => collection.verifyApproval(a, plan, journal));
  const duplicate = structuredClone(approval); duplicate.entries[1] = duplicate.entries[0];
  assert.throws(() => collection.verifyApproval(duplicate, plan, journal));
});
test("changed or incomplete import manifests fail closed before publication", () => {
  const { sources, plan } = fixture();
  assert.doesNotThrow(() => collection.verifySources(plan, sources));
  const changed = structuredClone(plan); changed.levels[0].sourceHash = "changed";
  assert.throws(() => collection.verifySources(changed, sources));
  assert.throws(() => collection.verifySources({ levels: plan.levels.slice(1) }, sources));
});

test("manifest targets resolve only to the current local canonical Skill UUID", async () => {
  const { sources, plan } = fixture();
  // One actual UUID per canonical skill; levels share it.
  const rows = sources.map((s: any) => ({ id: s.key, name: s.preset.name, category: s.preset.category }));
  plan.levels.forEach((e: any) => { e.skillId=e.key; });
  const db = { skill: { findMany: async () => rows } };
  await assert.doesNotReject(() => collection.verifyTargets(plan, sources, db));
  plan.levels[0].skillId="foreign-environment-uuid";
  await assert.rejects(() => collection.verifyTargets(plan, sources, db));
});

test("renamed, recategorized or duplicate canonical targets cannot be silently imported", async () => {
  const { sources, plan } = fixture();
  const base = sources.map((s: any) => ({ id:s.key,name:s.preset.name,category:s.preset.category }));
  plan.levels.forEach((e:any)=>{e.skillId=e.key;});
  for(const rows of [base.slice(1),base.map((r:any,i:number)=>i?r:{...r,category:"other"}),[...base,{...base[0],id:"duplicate"}]])
    await assert.rejects(()=>collection.verifyTargets(plan,sources,{skill:{findMany:async()=>rows}}));
});
