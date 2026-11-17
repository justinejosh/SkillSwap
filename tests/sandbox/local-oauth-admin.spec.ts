import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { join } from "node:path";
// Explicit operator-only live check. Never runs against ordinary test targets.
test.skip(process.env.KNOXITE_LOCAL_ADMIN_BROWSER !== "true", "Opt-in owned local administrator check only");
test.use({ baseURL: "http://localhost:5181", trace: "off", screenshot: "off", video: "off" });
for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`local password administrator signs in and opens assessment management at ${viewport.width}px`, async ({ page }) => {
    const require = createRequire(join(process.cwd(), "package.json"));
    const tool = require(join(process.cwd(), "knoxite-backend/development/oauthLocalAdmin.cjs"));
    const f = await tool.open();
    try {
      const account = await tool.credentials(f);
      await page.setViewportSize(viewport);
      await page.context().route("**/*", route => {
        const u = new URL(route.request().url());
        return ["localhost", "127.0.0.1"].includes(u.hostname) && ["5181", "5019"].includes(u.port) ? route.continue() : route.abort();
      });
      await page.goto("/login");
      await page.locator("#password").waitFor();
      // Native setter avoids credential-bearing locator.fill call logs. Trace,
      // screenshots and video stay off, including on failures.
      await page.evaluate(({ email, password }) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        for (const [id, value] of [["email", email], ["password", password]]) {
          const input = document.getElementById(id)!; setter.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, { email: account.user.email, password: account.password });
      const loginResponse = page.waitForResponse(r => new URL(r.url()).pathname === "/api/auth/login");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const response = await loginResponse;
      expect(new URL(response.url()).port).toBe("5019"); expect(response.status()).toBe(200);
      await expect(page).toHaveURL(/\/admin-dashboard$/);
      await page.goto("/admin/assessments");
      await expect(page.getByRole("heading", { name: "Assessment and trust administration", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Banks and versions", exact: true })).toBeVisible();
    } catch {
      throw new Error("Local administrator browser check failed; credentials and browser artifacts were suppressed.");
    } finally {
      await page.evaluate(async () => {
        const token = localStorage.getItem("knoxite_token");
        if (token) {
          await fetch("http://localhost:5019/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: "{}" });
          localStorage.removeItem("knoxite_token"); localStorage.removeItem("knoxite_user");
        }
      }).catch(() => {});
      await f.db.$disconnect();
    }
  });
}
