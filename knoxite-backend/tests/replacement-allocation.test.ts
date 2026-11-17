import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const { SLOT_COUNT, layoutForSlot, inventoryCandidates, chooseReplacement } = require(
  resolve(process.cwd(), "development/replacementAllocation.cjs"),
);
const empty = () => inventoryCandidates();

test("the reported original mismatch plus orphaned fixed replacement allocates recovery-1", () => {
  const candidates = inventoryCandidates({
    containerNames: ["knoxite-synthetic-mysql", "knoxite-synthetic-mysql-replacement"],
    volumeNames: ["knoxite-synthetic-mysql-data", "knoxite-synthetic-mysql-data-replacement"],
    occupiedPorts: [3309, 3310, 5010, 5011],
  });
  assert.deepEqual(chooseReplacement({ candidates }), { ok: true, profile: "recovery-1", action: "create" });
  assert.deepEqual(layoutForSlot(1), {
    name: "recovery-1", folder: "recovery-1",
    container: "knoxite-synthetic-mysql-recovery-1", volume: "knoxite-synthetic-mysql-data-recovery-1",
    dbPort: 3311, apiPort: 5012, dbName: "knoxite_sandbox_recovery_1_dev",
  });
});
test("all generation namespaces and ports are separate and bounded", () => {
  assert.equal(SLOT_COUNT, 8);
  const layouts = Array.from({ length: SLOT_COUNT }, (_, i) => layoutForSlot(i + 1));
  for (const key of ["name", "folder", "container", "volume", "dbPort", "apiPort", "dbName"])
    assert.equal(new Set(layouts.map((layout: any) => layout[key])).size, SLOT_COUNT);
  for (const slot of [0, 9, -1, 1.5, "1", NaN, undefined]) assert.throws(() => layoutForSlot(slot));
});
test("a reserved empty generation and settings-only pending generation keep the same identity slot", () => {
  let candidates = empty();
  assert.deepEqual(chooseReplacement({ pending: "recovery-3", candidates }), { ok: true, profile: "recovery-3", action: "create" });
  candidates = inventoryCandidates({ local: { "recovery-3": { settingsPresent: true, settingsValid: true } } });
  assert.deepEqual(chooseReplacement({ pending: "recovery-3", candidates }), { ok: true, profile: "recovery-3", action: "resume" });
});
test("fully owned saved generations resume with independently owned busy listeners", () => {
  const layout = layoutForSlot(2);
  const candidates = inventoryCandidates({
    containerNames: [layout.container], volumeNames: [layout.volume], occupiedPorts: [layout.dbPort, layout.apiPort],
    local: { [layout.name]: { settingsPresent: true, settingsValid: true, checkpointPresent: true, ownershipVerified: true, dbPortOwned: true, apiPortOwned: true } },
  });
  assert.deepEqual(chooseReplacement({ pending: layout.name, candidates }), { ok: true, profile: layout.name, action: "resume" });
  assert.deepEqual(chooseReplacement({ candidates }), { ok: true, profile: layout.name, action: "resume" });
});
test("orphaned or invalid pending state refuses instead of silently choosing the next generation", () => {
  const layout = layoutForSlot(1);
  for (const candidates of [
    inventoryCandidates({ containerNames: [layout.container], volumeNames: [layout.volume] }),
    inventoryCandidates({ volumeNames: [layout.volume], local: { [layout.name]: { settingsPresent: true, settingsValid: true, ownershipVerified: true } } }),
    inventoryCandidates({ local: { [layout.name]: { checkpointPresent: true } } }),
    inventoryCandidates({ local: { [layout.name]: { settingsPresent: true, settingsValid: false } } }),
    inventoryCandidates({ occupiedPorts: [layout.apiPort] }),
    inventoryCandidates({ local: { [layout.name]: { settingsPresent: true, settingsValid: true, checkpointPresent: true } } }),
  ]) {
    assert.equal(chooseReplacement({ pending: layout.name, candidates }).code, "PENDING_CONFLICT");
    assert.equal(chooseReplacement({ candidates }).profile, "recovery-2");
  }
});
test("all orphaned generations exhaust capacity without deletion or reuse", () => {
  const candidates = inventoryCandidates({ volumeNames: Array.from({ length: SLOT_COUNT }, (_, i) => layoutForSlot(i + 1).volume) });
  assert.equal(chooseReplacement({ candidates }).code, "CAPACITY_EXHAUSTED");
});
test("unknown pending profiles and ambiguous or incomplete candidate inputs fail closed", () => {
  for (const pending of ["replacement", "legacy", "../recovery-1", "recovery-0", "recovery-9", "recovery-01", "", false, undefined])
    assert.equal(chooseReplacement({ pending, candidates: empty() }).code, "PENDING_INVALID");
  const candidates = empty();
  assert.equal(chooseReplacement({ candidates: [...candidates, candidates[0]] }).code, "INVENTORY_INVALID");
  assert.equal(chooseReplacement({ candidates: [{ profile: "recovery-1" }] }).code, "INVENTORY_INVALID");
  assert.equal(chooseReplacement({ pending: "recovery-1", candidates: [] }).code, "PENDING_CONFLICT");
  assert.throws(() => inventoryCandidates({ occupiedPorts: ["3311"] }));
});
test("allocation does not mutate input, even when choosing a pending profile", () => {
  const candidates = empty().reverse();
  for (const candidate of candidates) Object.freeze(candidate);
  Object.freeze(candidates);
  const before = JSON.stringify(candidates);
  assert.equal(chooseReplacement({ pending: "recovery-4", candidates }).profile, "recovery-4");
  assert.equal(chooseReplacement({ candidates }).profile, "recovery-1");
  assert.equal(JSON.stringify(candidates), before);
});

