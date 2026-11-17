// Metadata-only ownership rules. A familiar name or an open port is insufficient.
const containerName = "knoxite-synthetic-mysql";
const volumeName = "knoxite-synthetic-mysql-data";
const profiles = require("./sandboxProfiles.cjs");
function ownershipReport(settings, container, volume) {
  const expected = profiles.forSettings(settings);
  const mounts = container?.Mounts?.filter((m) => m.Destination === "/var/lib/mysql") || [];
  const bindings = container?.HostConfig?.PortBindings?.["3306/tcp"] || [];
  const id = settings?.instanceId;
  return {
    containerPresent: !!container,
    volumePresent: !!volume,
    containerNameMatches: container?.Name === "/" + expected.container,
    imageMatches: container?.Config?.Image === "mysql:8.4",
    instanceIdMatches: !!id && container?.Config?.Labels?.["knoxite.synthetic"] === id,
    volumeInstanceIdMatches: !!id && volume?.Labels?.["knoxite.synthetic"] === id,
    volumeNameMatches: volume?.Name === expected.volume,
    exactMountMatches: mounts.length === 1 && mounts[0].Type === "volume" &&
      mounts[0].Name === expected.volume && mounts[0].RW === true,
    ipMatches: bindings.length === 1 && bindings[0].HostIp === "127.0.0.1",
    portMatches: bindings.length === 1 && bindings[0].HostPort === String(expected.dbPort),
  };
}
function ownsDatabase(report) {
  return Object.values(report).every((value) => value === true);
}
function mayInitialize(settingsExists, container, volume, checkpointExists) {
  return settingsExists || (!container && !volume && !checkpointExists);
}
function checkpointMatches(checkpoint, metadata) {
  let textMatches = false;
  try { textMatches = typeof checkpoint?.settingsText === "string" &&
    JSON.stringify(JSON.parse(checkpoint.settingsText)) === JSON.stringify(checkpoint.settings); } catch {}
  return textMatches && checkpoint?.format === 1 &&
    checkpoint.containerId === metadata.container?.Id &&
    checkpoint.volumeCreatedAt === metadata.volume?.CreatedAt &&
    ownsDatabase(ownershipReport(checkpoint.settings, metadata.container, metadata.volume));
}
module.exports = { containerName, volumeName, ownershipReport, ownsDatabase, mayInitialize, checkpointMatches };
