import { test, expect, BrowserContext, Page } from "@playwright/test";

async function fixture(context: BrowserContext, role: "USER" | "ADMIN" = "USER") {
  const idle = (role === "ADMIN" ? 15 : 30) * 60_000;
  const state = { now: Date.now(), last: Date.now(), absolute: Date.now() + (role === "ADMIN" ? 4 : 8) * 3600_000, activity: 0, status: 0, chat: 0, revoked: false, unavailable: false, attemptEnds: Date.now() + 45 * 60_000 };
  state.last = state.now;
  await context.addInitScript(({ role }) => {
    if (!sessionStorage.getItem("fixture-initialized")) {
      localStorage.setItem("knoxite_token", "synthetic-policy-session");
      localStorage.setItem("knoxite_user", JSON.stringify({ id: "owner", name: "Synthetic Owner", role }));
      sessionStorage.setItem("fixture-initialized", "true");
    }
    localStorage.setItem("knoxite_onboarding_completed", "true");
  }, { role });
  const expired = () => state.revoked || state.now >= Math.min(state.last + idle, state.absolute);
  const timing = () => ({ enabled: true, policy: "role-idle-absolute-v1", serverNow: new Date(state.now).toISOString(), idleExpiresAt: new Date(state.last + idle).toISOString(), absoluteExpiresAt: new Date(state.absolute).toISOString(), warningSeconds: 300 });
  await context.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    if (u.origin === "http://127.0.0.1:5174") return route.continue();
    if (u.origin !== "http://127.0.0.1:5009") return route.abort();
    const path = u.pathname;
    if (path.startsWith("/api/auth/") && ["/api/auth/providers", "/api/auth/recovery-options"].includes(path)) return route.fulfill({ json: path.endsWith("providers") ? { google: { enabled: false } } : { emailDeliveryAvailable: false } });
    if (path === "/api/auth/session-status" && state.unavailable) return route.abort();
    if (expired()) return route.fulfill({ status: 401, json: { error: "Synthetic session expired" } });
    if (path === "/api/profile") return route.fulfill({ json: { id: "owner", role, name: "Synthetic Owner", email: "ownerlag@fixture.test", avatarUrl: null, offeredSkills: [], wantedSkills: [], metrics: {} } });
    if (path === "/api/auth/session-status") { state.status++; return route.fulfill({ json: timing() }); }
    if (path === "/api/auth/session-activity") {
      expect(Object.keys(route.request().postDataJSON())).toEqual(["interaction"]);
      state.activity++; state.last = state.now; return route.fulfill({ json: timing() });
    }
    if (path === "/api/auth/logout") { state.revoked = true; return route.fulfill({ json: { message: "Signed out" } }); }
    if (path === "/api/swaps" && new URL(route.request().frame().url()).pathname === "/chat") return route.fulfill({ json: [{ id: "swap", requesterId: "owner", status: "CONFIRMED", receiver: { id: "partner", name: "Synthetic Partner" }, offeredSkill: { name: "Python" }, wantedSkill: { name: "SQL" } }] });
    if (path.startsWith("/api/chat/conversation/")) { state.chat++; return route.fulfill({ json: [{ id: "message", senderId: "owner", content: "Synthetic private message", createdAt: new Date(state.now).toISOString() }] }); }
    if (path === "/api/assessments/attempts/fixture-attempt") return route.fulfill({ json: { id: "fixture-attempt", offeringId: "offering", skillName: "Synthetic assessment", level: "BASIC", tier: "NOT_ASSESSED", status: "IN_PROGRESS", assessmentVersion: 1, learningOutcomes: "Synthetic testing only", passingPercent: 80, expiresAt: new Date(state.attemptEnds).toISOString(), questions: [{ id: "question", prompt: "Synthetic progress question", points: 1, kind: "KNOWLEDGE", options: [{ id: "option", text: "Saved selection" }, { id: "other", text: "Other selection" }] }] } });
    if (path === "/api/assessments/offerings/offering") return route.fulfill({ json: { offeringId: "offering", skillName: "Synthetic assessment", tier: "NOT_ASSESSED", levels: [], attempts: [] } });
    if (path === "/api/admin/dashboard-data") return route.fulfill({ json: { recentUsers: [], stats: { reportedIssues: 0 } } });
    if (path === "/api/analytics") return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  async function advance(page: Page, ms: number) { state.now += ms; await page.clock.fastForward(ms); }
  return { state, idle, advance };
}
for (const role of ["USER", "ADMIN"] as const) {
  test(`${role}: five-minute warning, explicit renewal and fixed absolute deadline`, async ({ page, context }) => {
    const f = await fixture(context, role); await page.clock.install();
    await page.goto(role === "ADMIN" ? "/admin-dashboard" : "/dashboard");
    await expect.poll(() => f.state.status).toBeGreaterThan(0);
    await f.advance(page, f.idle - 301_000);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await f.advance(page, 2000);
    await expect(page.getByRole("alertdialog")).toBeVisible();
    const absolute = f.state.absolute;
    await page.getByRole("button", { name: "Stay signed in" }).click();
    await expect.poll(() => f.state.activity).toBeGreaterThan(0);
    await f.advance(page, 1000);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(f.state.absolute).toBe(absolute);
  });
}
test("chat/status polling and reload do not renew idle time; expiry clears chat and stops polling", async ({ page, context }) => {
  const f = await fixture(context); await page.clock.install(); await page.goto("/chat");
  await expect(page.getByText("Synthetic private message")).toBeVisible();
  await f.advance(page, 60_000); await page.reload();
  await expect(page.getByText("Synthetic private message")).toBeVisible();
  expect(f.state.activity).toBe(0);
  await f.advance(page, f.idle); await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Synthetic private message")).toHaveCount(0);
  const requests = f.state.chat; await f.advance(page, 10_000); expect(f.state.chat).toBe(requests);
});
test("activity in another tab resynchronizes deadlines; manual logout ends both tabs", async ({ page, context }) => {
  const f = await fixture(context); await page.clock.install(); await page.goto("/dashboard");
  await expect.poll(() => f.state.status).toBeGreaterThan(0);
  const other = await context.newPage(); await other.clock.install(); await other.goto("/dashboard");
  await expect.poll(() => f.state.status).toBeGreaterThan(1);
  f.state.now += f.idle - 299_000;
  await page.clock.fastForward(f.idle - 299_000); await other.clock.fastForward(f.idle - 299_000);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await other.bringToFront(); await other.getByRole("button", { name: "Stay signed in" }).click();
  await expect.poll(() => f.state.activity).toBeGreaterThan(0);
  await page.clock.fastForward(1000); await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await other.evaluate(async () => (await import(String("/src/app/lib/api.ts"))).logoutSession());
  await expect(other).toHaveURL(/\/login$/); await expect(page).toHaveURL(/\/login$/);
});
test("assessment choices survive warning and expiry reauthentication without changing attempt deadline", async ({ page, context }) => {
  const f = await fixture(context); await page.clock.install(); await page.goto("/assessments/fixture-attempt");
  const choice = page.getByRole("radio", { name: "Saved selection" }); await choice.check();
  await expect(choice).toBeChecked();
  const originalDeadline = f.state.attemptEnds;
  await f.advance(page, f.idle - 299_000); await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(choice).toBeChecked();
  await f.advance(page, 300_000); await expect(page).toHaveURL(/\/login$/);
  f.state.last = f.state.now; f.state.absolute = f.state.now + 8 * 3600_000;
  await page.evaluate(() => localStorage.setItem("knoxite_token", "synthetic-reauthenticated-session"));
  await page.goto("/assessments/fixture-attempt"); await expect(choice).toBeChecked();
  expect(f.state.attemptEnds).toBe(originalDeadline);
  await page.evaluate(async () => (await import(String("/src/app/lib/api.ts"))).logoutSession());
  expect(await page.evaluate(() => Object.keys(sessionStorage).some((k) => k.startsWith("knoxite-assessment-draft:")))).toBe(false);
});
test("absolute lifetime warning cannot offer a false extension", async ({ page, context }) => {
  const f = await fixture(context); f.state.absolute = f.state.now + 240_000;
  await page.clock.install(); await page.goto("/dashboard"); await f.advance(page, 1000);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stay signed in" })).toHaveCount(0);
  await f.advance(page, 240_000); await expect(page).toHaveURL(/\/login$/);
});
test("synthetic DOM events and visibility resync do not count as activity", async ({ page, context }) => {
  const f = await fixture(context); await page.goto("/dashboard"); await expect.poll(() => f.state.status).toBeGreaterThan(0);
  await page.evaluate(() => { document.dispatchEvent(new Event("pointerdown")); document.dispatchEvent(new Event("keydown")); document.dispatchEvent(new Event("scroll")); document.dispatchEvent(new Event("visibilitychange")); });
  await expect.poll(() => f.state.status).toBeGreaterThan(1); expect(f.state.activity).toBe(0);
});

