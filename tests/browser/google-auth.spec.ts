import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const academicCatalog = JSON.parse(readFileSync("knoxite-backend/config/academic-catalog.json", "utf8"));

async function fixture(
  page: Page,
  settings: {
    enabled?: boolean;
    onboarding?: boolean;
    security?: boolean;
    hasPassword?: boolean;
    linked?: boolean;
    error?: string;
    errorStatus?: number;
    sdkFails?: boolean;
    consentUnavailable?: boolean;
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
        body: `window.google={accounts:{id:{initialize:function(o){window.__googleOptions=o},renderButton:function(el,opts){const b=document.createElement('button');b.type='button';b.textContent=opts.text==='continue_with'?'Continue with Google':'Sign in with Google';b.onclick=function(){window.__googleOptions.callback({credential:'synthetic-google-id-token'})};el.appendChild(b)}}}};`,
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
    if (path === "/api/auth/register")
      return ok({ verificationSent: false, message: "Account created, but verification delivery is unavailable. Request verification again when delivery is restored." });
    if (
      path === "/api/auth/google/challenge" ||
      path === "/api/auth/google/link/challenge"
    )
      return ok({ challengeId: "synthetic-challenge", nonce: "n".repeat(43) });
    if (path === "/api/auth/google/login") {
      if (settings.error)
        return route.fulfill({ status: settings.errorStatus || 409, json: { error: settings.error } });
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
        registrationPolicy: {available:!settings.consentUnavailable,noticeVersion:settings.consentUnavailable?null:"DRAFT_TEST_NOTICE_v1",approved:false},
        programs: academicCatalog.programs.map((p: any) => ({ id: p.code === "BSCS" ? "program" : p.code, label: p.label,
          yearLevels: (["BSIT", "BSIHM-CA", "BSIHM-HACLO"].includes(p.code) ? [academicCatalog.yearLevels[0]] : academicCatalog.yearLevels).map((y: any) => ({ id: y.code === "YEAR_1" ? "year" : y.code, name: y.name })) })),
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
  ).toBeDisabled();
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
    .getByRole("button", { name: "Continue with Google", exact: true })
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

test("disabled Google signup preserves the complete email form and desktop readability", async ({ page }) => {
  const f = await fixture(page, { enabled: false }); await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeDisabled();
  for (const name of ["Full Name", "Email Address", "Password", "Confirm Password"])
    await expect(page.getByLabel(name, { exact: true })).toBeVisible();
  await expect(page.getByLabel("College program", { exact: true }).locator("option")).toHaveCount(14);
  expect(f.sdkRequests()).toBe(0);
  const width = await page.locator('[data-slot="card"]').evaluate((el) => el.getBoundingClientRect().width);
  if (page.viewportSize()!.width > 768) expect(width).toBeGreaterThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("signup Google alternative needs no Knoxite password and preserves first-year-only onboarding", async ({ page }) => {
  const f = await fixture(page, { onboarding: true }); await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Complete your college profile" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  const programs = page.getByLabel("College program", { exact: true });
  await expect(programs.locator("option")).toHaveCount(14);
  for (const code of ["BSIT", "BSIHM-CA", "BSIHM-HACLO"]) {
    await programs.selectOption(code);
    await expect(page.getByLabel("Year level", { exact: true }).locator("option")).toHaveCount(2);
  }
  await page.getByLabel("Year level", { exact: true }).selectOption("year");
  await page.getByRole("button", { name: "Create college profile", exact: true }).click();
  expect(f.calls.some((c) => c.path.endsWith("/onboard"))).toBe(false);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create college profile", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const body = f.calls.find((c) => c.path.endsWith("/onboard"))!.body;
  expect(body).toMatchObject({ programId: "BSIHM-HACLO", yearLevelId: "year", termsAccepted: true });
  for (const key of ["password", "email", "subject", "emailVerifiedAt"]) expect(body[key]).toBeUndefined();
});

test("institutional Google rejection leaves explicit email sign-in and recovery available", async ({ page }) => {
  await fixture(page, { errorStatus: 403, error: "Use an eligible institutional Google Workspace account under the approved Santa Rosa college-student policy." });
  await page.goto("/login"); await page.getByRole("button", { name: "Sign in with Google", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("eligible institutional");
  await expect(page.getByRole("heading", { name: "Sign in with Email", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Forgot password?", exact: true })).toBeVisible();
});

test("email registration preserves existing fields and honestly reports unavailable verification", async ({ page }) => {
  const f = await fixture(page, { enabled: false }); await page.goto("/signup");
  await page.getByLabel("Full Name", { exact: true }).fill("Synthetic Registration Student");
  await page.getByLabel("Email Address", { exact: true }).fill("aasample1234lag@student.fatima.edu.ph");
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password-only");
  await page.getByLabel("Confirm Password", { exact: true }).fill("synthetic-password-only");
  await page.getByLabel("College program", { exact: true }).selectOption("program");
  await page.getByLabel("Year level", { exact: true }).selectOption("year");
  await page.getByRole("checkbox").check();
  let notice = "";
  page.once("dialog", async dialog => { notice = dialog.message(); await dialog.accept(); });
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect.poll(() => notice).toContain("verification delivery is unavailable");
  const body = f.calls.find((c) => c.path.endsWith("/register"))!.body;
  expect(Object.keys(body).sort()).toEqual(["name", "email", "password", "programId", "yearLevelId", "termsAccepted", "noticeVersion"].sort());
  expect(body).toMatchObject({ programId: "program", yearLevelId: "year",termsAccepted:true,noticeVersion:"DRAFT_TEST_NOTICE_v1" });
});

test("registration stays unavailable without consent configuration while existing sign-in remains usable",async({page})=>{
  const f=await fixture(page,{enabled:false,consentUnavailable:true});await page.goto("/signup");
  await expect(page.getByText("New registration is unavailable until the reviewed notice and consent storage are configured. Existing accounts can still sign in.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Create Account",exact:true})).toBeDisabled();
  expect(f.calls.filter(c=>c.path.endsWith("/register"))).toHaveLength(0);
  await page.goto("/login");await expect(page.getByLabel("Email Address",{exact:true})).toBeEnabled();await expect(page.getByLabel("Password",{exact:true})).toBeEnabled();
});
