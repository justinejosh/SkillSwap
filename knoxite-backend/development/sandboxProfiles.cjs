// Closed allowlist, not arbitrary database/port overrides. Old resources stay intact.
const layouts = {
  legacy: { name: "legacy", folder: "", container: "knoxite-synthetic-mysql", volume: "knoxite-synthetic-mysql-data", dbPort: 3309, dbName: "knoxite_sandbox_dev", apiPort: 5010 },
  replacement: { name: "replacement", folder: "replacement", container: "knoxite-synthetic-mysql-replacement", volume: "knoxite-synthetic-mysql-data-replacement", dbPort: 3310, dbName: "knoxite_sandbox_replacement_dev", apiPort: 5011 },
};
function layout(name = "legacy") {
  const generation = typeof name === "string" && /^recovery-([1-8])$/.exec(name);
  if (generation) {
    const slot = Number(generation[1]);
    return { name, folder: name, container: `knoxite-synthetic-mysql-${name}`, volume: `knoxite-synthetic-mysql-data-${name}`, dbPort: 3310 + slot, dbName: `knoxite_sandbox_recovery_${slot}_dev`, apiPort: 5011 + slot };
  }
  if (!Object.hasOwn(layouts, name)) throw new Error("Unknown synthetic sandbox profile; no arbitrary target is permitted.");
  return { ...layouts[name] };
}
function forSettings(settings) { return layout(settings?.environment?.KNOXITE_SANDBOX_PROFILE || "legacy"); }
module.exports = { layout, forSettings };
