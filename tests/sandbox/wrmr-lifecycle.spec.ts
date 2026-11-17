import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { privateSandbox } from "./state";

test("synthetic academic configuration: unranked students reach first WRMR and balanced subsequent outcomes", async ({ page, request }, testInfo) => {
  test.setTimeout(180000);
  const root = process.cwd();
  const require = createRequire(join(root, "package.json"));
  const dev = join(root, "knoxite-backend/development");
  const ownership = require(join(dev, "databaseIdentity.cjs"));
  const identity = require(join(dev, "identity.cjs"));
  const { directory, settings, profile, api, directApi } = privateSandbox();
  const settingsPath = join(directory, "settings.json");
  const settingsText = readFileSync(settingsPath, "utf8");
  const fingerprint = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const inspect = (args: string[]) => {
    const result = spawnSync("docker", args, { encoding: "utf8", windowsHide: true });
    expect(result.status, "Docker metadata must be available before any fixture write").toBe(0);
    return JSON.parse(result.stdout)[0];
  };
  expect(spawnSync("git", ["branch", "--show-current"], { encoding: "utf8" }).stdout.trim()).toBe("dev-justine");
  const metadata = { container: inspect(["inspect", profile.container]), volume: inspect(["volume", "inspect", profile.volume]) };
  const checkpoint = JSON.parse(readFileSync(join(directory, "settings.verified.json"), "utf8"));
  expect(ownership.ownsDatabase(ownership.ownershipReport(settings, metadata.container, metadata.volume))).toBe(true);
  expect(ownership.checkpointMatches(checkpoint, metadata) && checkpoint.settingsText === settingsText).toBe(true);
  const databaseUrl = new URL(settings.environment.DATABASE_URL);
  expect(databaseUrl.hostname === "127.0.0.1" && databaseUrl.port === String(profile.dbPort) && databaseUrl.pathname === "/" + profile.dbName && profile.dbName.endsWith("_dev")).toBe(true);
  expect(settings.environment.KNOXITE_SYNTHETIC_SANDBOX === "true" && settings.environment.NODE_ENV === "development" && settings.environment.GOOGLE_SIGN_IN_ENABLED === "false").toBe(true);
  const challenge = randomBytes(32).toString("hex");
  const health = await (await request.get(directApi + "/__synthetic/status?challenge=" + challenge, { maxRedirects: 0 })).json();
  expect(health.synthetic === true && health.instanceId === settings.instanceId && health.protocol === identity.protocol && identity.verify(settings, challenge, health)).toBe(true);

  // Credentials stay private. No tracing, screenshots or video in sandbox config.
  // Mutations below use normal authenticated APIs, never raw completion/tier flags.
  const tokens = new Set<string>();
  async function call(method: string, path: string, status: number, token?: string, body?: unknown) {
    const result = await request.fetch(directApi + "/api" + path, {
      method, maxRedirects: 0,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(body === undefined ? {} : { data: body }),
    });
    expect(result.status(), `${method} ${path} HTTP status`).toBe(status);
    return result.json();
  }
  const run = `wrmr-${randomUUID().slice(0, 8)}`;
  const evidence: { check: string; expected: unknown; actual: unknown }[] = [];
  function record(check: string, expected: unknown, actual: unknown) {
    expect(actual, check).toEqual(expected);
    evidence.push({ check, expected, actual });
  }
  const admin = settings.accounts.find((a: any) => a.role === "ADMIN");
  expect(!!admin).toBe(true);
  const adminLogin = await call("POST", "/auth/login", 200, undefined, { email: admin.email, password: admin.password });
  const adminToken = adminLogin.token; tokens.add(adminToken);
  const catalog = require(join(root, "knoxite-backend/config/academic-catalog.json"));
  const officialCodes = new Set(catalog.programs.map((p: any) => p.code));
  const originalCatalog = await call("GET", "/admin/academic-programs", 200, adminToken);
  const originalPrograms = originalCatalog.programs.filter((p: any) => officialCodes.has(p.code));
  expect(originalPrograms).toHaveLength(13);
  const originalFingerprint = fingerprint(originalPrograms);
  const years = originalCatalog.yearLevels.filter((y: any) => y.isActive).sort((a: any, b: any) => a.order - b.order);
  expect(years.length >= 2).toBe(true);
  const { PrismaClient } = require(join(root, "knoxite-backend/node_modules/@prisma/client"));
  // SELECT-only access is used for evidence checks; all fixture writes use APIs.
  const db = new PrismaClient({ datasources: { db: { url: settings.environment.DATABASE_URL } } });
  const { aggregateMetrics } = require(join(root, "knoxite-backend/dist/services/userMetrics.js"));
  const initialAnalytics = await call("GET", "/analytics", 200, adminToken);
  const period = new Date().toISOString().slice(0, 7);
  const initialRows = await db.swap.findMany({
    where: { OR: [{ completedAt: { gte: new Date(period + "-01T00:00:00Z") } }, { cancelledAt: { gte: new Date(period + "-01T00:00:00Z") } }] },
    select: { requesterId: true, receiverId: true, status: true, integrityVerified: true, requesterApprovedAt: true, receiverApprovedAt: true, completedAt: true, cancelledAt: true, sessions: true, requesterSessions: true, receiverSessions: true, reviews: { select: { reviewerId: true, revieweeId: true, rating: true, isValidated: true } } },
  });
  const initialMonthlyConcluded = initialRows.filter((s: any) => {
    const date = s.status === "COMPLETED" ? s.completedAt : s.status === "CANCELLED" ? s.cancelledAt : null;
    return date?.toISOString().slice(0, 7) === period && aggregateMetrics([s.requesterId], [s]).get(s.requesterId).eligibleConcludedSwaps === 1;
  }).length;
  const initialMonthlyCompleted = initialAnalytics.monthlyCompletion.find((m: any) => m.period === period).completed;
  type Student = { id: string; name: string; email: string; password: string; token: string };
  let viewer: Student, subject: Student, partner: Student, outsider: Student, missing: Student;
  let programOne: any, programTwo: any, programDraft: any;
  let skillOne = "", skillTwo = "";
  let completed = 0, cancelled = 0;
  async function matches(student: Student) { return call("GET", "/matches", 200, student.token); }
  async function subjectMatch(student = viewer) {
    const match = (await matches(student)).find((p: any) => p.id === subject.id);
    expect(!!match, "Reciprocal subject remains discoverable").toBe(true);
    return match;
  }
  async function assertState(label: string, rating: number, completion: number, rawRating: number, rawCompletion: number, count: number, partners: number, score: number) {
    const match = await subjectMatch();
    expect(match.matchScore).toBeCloseTo(score, 8);
    expect(match.matchDetails.averageRating).toBeCloseTo(rating, 8);
    expect(match.matchDetails.completionRate).toBeCloseTo(completion, 8);
    const analytics = await call("GET", "/analytics/me", 200, subject.token);
    const portfolio = await call("GET", `/users/${subject.id}/profile`, 200, viewer.token);
    const profileData = await call("GET", "/profile", 200, subject.token);
    for (const metrics of [analytics.metrics, portfolio.metrics, profileData.metrics, match.metrics]) {
      expect(metrics.averageRating).toBeCloseTo(rating, 8);
      expect(metrics.completionRate).toBeCloseTo(completion, 8);
      expect(metrics.rawAverageRating).toBeCloseTo(rawRating, 8);
      expect(metrics.rawCompletionRate).toBeCloseTo(rawCompletion, 8);
      expect(metrics.validatedCompletedSwaps).toBe(count);
      expect(metrics.uniqueCompletedPartners).toBe(partners);
      expect(metrics.legacyConcludedSwaps).toBe(0);
    }
    record(label, { score, completed: count, partners }, { score: match.matchScore, completed: analytics.metrics.validatedCompletedSwaps, partners: analytics.metrics.uniqueCompletedPartners });
    const board = await call("GET", "/leaderboard", 200, subject.token);
    expect(board.viewer.eligible).toBe(partners >= 2);
    expect(board.topMentors.some((p: any) => p.id === subject.id)).toBe(partners >= 2);
    const activity = await call("GET", "/leaderboard/swaps", 200, subject.token);
    expect(activity.some((p: any) => p.id === subject.id)).toBe(partners >= 2);
    const system = await call("GET", "/analytics", 200, adminToken);
    expect(system.swapMetrics.completedSwaps).toBe(initialAnalytics.swapMetrics.completedSwaps + completed);
    expect(system.swapMetrics.eligibleConcludedSwaps).toBe(initialAnalytics.swapMetrics.eligibleConcludedSwaps + completed + cancelled);
    if (!system.swapMetrics.legacyConcludedSwaps)
      expect(system.swapMetrics.completionRate).toBeCloseTo(100 * system.swapMetrics.completedSwaps / system.swapMetrics.eligibleConcludedSwaps, 8);
    else expect(system.swapMetrics.completionRate).toBeNull();
    const month = system.monthlyCompletion.find((m: any) => m.period === period);
    expect(month.completed).toBe(initialMonthlyCompleted + completed);
    expect(month.rate).toBeCloseTo(100 * (initialMonthlyCompleted + completed) / (initialMonthlyConcluded + completed + cancelled), 8);
  }
  async function start(first: Student, second: Student, approvals = 2) {
    const requested = await call("POST", "/swaps/request", 201, first.token, { receiverId: second.id, offeredSkillId: skillOne, wantedSkillId: skillTwo, message: "SYNTHETIC WRMR lifecycle test only" });
    const accepted = await call("PATCH", `/swap-requests/${requested.id}/status`, 200, second.token, { newStatus: "ACCEPTED" });
    const id = accepted.redirectId;
    await call("POST", `/swaps/${id}/log-session`, 409, first.token, { sessionNumber: 1 });
    let swap = await call("GET", `/swaps/${id}`, 200, first.token);
    for (const student of [first, second].slice(0, approvals)) {
      swap = (await call("POST", `/swaps/${id}/agreement`, 200, student.token, { sessions: 1, duration: 1, agreedToTerms: true, agreementVersion: swap.agreementVersion })).swap;
      if (student.id === first.id) expect(swap.status).toBe("PENDING_AGREEMENT");
    }
    expect(swap.status).toBe(approvals === 2 ? "CONFIRMED" : "PENDING_AGREEMENT");
    return id;
  }
  async function finish(first: Student, second: Student, ratingForSecond: number) {
    const id = await start(first, second);
    await call("POST", "/reputation/submit", 409, first.token, { swapId: id, rating: ratingForSecond });
    await call("POST", `/swaps/${id}/log-session`, 200, first.token, { sessionNumber: 1 });
    await call("POST", "/reputation/submit", 409, first.token, { swapId: id, rating: ratingForSecond });
    await call("POST", `/swaps/${id}/log-session`, 200, second.token, { sessionNumber: 1 });
    // Repeating a confirmation cannot fabricate a second session.
    await call("POST", `/swaps/${id}/log-session`, 200, first.token, { sessionNumber: 1 });
    await call("POST", "/reputation/submit", 200, first.token, { swapId: id, rating: ratingForSecond });
    expect((await call("GET", `/swaps/${id}`, 200, first.token)).status).toBe("CONFIRMED");
    await call("POST", "/reputation/submit", 200, second.token, { swapId: id, rating: 5 });
    await call("POST", "/reputation/submit", 200, first.token, { swapId: id, rating: ratingForSecond });
    const stored = await db.swap.findUnique({ where: { id }, include: { reviews: true, sessionLogs: true } });
    expect(stored.status === "COMPLETED" && stored.integrityVerified && !!stored.completedAt && !!stored.requesterApprovedAt && !!stored.receiverApprovedAt).toBe(true);
    expect(stored.reviews.length === 2 && stored.reviews.every((r: any) => r.isValidated)).toBe(true);
    expect(stored.sessionLogs).toHaveLength(2);
    expect([stored.requesterSessions, stored.receiverSessions]).toEqual([1, 1]);
    completed++;
  }
  const unexpected: string[] = [];
  await page.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    if (["http://localhost:5180", api].includes(origin)) return route.continue();
    // The existing shell requests a decorative remote avatar. Block it as well,
    // but distinguish an image from an accidental foreign API/script request.
    if (route.request().resourceType() !== "image") unexpected.push(origin);
    return route.abort();
  });
  try {
    await test.step("create clearly synthetic mappings through the existing administrator API", async () => {
      const departments = [];
      for (const suffix of ["ONE", "TWO"])
        departments.push(await call("POST", "/admin/academic-options", 201, adminToken, { type: "department", code: `SYN_${run}_${suffix}`.replaceAll("-", "_").toUpperCase(), name: `SYNTHETIC TEST ONLY ${run} department ${suffix}` }));
      const programs = [];
      for (const suffix of ["ONE", "TWO", "DRAFT"])
        programs.push(await call("POST", "/admin/academic-programs", 201, adminToken, { code: `SYN_${run}_${suffix}`, label: `SYNTHETIC TEST ONLY ${run} program ${suffix}`, yearLevelIds: years.slice(0, 2).map((y: any) => y.id) }));
      [programOne, programTwo, programDraft] = programs;
      for (const [program, department] of [[programOne, departments[0]], [programTwo, departments[1]]]) {
        await call("POST", `/admin/academic-programs/${program.id}/department`, 422, adminToken, { departmentId: department.id, validationNotes: "Synthetic fixture only", officiallyConfirmed: false });
        await call("POST", `/admin/academic-programs/${program.id}/department`, 422, adminToken, { departmentId: department.id, validationNotes: "", officiallyConfirmed: true });
        // The endpoint's confirmation flag is exercised only for fictitious
        // programs. This is not OLFU evidence or approval of any real mapping.
        await call("POST", `/admin/academic-programs/${program.id}/department`, 200, adminToken, { departmentId: department.id, validationNotes: `SYNTHETIC AUTOMATED FIXTURE ${run}; no institutional evidence or OLFU approval. Algorithm testing only.`, officiallyConfirmed: true });
      }
      await call("PATCH", `/admin/academic-programs/${programDraft.id}/department-draft`, 200, adminToken, { departmentId: departments[0].id, proposalNotes: "SYNTHETIC DRAFT ONLY; must not contribute to proximity", mappingVersion: 0 });
      const configured = await call("GET", "/admin/academic-programs", 200, adminToken);
      const confirmedFixtures = configured.programs.filter((p: any) => [programOne.id, programTwo.id].includes(p.id));
      record("synthetic mapping evidence and administrator attribution", true, confirmedFixtures.length === 2 && confirmedFixtures.every((p: any) => p.mappingValidatedAt && p.mappingValidatedById === adminLogin.user.id && p.mappingVersion === 1 && p.mappingNotes.startsWith("SYNTHETIC")));
      evidence.push({ check: "real-program mapping snapshot", expected: "unchanged", actual: originalPrograms.map((p: any) => ({ code: p.code, label: p.label, assigned: !!p.departmentId, validated: !!p.mappingValidatedAt })) });
    });
    await test.step("register and verify five fresh synthetic students without bypassing authentication", async () => {
      const students: Student[] = [];
      for (const label of ["viewer", "subject", "partner", "nonreciprocal", "missing"]) {
        const email = `${run}-${label}lag@students.knoxite.test`, password = randomBytes(32).toString("base64url");
        const name = `SYNTHETIC ${run} ${label}`;
        const program = label === "missing" ? programDraft : label === "partner" ? programTwo : programOne;
        const registered = await call("POST", "/auth/register", 201, undefined, { name, email, password, programId: program.id, yearLevelId: years[0].id });
        expect(registered.verificationSent).toBe(true);
        if (label === "viewer") await call("POST", "/auth/login", 403, undefined, { email, password });
        const mail = JSON.parse(readFileSync(join(directory, "mailbox.json"), "utf8")).find((m: any) => m.to === email && m.purpose === "verification");
        expect(!!mail).toBe(true);
        const link = new URL(mail.link);
        expect(link.origin).toBe("http://localhost:5180");
        await call("POST", "/auth/verify-email", 200, undefined, { token: link.hash.slice("#token=".length) });
        const login = await call("POST", "/auth/login", 200, undefined, { email, password });
        tokens.add(login.token); students.push({ id: login.user.id, name, email, password, token: login.token });
      }
      [viewer, subject, partner, outsider, missing] = students;
      await call("POST", `/admin/academic-programs/${programOne.id}/department`, 403, viewer.token, { officiallyConfirmed: true });
      const skills = ["python-programming-fundamentals", "bookkeeping-fundamentals", "chess-fundamentals"];
      for (const student of [viewer, subject, partner, outsider, missing]) {
        const reversed = [subject.id, outsider.id].includes(student.id);
        const offered = await call("POST", "/profile/skills/offer", 201, student.token, { presetKey: skills[reversed ? 1 : 0] });
        expect(offered.offering.tier).toBe("NOT_ASSESSED");
        await call("POST", "/profile/skills/want", 201, student.token, { presetKey: skills[student.id === outsider.id ? 2 : reversed ? 0 : 1] });
        if (student.id === viewer.id) skillOne = offered.skill.id;
        if (student.id === subject.id) skillTwo = offered.skill.id;
      }
      record("new students registered and verified through APIs", 5, students.length);
    });
    await test.step("unranked reciprocal discovery remains actionable and excludes one-way candidates", async () => {
      const peers = await matches(viewer);
      const target = peers.find((p: any) => p.id === subject.id);
      record("new reciprocal score is unavailable, not fabricated", null, target.matchScore);
      expect(target.matchDetails.missing).toContain("No validated peer ratings");
      record("nonreciprocal candidate excluded", false, peers.some((p: any) => p.id === outsider.id));
      await call("POST", "/swaps/request", 422, viewer.token, { receiverId: outsider.id, offeredSkillId: skillOne, wantedSkillId: skillTwo });
      await page.addInitScript(() => localStorage.setItem("knoxite_onboarding_completed", "true"));
      await page.goto("/login");
      await page.getByLabel("Email Address", { exact: true }).fill(viewer.email);
      const passwordInput = page.getByLabel("Password", { exact: true });
      await passwordInput.fill(viewer.password);
      const loginResponse = page.waitForResponse((r) => r.url() === api + "/api/auth/login" && r.request().method() === "POST");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const loggedIn = await loginResponse;
      if (loggedIn.status() !== 200) await passwordInput.fill("");
      expect(loggedIn.status()).toBe(200);
      await expect(page).toHaveURL(/\/dashboard$/);
      const browserToken = await page.evaluate(() => localStorage.getItem("knoxite_token"));
      if (browserToken) tokens.add(browserToken);
      const card = page.getByRole("article", { name: `${subject.name} reciprocal match`, exact: true });
      await expect(card.getByText("Unranked", { exact: true })).toBeVisible();
      await expect(card).toContainText("You can request a swap while this score is unavailable.");
      await expect(card.getByRole("button", { name: "Request Swap", exact: true })).toBeEnabled();
    });
    await test.step("bilateral sessions and reviews produce the first score immediately", async () => {
      await finish(viewer, subject, 4);
      await assertState("first qualifying exchange", 4, 1, 4, 1, 1, 1, 90);
      await page.reload();
      const card = page.getByRole("article", { name: `${subject.name} reciprocal match`, exact: true });
      await expect(card).toContainText("90.0% Match Score");
      await expect(card).toContainText("Limited evidence: peer feedback comes from one partner.");
      await expect(card).not.toContainText("WRMR");
      await expect(card).not.toContainText(/probability|chance of success/i);
      await expect(card.getByRole("button", { name: "Request Swap", exact: true })).toBeEnabled();
    });
    await test.step("all four proximity categories are returned by the actual matching API", async () => {
      for (const [program, year, proximity, score] of [[programOne, years[0], 1, 90], [programOne, years[1], 0.8, 86], [programTwo, years[0], 0.6, 82], [programTwo, years[1], 0.4, 78]] as const) {
        await call("PUT", "/profile/update", 200, subject.token, { programId: program.id, yearLevelId: year.id });
        const match = await subjectMatch();
        record(`proximity ${proximity}`, { proximity, score }, { proximity: match.matchDetails.proximity.value, score: match.matchScore });
      }
      await call("PUT", "/profile/update", 200, subject.token, { programId: programOne.id, yearLevelId: years[0].id });
    });
    await test.step("draft academics block a complete score for either student without hiding reciprocal peers", async () => {
      await call("PUT", "/profile/update", 200, subject.token, { programId: programDraft.id, yearLevelId: years[0].id });
      let match = await subjectMatch();
      record("draft candidate mapping", null, match.matchScore);
      expect(match.matchDetails.averageRating).toBe(4); expect(match.matchDetails.completionRate).toBe(1);
      expect(match.matchDetails.proximity.value).toBeNull();
      await call("PUT", "/profile/update", 200, subject.token, { programId: programOne.id, yearLevelId: years[0].id });
      match = await subjectMatch(missing);
      record("draft viewer mapping", null, match.matchScore);
      expect(match.matchDetails.missing).toContain("Incomplete academic information");
      expect((await subjectMatch()).matchScore).toBe(90);
    });
    await test.step("repeat exchanges do not create a second partner or leaderboard eligibility", async () => {
      await finish(viewer, subject, 2);
      await assertState("second exchange, same partner", 3, 1, 3, 1, 2, 1, 80);
    });
    await test.step("a second distinct completed partner changes balanced inputs and leaderboard eligibility", async () => {
      await finish(partner, subject, 5);
      await assertState("third exchange, second partner", 4, 1, 11 / 3, 1, 3, 2, 90);
    });
    await test.step("qualifying cancellation is symmetric and consistent with balanced and pooled analytics", async () => {
      const id = await start(viewer, subject);
      await call("DELETE", `/swaps/cancel/swap/${id}`, 200, subject.token);
      cancelled++;
      await assertState("post-bilateral cancellation", 4, 5 / 6, 11 / 3, 3 / 4, 3, 2, 85);
      const viewerMetrics = (await call("GET", "/analytics/me", 200, viewer.token)).metrics;
      expect(viewerMetrics.completionRate).toBeCloseTo(2 / 3, 8);
      expect(viewerMetrics.eligibleConcludedSwaps).toBe(3);
    });
    await test.step("pre-bilateral cancellation is excluded and does not alter either participant's rate", async () => {
      const id = await start(partner, subject, 1);
      await call("DELETE", `/swaps/cancel/swap/${id}`, 200, partner.token);
      await assertState("pre-bilateral cancellation excluded", 4, 5 / 6, 11 / 3, 3 / 4, 3, 2, 85);
      expect((await call("GET", "/analytics/me", 200, partner.token)).metrics.completionRate).toBe(1);
    });
    await test.step("later valid completion recomputes ratings without changing the approved weighting", async () => {
      await finish(partner, subject, 1);
      await assertState("fourth completion after cancellation", 3, 5 / 6, 3, 4 / 5, 4, 2, 75);
      await page.reload(); await page.setViewportSize({ width: 390, height: 844 });
      const card = page.getByRole("article", { name: `${subject.name} reciprocal match`, exact: true });
      await expect(card).toContainText("75.0% Match Score");
      await expect(card).toContainText("Peer feedback from 2 distinct partners");
      await expect(card).not.toContainText("Limited evidence: peer feedback comes from one partner.");
      await expect(card).not.toContainText(/WRMR|probability|chance of success/i);
    });
    await test.step("original college mappings, seed credentials and disabled Google are preserved", async () => {
      const after = await call("GET", "/admin/academic-programs", 200, adminToken);
      record("13 original college-program records unchanged", originalFingerprint, fingerprint(after.programs.filter((p: any) => officialCodes.has(p.code))));
      record("private sandbox settings unchanged", true, readFileSync(settingsPath, "utf8") === settingsText);
      record("Google remains disabled", false, (await call("GET", "/auth/providers", 200)).google.enabled);
      expect(unexpected).toEqual([]);
      writeFileSync(testInfo.outputPath("wrmr-lifecycle-evidence.json"), JSON.stringify({ run, profile: profile.name, completed, qualifyingCancellations: cancelled, earlyCancellations: 1, evidence }, null, 2));
    });
  } finally {
    await db.$disconnect();
    for (const token of tokens) await call("POST", "/auth/logout", 200, token).catch(() => {});
    // No cleanup deletes: keep clearly labelled synthetic history for inspection.
    // No pre-existing programs, users, passwords, volumes or settings are reset.
  }
});
