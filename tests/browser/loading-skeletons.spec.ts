import { test, expect, Page, devices } from "@playwright/test";

async function fixture(page: Page) {
  const counts = new Map<string, number>();
  const holds = new Map<string, { after: number; wait: Promise<void>; release: () => void }>();
  const state = { expired: false, failed: false, name: "Private Synthetic Name" };
  await page.addInitScript(() => {
    localStorage.setItem("knoxite_token", "synthetic-loader-session");
    localStorage.setItem("knoxite_user", JSON.stringify({ id: "loader-student", role: "USER", name: "Private Cached Name" }));
    localStorage.setItem("knoxite_onboarding_completed", "true");
  });
  await page.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.origin === "http://127.0.0.1:5174") return route.continue();
    if (u.origin !== "http://127.0.0.1:5009") return route.abort();
    const p = u.pathname.replace(/\/$/, "");
    const n = (counts.get(p) || 0) + 1; counts.set(p, n);
    const hold = holds.get(p); if (hold && n > hold.after) await hold.wait;
    if (state.expired) return route.fulfill({ status: 401, json: { error: "Synthetic session expired" } });
    if (state.failed && holds.has(p)) return route.fulfill({ status: 503, json: { error: "Synthetic data unavailable" } });
    if (p === "/api/profile") return route.fulfill({ json: { id: "loader-student", role: "USER", name: state.name, email: "student@fixture.test", programId: "program", yearLevelId: "year", avatarUrl: null, offeredSkills: [], wantedSkills: [], metrics: { averageRating: null, completedSwaps: 0 } } });
    if (p === "/api/profile/update") { state.name = route.request().postDataJSON().name; return route.fulfill({ json: {} }); }
    if (p === "/api/auth/session-status") return route.fulfill({ json: { enabled: false } });
    if (p === "/api/auth/providers") return route.fulfill({ json: { google: { enabled: false } } });
    if (p === "/api/auth/recovery-options") return route.fulfill({ json: { emailDeliveryAvailable: false } });
    if (p === "/api/profile/skill-catalog") return route.fulfill({ json: { presets: [] } });
    if (p === "/api/academic-options") return route.fulfill({ json: { programs: [{ id: "program", label: "Synthetic Program", yearLevels: [{ id: "year", name: "1st Year" }] }], yearLevels: [{ id: "year", name: "1st Year" }] } });
    if (p === "/api/leaderboard") return route.fulfill({ json: { topMentors: [], viewer: { eligible: false } } });
    return route.fulfill({ json: [] });
  });
  function hold(path: string, after = 0) {
    let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
    holds.set(path, { after, wait, release }); return release;
  }
  return { state, counts, hold };
}

test("initial authentication is a neutral skeleton and an expired session never reveals private UI", async ({ page }) => {
  const f = await fixture(page); const release = f.hold("/api/profile");
  await page.goto("/dashboard");
  const loading = page.getByRole("status", { name: "Checking your session...", exact: true });
  await expect(loading).toHaveAttribute("data-loading-layout", "neutral");
  await expect(loading.locator('[data-slot="skeleton"]').first()).toBeVisible();
  await expect(page.getByTitle("Account Menu")).toHaveCount(0);
  await expect(page.getByText(/Private (Cached|Synthetic) Name/)).toHaveCount(0);
  f.state.expired = true; release();
  await expect(page).toHaveURL(/\/login$/); await expect(page.locator('[data-loading-layout]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("knoxite_token"))).toBeNull();
});

for (const item of [
  { route: "/dashboard", path: "/api/swaps", after: 0, layout: "dashboard", label: "Loading dashboard..." },
  { route: "/knox-hub", path: "/api/matches", after: 0, layout: "cards", label: "Loading matches..." },
  { route: "/my-skills", path: "/api/profile", after: 1, layout: "cards", label: "Loading your skills..." },
  { route: "/profile", path: "/api/profile", after: 1, layout: "profile", label: "Loading your profile..." },
  { route: "/chat", path: "/api/swaps", after: 0, layout: "messages", label: "Loading conversations..." },
]) test(`${item.route} retains its header with responsive reduced-motion placeholders until data arrives`, async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await fixture(page); const release = f.hold(item.path, item.after);
  try {
    await page.goto(item.route); const loading = page.getByRole("status", { name: item.label, exact: true });
    await expect(loading).toHaveAttribute("data-loading-layout", item.layout);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header button").first()).toBeVisible();
    for (const width of [320, 375, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 840 });
      for (const dark of [false, true]) {
        await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
        const shape = loading.locator('[data-slot="skeleton"]').first(); await expect(shape).toBeVisible();
        expect(await shape.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 390) await page.screenshot({ path: info.outputPath(`loading-${dark ? "dark" : "light"}.png`) });
      }
    }
    release(); await expect(loading).toHaveCount(0);
    if (item.route === "/chat") await expect(page.getByRole("heading", { name: "No Active Swaps Yet" })).toBeVisible();
    if (item.route === "/profile") await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue("Private Synthetic Name");
    expect(f.counts.get("/api/auth/session-status")).toBe(1);
  } finally { release(); }
});

test("profile background refresh keeps the authorized form visible without a new skeleton", async ({ page }) => {
  const f = await fixture(page); await page.goto("/profile");
  await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue("Private Synthetic Name");
  const release = f.hold("/api/profile", 2);
  try {
    await page.getByLabel("Display Name", { exact: true }).fill("Updated Synthetic Name");
    await page.getByRole("button", { name: "Save Profile Configuration", exact: true }).click();
    await expect(page.getByText("Profile updated.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue("Updated Synthetic Name");
    await expect(page.locator('[data-loading-layout]')).toHaveCount(0);
  } finally { release(); }
});

test("loading conversations resolves to an error and retry, rather than a false empty state", async ({ page }) => {
  const f = await fixture(page); const release = f.hold("/api/swaps");
  await page.goto("/chat"); await expect(page.getByRole("status", { name: "Loading conversations..." })).toBeVisible();
  f.state.failed = true; release();
  await expect(page.getByRole("heading", { name: "Unable to load conversations" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Synthetic data unavailable");
  await expect(page.getByRole("heading", { name: "No Active Swaps Yet" })).toHaveCount(0);
  await expect(page.locator('[data-loading-layout]')).toHaveCount(0);
  f.state.failed = false; await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Active Swaps Yet" })).toBeVisible();
});

test.describe("Android Chrome skeleton navigation", () => {
  test.use({ viewport: devices["Pixel 7"].viewport, userAgent: devices["Pixel 7"].userAgent, deviceScaleFactor: devices["Pixel 7"].deviceScaleFactor, isMobile: true, hasTouch: true });
  test("the real header remains usable while page data is pending", async ({ page }) => {
    const f = await fixture(page); const release = f.hold("/api/profile", 1);
    try {
      await page.goto("/my-skills"); await expect(page.getByRole("status", { name: "Loading your skills..." })).toBeVisible();
      await page.getByTitle("Back to Dashboard").tap(); await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByTitle("Account Menu")).toBeVisible(); expect(f.counts.get("/api/auth/session-status")).toBe(1);
    } finally { release(); }
  });
});
