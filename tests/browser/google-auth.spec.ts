import { test, expect, Page, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
const legalNotices = JSON.parse(readFileSync("src/app/content/legal-notices.json", "utf8"));
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
    longIdentity?: boolean;
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
          name: settings.longIdentity ? "Synthetic Student With A Very Long Display Name For Mobile Layout Testing" : "Synthetic Google name",
          email: settings.longIdentity ? "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz1234lag@student.fatima.edu.ph" : "syntheticlag@fixture.example",
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
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("heading",{name:"Account created",exact:true})).toBeVisible();
  await expect(page.getByRole("status")).toContainText("verification delivery is unavailable");
  const body = f.calls.find((c) => c.path.endsWith("/register"))!.body;
  expect(Object.keys(body).sort()).toEqual(["name", "email", "password", "programId", "yearLevelId", "termsAccepted", "noticeVersion"].sort());
  expect(body).toMatchObject({ programId: "program", yearLevelId: "year",termsAccepted:true,noticeVersion:"DRAFT_TEST_NOTICE_v1" });
  await page.getByRole("button",{name:"Continue to Sign In",exact:true}).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration stays unavailable without consent configuration while existing sign-in remains usable",async({page})=>{
  const f=await fixture(page,{enabled:false,consentUnavailable:true});await page.goto("/signup");
  await expect(page.getByText("New registration is unavailable until the reviewed notice and consent storage are configured. Existing accounts can still sign in.",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Create Account",exact:true})).toBeDisabled();
  expect(f.calls.filter(c=>c.path.endsWith("/register"))).toHaveLength(0);
  await page.goto("/login");await expect(page.getByLabel("Email Address",{exact:true})).toBeEnabled();await expect(page.getByLabel("Password",{exact:true})).toBeEnabled();
});


