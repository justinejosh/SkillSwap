import { test, expect, BrowserContext, Page, devices } from "@playwright/test";

async function fixture(context: BrowserContext, role: "USER" | "ADMIN" = "USER") {
  const state = { profiles: 0, statuses: 0, failure: false, revoked: false, held: false, displayName: "Verified Synthetic Student" };
  let release = () => {};
  let waiting = Promise.resolve();
  await context.addInitScript(() => {
    if (!sessionStorage.getItem("navigation-fixture")) {
      sessionStorage.setItem("navigation-fixture", "true");
      if (!localStorage.getItem("knoxite_token")) {
        localStorage.setItem("knoxite_token", "synthetic-one");
        // Deliberately untrusted role: only the server response authorizes routes.
        localStorage.setItem("knoxite_user", JSON.stringify({ id: "forged", role: "ADMIN", name: "Untrusted storage name" }));
      }
    }
    localStorage.setItem("knoxite_onboarding_completed", "true");
  });
  await context.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.origin === "http://127.0.0.1:5174") return route.continue();
    if (u.origin !== "http://127.0.0.1:5009") return route.abort();
    const path = u.pathname.replace(/\/$/, ""), credential = route.request().headers().authorization;
    const user = { id: credential === "Bearer synthetic-two" ? "two" : "one", role, name: credential === "Bearer synthetic-two" ? "New Synthetic Student" : state.displayName, programId: "program", yearLevelId: "year", email: "synthetic@fixture.test", avatarUrl: null, offeredSkills: [], wantedSkills: [], metrics: { averageRating: null, completedSwaps: 0 } };
    if (path === "/api/profile") {
      state.profiles++;
      if (state.held) await waiting;
      if (state.failure) return route.fulfill({ status: 503, json: { error: "Synthetic session check unavailable" } });
    }
    if (state.revoked) return route.fulfill({ status: 401, json: { error: "Synthetic revoked or expired session" } });
    if (path === "/api/profile") return route.fulfill({ json: user });
    if (path === "/api/profile/update") { state.displayName = route.request().postDataJSON().name; return route.fulfill({ json: { message: "Updated" } }); }
    if (path === "/api/auth/session-status") { state.statuses++; return route.fulfill({ json: { enabled: false } }); }
    if (path === "/api/auth/logout") return route.fulfill({ json: { message: "Session revoked" } });
    if (path === "/api/auth/login") return route.fulfill({ json: { token: "synthetic-two", user: { ...user, id: "two", name: "New Synthetic Student" } } });
    if (path === "/api/auth/providers") return route.fulfill({ json: { google: { enabled: false } } });
    if (path === "/api/auth/recovery-options") return route.fulfill({ json: { emailDeliveryAvailable: false } });
    if (path === "/api/academic-options") return route.fulfill({ json: { programs: [{ id: "program", label: "Synthetic Program", yearLevels: [{ id: "year", name: "1st Year" }] }], yearLevels: [{ id: "year", name: "1st Year" }] } });
    if (path === "/api/leaderboard") return route.fulfill({ json: { topMentors: [], viewer: { eligible: false } } });
    if (path === "/api/admin/dashboard-data") return route.fulfill({ json: { stats: {}, recentUsers: [] } });
    if (path === "/api/analytics") return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  return { state, hold: () => { state.held = true; waiting = new Promise<void>(resolve => { release = resolve; }); }, release: () => { state.held = false; release(); } };
}
async function observeChecking(page: Page) {
  await page.evaluate(() => {
    (window as any).__checking = 0;
    new MutationObserver(() => { if ([...document.querySelectorAll('[role="status"]')].some(el => el.textContent === "Checking your session...")) (window as any).__checking++; }).observe(document.body, { childList: true, subtree: true });
  });
}
async function navigation(page: Page, context: BrowserContext) {
  const f = await fixture(context);
  let documents = 0;
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.goto("/dashboard"); await expect(page.getByTitle("Account Menu")).toBeVisible();
  await expect.poll(() => f.state.statuses).toBe(1);
  expect(f.state.profiles).toBe(1);
  await observeChecking(page);
  await page.getByRole("button", { name: "My Skills", exact: true }).click(); await expect(page.getByRole("button", { name: "+ Add Skill", exact: true })).toBeVisible();
  expect(f.state.profiles).toBe(2); // One actual skills-page data read, no guard read.
  await page.getByTitle("Back to Dashboard").click(); await page.getByRole("button", { name: "KnoxHub", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Explore Available Skill Swaps" })).toBeVisible();
  expect(f.state.profiles).toBe(2);
  await page.getByTitle("Back to Dashboard").click(); await page.getByTitle("Account Menu").click();
  await page.getByRole("button", { name: "Account Settings", exact: true }).click();
  await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue("Verified Synthetic Student");
  expect(f.state.profiles).toBe(3); // Profile's own editable data read.
  await page.goBack(); await expect(page.getByTitle("Account Menu")).toBeVisible();
  await page.getByRole("button", { name: "Community Forum", exact: true }).click(); await expect(page.getByTitle("Back to Dashboard")).toBeVisible();
  await page.getByTitle("Back to Dashboard").click(); await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Top Mentors", exact: true })).toBeVisible(); await page.goBack();
  expect(await page.evaluate(() => (window as any).__checking)).toBe(0);
  expect(f.state.profiles).toBe(3); expect(f.state.statuses).toBe(1); expect(documents).toBe(1);
  await page.reload(); await expect(page.getByTitle("Account Menu")).toBeVisible();
  expect(f.state.profiles).toBe(4); await expect.poll(() => f.state.statuses).toBe(2);
}
test("protected navigation and Back reuse server authentication and one session guardian", async ({ page, context }) => navigation(page, context));
test.describe("Android Chrome navigation", () => {
  test.use({ viewport: devices["Pixel 7"].viewport, userAgent: devices["Pixel 7"].userAgent, deviceScaleFactor: devices["Pixel 7"].deviceScaleFactor, isMobile: true, hasTouch: true });
  test("touch navigation reuses the verified session", async ({ page, context }) => navigation(page, context));
});
test("initial server failure stays closed, exposes retry and ignores a forged stored ADMIN role", async ({ page, context }) => {
  const f = await fixture(context); f.state.failure = true;
  await page.goto("/admin-dashboard"); await expect(page.getByRole("alert")).toContainText("Synthetic session check unavailable");
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(0);
  f.state.failure = false; await page.getByRole("button", { name: "Retry session check" }).click();
  await expect(page).toHaveURL(/\/dashboard$/); await expect(page.getByTitle("Account Menu")).toBeVisible();
  expect(f.state.profiles).toBe(2);
});
test("server ADMIN cannot enter student workflows and redirects without rechecking", async ({ page, context }) => {
  const f = await fixture(context, "ADMIN"); await page.goto("/my-skills");
  await expect(page).toHaveURL(/\/admin-dashboard$/); await expect(page.getByRole("heading", { name: "Overview", level: 1 })).toBeVisible();
  expect(f.state.profiles).toBe(1);
});
for (const endpoint of ["page", "status"] as const) test(`${endpoint} 401 immediately removes protected content`, async ({ page, context }) => {
  const f = await fixture(context); await page.goto("/dashboard"); await expect(page.getByTitle("Account Menu")).toBeVisible();
  f.state.revoked = true;
  if (endpoint === "page") await page.getByRole("button", { name: "My Skills", exact: true }).click();
  else await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page).toHaveURL(/\/login$/); await expect(page.getByTitle("Account Menu")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBeNull();
});
test("same-tab account replacement hides old content until fresh server verification", async ({ page, context }) => {
  const f = await fixture(context); await page.goto("/dashboard"); await expect(page.getByTitle("Account Menu")).toBeVisible();
  f.hold();
  await page.evaluate(async () => (await import(String("/src/app/lib/session.ts"))).saveSession({ token: "synthetic-two", user: { id: "two", role: "USER" } }));
  await expect(page.getByRole("status", { name: "Checking your session...", exact: true })).toBeVisible();
  await expect(page.getByTitle("Account Menu")).toHaveCount(0);
  f.release(); await expect(page.getByTitle("Account Menu")).toBeVisible(); await page.getByTitle("Account Menu").click();
  await expect(page.getByText("New Synthetic Student", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("knoxite_user")!).id)).toBe("two");
});
test("logout clears both tabs and a new password login revalidates instead of reusing old identity", async ({ page, context }) => {
  await fixture(context); await page.goto("/dashboard"); await expect(page.getByTitle("Account Menu")).toBeVisible();
  const other = await context.newPage(); await other.goto("/dashboard"); await expect(other.getByTitle("Account Menu")).toBeVisible();
  await page.evaluate(async () => (await import(String("/src/app/lib/api.ts"))).logoutSession());
  await expect(page).toHaveURL(/\/login$/); await expect(other).toHaveURL(/\/login$/);
  await page.getByLabel("Email Address", { exact: true }).fill("synthetic@fixture.test");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByTitle("Account Menu")).toBeVisible(); await page.getByTitle("Account Menu").click();
  await expect(page.getByText("New Synthetic Student", { exact: true })).toBeVisible();
});


