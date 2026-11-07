export interface AppConfig {
  jwtSecret: string;
  origins: string[];
  institutionDomains: string[];
  verificationRequired: boolean;
  campusEmailSuffix: string;
  campusRuleConfirmed: boolean;
  publicAppUrl: string;
  google: {
    enabled: boolean;
    clientId: string;
    hostedDomains: string[];
    policyVersion: string;
  };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const jwtSecret = env.JWT_SECRET || "";
  if (jwtSecret.length < 32 || /replace-with|change-me/i.test(jwtSecret))
    throw new Error(
      "JWT_SECRET must contain at least 32 unpredictable characters.",
    );
  const origins = (
    env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (origins.includes("*"))
    throw new Error("CORS_ORIGINS must list explicit origins.");
  const institutionDomains = (
    env.INSTITUTION_EMAIL_DOMAINS ?? "student.fatima.edu.ph"
  )
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (institutionDomains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)))
    throw new Error("Invalid institutional email domain configuration.");
  const campusEmailSuffix = (env.CAMPUS_EMAIL_SUFFIX ?? "lag")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9]+$/.test(campusEmailSuffix))
    throw new Error(
      "CAMPUS_EMAIL_SUFFIX must be a nonempty alphanumeric campus identifier.",
    );
  const campusRuleConfirmed = env.CAMPUS_EMAIL_RULE_CONFIRMED === "true";
  if (env.NODE_ENV === "production" && !campusRuleConfirmed)
    throw new Error(
      "Officially confirm the institutional domain and campus identifier before production activation.",
    );
  const verificationRequired = env.EMAIL_VERIFICATION_REQUIRED !== "false";
  if (
    env.NODE_ENV === "production" &&
    (!verificationRequired || !institutionDomains.length)
  )
    throw new Error(
      "Production requires institutional domains and email ownership verification.",
    );
  const publicAppUrl = env.PUBLIC_APP_URL || "http://localhost:5173";
  const url = new URL(publicAppUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "PUBLIC_APP_URL must be an HTTP(S) origin without credentials.",
    );
  if (env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("PUBLIC_APP_URL must use HTTPS in production.");
  const google = {
    enabled: env.GOOGLE_SIGN_IN_ENABLED === "true",
    clientId: (env.GOOGLE_CLIENT_ID || "").trim(),
    hostedDomains: (env.GOOGLE_ALLOWED_HOSTED_DOMAINS || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    policyVersion: (env.GOOGLE_ELIGIBILITY_POLICY_VERSION || "").trim(),
  };
  if (
    google.enabled &&
    (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(google.clientId) ||
      !google.hostedDomains.length ||
      google.hostedDomains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) ||
      !google.policyVersion ||
      google.policyVersion.length > 191 ||
      !campusRuleConfirmed ||
      !verificationRequired ||
      !institutionDomains.length ||
      env.GOOGLE_WORKSPACE_ACCESS_CONFIRMED !== "true" ||
      env.GOOGLE_ELIGIBILITY_RULES_CONFIRMED !== "true" ||
      env.GOOGLE_SECURITY_REVIEW_CONFIRMED !== "true")
  )
    throw new Error(
      "Google Sign-In requires an approved client, hosted domains, confirmed Workspace/campus/college eligibility policy, ownership verification, and security review. Keep GOOGLE_SIGN_IN_ENABLED=false until approved.",
    );
  return {
    jwtSecret,
    origins,
    institutionDomains,
    verificationRequired,
    campusEmailSuffix,
    campusRuleConfirmed,
    publicAppUrl: url.origin,
    google,
  };
}

export function studentEmailAllowed(email: string, config: AppConfig) {
  const parts = email.trim().toLowerCase().split("@");
  return (
    parts.length === 2 &&
    config.institutionDomains.includes(parts[1]) &&
    parts[0].length > config.campusEmailSuffix.length &&
    parts[0].endsWith(config.campusEmailSuffix)
  );
}
