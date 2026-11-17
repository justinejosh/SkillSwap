import { test, expect, Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, createHash } from "node:crypto";

const require = createRequire(join(process.cwd(), "package.json"));
const demo = require(join(process.cwd(), "knoxite-backend/development/assessmentDemo.cjs"));
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`persistent labelled JavaScript assessment through normal sandbox browser at width ${viewport.width}`, async ({ page, browser }) => {
    test.setTimeout(120000); await page.setViewportSize(viewport);
    const f = await demo.openVerifiedSandbox();
    const tokens = new Set<string>();
    const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
    const oldIds = (await f.db.user.findMany({ select: { id: true } })).map((u: any) => u.id);
    const preserved = async () => digest(await Promise.all([
      f.db.user.findMany({ where: { id: { in: oldIds } }, orderBy: { id: "asc" }, include: { offeredSkills: { orderBy: { id: "asc" } }, wantedSkills: { orderBy: { id: "asc" } } } }),
      f.db.skill.findMany({ orderBy: { id: "asc" } }),
      f.db.program.findMany({ orderBy: { id: "asc" }, include: { yearLevels: { orderBy: { id: "asc" } } } }), f.db.department.findMany({ orderBy: { id: "asc" } }),
      f.db.assessmentVersion.findMany({ orderBy: { id: "asc" }, include: { items: { orderBy: { id: "asc" }, include: { options: { orderBy: { id: "asc" } } } } } }),
    ]));
    const before = await preserved();
    let adminContext: any;
    try {
      const options = await f.call("GET", "/auth/academic-options", 200);
      const program = options.programs.find((p: any) => p.code === "BSCS");
      async function student(suffix: string) {
        const marker = randomBytes(6).toString("hex");
        const email = `demo-qa-${marker}-${suffix}lag@students.knoxite.test`, password = randomBytes(32).toString("base64url");
        await f.call("POST", "/auth/register", 201, undefined, { name: `SYNTHETIC ASSESSMENT DEMO QA ${marker}-${suffix}`, email, password, programId: program.id, yearLevelId: program.yearLevels[0].id });
        const mail = JSON.parse(readFileSync(join(f.directory, "mailbox.json"), "utf8")).find((m: any) => m.to === email && m.purpose === "verification");
        await f.call("POST", "/auth/verify-email", 200, undefined, { token: new URL(mail.link).hash.slice(7) });
        const login = await f.call("POST", "/auth/login", 200, undefined, { email, password });
        tokens.add(login.token); return { ...login, email, password };
      }
      const actor = await student("actor");
      async function restrict(p: Page) {
        await p.route("**/*", (route) => ["http://localhost:5180", `http://localhost:${f.profile.apiPort}`].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
        await p.addInitScript(() => localStorage.setItem("knoxite_onboarding_completed", "true"));
      }
      async function browserLogin(p: Page, email: string, password: string) {
        await p.goto("/login");
        await p.getByLabel("Email Address", { exact: true }).fill(email);
        await p.getByLabel("Password", { exact: true }).fill(password);
        const response = p.waitForResponse((r) => r.url() === `http://localhost:${f.profile.apiPort}/api/auth/login` && r.request().method() === "POST");
        await p.getByRole("button", { name: "Sign in", exact: true }).click();
        const result = await response; expect(result.status()).toBe(200);
        tokens.add((await result.json()).token);
      }
      await restrict(page); await browserLogin(page, actor.email, actor.password);
      await expect(page).toHaveURL(/\/dashboard$/);
      async function add(name: string, category: string) {
        await page.goto("/my-skills");
        await page.getByRole("button", { name: "+ Add Skill", exact: true }).click();
        await page.getByLabel("Domain Category", { exact: true }).click();
        await page.getByRole("option", { name: category, exact: true }).click();
        await page.getByLabel("Choose a Skill", { exact: true }).fill(name);
        await page.getByRole("option", { name, exact: true }).click();
        await page.getByRole("button", { name: "Save Skill", exact: true }).click();
      }
      await add("JavaScript Fundamentals", "Technology");
      await expect(page.getByRole("dialog")).toContainText("Your teaching skill is saved");
      await page.getByRole("button", { name: "Take Basic Assessment", exact: true }).click();
      await expect(page.getByText(demo.LABEL, { exact: false }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: "Take Advanced Assessment", exact: true })).toBeDisabled();
      page.on("dialog", (dialog) => dialog.accept());
      async function complete(level: "BASIC" | "ADVANCED", count: number) {
        const response = page.waitForResponse((r) => r.url().endsWith("/attempts") && r.request().method() === "POST");
        await page.getByRole("button", { name: level === "BASIC" ? "Take Basic Assessment" : "Take Advanced Assessment", exact: true }).click();
        const started = await response; expect(started.status()).toBe(201);
        const attempt = await started.json(); expect(attempt.questions).toHaveLength(count);
        expect(JSON.stringify(attempt)).not.toMatch(/isCorrect|rubric|answerOptionId|validationNotes/);
        await expect(page.getByRole("radio")).toHaveCount(count * 4);
        const stored = await f.db.assessmentAttempt.findUnique({ where: { id: attempt.id }, include: { items: { include: { item: { include: { options: true } } } } } });
        // Test-side private DB oracle only. The student receives no keys/scores
        // to trust; the normal backend must grade the submitted option UUIDs.
        for (const q of attempt.questions) {
          const row = stored.items.find((s: any) => s.id === q.id);
          const key = row.item.options.find((o: any) => o.isCorrect);
          await page.locator(`input[name="${q.id}"][value="${key.id}"]`).check();
        }
        const gradedResponse = page.waitForResponse((r) => r.url().endsWith(`/attempts/${attempt.id}/submit`) && r.request().method() === "POST");
        await page.getByRole("button", { name: "Submit Assessment", exact: true }).click();
        const graded = await (await gradedResponse).json();
        expect(graded.status).toBe("PASSED"); expect(graded.score).toBe(100); expect(graded.earnedPoints).toBe(count);
        expect(graded.tier).toBe(level === "BASIC" ? "AMATEUR" : "VERIFIED");
        return attempt;
      }
      const basic = await complete("BASIC", 10);
      await expect(page.getByRole("dialog")).toContainText("earned the Amateur badge");
      await page.getByRole("button", { name: "Take Advanced Assessment", exact: true }).click();
      await expect(page.getByRole("button", { name: "Take Advanced Assessment", exact: true })).toBeEnabled();
      const advanced = await complete("ADVANCED", 6);
      await expect(page.getByText("Verified", { exact: true }).first()).toBeVisible();
      await page.getByRole("link", { name: "Back to My Skills", exact: true }).click();
      await expect(page.getByText("Verified", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Assessment history", exact: true }).click();
      await expect(page.getByRole("link", { name: "BASIC attempt 1: PASSED", exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "ADVANCED attempt 1: PASSED", exact: true })).toBeVisible();
      expect((await f.call("GET", `/assessments/offerings/${basic.offeringId}`, 200, actor.token)).attempts).toHaveLength(2);
      await f.call("GET", `/assessments/attempts/${advanced.id}`, 401);

      await add("Chess Fundamentals", "Other");
      await page.getByRole("button", { name: "Skip for Now", exact: true }).click();
      await expect(page.getByRole("dialog")).toContainText("continue teaching, matching, and swapping");
      await page.getByRole("button", { name: "Confirm Skip", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await add("SQL Fundamentals", "Technology");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByText("Assessment Unavailable", { exact: true })).toBeVisible();
      const profile = await f.call("GET", "/profile", 200, actor.token);
      const chess = profile.offeredSkills.find((s: any) => s.name === "Chess Fundamentals");
      expect(chess.tier).toBe("NOT_ASSESSED"); expect(chess.basicPromptDismissed).toBe(true);
      expect(profile.metrics.averageRating).toBeNull();
      const peer = await student("peer");
      const sql = await f.call("POST", "/profile/skills/offer", 201, peer.token, { presetKey: "sql-fundamentals" });
      await f.call("POST", "/profile/skills/want", 201, peer.token, { presetKey: "chess-fundamentals" });
      await f.call("POST", "/profile/skills/want", 201, actor.token, { presetKey: "sql-fundamentals" });
      const match = (await f.call("GET", "/matches", 200, actor.token)).find((m: any) => m.id === peer.user.id);
      expect(match.matchScore).toBeNull();
      const swap = await f.call("POST", "/swaps/request", 201, actor.token, { receiverId: peer.user.id, offeredSkillId: chess.id, wantedSkillId: sql.skill.id, message: "SYNTHETIC assessment-skip demonstration only" });
      expect(swap.status).toBe("PENDING");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

      adminContext = await browser.newContext({ baseURL: "http://localhost:5180", viewport });
      const adminPage = await adminContext.newPage(); await restrict(adminPage);
      const admin = f.settings.accounts.find((a: any) => a.role === "ADMIN");
      await browserLogin(adminPage, admin.email, admin.password);
      await adminPage.goto("/admin/assessments");
      await expect(adminPage.getByRole("heading", { name: "JavaScript Fundamentals · BASIC", exact: true })).toBeVisible();
      await expect(adminPage.getByRole("heading", { name: "JavaScript Fundamentals · ADVANCED", exact: true })).toBeVisible();
      await expect(adminPage.getByText("Validation: " + demo.LABEL, { exact: false })).toHaveCount(14);
      expect(await preserved()).toBe(before);
    } finally {
      await adminContext?.close();
      for (const token of tokens) await f.call("POST", "/auth/logout", 200, token).catch(() => {});
      await f.db.$disconnect();
      // New labelled QA accounts, attempts and pending requests remain as test
      // history. Existing Alice/Bob/Casey/Admin progress is never edited/reset.
    }
  });
}
