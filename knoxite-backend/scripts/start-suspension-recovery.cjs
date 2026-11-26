// Run only from a reviewed, suspension-capable build. Never use an older binary.
// Load dotenv once, then force the safe value. index.js's cached dotenv import
// cannot restore a true value, even when dotenv override was configured.
try {
  require("dotenv/config");
  process.env.SUSPENSION_CREATION_ENABLED = "false";
  if (require("../dist/services/studentSuspensions.js").SUSPENSION_PROTOCOL_VERSION !== 2)
    throw new Error("Unsupported suspension protocol");
  require("../dist/index.js");
} catch {
  console.error("Recovery startup refused: use a complete reviewed suspension-protocol-2 build. No legacy fallback was started.");
  process.exitCode = 1;
}
