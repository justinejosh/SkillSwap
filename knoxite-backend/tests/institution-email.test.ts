import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig, studentEmailAllowed } from "../lib/config";
import { eligibleGoogleIdentity } from "../services/googleIdentity";
import { googleTestEnvironment } from "./googleFixture";

test("confirmed institutional format checks two initials, surname, four digits, Laguna and exact domain", () => {
  const config = loadConfig({ JWT_SECRET: "synthetic-format-test-key-".repeat(3) });
  for (const email of ["aasample1234lag@student.fatima.edu.ph", "  AASAMPLE1234LAG@STUDENT.FATIMA.EDU.PH  "])
    assert.equal(studentEmailAllowed(email, config), true);
  for (const email of ["aasample123lag@student.fatima.edu.ph", "aasample12345lag@student.fatima.edu.ph", "aasamplelag@student.fatima.edu.ph", "aa1234lag@student.fatima.edu.ph", "a.a.sample1234lag@student.fatima.edu.ph", "aasample1234qc@student.fatima.edu.ph", "aasample1234lag@gmail.com", "aasample1234lag@fatima.edu.ph", "aasample1234lag@student.fatima.edu.ph.attacker.example", "aasample1234lag+tag@student.fatima.edu.ph"])
    assert.equal(studentEmailAllowed(email, config), false, "Nonconforming account must require review, not an automatic exception");
});
test("synthetic policy is preserved and never authorizes synthetic accounts in institutional configuration", () => {
  const env = { JWT_SECRET: "synthetic-format-test-key-".repeat(3), INSTITUTION_EMAIL_DOMAINS: "students.knoxite.test" };
  assert.equal(studentEmailAllowed("alicelag@students.knoxite.test", loadConfig(env)), true);
  assert.equal(studentEmailAllowed("alicelag@students.knoxite.test", loadConfig({ JWT_SECRET: env.JWT_SECRET })), false);
});
test("verified Google institutional email and approved hd allowlist are independent requirements", () => {
  const config = loadConfig({ ...googleTestEnvironment(), INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph", GOOGLE_ALLOWED_HOSTED_DOMAINS: "workspace.fixture.example" });
  const claims = { iss: "https://accounts.google.com", aud: config.google.clientId, sub: "synthetic-format-subject", email: "aasample1234lag@student.fatima.edu.ph", email_verified: true, hd: "workspace.fixture.example", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600 };
  assert.equal(eligibleGoogleIdentity(claims, config).hostedDomain, "workspace.fixture.example");
  for (const change of [{ email: "aasample123lag@student.fatima.edu.ph" }, { email: "aasample1234qc@student.fatima.edu.ph" }, { email: "aasample1234lag@gmail.com" }, { email_verified: false }, { hd: "student.fatima.edu.ph" }])
    assert.throws(() => eligibleGoogleIdentity({ ...claims, ...change }, config), (e: any) => e.status === 403);
});
