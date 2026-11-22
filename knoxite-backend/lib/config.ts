import { ReportEvidenceConfig, reportEvidenceConfig } from "../services/reportEvidenceConfig";
export interface AppConfig {
  reportEvidence?: ReportEvidenceConfig;
  jwtSecret: string;
  origins: string[];
  institutionDomains: string[];
  verificationRequired: boolean;
  campusEmailSuffix: string;
  campusRuleConfirmed: boolean;
  publicAppUrl: string;
  // Populated only by the dedicated local OAuth launcher; never a public DTO.
  localOAuthPilot?: { email: string; additionalEmails?: string[]; passwordAdmin?: { id: string; email: string } };
  sessionTimeouts?: boolean;
  production?: boolean;
  registrationConsent?: { enabled: boolean; version: string; approved: boolean };
  google: {
    enabled: boolean;
    clientId: string;
    hostedDomains: string[];
    policyVersion: string;
  };
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env.KNOXITE_STAGING_STUDENT_VERIFICATION_ENABLED === "true")
    throw new Error("Temporary staging student verification is an operator-only command. Never enable its flag in an API deployment.");
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
  if (env.NODE_ENV === "production") {
    if (url.pathname !== "/" || url.search || url.hash)
      throw new Error("PUBLIC_APP_URL must be a production HTTPS origin without a path, query or fragment.");
    if (!env.CORS_ORIGINS || !origins.length || !origins.includes(url.origin))
      throw new Error("Production CORS_ORIGINS must explicitly include PUBLIC_APP_URL's HTTPS origin.");
    for (const origin of origins) {
      let allowed: URL;
      try { allowed = new URL(origin); } catch { throw new Error("Production CORS origins must be valid HTTPS origins."); }
      if (allowed.protocol !== "https:" || allowed.origin !== origin || allowed.hostname.includes("*") ||
          ["localhost", "127.0.0.1", "[::1]"].includes(allowed.hostname) || allowed.hostname.endsWith(".localhost"))
        throw new Error("Production CORS origins must be explicit non-loopback HTTPS origins without paths or credentials.");
    }
    if (env.KNOXITE_SYNTHETIC_SANDBOX === "true")
      throw new Error("Synthetic sandbox mode is forbidden in production.");
  }
  const google = {
    enabled: env.GOOGLE_SIGN_IN_ENABLED === "true",
    clientId: (env.GOOGLE_CLIENT_ID || "").trim(),
    hostedDomains: (env.GOOGLE_ALLOWED_HOSTED_DOMAINS || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
    policyVersion: (env.GOOGLE_ELIGIBILITY_POLICY_VERSION || "").trim(),
  };
  const pilotRequested = env.KNOXITE_LOCAL_OAUTH_PILOT === "true";
  const pilotEmail = (env.GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL || "").trim().toLowerCase();
  const additionalJson = env.GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON;
  let additionalEmails: string[] = [];
  const adminId = env.KNOXITE_LOCAL_PASSWORD_ADMIN_ID || "";
  const adminEmail = env.KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL || "";
  if (pilotRequested || pilotEmail || additionalJson !== undefined || adminId || adminEmail) {
    const database = new URL(env.DATABASE_URL || "invalid:");
    if (!pilotRequested || env.NODE_ENV !== "development" ||
      env.KNOXITE_SYNTHETIC_SANDBOX || env.HOST !== "127.0.0.1" || env.PORT !== "5019" ||
      url.origin !== "http://localhost:5181" || origins.length !== 1 || origins[0] !== url.origin ||
      database.protocol !== "mysql:" || database.hostname !== "127.0.0.1" ||
      database.port !== "3319" || database.pathname !== "/knoxite_google_local_dev" ||
      database.username !== "knoxite_oauth")
      throw new Error("The pilot account restriction is only permitted in the dedicated local OAuth environment.");
    const emailConfig = { institutionDomains, campusEmailSuffix };
    if (additionalJson !== undefined) {
      let values: unknown;
      try { values = JSON.parse(additionalJson); } catch {
        throw new Error("Additional local pilot emails must be a valid JSON array of eligible addresses.");
      }
      if (!Array.isArray(values) || values.some(value => typeof value !== "string"))
        throw new Error("Additional local pilot emails must be a JSON array of eligible addresses.");
      additionalEmails = values.map(value => value.trim().toLowerCase());
      if (additionalEmails.some(email => !studentEmailAllowed(email, emailConfig)) ||
        new Set([pilotEmail, ...additionalEmails]).size !== 1 + additionalEmails.length ||
        (additionalEmails.length > 0 && !pilotEmail))
        throw new Error("Local student allowlist entries must be eligible, unique addresses with the original pilot account retained.");
    }
    if ((pilotEmail && !studentEmailAllowed(pilotEmail, emailConfig)) ||
      (google.enabled && !pilotEmail))
      throw new Error("Configure exactly one original eligible pilot account and any unique authorized additional emails privately before enabling local Google Sign-In.");
    if ((adminId || adminEmail) && (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(adminId) ||
      !/^admin-[0-9a-f]{16}@admin\.knoxite\.test$/.test(adminEmail) || adminEmail === pilotEmail))
      throw new Error("The dedicated password administrator requires an exact private ID and reserved local email.");
  }
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
  if (google.enabled && !pilotRequested &&
    (env.PORT === "5019" || url.origin === "http://localhost:5181"))
    throw new Error("Dedicated local OAuth sign-in requires its private exact-account pilot restriction. Use the guarded local launcher.");
  if (env.SESSION_TIMEOUTS_ENABLED === "true" && env.KNOXITE_SYNTHETIC_SANDBOX === "true")
    throw new Error("Session timeout activation remains restricted in the protected synthetic sandbox.");
  const registrationConsent = {
    enabled: env.REGISTRATION_CONSENT_ENABLED === "true",
    version: (env.REGISTRATION_NOTICE_VERSION || "").trim(),
    approved: env.REGISTRATION_NOTICE_APPROVED === "true",
  };
  if (registrationConsent.enabled && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,190}$/.test(registrationConsent.version))
    throw new Error("Registration requires a configured notice version.");
  if (env.NODE_ENV === "production" && env.SESSION_TIMEOUTS_ENABLED !== "true")
    throw new Error("Production requires explicitly enabled role-based session timeouts and database readiness.");
  if (env.NODE_ENV === "production" && (!registrationConsent.enabled || !registrationConsent.approved || /draft|placeholder|example/i.test(registrationConsent.version)))
    throw new Error("Production registration requires an approved notice version and durable consent storage.");
  return {
    jwtSecret,
    reportEvidence: reportEvidenceConfig(env),
    origins,
    institutionDomains,
    verificationRequired,
    campusEmailSuffix,
    campusRuleConfirmed,
    publicAppUrl: url.origin,
    google,
    production: env.NODE_ENV === "production",
    registrationConsent,
    ...(pilotRequested ? { localOAuthPilot: { email: pilotEmail, additionalEmails, ...(adminId ? { passwordAdmin: { id: adminId, email: adminEmail } } : {}) } } : {}),
    ...(env.SESSION_TIMEOUTS_ENABLED === "true" ? { sessionTimeouts: true } : {}),
  };
}