test("a network error cannot reveal protected content and retry performs server validation",async({page,context})=>{
  await fixture(context);
  let offline=true;
  await context.route("**/api/profile",route=>offline?route.abort():route.fallback());
  await page.goto("/dashboard");await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTitle("Account Menu")).toHaveCount(0);
  offline=false;await page.getByRole("button",{name:"Retry session check"}).click();
  await expect(page.getByTitle("Account Menu")).toBeVisible();
});

test("cross-tab account replacement revalidates both tabs and removes old identity immediately",async({page,context})=>{
  const f=await fixture(context);await page.goto("/dashboard");await expect(page.getByTitle("Account Menu")).toBeVisible();
  const other=await context.newPage();await other.goto("/dashboard");await expect(other.getByTitle("Account Menu")).toBeVisible();
  f.hold();
  await page.evaluate(async()=>{(await import(String("/src/app/lib/session.ts"))).saveSession({token:"synthetic-two",user:{id:"two",role:"USER"}});});
  for(const tab of [page,other]){
    await expect(tab.getByText("Checking your session...",{exact:true})).toBeVisible();
    await expect(tab.getByTitle("Account Menu")).toHaveCount(0);
  }
  f.release();
  for(const tab of [page,other]){
    await expect(tab.getByTitle("Account Menu")).toBeVisible();await tab.getByTitle("Account Menu").click();
    await expect(tab.getByText("New Synthetic Student",{exact:true})).toBeVisible();
    await expect(tab.getByText("Verified Synthetic Student",{exact:true})).toHaveCount(0);
  }
});


test("saved profile display changes reach the dashboard without restarting authentication",async({page,context})=>{
  const f=await fixture(context);await page.goto("/profile");
  await expect(page.getByLabel("Display Name",{exact:true})).toHaveValue("Verified Synthetic Student");
  await observeChecking(page);
  await page.getByLabel("Display Name",{exact:true}).fill("Updated Synthetic Student");
  await page.getByRole("button",{name:"Save Profile Configuration",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Profile updated.");
  await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem("knoxite_user")!).name)).toBe("Updated Synthetic Student");
  await page.getByTitle("Back to Dashboard").click();await page.getByTitle("Account Menu").click();
  await expect(page.getByText("Updated Synthetic Student",{exact:true})).toBeVisible();
  expect(f.state.statuses).toBe(1);expect(f.state.profiles).toBe(3);
  expect(await page.evaluate(()=>(window as any).__checking)).toBe(0);
});
