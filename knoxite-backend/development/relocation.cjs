const path = require("node:path");
function previousRoot(records) {
  const entry = records?.backend?.entry;
  if (typeof entry !== "string") return null;
  const candidate = path.resolve(path.dirname(entry), "../../..");
  if (entry !== path.join(candidate, "knoxite-backend/dist/development/server.js") ||
      records?.frontend?.entry !== path.join(candidate, "node_modules/vite/bin/vite.js")) return null;
  return candidate;
}
function processMatches(record, observed, executable, owner, frontend = false) {
  if (!record || !observed || record.pid !== observed.pid || !Number.isInteger(record.pid) || record.pid <= 0) return false;
  const normalize = (s) => process.platform === "win32" ? s.toLowerCase() : s;
  if (normalize(observed.executable || "") !== normalize(executable) || observed.owner !== owner) return false;
  const command = normalize(observed.command || "");
  const entry = normalize(record.entry || "");
  if (!entry || !(command.includes('"' + entry + '"') || command.split(/\s+/).includes(entry))) return false;
  const created = Date.parse(observed.createdAt), launched = Date.parse(record.launchedAt);
  if (!Number.isFinite(created) || !Number.isFinite(launched) || Math.abs(created - launched) > 10000) return false;
  return !frontend || /(?:^|\s)--port\s+5180(?:\s|$)/.test(command) && /(?:^|\s)--strictport(?:\s|$)/i.test(command);
}
module.exports = { previousRoot, processMatches };
