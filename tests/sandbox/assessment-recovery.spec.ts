import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { isolatedAssessmentApp } from "./assessment-isolation";

test("rollback-isolated MySQL: retirement resume, inactive history and canonical identity", async ({ page }) => {
  test.setTimeout(180000);
  const f = await isolatedAssessmentApp();
  try {
    const admin = await f.call("POST", "/auth/login", 200, undefined, { email: f.admin.email, password: f.password });
    const programs = await f.call("GET", "/auth/academic-options", 200);
    const p = programs.programs.find((p: any) => p.code === "BSCS");
    const email = `recovery-${randomBytes(8).toString("hex")}lag@assessment.knoxite.test`;
    await f.call("POST", "/auth/register", 201, undefined, { name: "SYNTHETIC RECOVERY FIXTURE", email, password: f.password, programId: p.id, yearLevelId: p.yearLevels[0].id });
    await f.call("POST", "/auth/verify-email", 200, undefined, { token: new URL(f.deliveries.get(email)!).hash.slice(7) });
    const user = await f.call("POST", "/auth/login", 200, undefined, { email, password: f.password });
    const offer = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "java-programming-fundamentals" });
    const id = offer.offering.id;
    const versions: any = {};
    for (const level of ["BASIC", "ADVANCED"]) {
      const questionCount = level === "BASIC" ? 10 : 6;
      const body = { skillId: offer.skill.id, level, title: "UNCOMMITTED SYNTHETIC TEST ONLY", learningOutcomes: "Software fixture validation only; not academic review", passingPercent: 80, questionCount, durationMinutes: level === "BASIC" ? 20 : 45,
        items: Array.from({ length: questionCount }, (_, i) => ({ kind: level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE", prompt: `UNCOMMITTED ${level} scenario ${i}`, competency: "Synthetic protocol check", rubric: "Synthetic choice only, not academic content", points: 1, options: [{ text: `Correct ${i}`, isCorrect: true }, { text: `Other ${i}`, isCorrect: false }] })) };
      await f.call("POST", "/admin/assessments/versions", 404, admin.token, { ...body, skillId: randomUUID() });
      const draft = await f.call("POST", "/admin/assessments/versions", 201, admin.token, body);
      await f.call("POST", `/admin/assessments/versions/${draft.id}/validate`, 200, admin.token, { validationNotes: "UNCOMMITTED SOFTWARE FIXTURE ONLY. No subject review or academic approval." });
      await f.call("POST", `/admin/assessments/versions/${draft.id}/publish`, 200, admin.token, {}); versions[level] = draft;
    }
    const start = await f.call("POST", `/assessments/offerings/${id}/attempts`, 201, user.token, { level: "BASIC" });
    await f.call("POST", `/admin/assessments/versions/${versions.BASIC.id}/retire`, 200, admin.token, {});
    let profile = await f.call("GET", "/profile", 200, user.token);
    expect(profile.offeredSkills[0].basicAvailable).toBe(false);
    expect(profile.offeredSkills[0].activeBasicAttemptId).toBe(start.id);
    const resumed = await f.call("POST", `/assessments/offerings/${id}/attempts`, 201, user.token, { level: "BASIC" });
    expect(resumed.id).toBe(start.id); expect(resumed.questions).toEqual(start.questions); expect(resumed.expiresAt).toBe(start.expiresAt);
    await page.context().route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) { const response = await route.fetch({ url: f.api + url.pathname.slice(4) + url.search, maxRedirects: 0 }); return route.fulfill({ response }); }
      if (url.origin === "http://localhost:5180") return route.continue();
      return route.abort();
    });
    await page.addInitScript(({ token, id }) => { localStorage.setItem("knoxite_token", token); localStorage.setItem("knoxite_user", JSON.stringify({ id, role: "USER" })); }, { token: user.token, id: user.user.id });
    await page.goto("http://localhost:5180/my-skills"); await page.getByRole("button", { name: "Resume Assessment", exact: true }).click();
    await expect(page.getByRole("button", { name: "Submit Assessment" })).toBeEnabled();
    async function correct(attempt: any) {
      const row = await f.db.assessmentAttempt.findUnique({ where: { id: attempt.id }, include: { items: { include: { item: { include: { options: true } } } } } });
      return row.items.map((i: any) => ({ questionId: i.id, optionId: i.item.options.find((o: any) => o.isCorrect).id }));
    }
    const passed = await f.call("POST", `/assessments/attempts/${start.id}/submit`, 200, user.token, { answers: await correct(start) });
    expect(passed.tier).toBe("AMATEUR");
    const advanced = await f.call("POST", `/assessments/offerings/${id}/attempts`, 201, user.token, { level: "ADVANCED" });
    await f.call("POST", `/admin/assessments/versions/${versions.ADVANCED.id}/retire`, 200, admin.token, {});
    await f.call("DELETE", `/profile/skills/offer/${offer.skill.id}`, 200, user.token);
    const history = await f.call("GET", `/assessments/offerings/${id}`, 200, user.token);
    expect(history.isActive).toBe(false); expect(history.attempts).toHaveLength(2); expect(history.levels.every((l: any) => !l.eligible)).toBe(true);
    await f.call("POST", `/assessments/offerings/${id}/attempts`, 404, user.token, { level: "ADVANCED" });
    await f.call("POST", `/assessments/attempts/${advanced.id}/submit`, 409, user.token, { answers: await correct(advanced) });
    await page.goto(`http://localhost:5180/assessments/${advanced.id}`);
    await expect(page.getByText(/This teaching skill was removed/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit Assessment" })).toBeDisabled();
    const restored = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "java-programming-fundamentals" });
    expect(restored.offering.id).toBe(id); expect(restored.offering.tier).toBe("AMATEUR");
    profile = await f.call("GET", "/profile", 200, user.token); expect(profile.offeredSkills[0].activeAdvancedAttemptId).toBe(advanced.id);
    const secondTab = await page.context().newPage();
    await secondTab.goto(`http://localhost:5180/assessments/${advanced.id}`);
    await expect(secondTab.getByRole("button", { name: "Submit Assessment" })).toBeEnabled();
    const verified = await f.call("POST", `/assessments/attempts/${advanced.id}/submit`, 200, user.token, { answers: await correct(advanced) }); expect(verified.tier).toBe("VERIFIED");
    secondTab.on("dialog", (dialog) => dialog.accept());
    await secondTab.getByRole("button", { name: "Submit Assessment" }).click();
    await expect(secondTab.getByText("Assessment Passed", { exact: true })).toBeVisible();
    await secondTab.close();
    const replay = await f.call("POST", `/assessments/attempts/${advanced.id}/submit`, 200, user.token, { answers: [] }); expect(replay.earnedPoints).toBe(verified.earnedPoints);
    const unsupported = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "acoustic-guitar-basics" });
    expect(unsupported.offering.tier).toBe("NOT_ASSESSED"); expect(unsupported.offering.basicAvailable).toBe(false);
    await f.sharedUnchanged();
  } finally { await f.close(); }
});
