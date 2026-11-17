import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { isolatedAssessmentApp } from "./assessment-isolation";

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`isolated real assessment APIs and browser progress Amateur to Verified at width ${viewport.width}`, async ({ page }) => {
    test.setTimeout(180000); await page.setViewportSize(viewport);
    const f = await isolatedAssessmentApp();
    try {
      const adminLogin = await f.call("POST", "/auth/login", 200, undefined, { email: f.admin.email, password: f.password });
      const programs = await f.call("GET", "/auth/academic-options", 200);
      const program = programs.programs.find((p: any) => p.code === "BSCS");
      const email = `student-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`;
      await f.call("POST", "/auth/register", 201, undefined, { name: "SYNTHETIC ASSESSMENT STUDENT", email, password: f.password, programId: program.id, yearLevelId: program.yearLevels[0].id });
      await f.call("POST", "/auth/verify-email", 200, undefined, { token: new URL(f.deliveries.get(email)!).hash.slice(7) });
      const user = await f.call("POST", "/auth/login", 200, undefined, { email, password: f.password });
      const legacy = await f.db.skill.create({ data: { name: `SYNTHETIC HISTORICAL CUSTOM ${randomBytes(6).toString("hex")}`, category: "other" } });
      await f.db.user.update({ where: { id: user.user.id }, data: { wantedSkills: { connect: { id: legacy.id } } } });
      expect((await f.call("GET", "/profile", 200, user.token)).wantedSkills.some((s: any) => s.id === legacy.id)).toBe(true);
      for (const type of ["offer", "want"]) {
        await f.call("POST", `/profile/skills/${type}`, 422, user.token);
        for (const body of [{ name: "Asd", category: "other" }, { presetKey: "unknown" }, { skillId: legacy.id }, { skillId: "forged" }, { presetKey: "chess-fundamentals", skillId: legacy.id }])
          await f.call("POST", `/profile/skills/${type}`, 422, user.token, body);
      }
      await f.call("DELETE", `/profile/skills/want/${legacy.id}`, 200, user.token);
      expect(await f.db.skill.findUnique({ where: { id: legacy.id } })).not.toBeNull();
      const offer = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "java-programming-fundamentals" });
      const other = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "chess-fundamentals" });
      const offering = offer.offering.id;
      const availability = () => f.call("GET", `/assessments/offerings/${offering}`, 200, user.token);
      expect((await availability()).levels[0].supported).toBe(false);
      const versions: any[] = [];
      for (const level of ["BASIC", "ADVANCED"]) {
        const version = await f.call("POST", "/admin/assessments/versions", 201, adminLogin.token, {
          skillId: offer.skill.id, level, title: `SYNTHETIC SOFTWARE FIXTURE ONLY ${level}`,
          learningOutcomes: "Software control-flow fixture; NOT subject-reviewed educational content", questionCount: level === "BASIC" ? 10 : 6, passingPercent: 80,
          items: Array.from({ length: level === "BASIC" ? 12 : 8 }, (_, i) => ({ kind: level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE", prompt: `SYNTHETIC ${level} scenario ${i}: choose fixture token ${i}.`, competency: "Synthetic fixture token handling only", rubric: "Correct token earns one point; no academic approval or competency claim.", points: 1, options: [{ text: `Fixture key ${i}`, isCorrect: true }, { text: `Fixture wrong A ${i}`, isCorrect: false }, { text: `Fixture wrong B ${i}`, isCorrect: false }, { text: `Fixture wrong C ${i}`, isCorrect: false }] })),
        });
        versions.push(version);
        if (level === "BASIC") expect((await availability()).levels[0].supported).toBe(false);
        await f.call("POST", `/admin/assessments/versions/${version.id}/publish`, 409, adminLogin.token, {});
        await f.call("POST", `/admin/assessments/versions/${version.id}/validate`, 200, adminLogin.token, { validationNotes: "SYNTHETIC SOFTWARE TEST ATTESTATION ONLY; no faculty review, no committed publication." });
        await f.call("POST", `/admin/assessments/versions/${version.id}/publish`, 200, adminLogin.token, {});
      }
      await f.sharedUnchanged(); // Other sandbox connections see NONE of these banks/grades.
      await f.call("POST", `/assessments/offerings/${offering}/attempts`, 403, user.token, { level: "ADVANCED" });
      async function answers(id: string, correct: number) {
        const stored = await f.db.assessmentAttempt.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" }, include: { item: { include: { options: true } } } } } });
        return stored.items.map((q: any, i: number) => ({ questionId: q.id, optionId: q.item.options.find((o: any) => o.isCorrect === (i < correct)).id }));
      }
      const failed = await f.call("POST", `/assessments/offerings/${offering}/attempts`, 201, user.token, { level: "BASIC" });
      await f.call("POST", `/assessments/attempts/${failed.id}/submit`, 422, user.token, { answers: await answers(failed.id, 10), score: 100 });
      await f.call("POST", `/assessments/attempts/${failed.id}/submit`, 422, user.token, { answers: [{ questionId: failed.questions[0].id, optionId: "forged-option" }] });
      const failure = await f.call("POST", `/assessments/attempts/${failed.id}/submit`, 200, user.token, { answers: await answers(failed.id, 7) });
      expect(failure.status).toBe("FAILED"); expect(failure.tier).toBe("NOT_ASSESSED");
      await f.call("POST", `/assessments/offerings/${offering}/attempts`, 429, user.token, { level: "BASIC" });
      // Move only UNCOMMITTED fixture timestamps, never system time or shared history.
      await f.db.assessmentAttempt.update({ where: { id: failed.id }, data: { startedAt: new Date(Date.now() - 25 * 3600000), gradedAt: new Date(Date.now() - 25 * 3600000) } });
      const attempt = await f.call("POST", `/assessments/offerings/${offering}/attempts`, 201, user.token, { level: "BASIC" });
      expect(attempt.questions).toHaveLength(10);
      expect(new Set(attempt.questions.map((q: any) => q.id)).size).toBe(10);
      expect(JSON.stringify(attempt.questions)).not.toMatch(/isCorrect|rubric|validationNotes/);
      const expected = await answers(attempt.id, 8);
      await page.route("**/*", async (route) => {
        const u = new URL(route.request().url());
        if (u.pathname.startsWith("/api/")) {
          const response = await route.fetch({ url: f.api + u.pathname.slice(4) + u.search, maxRedirects: 0 });
          return route.fulfill({ response });
        }
        if (u.origin === "http://localhost:5180") return route.continue();
        return route.abort();
      });
      // This normal Knoxite session was issued by the real login API. No Google
      // token, test auth route or production verification bypass is introduced.
      await page.addInitScript(({ token, id }) => { localStorage.setItem("knoxite_token", token); localStorage.setItem("knoxite_user", JSON.stringify({ id, role: "USER", name: "SYNTHETIC ASSESSMENT STUDENT" })); localStorage.setItem("knoxite_onboarding_completed", "true"); }, { token: user.token, id: user.user.id });
      await page.goto(`/assessments/offerings/${offering}`);
      await page.getByRole("button", { name: "Resume Assessment", exact: true }).click();
      for (const answer of expected) {
        const question = attempt.questions.find((q: any) => q.id === answer.questionId);
        const choice = question.options.find((o: any) => o.id === answer.optionId);
        await page.getByRole("radio", { name: choice.text, exact: true }).check();
      }
      page.on("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Submit Assessment", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("You've earned the Amateur badge");
      await page.getByRole("button", { name: "Maybe Later", exact: true }).click();
      expect((await availability()).tier).toBe("AMATEUR");
      const advancedFailed = await f.call("POST", `/assessments/offerings/${offering}/attempts`, 201, user.token, { level: "ADVANCED" });
      const advancedFailure = await f.call("POST", `/assessments/attempts/${advancedFailed.id}/submit`, 200, user.token, { answers: await answers(advancedFailed.id, 4) });
      expect(advancedFailure.status).toBe("FAILED"); expect(advancedFailure.tier).toBe("AMATEUR");
      await f.call("POST", `/assessments/offerings/${offering}/attempts`, 429, user.token, { level: "ADVANCED" });
      await f.db.assessmentAttempt.update({ where: { id: advancedFailed.id }, data: { startedAt: new Date(Date.now() - 25 * 3600000), gradedAt: new Date(Date.now() - 25 * 3600000) } });
      const advanced = await f.call("POST", `/assessments/offerings/${offering}/attempts`, 201, user.token, { level: "ADVANCED" });
      expect(advanced.questions).toHaveLength(6);
      const advAnswers = await answers(advanced.id, 6);
      await page.goto(`/assessments/offerings/${offering}`);
      await page.getByRole("button", { name: "Resume Assessment", exact: true }).click();
      for (const answer of advAnswers) {
        const question = advanced.questions.find((q: any) => q.id === answer.questionId);
        const choice = question.options.find((o: any) => o.id === answer.optionId);
        await page.getByRole("radio", { name: choice.text, exact: true }).check();
      }
      await page.getByRole("button", { name: "Submit Assessment", exact: true }).click();
      await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
      const history = await availability(); expect(history.tier).toBe("VERIFIED");
      expect(history.attempts.filter((a: any) => a.status === "PASSED")).toHaveLength(2);
      expect(history.attempts.filter((a: any) => a.status === "FAILED")).toHaveLength(2);
      expect((await f.call("GET", `/assessments/offerings/${other.offering.id}`, 200, user.token)).tier).toBe("NOT_ASSESSED");
      expect((await f.call("GET", "/profile", 200, user.token)).metrics.averageRating).toBeNull();
      await f.call("DELETE", `/profile/skills/offer/${offer.skill.id}`, 200, user.token);
      const restored = await f.call("POST", "/profile/skills/offer", 201, user.token, { presetKey: "java-programming-fundamentals" });
      expect(restored.offering.id).toBe(offering); expect(restored.offering.tier).toBe("VERIFIED");
      expect((await availability()).attempts).toHaveLength(history.attempts.length);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      // Separate fixture account: expiry, ownership and the three-start limit.
      // Time is advanced only by editing newly created UNCOMMITTED fixture rows.
      const expiringEmail = `expiry-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`;
      await f.call("POST", "/auth/register", 201, undefined, { name: "SYNTHETIC EXPIRY STUDENT", email: expiringEmail, password: f.password, programId: program.id, yearLevelId: program.yearLevels[0].id });
      await f.call("POST", "/auth/verify-email", 200, undefined, { token: new URL(f.deliveries.get(expiringEmail)!).hash.slice(7) });
      const expiryUser = await f.call("POST", "/auth/login", 200, undefined, { email: expiringEmail, password: f.password });
      const expiryOffer = await f.call("POST", "/profile/skills/offer", 201, expiryUser.token, { presetKey: "java-programming-fundamentals" });
      await f.call("GET", `/assessments/attempts/${advanced.id}`, 404, expiryUser.token);
      await f.call("POST", `/assessments/attempts/${advanced.id}/submit`, 404, expiryUser.token, { answers: advAnswers });
      for (let i = 0; i < 3; i++) {
        const expiring = await f.call("POST", `/assessments/offerings/${expiryOffer.offering.id}/attempts`, 201, expiryUser.token, { level: "BASIC" });
        expect(expiring.questions).toHaveLength(10);
        for (const q of expiring.questions) {
          expect(new Set(q.options.map((o: any) => o.id)).size).toBe(4);
          const stored = await f.db.assessmentAttemptItem.findUnique({ where: { id: q.id } });
          expect(q.options.map((o: any) => o.id)).toEqual(stored.optionOrder);
        }
        await f.db.assessmentAttempt.update({ where: { id: expiring.id }, data: { startedAt: new Date(Date.now() - 26 * 3600000), expiresAt: new Date(Date.now() - 25 * 3600000) } });
        expect((await f.call("GET", `/assessments/attempts/${expiring.id}`, 200, expiryUser.token)).status).toBe("EXPIRED");
        // Closed-attempt submissions are idempotent reads of the result. A 200
        // must still be EXPIRED with no grading or badge, never a successful pass.
        const closed = await f.call("POST", `/assessments/attempts/${expiring.id}/submit`, 200, expiryUser.token, { answers: [] });
        expect(closed.status).toBe("EXPIRED"); expect(closed.score).toBeNull(); expect(closed.tier).toBe("NOT_ASSESSED");
      }
      await f.call("POST", `/assessments/offerings/${expiryOffer.offering.id}/attempts`, 429, expiryUser.token, { level: "BASIC" });
      expect((await f.call("GET", `/assessments/offerings/${expiryOffer.offering.id}`, 200, expiryUser.token)).tier).toBe("NOT_ASSESSED");
      await f.sharedUnchanged();
    } finally { await f.close(); }
  });
}
