import { test, expect, Page } from "@playwright/test";

async function fixture(page: Page, role = "USER") {
  const state = { logout: "fail", expired: false, messages: 0, profileCalls: 0 };
  await page.addInitScript(({ role }) => {
    localStorage.setItem("knoxite_token", "synthetic-session");
    localStorage.setItem("knoxite_user", JSON.stringify({ id: "owner", name: "Synthetic Owner", role }));
    localStorage.setItem("knoxite_onboarding_completed", "true");
  }, { role });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") return route.continue();
    if (url.origin !== "http://127.0.0.1:5009") return route.abort();
    const path = url.pathname;
    if (path === "/api/profile") { state.profileCalls++; return route.fulfill({ json: { id: "owner", role, name: "Synthetic Owner", email: "syntheticlag@fixture.example", avatarUrl: null, offeredSkills: [], wantedSkills: [], metrics: {} } }); }
    if (path === "/api/auth/logout") {
      if (state.logout === "network") return route.abort();
      return route.fulfill({ status: state.logout === "fail" ? 503 : state.logout === "expired" ? 401 : 200, json: { message: "Synthetic response" } });
    }
    if (path.startsWith("/api/chat/conversation/")) {
      state.messages++;
      return route.fulfill({ status: state.expired ? 401 : 200, json: state.expired ? { error: "Expired" } : [{ id: "message", senderId: "owner", content: "Synthetic private message", createdAt: new Date().toISOString() }] });
    }
    if (path === "/api/swaps" && new URL(page.url()).pathname === "/chat") return route.fulfill({ json: [{ id: "swap", requesterId: "owner", status: "CONFIRMED", receiver: { id: "partner", name: "Synthetic Partner" }, offeredSkill: { name: "Python" }, wantedSkill: { name: "SQL" } }] });
    if (path === "/api/auth/providers") return route.fulfill({ json: { google: { enabled: false } } });
    if (path === "/api/auth/recovery-options") return route.fulfill({ json: { emailDeliveryAvailable: false } });
    if (path === "/api/admin/dashboard-data") return route.fulfill({ json: { recentUsers: [], stats: { reportedIssues: 0 } } });
    if (path === "/api/analytics") return route.fulfill({ json: {} });
    if (path === "/api/leaderboard") return route.fulfill({ json: { topMentors: [] } });
    return route.fulfill({ status: state.expired ? 401 : 200, json: state.expired ? { error: "Expired" } : [] });
  });
  return state;
}

for (const role of ["USER", "ADMIN"]) {
  test(`${role} logout failure is truthful and a successful retry clears the session`, async ({ page }) => {
    const state = await fixture(page, role);
    await page.goto(role === "USER" ? "/dashboard" : "/admin-dashboard");
    await expect.poll(() => state.profileCalls).toBeGreaterThan(0);
    // Invoke the shared logout helper used by both real page handlers. Dialog
    // feedback and page wiring are separately checked below for each role.
    for (const failure of ["fail", "network"]) {
      state.logout = failure;
      const result = await page.evaluate(async () => { try { await (await import(String("/src/app/lib/api.ts"))).logoutSession(); return "unexpected success"; } catch (e) { return (e as Error).message; } });
      expect(result).toContain("not confirmed");
      expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-session");
    }
    state.logout = "ok";
    await page.evaluate(async () => (await import(String("/src/app/lib/api.ts"))).logoutSession());
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem("knoxite_user"))).toBeNull();
  });
}

test("chat polling handles expired authentication, removes private UI and stops polling", async ({ page }) => {
  const state = await fixture(page);
  await page.goto("/chat");
  await expect(page.getByText("Synthetic private message")).toBeVisible();
  state.expired = true;
  await expect(page).toHaveURL(/\/login$/, { timeout: 8000 });
  await expect(page.getByText("Synthetic private message")).toHaveCount(0);
  const count = state.messages;
  await page.waitForTimeout(3300);
  expect(state.messages).toBe(count);
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBeNull();
});

test("raw forum requests include authentication and route expired sessions to login", async ({ page }) => {
  const state = await fixture(page);
  state.expired = true;
  let bearer = "";
  page.on("request", (r) => { if (new URL(r.url()).pathname === "/api/forum/posts") bearer = r.headers().authorization; });
  await page.goto("/community-forum");
  await expect(page).toHaveURL(/\/login$/);
  expect(bearer).toBe("Bearer synthetic-session");
});

test("late 401 and logout responses cannot discard a newer signed-in account", async ({ page }) => {
  await fixture(page); await page.goto("/dashboard");
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/delayed", async (route) => { await waiting; await route.fulfill({ status: 401, json: { error: "Old session expired" } }); });
  const request = page.evaluate(async () => (await import(String("/src/app/lib/api.ts"))).api("/delayed").catch(() => null));
  await page.waitForRequest("**/api/delayed");
  await page.evaluate(() => localStorage.setItem("knoxite_token", "synthetic-new-session"));
  release(); await request;
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-new-session");
  await expect(page).toHaveURL(/\/dashboard$/);
  let finish!: () => void;
  const delayed = new Promise<void>((resolve) => { finish = resolve; });
  await page.route("**/api/auth/logout", async (route) => { await delayed; await route.fulfill({ json: { message: "Revoked old credential" } }); });
  const logout = page.evaluate(async () => { try { await (await import(String("/src/app/lib/api.ts"))).logoutSession(); return "unexpected"; } catch (e) { return (e as Error).message; } });
  await page.waitForRequest("**/api/auth/logout");
  await page.evaluate(() => localStorage.setItem("knoxite_token", "synthetic-latest-session"));
  finish(); expect(await logout).toContain("account changed");
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-latest-session");
});

for (const role of ["USER", "ADMIN"]) {
  test(`${role} actual logout button reports failed revocation`, async ({ page }) => {
    const state = await fixture(page, role);
    await page.goto(role === "USER" ? "/dashboard" : "/admin-dashboard");
    const messages: string[] = [];
    page.on("dialog", async (d) => { if (d.type() === "alert") messages.push(d.message()); await d.accept(); });
    const clickLogout = async () => {
      if (role === "USER") { await page.getByTitle("Account Menu").click(); await page.getByRole("button", { name: "Log Out", exact: true }).click(); }
      else { await page.getByRole("button", { name: "Sign Out", exact: true }).click(); await page.getByRole("alertdialog").getByRole("button", { name: "Confirm", exact: true }).click(); }
    };
    await clickLogout();
    await expect(page.getByRole("alert")).toContainText("not confirmed");
    expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-session");
    state.logout = "ok"; await clickLogout();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem("knoxite_token"))).toBeNull();
    await expect(page).not.toHaveURL(/dashboard$/);
  });
}

test("forbidden responses retain the session; configured API boundary rejects credential leakage", async ({ page }) => {
  await fixture(page); await page.goto("/dashboard");
  await page.route("**/api/forbidden", (route) => route.fulfill({ status: 403, json: { error: "Forbidden" } }));
  const errors = await page.evaluate(async () => {
    const client = await import(String("/src/app/lib/api.ts"));
    const forbidden = await client.api("/forbidden").catch((e: Error) => e.message);
    const foreign = await client.authenticatedFetch("https://foreign.invalid/api/private").catch((e: Error) => e.message);
    return { forbidden, foreign };
  });
  expect(errors.forbidden).toBe("Forbidden"); expect(errors.foreign).toContain("configured Knoxite API");
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBe("synthetic-session");
});