export function pilotAccountAllowed(email: string, config: AppConfig) {
  return !config.localOAuthPilot ||
    (!!config.localOAuthPilot.email && (email.trim().toLowerCase() === config.localOAuthPilot.email ||
      !!config.localOAuthPilot.additionalEmails?.includes(email.trim().toLowerCase())));
}

// Session-only exception: Google identities and student registration keep using
// pilotAccountAllowed. A matching email alone can never grant admin access.
export function pilotSessionAccountAllowed(
  user: { id?: string; email: string; role: string }, config: AppConfig,
) {
  if (pilotAccountAllowed(user.email, config)) return !config.localOAuthPilot || user.role === "USER";
  const admin = config.localOAuthPilot?.passwordAdmin;
  return !!admin && user.role === "ADMIN" && user.id === admin.id && user.email === admin.email;
}

export function studentEmailAllowed(email: string, config: Pick<AppConfig, "institutionDomains" | "campusEmailSuffix">) {
  const parts = email.trim().toLowerCase().split("@");
  const campusAllowed = (
    parts.length === 2 &&
    config.institutionDomains.includes(parts[1]) &&
    parts[0].length > config.campusEmailSuffix.length &&
    parts[0].endsWith(config.campusEmailSuffix)
  );
  if (!campusAllowed) return false;
  // The confirmed OLFU rule applies to the real institutional domain. Reserved
  // synthetic domains retain their existing test policy and never establish
  // eligibility in the separately configured institutional environment.
  if (parts[1] === "student.fatima.edu.ph")
    return config.campusEmailSuffix === "lag" && /^[a-z]{3,}[0-9]{4}lag$/.test(parts[0]);
  return true;
}