test.describe("Google college profile signup presentation", () => {
  // Chromium touch/device emulation; no real Google or protected API is used.
  test.use({ isMobile: true, hasTouch: true, userAgent: devices["Pixel 7"].userAgent });
  for (const width of [320, 375, 390, 430, 1280]) {
    test(`signup styling and overflow at ${width}px in both themes and entry routes`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await fixture(page, { onboarding: true, longIdentity: true });
      for (const path of ["/signup", "/login"]) {
        for (const dark of [false, true]) {
          await page.goto(path);
          await page.evaluate(dark => {
            document.documentElement.classList.toggle("dark", dark);
            document.documentElement.style.colorScheme = dark ? "dark" : "light";
          }, dark);
          const baseline = path === "/signup" ? await page.getByLabel("Full Name", { exact: true }).evaluate(el => {
            const s = getComputedStyle(el); return { height: s.height, radius: s.borderRadius, padding: s.padding };
          }) : null;
          await page.getByRole("button", { name: path === "/signup" ? "Continue with Google" : "Sign in with Google", exact: true }).click();
          const form = page.getByRole("form", { name: "Complete your college profile" });
          await expect(form).toBeVisible();
          if (dark) {
            // The existing signup/login cards are light: the dark form must
            // supply its own surface so pale labels and consent stay readable.
            expect(await form.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
          }
          await expect(form.locator('input[type="password"]')).toHaveCount(0);
          const name = form.getByLabel("Display name", { exact: true });
          await expect(name).toHaveValue("Synthetic Student With A Very Long Display Name For Mobile Layout Testing");
          if (baseline) expect(await name.evaluate(el => {
            const s = getComputedStyle(el); return { height: s.height, radius: s.borderRadius, padding: s.padding };
          })).toEqual(baseline);
          for (const field of ["Display name", "College program", "Year level"]) {
            const control = form.getByLabel(field, { exact: true });
            await control.focus();
            await expect(control).toBeFocused();
            const box = await control.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(width);
          }
          for (const [text, document] of [["Terms of Service", "summary"], ["Privacy Policy", "account"]] as const) {
            await form.getByRole("button", { name: text, exact: true }).click();
            const dialog = page.getByRole("dialog");
            await expect(dialog).toBeVisible();
            for (const section of legalNotices[document]) {
              await expect(dialog.getByRole("heading", { name: section.heading, exact: true })).toBeAttached();
              for (const paragraph of section.paragraphs) await expect(dialog.getByText(paragraph, { exact: true })).toBeAttached();
            }
            const scroll = dialog.getByLabel("Policy content");
            await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
            await expect(dialog.getByRole("button", { name: "Back to form" })).toBeInViewport();
            const box = await dialog.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.y).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(width);
            expect(box!.y + box!.height).toBeLessThanOrEqual(900);
            if (document === "summary") await page.keyboard.press("Escape");
            else await dialog.getByRole("button", { name: "Back to form" }).click();
            await expect(dialog).toHaveCount(0);
            await expect(form.getByRole("checkbox")).not.toBeChecked();
            await expect(name).toHaveValue("Synthetic Student With A Very Long Display Name For Mobile Layout Testing");
            await expect(page).toHaveURL(new RegExp(`${path}$`));
          }
          const create = form.getByRole("button", { name: "Create college profile" });
          const cancel = form.getByRole("button", { name: "Cancel Google sign-up" });
          const contentWidth = await form.evaluate(el => {
            const s = getComputedStyle(el);
            return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          });
          for (const button of [create, cancel]) {
            expect((await button.boundingBox())!.width).toBeCloseTo(contentWidth, 0);
            await button.scrollIntoViewIfNeeded();
            await expect(button).toBeInViewport();
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          expect(await form.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
          if (width === 390 && path === "/signup") {
            await form.screenshot({ path: testInfo.outputPath(`google-profile-${dark ? "dark" : "light"}.png`) });
          }
          await cancel.click();
          await expect(form).toHaveCount(0);
          await expect(page.getByRole("button", { name: path === "/signup" ? "Create Account" : "Sign in", exact: true })).toBeVisible();
        }
      }
    });
  }
});


test("email signup legal reader preserves data and requires independent consent", async ({ page }) => {
  const refWarnings:string[]=[];
  page.on("console",message=>{if(/Function components cannot be given refs/.test(message.text()))refWarnings.push(message.text());});
  const f = await fixture(page, { enabled: false });
  await page.goto("/signup");
  await page.getByLabel("Full Name", { exact: true }).fill("Synthetic Preserved Student");
  for (const [text, document] of [["Terms of Service", "summary"], ["Privacy Policy", "account"]] as const) {
    await page.getByRole("button", { name: text, exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (const section of legalNotices[document]) {
      for (const paragraph of section.paragraphs) await expect(dialog.getByText(paragraph, { exact: true })).toBeAttached();
    }
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("Synthetic Preserved Student");
  }
  await page.getByRole("checkbox").check();
  const privacy = page.getByRole("button", { name: "Privacy Policy", exact: true });
  await privacy.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Visibility can precede Radix's focus setup and Escape listener registration.
  await expect(dialog.getByLabel("Policy content")).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(privacy).toBeFocused();

  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page.getByLabel("Full Name", { exact: true })).toHaveValue("Synthetic Preserved Student");
  expect(f.calls.some(c => c.path.endsWith("/register"))).toBe(false);
  expect(refWarnings).toEqual([]);
});

test("standalone privacy uses identical disclosures and safe direct-entry navigation", async ({ page }) => {
  await fixture(page, { enabled: false });
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/privacy");
    for (const dark of [false, true]) {
      await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
      for (const section of legalNotices.account) {
        for (const paragraph of section.paragraphs) await expect(page.getByText(paragraph, { exact: true })).toBeAttached();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page).toHaveURL(/\/signup$/);
  }
});


test.describe("registration legal final checks", () => {
  test.use({ isMobile: true, hasTouch: true, userAgent: devices["Pixel 7"].userAgent });
  test("regular form and reader fit all widths, retain consent and restore focus", async ({ page }, testInfo) => {
    await fixture(page, { enabled: false });
    for (const width of [320, 375, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 640 });
      await page.goto("/signup");
      for (const dark of [false, true]) {
        await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const label of ["Full Name", "Email Address", "Password", "Confirm Password", "College program", "Year level"]) {
          const box = await page.getByLabel(label, { exact: true }).boundingBox();
          expect(box!.x).toBeGreaterThanOrEqual(0);
          expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        }
        const opener = page.getByRole("button", { name: "Privacy Policy", exact: true });
        await opener.click();
        const dialog = page.getByRole("dialog");
        const body = dialog.getByLabel("Policy content");
        await body.focus();
        await page.keyboard.press("End");
        await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
        expect(await body.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        await expect(dialog.getByRole("heading", { name: "Privacy and account information", exact: true })).toBeInViewport();
        await expect(dialog.getByRole("button", { name: "Back to form", exact: true })).toBeInViewport();
        if (width === 390) await dialog.screenshot({ path: testInfo.outputPath(`privacy-reader-${dark ? "dark" : "light"}.png`) });
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        await expect(page.getByRole("checkbox")).not.toBeChecked();
      }
    }
  });
  test("Google submission loading and error preserve academics and explicit consent", async ({ page }) => {
    await fixture(page, { onboarding: true });
    let releaseIdentity!: () => void;
    const identityPending = new Promise<void>(resolve => { releaseIdentity = resolve; });
    await page.route("**/api/auth/google/login", async route => {
      await identityPending;
      await route.fallback();
    });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/auth/google/onboard", async route => {
      await pending;
      await route.fulfill({ status: 400, json: { error: "Synthetic onboarding validation error" } });
    });
    try {
      await page.goto("/signup");
      await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
      const form = page.getByRole("form", { name: "Complete your college profile", exact: true });
      await expect(form).toHaveCount(0);
      releaseIdentity();
      await expect(form).toBeVisible();
      // The regular signup has identically named fields. Wait for the actual
      // Google form and its asynchronous options, not the outgoing email form.
      await form.getByLabel("College program", { exact: true }).selectOption("program");
      await expect(form.getByLabel("Year level", { exact: true }).locator('option[value="year"]')).toHaveCount(1);
      await form.getByLabel("Year level", { exact: true }).selectOption("year");
      await form.getByRole("checkbox").check();
      const submitted = page.waitForRequest(request => request.url().endsWith("/api/auth/google/onboard") && request.method() === "POST");
      await form.getByRole("button", { name: "Create college profile" }).click();
      expect((await submitted).postDataJSON()).toMatchObject({ programId: "program", yearLevelId: "year", termsAccepted: true, noticeVersion: "DRAFT_TEST_NOTICE_v1" });
      await expect(form.getByRole("button", { name: "Create college profile" })).toBeDisabled();
      await expect(form.getByRole("button", { name: "Cancel Google sign-up" })).toBeDisabled();
      await expect(page.getByRole("status")).toContainText("Checking Google sign-in");
      release();
      await expect(page.getByRole("alert")).toContainText("Synthetic onboarding validation error");
      await expect(form.getByLabel("College program", { exact: true })).toHaveValue("program");
      await expect(form.getByLabel("Year level", { exact: true })).toHaveValue("year");
      await expect(form.getByRole("checkbox")).toBeChecked();
      await expect(form.getByRole("button", { name: "Create college profile" })).toBeEnabled();
    } finally {
      releaseIdentity();
      release();
    }
  });
});