test("exact reported nested-orphan repair prepares and activates the same fresh profile", async () => {
  const { repairFlow } = require(resolve(process.cwd(), "development/repairFlow.cjs"));
  const events: string[] = [];
  const candidates = inventoryCandidates({
    containerNames: ["knoxite-synthetic-mysql", "knoxite-synthetic-mysql-replacement"],
    volumeNames: ["knoxite-synthetic-mysql-data", "knoxite-synthetic-mysql-data-replacement"],
    occupiedPorts: [3309, 3310, 5010, 5011],
  });
  let pending: string | null = null;
  const result = await repairFlow({
    recoverOriginal: async () => { events.push("original-unverified"); return false; },
    prepareReplacement: async () => {
      const choice = chooseReplacement({ pending, candidates });
      assert.equal(choice.ok, true);
      pending = choice.profile; events.push("prepared:" + pending);
      return choice.profile;
    },
    activateReplacement: async (prepared: string) => { assert.equal(prepared, pending); events.push("activated:" + prepared); },
    needsRelocation: async () => { throw new Error("Unverified original cannot be relocated"); },
    startOriginal: async () => { throw new Error("Unverified original cannot start"); },
    relocateOriginal: async () => { throw new Error("Unverified original cannot be stopped"); },
  });
  assert.deepEqual(result, { outcome: "replacement", prepared: "recovery-1" });
  assert.deepEqual(events, ["original-unverified", "prepared:recovery-1", "activated:recovery-1"]);
});
test("repair never activates after failed preparation and retries the same durable pending generation", async () => {
  const { repairFlow } = require(resolve(process.cwd(), "development/repairFlow.cjs"));
  let pending: string | null = null, activations = 0, fail = true;
  const candidates = inventoryCandidates({ local: { "recovery-2": { settingsPresent: true, settingsValid: true } } });
  const prepareReplacement = async () => {
    const choice = chooseReplacement({ pending, candidates });
    assert.equal(choice.ok, true);
    pending = choice.profile;
    if (fail) throw new Error("Synthetic preparation interrupted");
    return choice.profile;
  };
  const options = {
    recoverOriginal: async () => false,
    prepareReplacement,
    activateReplacement: async (prepared: string) => { assert.equal(prepared, "recovery-2"); activations++; },
    needsRelocation: async () => false, startOriginal: async () => {}, relocateOriginal: async () => {},
  };
  await assert.rejects(() => repairFlow(options), /interrupted/);
  assert.equal(activations, 0); assert.equal(pending, "recovery-2");
  fail = false;
  await repairFlow(options);
  assert.equal(pending, "recovery-2"); assert.equal(activations, 1);
});
test("verified repair uses original or relocation paths without replacement allocation", async () => {
  const { repairFlow } = require(resolve(process.cwd(), "development/repairFlow.cjs"));
  for (const relocation of [false, true]) {
    let starts = 0, relocations = 0;
    const result = await repairFlow({
      recoverOriginal: async () => true,
      prepareReplacement: async () => { throw new Error("No allocation for a verified original"); },
      activateReplacement: async () => { throw new Error("No replacement activation"); },
      needsRelocation: async () => relocation,
      startOriginal: async () => { starts++; },
      relocateOriginal: async () => { relocations++; },
    });
    assert.equal(result.outcome, relocation ? "relocated" : "original");
    assert.equal(starts, relocation ? 0 : 1); assert.equal(relocations, relocation ? 1 : 0);
  }
});
test("unknown or failed original recovery cannot be treated as permission to replace", async () => {
  const { repairFlow } = require(resolve(process.cwd(), "development/repairFlow.cjs"));
  let allocations = 0;
  const options = {
    prepareReplacement: async () => { allocations++; }, activateReplacement: async () => {},
    needsRelocation: async () => false, startOriginal: async () => {}, relocateOriginal: async () => {},
  };
  await assert.rejects(() => repairFlow({ ...options, recoverOriginal: async () => undefined }));
  await assert.rejects(() => repairFlow({ ...options, recoverOriginal: async () => { throw new Error("Synthetic metadata inspection failed"); } }));
  assert.equal(allocations, 0);
});
test("preparation without an identified replacement never activates", async () => {
  const { repairFlow } = require(resolve(process.cwd(), "development/repairFlow.cjs"));
  let activations = 0;
  await assert.rejects(() => repairFlow({
    recoverOriginal: async () => false, prepareReplacement: async () => undefined,
    activateReplacement: async () => { activations++; },
    needsRelocation: async () => false, startOriginal: async () => {}, relocateOriginal: async () => {},
  }));
  assert.equal(activations, 0);
});
