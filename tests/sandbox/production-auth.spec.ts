import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { isolatedAssessmentApp } from "./assessment-isolation";

test("rollback-only email/password readiness: verification, recovery expiry/replay, password reset and session revocation", async () => {
  const f = await isolatedAssessmentApp();
  try {
    const options = await f.call("GET", "/auth/academic-options", 200);
    const program = options.programs.find((p: any) => p.code === "BSCS");
    const email = `production-auth-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`;
    const input = { name: "Synthetic authentication fixture", email, password: f.password, programId: program.id, yearLevelId: program.yearLevels[0].id };
    await f.call("POST", "/auth/register", 201, undefined, input);
    await f.call("POST", "/auth/login", 403, undefined, { email, password: f.password });
    const verification = new URL(f.deliveries.get(email)!).hash.slice(7);
    await f.call("POST", "/auth/verify-email", 200, undefined, { token: verification });
    await f.call("POST", "/auth/verify-email", 422, undefined, { token: verification });
    const login = await f.call("POST", "/auth/login", 200, undefined, { email, password: f.password });
    expect(login.user.role).toBe("USER");
    const account = await f.db.user.findUnique({ where: { email } });
    expect(account.passwordHash).not.toBe(f.password);
    const present = await f.call("POST", "/auth/request-password-reset", 202, undefined, { email });
    const absent = await f.call("POST", "/auth/request-password-reset", 202, undefined, { email: `absent-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test` });
    expect(absent).toEqual(present);
    const expired = new URL(f.deliveries.get(email)!).hash.slice(7);
    const pending = await f.db.emailVerificationToken.findFirst({ where: { userId: account.id, usedAt: null } });
    expect(pending.tokenHash).not.toBe(expired);
    await f.db.emailVerificationToken.update({ where: { id: pending.id }, data: { expiresAt: new Date(Date.now() - 1) } });
    const newPassword = randomBytes(32).toString("base64url");
    await f.call("POST", "/auth/reset-password", 422, undefined, { token: expired, newPassword });
    await f.call("POST", "/auth/request-password-reset", 202, undefined, { email });
    const reset = new URL(f.deliveries.get(email)!).hash.slice(7);
    await f.call("POST", "/auth/reset-password", 200, undefined, { token: reset, newPassword });
    await f.call("POST", "/auth/reset-password", 422, undefined, { token: reset, newPassword });
    await f.call("GET", "/profile", 401, login.token);
    await f.call("POST", "/auth/login", 401, undefined, { email, password: f.password });
    const fresh = await f.call("POST", "/auth/login", 200, undefined, { email, password: newPassword });
    await f.call("POST", "/auth/logout", 200, fresh.token, {});
    await f.call("GET", "/profile", 401, fresh.token);
    await f.sharedUnchanged();
  } finally { await f.close(); }
});