test("signup password visibility has a labeled touch target and preserves entered values",async({page})=>{
  await fixture(page,{enabled:false});await page.setViewportSize({width:320,height:740});await page.goto("/signup");
  const password=page.getByLabel("Password",{exact:true}),confirmation=page.getByLabel("Confirm Password",{exact:true});
  await password.fill("synthetic-ui-password");await confirmation.fill("synthetic-ui-password");
  const show=page.getByRole("button",{name:"Show passwords",exact:true});
  const box=await show.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  await show.click();await expect(password).toHaveAttribute("type","text");await expect(confirmation).toHaveAttribute("type","text");
  const hide=page.getByRole("button",{name:"Hide passwords",exact:true});await expect(hide).toHaveAttribute("aria-pressed","true");
  await hide.focus();await page.keyboard.press("Enter");await expect(password).toHaveAttribute("type","password");
  await expect(password).toHaveValue("synthetic-ui-password");await expect(confirmation).toHaveValue("synthetic-ui-password");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


for(const entry of ["/signup","/login"])test(`Google restart clears consent and academic choices at ${entry}`,async({page})=>{
  await fixture(page,{onboarding:true});let identity=0;
  await page.route("**/api/auth/google/login",route=>route.fulfill({json:{requiresOnboarding:true,onboardingId:`synthetic-${++identity}`,name:`Synthetic Student ${identity}`,email:`student-${identity}@fixture.test`}}));
  await page.goto(entry);
  const google=()=>page.getByRole("button",{name:entry==="/signup"?"Continue with Google":"Sign in with Google",exact:true});
  await google().click();
  await expect(page.getByRole("heading",{name:"Complete your college profile",exact:true})).toBeVisible();
  await page.getByLabel("College program",{exact:true}).selectOption("program");
  await page.getByLabel("Year level",{exact:true}).selectOption("year");await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Cancel Google sign-up"}).click();await google().click();
  await expect(page.getByLabel("Display name",{exact:true})).toHaveValue("Synthetic Student 2");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByLabel("College program",{exact:true})).toHaveValue("");
  await expect(page.getByLabel("Year level",{exact:true})).toHaveValue("");
});


test("slow provider discovery shows loading instead of incorrectly declaring Google unavailable",async({page})=>{
  await fixture(page);let release!:()=>void;const wait=new Promise<void>(resolve=>release=resolve);
  await page.route("**/api/auth/providers",async route=>{await wait;await route.fulfill({json:{google:{enabled:true,clientId:"synthetic.apps.googleusercontent.com"}}});});
  await page.goto("/signup");
  await expect(page.getByRole("button",{name:"Checking Google availability...",exact:true})).toBeDisabled();
  await expect(page.getByText("Google Sign-In is unavailable in this environment. Use email and password.",{exact:true})).toHaveCount(0);
  await expect(page.getByLabel("Email Address",{exact:true})).toBeEnabled();
  release();await expect(page.getByRole("button",{name:"Continue with Google",exact:true})).toBeEnabled();
});

test("a transient provider failure can be retried without changing backend Google gates",async({page})=>{
  const f=await fixture(page);let calls=0;
  await page.route("**/api/auth/providers",route=>++calls===1?route.fulfill({status:503,json:{error:"Synthetic temporary outage"}}):route.fulfill({json:{google:{enabled:true,clientId:"synthetic.apps.googleusercontent.com"}}}));
  await page.goto("/login");await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  expect(f.sdkRequests()).toBe(0);
  await page.getByRole("button",{name:"Retry Google availability",exact:true}).click();
  await expect(page.getByRole("button",{name:"Sign in with Google",exact:true})).toBeEnabled();expect(calls).toBe(2);
  expect(f.calls.filter(c=>c.path.endsWith("/google/login"))).toHaveLength(0);
});

test("missing Google client configuration fails closed and an intentionally disabled provider stays disabled",async({page})=>{
  const f=await fixture(page);
  await page.route("**/api/auth/providers",route=>route.fulfill({json:{google:{enabled:true}}}));
  await page.goto("/signup");await expect(page.getByRole("alert")).toContainText("temporarily unavailable");expect(f.sdkRequests()).toBe(0);
  await page.route("**/api/auth/providers",route=>route.fulfill({json:{google:{enabled:false}}}));
  await page.getByRole("button",{name:"Retry Google availability",exact:true}).click();
  await expect(page.getByRole("button",{name:"Continue with Google",exact:true})).toBeDisabled();
  await expect(page.getByRole("button",{name:"Retry Google availability",exact:true})).toHaveCount(0);expect(f.sdkRequests()).toBe(0);
});

test("email and institutional Google signup show exactly identical legal documents without accepting consent",async({page})=>{
  await fixture(page,{onboarding:true});await page.goto("/signup");const documents:Record<string,string>={};
  for(const title of ["Terms of Service","Privacy Policy"]){
    await page.getByRole("button",{name:title,exact:true}).click();
    documents[title]=await page.getByRole("dialog").getByLabel("Policy content").innerText();
    await page.getByRole("dialog").getByRole("button",{name:"Back to form",exact:true}).click();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
  }
  await page.getByRole("button",{name:"Continue with Google",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Complete your college profile"})).toBeVisible();
  for(const title of ["Terms of Service","Privacy Policy"]){
    await page.getByRole("button",{name:title,exact:true}).click();
    expect(await page.getByRole("dialog").getByLabel("Policy content").innerText()).toBe(documents[title]);
    await page.getByRole("dialog").getByRole("button",{name:"Back to form",exact:true}).click();
    await expect(page.getByRole("checkbox")).not.toBeChecked();
  }
});

test("Google college-options failure retries without discarding the verified onboarding identity",async({page})=>{
  const f=await fixture(page,{onboarding:true});let reads=0;
  await page.route("**/api/auth/academic-options",route=>{reads++;return reads===2?route.fulfill({status:503,json:{error:"Synthetic college options temporarily unavailable"}}):reads===3?route.fulfill({json:{programs:"malformed",yearLevels:[{id:"year"}]}}):route.fallback();});
  await page.goto("/signup");await page.getByRole("button",{name:"Continue with Google",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Complete your college profile"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry college options",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Create college profile",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Retry college options",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("not available yet");
  await page.getByRole("button",{name:"Retry college options",exact:true}).click();
  await expect(page.getByRole("button",{name:"Retry college options",exact:true})).toHaveCount(0);
  await expect(page.getByLabel("Display name",{exact:true})).toHaveValue("Synthetic Google name");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(f.calls.filter(c=>c.path.endsWith("/google/login"))).toHaveLength(1);
  expect(f.calls.filter(c=>c.path.endsWith("/google/onboard"))).toHaveLength(0);
});
