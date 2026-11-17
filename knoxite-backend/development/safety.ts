import { requireLocalDatabase } from "../scripts/safeDatabase";
import { resolve } from "node:path";
// Works from source and the compiled development entry.
const profiles = require(resolve(__dirname, __dirname.endsWith("dist/development") || __dirname.endsWith("dist\\development") ? "../../development/sandboxProfiles.cjs" : "sandboxProfiles.cjs"));

export const syntheticDomain = "students.knoxite.test";
export function requireSyntheticEnvironment(
  env: NodeJS.ProcessEnv = process.env,
) {
  if (
    env.NODE_ENV !== "development" ||
    env.KNOXITE_SYNTHETIC_SANDBOX !== "true"
  )
    throw new Error(
      "Synthetic development requires its dedicated development launcher.",
    );
  const url = new URL(requireLocalDatabase(env));
  const profile = profiles.layout(env.KNOXITE_SANDBOX_PROFILE || "legacy");
  if (
    url.hostname !== "127.0.0.1" ||
    (url.port || "3306") !== String(profile.dbPort) ||
    url.pathname !== "/" + profile.dbName ||
    env.INSTITUTION_EMAIL_DOMAINS !== syntheticDomain ||
    env.CAMPUS_EMAIL_SUFFIX !== "lag" ||
    env.EMAIL_VERIFICATION_REQUIRED !== "true" ||
    env.GOOGLE_SIGN_IN_ENABLED !== "false" ||
    env.PUBLIC_APP_URL !== "http://localhost:5180"
  )
    throw new Error(
      "Synthetic sandbox target or authentication policy is unsafe. Refusing access.",
    );
  return url.toString();
}
