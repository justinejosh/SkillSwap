import { test, expect } from "@playwright/test";
import { privateSandbox } from "./state";

test("twelve successful login/logout cycles can switch Alice and Bob in one browser", async ({ page }) => {
  test.setTimeout(180000);
  const { settings, api } = privateSandbox();
  const accounts = ["alice", "bob"].map((name) => settings.accounts.find((a: any) => a.email === `${name}lag@students.knoxite.test`));
  expect(accounts.every(Boolean)).toBe(true);
  // Presentation-only preference: this regression starts after the student's
  // first-run tour, so it can exercise the normal account menu repeatedly.
  await page.addInitScript(() => localStorage.setItem("knoxite_onboarding_completed", "true"));
  const unexpected: string[] = [];
  await page.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    if (["http://localhost:5180", api].includes(origin)) return route.continue();
    if (route.request().resourceType() !== "image") unexpected.push(origin);
    return route.abort();
  });
  page.on("dialog", (dialog) => dialog.accept());
  for (let i = 0; i < 12; i++) {
    const account = accounts[i % 2];
    await page.goto("/login");
    await page.getByLabel("Email Address", { exact: true }).fill(account.email);
    const password = page.getByLabel("Password", { exact: true }); await password.fill(account.password);
    const login = page.waitForResponse((r) => r.url() === api + "/api/auth/login" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const result = await login;
    if (result.status() !== 200) await password.fill("").catch(() => {});
    expect(result.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
    // Follow the same account menu/logout action as a student, not just clearing
    // storage or bypassing session revocation through a test-only shortcut.
    await page.getByTitle("Account Menu", { exact: true }).click();
    const logout = page.waitForResponse((r) => r.url() === api + "/api/auth/logout" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Log Out", exact: true }).click();
    expect((await logout).status()).toBe(200);
    await expect(page).toHaveURL("http://localhost:5180/");
  }
  expect(unexpected).toEqual([]);
});
