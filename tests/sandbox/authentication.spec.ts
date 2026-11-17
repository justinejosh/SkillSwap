import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { privateSandbox } from "./state";
for (const autofill of [false, true])
  test(`seeded Alice login ${autofill ? "with incorrect frontend API configuration" : "with generated credentials"}`, async ({
    page,
    request,
  }) => {
    const { settings, api, directApi } = privateSandbox();
    const alice = settings.accounts.find(
      (a: any) => a.email === "alicelag@students.knoxite.test",
    );
    expect(!!alice).toBe(true);
    const status = await (
      await request.get(directApi + "/__synthetic/status")
    ).json();
    expect(status.instanceId === settings.instanceId).toBe(true);
    const unexpectedOrigins: string[] = [];
    await page.route("**/*", (route) => {
      const origin = new URL(route.request().url()).origin;
      if (["http://localhost:5180", api].includes(origin))
        return route.continue();
      unexpectedOrigins.push(origin);
      return route.abort();
    });
    if (autofill)
      await page.route("**/src/config.ts*", async (route) => {
        const original = await route.fetch();
        const source = await original.text();
        const altered = source.replace(
          /const configuredUrl = [^;]+;/,
          'const configuredUrl = "http://localhost:5000/api";',
        );
        expect(altered !== source).toBe(true);
        await route.fulfill({ response: original, body: altered });
      });
    await page.goto("/login");
    await page.getByLabel("Email Address", { exact: true }).fill(alice.email);
    const passwordInput = page.getByLabel("Password", { exact: true });
    await passwordInput.fill(alice.password);
    const response = page.waitForResponse(
      (r) =>
        r.url() === api + "/api/auth/login" &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const result = await response;
    if (result.status() !== 200) await passwordInput.fill("").catch(() => {});
    expect(result.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/my-skills");
    await expect(
      page.getByRole("heading", { name: "My Skills", exact: true }),
    ).toBeVisible();
    expect(unexpectedOrigins).toEqual([]);
    const token = await page.evaluate(() =>
      localStorage.getItem("knoxite_token"),
    );
    expect(
      (
        await request.post(directApi + "/api/auth/logout", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ).status(),
    ).toBe(200);
  });
test("real isolated frontend and backend: registration, captured verification, login, recovery and revocation", async ({
  page,
  request,
}) => {
  const { directory: dir, settings, api, directApi, profile } = privateSandbox();
  const status = await request.get(directApi + "/__synthetic/status");
  expect((await status.json()).instanceId).toBe(settings.instanceId);
  const database = new URL(settings.environment.DATABASE_URL);
  expect(database.hostname === "127.0.0.1" && database.port === String(profile.dbPort) && database.pathname === "/" + profile.dbName).toBe(true);
  expect(
    (
      await (
        await request.get(directApi + "/api/auth/providers")
      ).json()
    ).google.enabled,
  ).toBe(false);
  await page.route("**/*", (route) =>
    ["http://localhost:5180", api].includes(
      new URL(route.request().url()).origin,
    )
      ? route.continue()
      : route.abort(),
  );
  const email = `journey-${Date.now()}lag@students.knoxite.test`;
  const password = randomBytes(20).toString("base64url");
  const nextPassword = randomBytes(20).toString("base64url");
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/signup");
  await expect(page.getByRole("note")).toContainText("Synthetic development");
  await page
    .getByLabel("Full Name", { exact: true })
    .fill("Synthetic browser journey");
  await page.getByLabel("Email Address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm Password", { exact: true }).fill(password);
  await page
    .getByLabel("College program", { exact: true })
    .selectOption({ label: "BSCS" });
  await page
    .getByLabel("Year level", { exact: true })
    .selectOption({ label: "1st Year" });
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(page).toHaveURL("http://localhost:5180/");
  async function login(value: string) {
    await page.goto("/login");
    await page.getByLabel("Email Address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await login(password);
  await expect(page.getByRole("alert")).toContainText(
    "Verify your institutional email",
  );
  const captured = (purpose: string) =>
    JSON.parse(readFileSync(join(dir, "mailbox.json"), "utf8")).find(
      (m: any) => m.to === email && m.purpose === purpose,
    ).link;
  await page.goto(captured("verification"));
  await page.getByRole("button", { name: "Verify Email", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await login(password);
  await expect(page).toHaveURL(/\/dashboard$/);
  const previousSession = await page.evaluate(() =>
    localStorage.getItem("knoxite_token"),
  );
  await page.goto("/my-skills");
  await expect(
    page.getByRole("heading", { name: "My Skills", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/security");
  await expect(
    page.getByRole("heading", { name: "Account security", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/recover-account");
  await page.getByLabel("Institutional email", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Send password reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("password reset link");
  await page.goto(captured("password-reset"));
  await page.getByLabel("New password", { exact: true }).fill(nextPassword);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill(nextPassword);
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password reset");
  const revoked = await request.get(directApi + "/api/auth/sessions", {
    headers: { Authorization: `Bearer ${previousSession}` },
  });
  expect(revoked.status()).toBe(401);
  await login(password);
  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password",
  );
  await login(nextPassword);
  await expect(page).toHaveURL(/\/dashboard$/);
});
