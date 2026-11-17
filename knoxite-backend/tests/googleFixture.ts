import { loadConfig } from "../lib/config";
export function googleTestEnvironment() {
  return {
    REGISTRATION_CONSENT_ENABLED: "true", REGISTRATION_NOTICE_VERSION: "DRAFT_TEST_NOTICE_v1",
    JWT_SECRET: "synthetic-google-test-key-".repeat(3),
    INSTITUTION_EMAIL_DOMAINS: "fixture.example",
    CAMPUS_EMAIL_SUFFIX: "lag",
    EMAIL_VERIFICATION_REQUIRED: "true",
    CAMPUS_EMAIL_RULE_CONFIRMED: "true",
    CORS_ORIGINS: "http://127.0.0.1:5174",
    PUBLIC_APP_URL: "http://127.0.0.1:5174",
    GOOGLE_SIGN_IN_ENABLED: "true",
    GOOGLE_CLIENT_ID: "synthetic.apps.googleusercontent.com",
    GOOGLE_ALLOWED_HOSTED_DOMAINS: "workspace.fixture.example",
    GOOGLE_WORKSPACE_ACCESS_CONFIRMED: "true",
    GOOGLE_ELIGIBILITY_RULES_CONFIRMED: "true",
    GOOGLE_SECURITY_REVIEW_CONFIRMED: "true",
    GOOGLE_ELIGIBILITY_POLICY_VERSION: "synthetic-approved-policy-v1",
  };
}
export const googleTestConfig = () => loadConfig(googleTestEnvironment());
