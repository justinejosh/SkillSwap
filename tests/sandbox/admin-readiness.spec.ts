import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { isolatedAssessmentApp } from "./assessment-isolation";

test("rollback-only MySQL: admin directory and analytics preserve role boundaries and stored configuration", async () => {
  const f = await isolatedAssessmentApp();
  try {
    const options = await f.call("GET", "/auth/academic-options", 200);
    const program = options.programs.find((p: any) => p.code === "BSCS");
    const email = `admin-review-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`;
    await f.call("POST", "/auth/register", 201, undefined, {
      name: "Synthetic admin review student", email, password: f.password,
      programId: program.id, yearLevelId: program.yearLevels[0].id,
    });
    await f.call("POST", "/auth/verify-email", 200, undefined, {
      token: new URL(f.deliveries.get(email)!).hash.slice(7),
    });
    const student = await f.call("POST", "/auth/login", 200, undefined, { email, password: f.password });
    const admin = await f.call("POST", "/auth/login", 200, undefined, { email: f.admin.email, password: f.password });
    expect(student.user.id).not.toBe(admin.user.id);
    expect(student.user.role).toBe("USER");expect(admin.user.role).toBe("ADMIN");
    for (const path of ["/admin/users", "/admin/assessments", "/admin/academic-programs", "/admin/reports", "/admin/integrity/signals", "/analytics"]) {
      const forbidden = await f.call("GET", path, 403, student.token);
      expect(JSON.stringify(forbidden)).not.toMatch(/isCorrect|passwordHash|validationNotes/);
      await f.call("GET", path, 200, admin.token);
    }
    const users = await f.call("GET", "/admin/users?role=USER&pageSize=2", 200, admin.token);
    expect(users.users.length).toBeLessThanOrEqual(2);
    for (const user of users.users) {
      expect(user.role).toBe("USER");
      expect(Object.keys(user).sort()).toEqual(["id", "name", "email", "role", "isSuspended", "createdAt"].sort());
    }
    const analytics = await f.call("GET", "/analytics", 200, admin.token);
    expect(analytics.skillTrends.catalog).toHaveLength(80);
    expect(analytics.monthlyCompletion).toHaveLength(6);
    for (const month of analytics.monthlyCompletion) {
      expect(month.rate).toBe(month.eligibleConcluded ? month.completed / month.eligibleConcluded * 100 : null);
    }
    const academic = await f.call("GET", "/admin/academic-programs", 200, admin.token);
    const codes = JSON.parse(readFileSync("knoxite-backend/config/academic-catalog.json", "utf8")).programs.map((p: any) => p.code);
    expect(academic.programs.filter((p: any) => codes.includes(p.code))).toHaveLength(13);
    for (const code of ["BSIT", "BSIHM-CA", "BSIHM-HACLO"]) {
      expect(academic.programs.find((p: any) => p.code === code).yearLevels.map((y: any) => y.name)).toEqual(["1st Year"]);
    }
    await f.sharedUnchanged();
  } finally { await f.close(); }
});
