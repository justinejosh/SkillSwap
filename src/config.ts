// Local development never falls back to the deployed API.
const configuredUrl = import.meta.env.VITE_API_BASE_URL;
if (import.meta.env.PROD && !configuredUrl)
  throw new Error("VITE_API_BASE_URL is required for a production build.");
export const API_BASE_URL = (
  configuredUrl || "http://localhost:5000/api"
).replace(/\/$/, "");
