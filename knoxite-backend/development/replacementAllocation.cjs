// Pure allocation policy. It never reads credentials, adopts resource labels,
// changes a pointer, starts a process, or deletes an existing resource.
const SLOT_COUNT = 8;
const flags = [
  "settingsPresent", "settingsValid", "checkpointPresent", "containerPresent",
  "volumePresent", "ownershipVerified", "dbPortAvailable", "apiPortAvailable",
];
function layoutForSlot(slot) {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT)
    throw new TypeError("Recovery slot must be an integer from 1 through 8.");
  const name = `recovery-${slot}`;
  return {
    name, folder: name,
    container: `knoxite-synthetic-mysql-${name}`,
    volume: `knoxite-synthetic-mysql-data-${name}`,
    dbPort: 3310 + slot, apiPort: 5011 + slot,
    dbName: `knoxite_sandbox_recovery_${slot}_dev`,
  };
}
function slotForProfile(profile) {
  const match = typeof profile === "string" && /^recovery-([1-8])$/.exec(profile);
  return match ? Number(match[1]) : null;
}
function inventoryCandidates({ containerNames = [], volumeNames = [], occupiedPorts = [], local = {} } = {}) {
  if (!Array.isArray(containerNames) || !containerNames.every((name) => typeof name === "string") ||
      !Array.isArray(volumeNames) || !volumeNames.every((name) => typeof name === "string") ||
      !Array.isArray(occupiedPorts) || !occupiedPorts.every((port) => Number.isInteger(port) && port > 0 && port <= 65535) ||
      !local || typeof local !== "object" || Array.isArray(local))
    throw new TypeError("Recovery allocation requires a valid local metadata inventory.");
  const containers = new Set(containerNames), volumes = new Set(volumeNames), ports = new Set(occupiedPorts);
  return Array.from({ length: SLOT_COUNT }, (_, i) => {
    const layout = layoutForSlot(i + 1), saved = local[layout.name] || {};
    return {
      profile: layout.name,
      settingsPresent: saved.settingsPresent === true,
      settingsValid: saved.settingsValid === true,
      checkpointPresent: saved.checkpointPresent === true,
      containerPresent: containers.has(layout.container),
      volumePresent: volumes.has(layout.volume),
      ownershipVerified: saved.ownershipVerified === true,
      // A listener is usable only if absent or independently proven owned.
      dbPortAvailable: !ports.has(layout.dbPort) || saved.dbPortOwned === true,
      apiPortAvailable: !ports.has(layout.apiPort) || saved.apiPortOwned === true,
    };
  });
}
function canResume(candidate) {
  if (!candidate.settingsPresent || !candidate.settingsValid ||
      !candidate.dbPortAvailable || !candidate.apiPortAvailable) return false;
  if (candidate.containerPresent || candidate.volumePresent)
    return candidate.containerPresent && candidate.volumePresent && candidate.ownershipVerified;
  // A checkpoint without resources records history that must be reconciled;
  // it cannot authorize silently creating a new database in its place.
  return !candidate.checkpointPresent;
}
function isEmpty(candidate) {
  return !candidate.settingsPresent && !candidate.checkpointPresent &&
    !candidate.containerPresent && !candidate.volumePresent &&
    candidate.dbPortAvailable && candidate.apiPortAvailable;
}
function refusal(code, message) { return { ok: false, code, message }; }
function chooseReplacement(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options))
    return refusal("INVENTORY_INVALID", "Recovery allocation options are invalid. No resource or profile was selected.");
  const pending = Object.hasOwn(options, "pending") ? options.pending : null;
  const candidates = options.candidates === undefined ? [] : options.candidates;
  if (pending !== null && slotForProfile(pending) === null)
    return refusal("PENDING_INVALID", "Pending recovery profile is invalid. Retain it for review; no new profile was selected.");
  if (!Array.isArray(candidates) || candidates.some((candidate) =>
    !candidate || slotForProfile(candidate.profile) === null ||
    flags.some((flag) => typeof candidate[flag] !== "boolean")) ||
    new Set(candidates.map((candidate) => candidate.profile)).size !== candidates.length)
    return refusal("INVENTORY_INVALID", "Recovery inventory is incomplete or ambiguous. No resource or profile was selected.");
  const ordered = [...candidates].sort((a, b) => slotForProfile(a.profile) - slotForProfile(b.profile));
  if (pending !== null) {
    const candidate = ordered.find((value) => value.profile === pending);
    if (candidate && canResume(candidate)) return { ok: true, profile: pending, action: "resume" };
    // Pending may have been reserved before exclusive settings creation.
    if (candidate && isEmpty(candidate)) return { ok: true, profile: pending, action: "create" };
    return refusal("PENDING_CONFLICT", "Pending recovery state is orphaned, occupied or unverified. It was retained; explicit reconciliation is required before allocating another profile.");
  }
  const resumable = ordered.find(canResume);
  if (resumable) return { ok: true, profile: resumable.profile, action: "resume" };
  const empty = ordered.find(isEmpty);
  if (empty) return { ok: true, profile: empty.profile, action: "create" };
  return refusal("CAPACITY_EXHAUSTED", "No safe recovery slot is available. Existing settings, containers, volumes and listeners were retained.");
}
module.exports = { SLOT_COUNT, layoutForSlot, inventoryCandidates, chooseReplacement };
