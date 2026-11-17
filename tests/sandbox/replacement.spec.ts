import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { privateSandbox } from "./state";

test("prepared replacement preserves both identities, isolates credentials and refuses an occupied frontend", async ({ page, request }) => {
  test.skip(process.env.KNOXITE_TEST_REPLACEMENT !== "true", "Requires explicitly prepared isolated replacement");
  test.setTimeout(180000);
  const original = privateSandbox();
  test.skip(original.profile.name !== "legacy", "Original must stay selected for the non-takeover test");
  const root = process.cwd();
  const require = createRequire(join(root, "package.json"));
  const profiles = require(join(root, "knoxite-backend/development/sandboxProfiles.cjs"));
  const pending = join(original.directory, "pending-replacement.json");
  const replacement = profiles.layout(existsSync(pending) ? JSON.parse(readFileSync(pending, "utf8")).profile : "replacement");
  const api = `http://localhost:${replacement.apiPort}`, directApi = `http://127.0.0.1:${replacement.apiPort}`;
  const file = join(original.directory, replacement.folder, "settings.json");
  const before = readFileSync(file), oldBefore = readFileSync(join(original.directory, "settings.json"));
  const settings = JSON.parse(before.toString("utf8"));
  const { backendStatus } = require(join(root, "knoxite-backend/development/sandbox.cjs"));
  expect((await backendStatus(settings)).state).toBe("ready");
  const oldStatus = await backendStatus(original.settings);
  expect(oldStatus.state).toBe("ready");
  const selection = join(original.directory, "active-profile.json");
  const selectionBefore = existsSync(selection) ? readFileSync(selection) : null;
  const command = (name: string) => new Promise<{ code: number | null; text: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [join(root, "knoxite-backend/development/sandbox.cjs"), name], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    child.stdout.on("data", (chunk) => { text += chunk; }); child.stderr.on("data", (chunk) => { text += chunk; });
    child.on("error", () => reject(new Error("Sandbox fixture command failed")));
    child.on("close", (code) => resolve({ code, text }));
  });
  expect((await command("prepare-replacement")).code).toBe(0);
  expect(readFileSync(file).equals(before)).toBe(true);
  expect(readFileSync(join(original.directory, "settings.json")).equals(oldBefore)).toBe(true);
  const refused = await command("use-replacement");
  expect(refused.code).toBe(1); expect(refused.text.includes("PORT_OCCUPIED")).toBe(true);
  expect((await backendStatus(original.settings)).pid).toBe(oldStatus.pid);
  expect(existsSync(selection)).toBe(!!selectionBefore);
  if (selectionBefore) expect(readFileSync(selection).equals(selectionBefore)).toBe(true);
  const alice = settings.accounts.find((a: any) => a.email === "alicelag@students.knoxite.test");
  const oldAlice = original.settings.accounts.find((a: any) => a.email === alice.email);
  expect(alice.password !== oldAlice.password).toBe(true);
  await page.route("**/*", (route) => ["http://localhost:5180", api].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  // Simulates the replacement Vite profile, leaving the live selected instance
  // intact. All login/profile/session calls go to the real isolated profile API.
  await page.route("**/src/config.ts*", async (route) => {
    const response = await route.fetch(); const source = await response.text();
    const changed = source.replace(/export const SYNTHETIC_SANDBOX_PROFILE = [^;]+;/, `export const SYNTHETIC_SANDBOX_PROFILE = ${JSON.stringify(replacement.name)};`);
    expect(changed !== source).toBe(true);
    await route.fulfill({ response, body: changed });
  });
  await page.goto("/login");
  await expect(page.getByRole("note")).toContainText(replacement.name);
  await page.getByLabel("Email Address", { exact: true }).fill(alice.email);
  const password = page.getByLabel("Password", { exact: true }); await password.fill(alice.password);
  const login = page.waitForResponse((r) => r.url() === api + "/api/auth/login" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const result = await login; if (result.status() !== 200) await password.fill("").catch(() => {});
  expect(result.status()).toBe(200); await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/my-skills"); await expect(page.getByRole("heading", { name: "My Skills", exact: true })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem("knoxite_token"));
  expect((await request.get(original.directApi + "/api/profile/me", { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);
  expect((await request.post(directApi + "/api/auth/login", { data: { email: alice.email, password: oldAlice.password } })).status()).toBe(401);
  expect((await request.post(directApi + "/api/auth/logout", { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(200);
});
