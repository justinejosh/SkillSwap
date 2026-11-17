import { test, expect, Page } from "@playwright/test";

async function fixture(page: Page, inactive = false, wantedOnly = false) {
  await page.addInitScript(() => {
    localStorage.setItem("knoxite_token", "synthetic-session");
    localStorage.setItem("knoxite_user", JSON.stringify({ id: "owner", role: "USER" }));
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") return route.continue();
    if (url.origin !== "http://127.0.0.1:5009") return route.abort();
    const skill = { id: "skill", name: "Synthetic supported skill", category: "technology", offeringId: "offering", tier: "NOT_ASSESSED", basicAvailable: false, advancedAvailable: false, activeBasicAttemptId: "resume" };
    if (url.pathname === "/api/profile") return route.fulfill({ json: { id: "owner", name: "Synthetic", role: "USER", offeredSkills: wantedOnly ? [] : [skill], wantedSkills: wantedOnly ? [skill] : [] } });
    if (url.pathname === "/api/profile/skill-catalog") return route.fulfill({ json: { presets: [] } });
    if (url.pathname === "/api/auth/session-status") return route.fulfill({ json: { enabled: false } });
    if (url.pathname === "/api/assessments/attempts/resume") return route.fulfill({ json: { id: "resume", offeringId: "offering", offeringActive: !inactive, skillName: skill.name, level: "BASIC", status: "IN_PROGRESS", tier: "NOT_ASSESSED", assessmentVersion: 1, passingPercent: 80, expiresAt: new Date(Date.now() + 120_000).toISOString(), score: null, questions: [{ id: "q", prompt: "Synthetic question", options: [{ id: "a", text: "Synthetic choice" }] }] } });
    if (url.pathname === "/api/assessments/offerings/offering") return route.fulfill({ json: { offeringId: "offering", isActive: !inactive, skillName: skill.name, tier: "NOT_ASSESSED", attempts: [{ id: "resume", level: "BASIC", status: "IN_PROGRESS", attemptNumber: 1, earnedPoints: null, possiblePoints: null, startedAt: new Date().toISOString() }], levels: ["BASIC", "ADVANCED"].map((level) => ({ level, supported: level === "BASIC", eligible: !inactive && level === "BASIC", reason: inactive ? "Restore this teaching skill before starting or resuming assessments." : level === "BASIC" ? "Resume your current attempt." : "Assessment is unavailable for this skill and level.", activeAttemptId: level === "BASIC" ? "resume" : null, nextEligibleAt: null, passingPercent: level === "BASIC" ? 80 : null, questionCount: level === "BASIC" ? 10 : null })) } });
    return route.fulfill({ json: {} });
  });
}
test("My Skills resumes a pinned attempt even without a currently published bank", async ({ page }) => {
  await fixture(page); await page.goto("/my-skills");
  await page.getByRole("button", { name: "Resume Assessment", exact: true }).click();
  await expect(page).toHaveURL(/\/assessments\/resume$/);
  await expect(page.getByRole("radio", { name: "Synthetic choice" })).toBeEnabled();
});
test("removed-skill attempt stays readable with history and disabled submission", async ({ page }) => {
  await fixture(page, true); await page.goto("/assessments/resume");
  await expect(page.getByText(/This teaching skill was removed/)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Synthetic choice" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Submit Assessment" })).toBeDisabled();
  await page.goto("/assessments/offerings/offering");
  await expect(page.getByRole("heading", { name: "Your assessment history" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume Assessment", exact: true })).toBeDisabled();
});
test("missing Advanced bank is clearly unavailable and wanted skills have no assessments", async ({ page }) => {
  await fixture(page, false, true); await page.goto("/assessments/offerings/offering");
  await expect(page.getByText("Assessment is unavailable for this skill and level.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Advanced Assessment" })).toBeDisabled();
  await page.goto("/my-skills"); await page.getByRole("tab", { name: /Wants to Learn/ }).click();
  await expect(page.getByText("Synthetic supported skill")).toBeVisible();
  await expect(page.getByRole("button", { name: /Assessment/ })).toHaveCount(0);
});
