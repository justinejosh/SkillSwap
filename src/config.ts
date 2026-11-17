// Local development never falls back to the deployed API.
const configuredUrl = import.meta.env.VITE_API_BASE_URL;
const requestedSandboxProfile = import.meta.env.VITE_KNOXITE_SANDBOX_PROFILE || "legacy";
if (!["legacy", "replacement"].includes(requestedSandboxProfile) && !/^recovery-[1-8]$/.test(requestedSandboxProfile))
  throw new Error("Unknown sandbox profile; refusing an implicit API fallback.");
export const SYNTHETIC_SANDBOX_PROFILE = requestedSandboxProfile;
const sandboxApiPort = SYNTHETIC_SANDBOX_PROFILE === "legacy" ? 5010 :
  SYNTHETIC_SANDBOX_PROFILE === "replacement" ? 5011 : 5011 + Number(SYNTHETIC_SANDBOX_PROFILE.slice("recovery-".length));
// Port 5180 is reserved for the synthetic sandbox. Never let a stale .env or
// a manually started Vite server send its credentials to the normal backend.
export const IS_SYNTHETIC_SANDBOX =
  import.meta.env.DEV &&
  (import.meta.env.VITE_KNOXITE_SANDBOX === "true" ||
    window.location.port === "5180");
if (import.meta.env.PROD && !configuredUrl)
  throw new Error("VITE_API_BASE_URL is required for a production build.");
if (import.meta.env.PROD) {
  let productionApi: URL;
  try { productionApi = new URL(configuredUrl!); } catch { throw new Error("Production VITE_API_BASE_URL must be an absolute HTTPS URL."); }
  if (productionApi.protocol !== "https:" || productionApi.username || productionApi.password || productionApi.search || productionApi.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(productionApi.hostname) || productionApi.hostname.endsWith(".localhost"))
    throw new Error("Production VITE_API_BASE_URL must use non-loopback HTTPS without credentials, query or fragment.");
}
export const API_BASE_URL = (
  IS_SYNTHETIC_SANDBOX
    ? `http://localhost:${sandboxApiPort}/api`
    : configuredUrl || "http://localhost:5000/api"
).replace(/\/$/, "");
