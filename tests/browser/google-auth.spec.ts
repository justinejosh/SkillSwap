import { test, expect, Page } from "@playwright/test";

async function fixture(
  page: Page,
  settings: {
    enabled?: boolean;
    onboarding?: boolean;
    security?: boolean;
    hasPassword?: boolean;
    linked?: boolean;
    error?: string;
    sdkFails?: boolean;
  } = {},
) {
  const calls: { path: string; body: any }[] = [];
  let linked = settings.linked || false;
  let sdkRequests = 0;
  if (settings.security)
    await page.addInitScript(() => {
      localStorage.setItem("knoxite_token", "synthetic-session");
      localStorage.setItem(
        "knoxite_user",
        JSON.stringify({ id: "owner", role: "USER" }),
      );
    });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") {
      await route.continue();
      return;
    }
    if (url.href === "https://accounts.google.com/gsi/client") {
      sdkRequests++;
      if (settings.sdkFails) {
        await route.abort();
        return;
      }
      await route.fulfill({
        contentType: "application/javascript",
        body: `window.google={accounts:{id:{initialize:function(o){window.__googleOptions=o},renderButton:function(el){const b=document.createElement('button');b.type='button';b.textContent='Sign in with Google';b.onclick=function(){window.__googleOptions.callback({credential:'synthetic-google-id-token'})};el.appendChild(b)}}}};`,
      });
      return;
    }
    if (url.origin !== "http://127.0.0.1:5009") {
      await route.abort();
      return;
    }
    const path = url.pathname;
    const body = route.request().postDataJSON();
    if (route.request().method() !== "GET") calls.push({ path, body });
    const ok = (json: any) => route.fulfill({ json });
    if (path === "/api/auth/providers")
      return ok({
        google: {
          enabled: settings.enabled !== false,
          clientId: "synthetic.apps.googleusercontent.com",
        },
      });
    if (path === "/api/auth/recovery-options")
      return ok({ emailDeliveryAvailable: false });
    if (
      path === "/api/auth/google/challenge" ||
      path === "/api/auth/google/link/challenge"
    )
      return ok({ challengeId: "synthetic-challenge", nonce: "n".repeat(43) });
    if (path === "/api/auth/google/login") {
      if (settings.error)
        return route.fulfill({ status: 409, json: { error: settings.error } });
      if (settings.onboarding)
        return ok({
          requiresOnboarding: true,
          onboardingId: "pending",
          name: "Synthetic Google name",
          email: "syntheticlag@fixture.example",
        });
      return ok({
        token: "synthetic-knoxite-session",
        user: { id: "owner", name: "Existing Student", role: "USER" },
      });
    }
    if (path === "/api/auth/google/onboard")
      return ok({
        token: "synthetic-knoxite-session",
        user: { id: "owner", role: "USER", name: body.name },
      });
    if (path === "/api/auth/google/link") {
      linked = true;
      return ok({ message: "Google linked" });
    }
    if (path === "/api/auth/methods")
      return ok({
        hasPassword: settings.hasPassword !== false,
        email: "syntheticlag@fixture.example",
        googleEnabled: true,
        googleLinked: linked,
      });
    if (path === "/api/auth/sessions") return ok([]);
    if (path === "/api/profile")
      return ok({
        id: "owner",
        role: "USER",
        name: "Existing Student",
        email: "syntheticlag@fixture.example",
        offeredSkills: [],
        wantedSkills: [],
        metrics: {},
      });
    if (path === "/api/auth/academic-options")
      return ok({
        programs: [
          {
            id: "program",
            label: "BSCS",
            yearLevels: [{ id: "year", name: "1st Year" }],
          },
        ],
        yearLevels: [{ id: "year", name: "1st Year" }],
      });
    if (path === "/api/auth/request-password-reset")
      return route.fulfill({
        status: 503,
        json: { error: "Email delivery is not configured." },
      });
    return ok(path.endsWith("stats") ? {} : []);
  });
  return { calls, sdkRequests: () => sdkRequests };
}

test("default-off Google does not load its SDK and password sign-in remains available", async ({
  page,
}) => {
  const f = await fixture(page, { enabled: false });
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with Google", exact: true }),
  ).toHaveCount(0);
  expect(f.sdkRequests()).toBe(0);
  expect(f.calls).toHaveLength(0);
});
test("approved Google login exchanges an ID credential for a Knoxite session without storing Google tokens", async ({
  page,
}) => {
  const f = await fixture(page);
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(storage.knoxite_token).toBe("synthetic-knoxite-session");
  expect(JSON.stringify(storage)).not.toContain("synthetic-google-id-token");
  expect(
    f.calls.find((c) => c.path.endsWith("/google/login"))?.body.browserProof,
  ).toMatch(/^[A-Za-z0-9_-]{43}$/);
});
test("Google onboarding requires standardized academics and terms before account creation", async ({
  page,
}) => {
  const f = await fixture(page, { onboarding: true });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Complete your college profile" }),
  ).toBeVisible();
  expect(f.calls.some((c) => c.path.endsWith("/onboard"))).toBe(false);
  await page
    .getByLabel("College program", { exact: true })
    .selectOption("program");
  await page.getByLabel("Year level", { exact: true }).selectOption("year");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create college profile" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(f.calls.find((c) => c.path.endsWith("/onboard"))?.body).toMatchObject({
    programId: "program",
    yearLevelId: "year",
    termsAccepted: true,
  });
});
test("existing email collisions explain explicit linking and leave password recovery usable", async ({
  page,
}) => {
  await fixture(page, {
    error:
      "Sign in using your existing method, then link Google in Account security.",
  });
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("existing method");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(page).toHaveURL(/\/recover-account$/);
});
test("Google sign-up uses one academic form and cancellation restores password registration", async ({
  page,
}) => {
  await fixture(page, { onboarding: true });
  await page.goto("/signup");
  await page
    .getByLabel("Full Name", { exact: true })
    .fill("Preserved typed name");
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Complete your college profile" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "College program", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel Google sign-up" }).click();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue(
    "Preserved typed name",
  );
  await expect(
    page.getByRole("button", { name: "Create Account", exact: true }),
  ).toBeVisible();
});
test("linking requires a current password and preserves the active existing account", async ({
  page,
}) => {
  const f = await fixture(page, { security: true });
  await page.goto("/security");
  await expect(
    page.getByRole("button", { name: "Confirm password to link Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with Google", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Current Knoxite password", { exact: true })
    .fill("synthetic-local-password");
  await page
    .getByRole("button", { name: "Confirm password to link Google" })
    .click();
  await page
    .getByRole("button", { name: "Sign in with Google", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "existing account and history are preserved",
  );
  expect(
    f.calls.find((c) => c.path.endsWith("/link/challenge"))?.body
      .currentPassword,
  ).toBe("synthetic-local-password");
  expect(
    f.calls.find((c) => c.path.endsWith("/google/link"))?.body.currentPassword,
  ).toBeUndefined();
});
test("Google-only account cannot unlink before establishing a password fallback", async ({
  page,
}) => {
  await fixture(page, { security: true, hasPassword: false, linked: true });
  await page.goto("/security");
  await expect(
    page.getByText(
      "Set up your email/password fallback before unlinking Google.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unlink Google and sign out" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Send password setup link" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email delivery is not configured",
  );
});
test("blocked Google SDK leaves password authentication available", async ({
  page,
}) => {
  await fixture(page, { sdkFails: true });
  await page.goto("/login");
  await expect(page.getByRole("alert")).toContainText(
    "Google Sign-In is unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
