// Shared by the development entry and launcher. Never used by production auth.
const { createHmac, timingSafeEqual } = require("node:crypto");
const protocol = 1;
function proof(settings, challenge, status) {
  return createHmac("sha256", settings.environment.JWT_SECRET)
    .update(JSON.stringify([
      "knoxite-sandbox-health", challenge, status.instanceId,
      status.protocol, status.pid, status.startedAt,
    ]))
    .digest("hex");
}
function verify(settings, challenge, status) {
  if (typeof status.proof !== "string" || !/^[a-f0-9]{64}$/.test(status.proof)) return false;
  return timingSafeEqual(Buffer.from(status.proof, "hex"), Buffer.from(proof(settings, challenge, status), "hex"));
}
module.exports = { protocol, proof, verify };