test("expired or tampered assessment drafts cannot restore invalid answers or extend an attempt", async ({ page, context }) => {
  const f = await fixture(context); await page.clock.install(); await page.goto("/assessments/fixture-attempt");
  await expect(page.getByRole("radio", { name: "Saved selection" })).toBeVisible();
  await page.evaluate((expiresAt) => sessionStorage.setItem("knoxite-assessment-draft:owner:fixture-attempt", JSON.stringify({ expiresAt, answers: { question: "forged-option", otherQuestion: "option" } })), new Date(f.state.attemptEnds).toISOString());
  await page.reload(); await expect(page.getByRole("radio", { name: "Saved selection" })).not.toBeChecked();
  await page.getByRole("radio", { name: "Saved selection" }).check();
  f.state.attemptEnds = f.state.now - 1000;
  await page.reload(); await expect(page.getByRole("radio", { name: "Saved selection" })).not.toBeChecked();
  await expect(page.getByRole("radio", { name: "Saved selection" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Submit Assessment" })).toBeDisabled();
});

test("an unreachable expiry check hides private UI without claiming server revocation", async ({ page, context }) => {
  const f = await fixture(context); await page.clock.install(); await page.goto("/dashboard");
  await expect.poll(() => f.state.status).toBeGreaterThan(0);
  f.state.unavailable = true;
  await f.advance(page, f.idle + 1000);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByTitle("Account Menu")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Return to sign in" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-policy-session");
});
