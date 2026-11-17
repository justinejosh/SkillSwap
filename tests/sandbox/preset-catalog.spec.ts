import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { privateSandbox } from "./state";

test("actual preset offers/wants use canonical IDs, preserve history and remain unranked/shareable without banks", async ({ page, request }) => {
  test.setTimeout(120000);
  const { settings, directory, profile, api, directApi } = privateSandbox();
  const require = createRequire(join(process.cwd(), "package.json"));
  const own = require(join(process.cwd(), "knoxite-backend/development/databaseIdentity.cjs"));
  const identity = require(join(process.cwd(), "knoxite-backend/development/identity.cjs"));
  const inspect = (args: string[]) => {
    const r = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
    expect(r.status).toBe(0); return JSON.parse(r.stdout)[0];
  };
  const metadata = { container: inspect(["inspect", profile.container]), volume: inspect(["volume", "inspect", profile.volume]) };
  const text = readFileSync(join(directory, "settings.json"), "utf8");
  const checkpoint = JSON.parse(readFileSync(join(directory, "settings.verified.json"), "utf8"));
  expect(own.ownsDatabase(own.ownershipReport(settings, metadata.container, metadata.volume)) && own.checkpointMatches(checkpoint, metadata) && checkpoint.settingsText === text).toBe(true);
  const url = new URL(settings.environment.DATABASE_URL);
  expect(url.hostname === "127.0.0.1" && url.port === String(profile.dbPort) && url.pathname === "/" + profile.dbName && profile.dbName.endsWith("_dev") && settings.environment.KNOXITE_SYNTHETIC_SANDBOX === "true").toBe(true);
  expect(spawnSync("git", ["branch", "--show-current"], { encoding: "utf8" }).stdout.trim()).toBe("dev-justine");
  const challenge = randomBytes(32).toString("hex");
  const status = await (await request.get(directApi + "/__synthetic/status?challenge=" + challenge)).json();
  expect(status.instanceId === settings.instanceId && identity.verify(settings, challenge, status)).toBe(true);
  const tokens = new Set<string>();
  const hash = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
  async function call(method: string, path: string, expected: number, token?: string, data?: unknown) {
    const result = await request.fetch(directApi + "/api" + path, { method, maxRedirects: 0, headers: token ? { Authorization: `Bearer ${token}` } : {}, ...(data === undefined ? {} : { data }) });
    expect(result.status(), method + " " + path).toBe(expected); return result.json();
  }
  const admin = settings.accounts.find((a: any) => a.role === "ADMIN");
  const adminLogin = await call("POST", "/auth/login", 200, undefined, { email: admin.email, password: admin.password });
  tokens.add(adminLogin.token);
  const academicBefore = hash(await call("GET", "/admin/academic-programs", 200, adminLogin.token));
  const banksBefore = hash(await call("GET", "/admin/assessments", 200, adminLogin.token));
  try {
    await call("GET", "/profile/skill-catalog", 401);
    const initialized = await call("POST", "/admin/skill-catalog/initialize", 200, adminLogin.token, {});
    expect(initialized).toEqual({ total: 80, created: 0, reused: 80 });
    const options = await call("GET", "/auth/academic-options", 200);
    const people: any[] = [];
    const prefix = `catalog-${randomUUID().slice(0, 8)}`;
    for (const [suffix, code] of [["a", "BSCS"], ["b", "BSN"]]) {
      const program = options.programs.find((p: any) => p.code === code);
      const email = `${prefix}-${suffix}lag@students.knoxite.test`, password = randomBytes(32).toString("base64url");
      expect((await call("POST", "/auth/register", 201, undefined, { name: `SYNTHETIC ${prefix}-${suffix}`, email, password, programId: program.id, yearLevelId: program.yearLevels[0].id })).verificationSent).toBe(true);
      const mail = JSON.parse(readFileSync(join(directory, "mailbox.json"), "utf8")).find((m: any) => m.to === email && m.purpose === "verification");
      await call("POST", "/auth/verify-email", 200, undefined, { token: new URL(mail.link).hash.slice("#token=".length) });
      const login = await call("POST", "/auth/login", 200, undefined, { email, password });
      tokens.add(login.token); people.push({ ...login, email, password });
    }
    const [a, b] = people;
    await call("POST", "/admin/skill-catalog/initialize", 403, a.token, {});
    const catalog = await call("GET", "/profile/skill-catalog", 200, a.token);
    expect(catalog.presets).toHaveLength(80);
    expect(catalog.presets.every((p: any) => p.skillId && !p.conflict)).toBe(true);
    // These intentionally unsupported presets retain unavailable-bank coverage
    // after the seven explicitly authorized sandbox demonstrations are present.
    const python = catalog.presets.find((p: any) => p.key === "java-programming-fundamentals");
    const books = catalog.presets.find((p: any) => p.key === "accounting-information-systems-basics");
    await page.route("**/*", (route) => ["http://localhost:5180", api].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    await page.addInitScript(() => localStorage.setItem("knoxite_onboarding_completed", "true"));
    await page.goto("/login");
    await page.getByLabel("Email Address", { exact: true }).fill(a.email);
    const passwordInput = page.getByLabel("Password", { exact: true }); await passwordInput.fill(a.password);
    const pendingLogin = page.waitForResponse((r) => r.url() === api + "/api/auth/login" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    const loginResponse = await pendingLogin;
    if (loginResponse.status() !== 200) await passwordInput.fill("");
    expect(loginResponse.status()).toBe(200); await expect(page).toHaveURL(/\/dashboard$/);
    const browserToken = await page.evaluate(() => localStorage.getItem("knoxite_token")); if (browserToken) tokens.add(browserToken);
    await page.goto("/my-skills");
    await page.getByRole("button", { name: "+ Add Skill", exact: true }).click();
    const input = page.getByLabel("Choose a Skill", { exact: true });
    await input.fill("jAvA"); await expect(page.getByRole("option", { name: python.name, exact: true })).toBeVisible();
    await input.press("ArrowDown"); await input.press("Enter");
    await page.getByRole("button", { name: "Save Skill", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Assessment Unavailable", { exact: true })).toBeVisible();
    const offered = (await call("GET", "/profile", 200, a.token)).offeredSkills[0];
    expect(offered.id).toBe(python.skillId); expect(offered.tier).toBe("NOT_ASSESSED");
    const repeated = await call("POST", "/profile/skills/offer", 201, a.token, { skillId: python.skillId });
    expect(repeated.skill.id).toBe(python.skillId); expect(repeated.created).toBe(false); expect(repeated.offering.id).toBe(offered.offeringId);
    await page.getByRole("button", { name: "+ Add Skill", exact: true }).click();
    await page.getByLabel("Exchange Direction", { exact: true }).click();
    await page.getByRole("option", { name: "Wants to Learn (Request a skill)", exact: true }).click();
    await page.getByLabel("Domain Category", { exact: true }).click();
    await page.getByRole("option", { name: "Business", exact: true }).click();
    await input.fill("accounting information");
    await page.getByRole("option", { name: books.name, exact: true }).click();
    await page.getByRole("button", { name: "Save Skill", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const bOffer = await call("POST", "/profile/skills/offer", 201, b.token, { presetKey: books.key });
    const bWant = await call("POST", "/profile/skills/want", 201, b.token, { presetKey: python.key });
    expect(bWant.skill.id).toBe(python.skillId); expect(bOffer.skill.id).toBe(books.skillId);
    const match = (await call("GET", "/matches", 200, a.token)).find((m: any) => m.id === b.user.id);
    expect(!!match).toBe(true); expect(match.matchScore).toBeNull(); expect(match.matchingOfferedSkills[0].id).toBe(books.skillId);
    const unavailable = await call("GET", `/assessments/offerings/${offered.offeringId}`, 200, a.token);
    expect(unavailable.levels[0].supported).toBe(false);
    await call("POST", `/assessments/offerings/${offered.offeringId}/attempts`, 404, a.token, { level: "BASIC" });
    await call("POST", `/assessments/offerings/${offered.offeringId}/attempts`, 403, a.token, { level: "ADVANCED" });
    for (const type of ["offer", "want"]) {
      for (const body of [{ name: "Asd", category: "creative" }, { name: python.name }, { presetKey: "forged-key" }, { skillId: "forged-id" }, { presetKey: python.key, skillId: python.skillId }])
        await call("POST", `/profile/skills/${type}`, 422, a.token, body);
    }
    const publicProfile = await call("GET", `/users/${a.user.id}/profile`, 200, b.token);
    expect(publicProfile.offeredSkills.some((s: any) => s.id === python.skillId)).toBe(true);
    expect(publicProfile.wantedSkills.some((s: any) => s.id === books.skillId)).toBe(true);
    expect(publicProfile.email).toBeUndefined(); expect(publicProfile.passwordHash).toBeUndefined();
    await page.goto(`/students/${b.user.id}`);
    await expect(page.getByText(books.name, { exact: true })).toBeVisible();
    expect(hash(await call("GET", "/admin/academic-programs", 200, adminLogin.token))).toBe(academicBefore);
    expect(hash(await call("GET", "/admin/assessments", 200, adminLogin.token))).toBe(banksBefore);
    expect((await call("GET", "/auth/providers", 200)).google.enabled).toBe(false);
  } finally {
    for (const token of tokens) await call("POST", "/auth/logout", 200, token).catch(() => {});
    // Retain the two clearly named synthetic students and their new skill links.
    // No existing records, mappings, attempts or private credentials are reset.
  }
});
