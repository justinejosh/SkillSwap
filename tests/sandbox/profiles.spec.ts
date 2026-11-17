import { test, expect } from "@playwright/test";

// No accounts, credentials, databases or new live resources are needed. This
// proves the browser uses the allocated API instead of silently using 5010.
for (const slot of [1, 8]) test(`recovery-${slot} frontend pins API ${5011 + slot}`, async ({ page }) => {
  const profile = `recovery-${slot}`, api = `http://localhost:${5011 + slot}`;
  const unexpected: string[] = [], calls: string[] = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === api) {
      calls.push(url.pathname);
      return route.fulfill({ json: url.pathname.endsWith("/providers") ? { google: { enabled: false } } : { available: false } });
    }
    if (url.origin === "http://localhost:5180") return route.continue();
    unexpected.push(url.origin); return route.abort();
  });
  await page.route("**/src/config.ts*", async (route) => {
    const original = await route.fetch(), source = await original.text();
    const changed = source.replace(/const requestedSandboxProfile = [^;]+;/, `const requestedSandboxProfile = ${JSON.stringify(profile)};`);
    expect(changed !== source).toBe(true);
    await route.fulfill({ response: original, body: changed });
  });
  await page.goto("/login");
  await expect(page.getByRole("note")).toContainText(profile);
  await expect.poll(() => calls.length).toBeGreaterThan(0);
  expect(unexpected).toEqual([]);
});
