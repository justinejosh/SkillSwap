import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const catalog = JSON.parse(
  readFileSync(resolve("knoxite-backend/config/academic-catalog.json"), "utf8"),
);
async function fixture(page: Page, initialTier = "NOT_ASSESSED") {
  const state = {
    tier: initialTier,
    basicDismissed: false,
    advancedDismissed: false,
    offered: [] as any[],
    wanted: [] as any[],
    level: "BASIC",
    result: null as any,
    submits: [] as any[],
    matches: [] as any[],
    requests: [] as any[],
  };
  const programs = catalog.programs.map((p: any, i: number) => ({
    ...p,
    id: `program-${i}`,
    yearLevels: catalog.yearLevels.map((y: any) => ({ ...y, id: y.code })),
  }));
  const profile = () => ({
    id: "owner",
    name: "Synthetic Student",
    role: "USER",
    email: "syntheticlag@fixture.example",
    avatarUrl: null,
    bio: "Synthetic portfolio",
    programId: programs[3].id,
    yearLevelId: "YEAR_1",
    program: programs[3],
    yearLevel: { id: "YEAR_1", name: "1st Year" },
    department: null,
    offeredSkills: state.offered.map((s) => ({
      ...s,
      tier: state.tier,
      basicPromptDismissed: state.basicDismissed,
      advancedPromptDismissed: state.advancedDismissed,
    })),
    wantedSkills: state.wanted,
    metrics: { averageRating: null, ratingCount: 0, completedSwaps: 0 },
  });
  const availability = () => ({
    offeringId: "offering",
    skillName: "Fixture Supported",
    tier: state.tier,
    levels: [
      {
        level: "BASIC",
        supported: true,
        eligible: state.tier === "NOT_ASSESSED",
        reason:
          state.tier === "NOT_ASSESSED"
            ? "Assessment available."
            : "This tier has already been earned.",
        passingPercent: 80,
        questionCount: 10,
        learningOutcomes: "Synthetic foundational reasoning outcomes.",
        attemptCount: 0,
        activeAttemptId: null,
        nextEligibleAt: null,
      },
      {
        level: "ADVANCED",
        supported: true,
        eligible: state.tier === "AMATEUR",
        reason:
          state.tier === "AMATEUR"
            ? "Assessment available."
            : "Earn Amateur for this skill first.",
        passingPercent: 80,
        questionCount: 5,
        learningOutcomes: "Synthetic applied scenario reasoning outcomes.",
        attemptCount: 0,
        activeAttemptId: null,
        nextEligibleAt: null,
      },
    ],
    attempts: [],
  });
  const attempt = () =>
    state.result || {
      id: "attempt",
      offeringId: "offering",
      skillName: "Fixture Supported",
      level: state.level,
      tier: state.tier,
      status: "IN_PROGRESS",
      assessmentVersion: 1,
      learningOutcomes:
        state.level === "BASIC"
          ? "Synthetic foundational reasoning outcomes."
          : "Synthetic applied scenario reasoning outcomes.",
      passingPercent: 80,
      expiresAt: new Date(Date.now() + 1200000).toISOString(),
      score: null,
      advancedPromptDismissed: state.advancedDismissed,
      questions: Array.from(
        { length: state.level === "BASIC" ? 10 : 5 },
        (_, i) => ({
          id: `question-${i}`,
          kind: state.level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE",
          prompt: `Synthetic fixture prompt ${i + 1}`,
          points: 1,
          options: [
            { id: `a-${i}`, text: `Choice A ${i + 1}` },
            { id: `b-${i}`, text: `Choice B ${i + 1}` },
          ],
        }),
      ),
    };
  await page.addInitScript(() => {
    localStorage.setItem("knoxite_token", "synthetic-session");
    localStorage.setItem(
      "knoxite_user",
      JSON.stringify({ id: "owner", name: "Synthetic Student", role: "USER" }),
    );
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") {
      await route.continue();
      return;
    }
    if (url.origin !== "http://127.0.0.1:5009") {
      await route.abort();
      return;
    }
    const path = url.pathname.replace(/^\/api/, "");
    const method = route.request().method();
    const body = route.request().postDataJSON();
    let data: any = {};
    if (path === "/profile") data = profile();
    else if (path.endsWith("academic-options"))
      data = { programs, yearLevels: programs[0].yearLevels };
    else if (path === "/profile/skills/offer" && method === "POST") {
      const supported = body.name === "Fixture Supported";
      const skill = {
        id: "skill",
        offeringId: "offering",
        name: body.name,
        category: body.category,
        tier: state.tier,
        basicAvailable: supported,
        advancedAvailable: supported,
      };
      if (!state.offered.length) state.offered.push(skill);
      data = {
        skill,
        created: true,
        offering: {
          id: "offering",
          tier: state.tier,
          basicAvailable: supported,
          basicPromptDismissed: state.basicDismissed,
        },
      };
    } else if (path === "/profile/skills/want" && method === "POST") {
      state.wanted.push({
        id: "wanted",
        name: body.name,
        category: body.category,
      });
      data = { message: "Saved" };
    } else if (path.endsWith("/prompts")) {
      if (body.level === "BASIC") state.basicDismissed = true;
      else state.advancedDismissed = true;
      data = { message: "Dismissed" };
      if (state.result)
        state.result.advancedPromptDismissed = state.advancedDismissed;
    } else if (path === "/assessments/offerings/offering")
      data = availability();
    else if (path === "/assessments/offerings/offering/attempts") {
      state.level = body.level;
      state.result = null;
      data = attempt();
    } else if (path === "/assessments/attempts/attempt/submit") {
      state.submits.push(body);
      const passed = state.level === "BASIC";
      if (passed) state.tier = "AMATEUR";
      state.result = {
        ...attempt(),
        questions: [],
        status: passed ? "PASSED" : "FAILED",
        tier: state.tier,
        score: passed ? 80 : 60,
        earnedPoints: passed ? 8 : 3,
        possiblePoints: passed ? 10 : 5,
      };
      data = state.result;
    } else if (path === "/assessments/attempts/attempt") data = attempt();
    else if (path === "/users/peer/profile")
      data = {
        ...profile(),
        id: "peer",
        name: "Synthetic Peer",
        offeredSkills: Array.from({ length: 12 }, (_, i) => ({
          id: `offered-${i}`,
          name: `Teaching topic ${i + 1}`,
          category: "academic",
          tier: i === 0 ? "VERIFIED" : "NOT_ASSESSED",
        })),
        wantedSkills: Array.from({ length: 12 }, (_, i) => ({
          id: `wanted-${i}`,
          name: `Learning topic ${i + 1}`,
          category: "academic",
        })),
      };
    else if (path === "/swaps/request" && method === "POST") {
      state.requests.push(body);
      data = { id: "synthetic-request", status: "PENDING" };
    } else if (path === "/matches") data = state.matches;
    else if (["/swaps", "/swap-requests"].includes(path)) data = [];
    else {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unknown synthetic endpoint" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    });
  });
  return state;
}
async function addSkill(page: Page, name: string) {
  await page.getByRole("button", { name: "+ Add Skill", exact: true }).click();
  await page.getByPlaceholder("e.g., UI Design, SQL, Python...").fill(name);
  await page.getByRole("button", { name: "Save Skill", exact: true }).click();
}
test("saving a supported offering precedes a persistent skip confirmation", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto("/my-skills");
  await addSkill(page, "Fixture Supported");
  await expect(page.getByRole("dialog")).toContainText(
    "Your teaching skill is saved",
  );
  expect(state.offered).toHaveLength(1);
  await page.getByRole("button", { name: "Skip for Now" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    'remain marked "Not Assessed"',
  );
  await page.getByRole("button", { name: "Confirm Skip" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.basicDismissed).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Take Assessment", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("unsupported teaching skills remain available without invented assessments", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/my-skills");
  await addSkill(page, "Unsupported fixture skill");
  await expect(page.getByRole("status")).toContainText(
    "Assessment is unavailable",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Take Assessment", exact: true }),
  ).toHaveCount(0);
});
test("basic pass uses the returned score, offers advanced and preserves Amateur after advanced failure", async ({
  page,
}) => {
  const state = await fixture(page);
  state.offered.push({
    id: "skill",
    offeringId: "offering",
    name: "Fixture Supported",
    category: "technology",
    basicAvailable: true,
    advancedAvailable: true,
  });
  await page.goto("/assessments/offerings/offering");
  await page
    .getByRole("button", { name: "Take Basic Assessment", exact: true })
    .click();
  await expect(page.getByRole("radio")).toHaveCount(20);
  for (let i = 1; i <= 10; i++)
    await page
      .getByRole("radio", { name: `Choice A ${i}`, exact: true })
      .check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "You've earned the Amateur badge",
  );
  expect(Object.keys(state.submits[0])).toEqual(["answers"]);
  await page.getByRole("button", { name: "Maybe Later", exact: true }).click();
  await expect(
    page.getByText("8/10 points (80.0%)", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/assessments/offerings/offering");
  await page
    .getByRole("button", { name: "Take Advanced Assessment", exact: true })
    .click();
  await expect(
    page.getByText("Advanced assessment format: applied scenario choices", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic applied scenario reasoning outcomes.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("no hands-on performance is observed", { exact: false }),
  ).toBeVisible();
  for (let i = 1; i <= 5; i++)
    await page
      .getByRole("radio", { name: `Choice A ${i}`, exact: true })
      .check();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Submit Assessment", exact: true })
    .click();
  await expect(
    page.getByText("Your current skill tier is Amateur.", { exact: false }),
  ).toBeVisible();
  expect(state.tier).toBe("AMATEUR");
});
test("portfolio contains complete lists, truthful empty metrics and badge meanings", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/students/peer");
  await expect(
    page.getByRole("heading", { name: "Synthetic Peer" }),
  ).toBeVisible();
  await expect(
    page.getByText("Teaching topic 12", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Learning topic 12", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No reviews yet", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Badges apply to individual skills", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("BSCS", { exact: false })).toBeVisible();
  await expect(
    page.getByLabel(
      "Verified: passed Knoxite's advanced scenario-based assessment for this skill. This is not an observed practical test or professional certification.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText("syntheticlag@fixture.example", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("registration uses server-configured college programs and program year levels", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/signup");
  const program = page.getByLabel("College program", { exact: true });
  await expect(program.locator("option")).toHaveCount(14);
  await program.selectOption({ label: "BS PHARM" });
  await expect(
    page.getByLabel("Year level", { exact: true }).locator("option"),
  ).toHaveCount(5);
  await expect(
    page.getByText("Senior High School", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Department", { exact: true })).toHaveCount(0);
});

test("server-authoritative roles recover a tampered browser role without a redirect loop", async ({
  page,
}) => {
  await fixture(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "knoxite_user",
      JSON.stringify({ id: "owner", name: "Synthetic Student", role: "ADMIN" }),
    ),
  );
  await page.goto("/admin/assessments");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Compatible Peer Matches" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("knoxite_user")!).role,
    ),
  ).toBe("USER");
});
test("failed public profile requests show errors rather than fabricated zero metrics", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/users/peer/profile", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Synthetic profile fetch failure" }),
    }),
  );
  await page.goto("/students/peer");
  await expect(page.getByRole("alert")).toHaveText(
    "Synthetic profile fetch failure",
  );
  await expect(page.getByText("No reviews yet", { exact: true })).toHaveCount(
    0,
  );
});
test("reciprocal match cards show evidence gaps and provide a working public-profile action", async ({
  page,
}) => {
  const state = await fixture(page);
  state.matches.push({
    id: "peer",
    name: "Synthetic Peer",
    avatarUrl: null,
    matchScore: null,
    offeredSkills: [
      { id: "s1", name: "Fixture teaching", tier: "NOT_ASSESSED" },
    ],
    wantedSkills: [{ id: "s2", name: "Fixture learning" }],
    matchDetails: {
      averageRating: null,
      ratingCount: 0,
      completionRate: null,
      proximity: { value: null, reason: "Academic information is incomplete." },
      missing: ["No validated peer ratings", "Incomplete academic information"],
    },
  });
  await page.goto("/knox-hub");
  await expect(page.getByText("Unranked", { exact: true })).toBeVisible();
  await expect(page.getByText("4.8", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "View Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/students\/peer$/);
  await expect(
    page.getByRole("heading", { name: "Synthetic Peer" }),
  ).toBeVisible();
});

function unrankedPeer(id = "peer", name = "Synthetic Peer") {
  return {
    id,
    name,
    avatarUrl: null,
    matchScore: null,
    offeredSkills: [
      { id: "teach", name: "Fixture teaching", tier: "NOT_ASSESSED" },
    ],
    wantedSkills: [{ id: "learn", name: "Fixture learning" }],
    matchingOfferedSkills: [
      { id: "teach", name: "Fixture teaching", tier: "NOT_ASSESSED" },
    ],
    matchingWantedSkills: [{ id: "learn", name: "Fixture learning" }],
    matchDetails: {
      averageRating: null,
      ratingCount: 0,
      completionRate: null,
      proximity: { value: null, reason: "Academic information is incomplete." },
      missing: [
        "No validated peer ratings",
        "Completion-rate evidence unavailable",
        "Incomplete academic information",
      ],
    },
  };
}
for (const path of ["/dashboard", "/knox-hub"]) {
  test(`new unranked students can send reciprocal swap requests from ${path}`, async ({
    page,
  }) => {
    const state = await fixture(page);
    // Isolate matching from the separately existing onboarding tour.
    await page.addInitScript(() =>
      localStorage.setItem("knoxite_onboarding_completed", "true"),
    );
    state.matches.push(unrankedPeer());
    await page.goto(path);
    const group = page.getByRole("region", {
      name: "Matches awaiting enough evidence (1)",
      exact: true,
    });
    await expect(group).toBeVisible();
    await expect(group.getByText("Unranked", { exact: true })).toBeVisible();
    await expect(
      group.getByText(
        "You can request a swap while this score is unavailable.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Awaiting evidence (1)", exact: true }),
    ).toBeVisible();
    const request = group.getByRole("button", {
      name: "Request Swap",
      exact: true,
    });
    await expect(request).toBeEnabled();
    await request.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Send Swap Request", exact: true })
      .click();
    await expect.poll(() => state.requests.length).toBe(1);
    expect(state.requests[0]).toEqual({
      receiverId: "peer",
      offeredSkillId: "learn",
      wantedSkillId: "teach",
      message: expect.any(String),
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
test("mixed cohorts keep unranked matches in a separate visible group without assigning zero", async ({
  page,
}) => {
  const state = await fixture(page);
  const peer = unrankedPeer();
  state.matches.push(
    {
      ...unrankedPeer("scored", "Synthetic Scored Peer"),
      matchScore: 81,
      matchDetails: {
        averageRating: 4.5,
        ratingCount: 2,
        completionRate: 0.8,
        proximity: {
          value: 0.6,
          reason: "Different department, same year level.",
        },
        missing: [],
      },
    },
    peer,
  );
  await page.goto("/knox-hub");
  await expect(
    page.getByRole("region", { name: "Matches awaiting enough evidence (1)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Matches with WRMR scores (1)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Awaiting evidence (1)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "With WRMR scores (1)", exact: true }),
  ).toBeVisible();
  const unranked = page.getByRole("article", {
    name: "Synthetic Peer reciprocal match",
    exact: true,
  });
  await expect(unranked.getByText("Unranked", { exact: true })).toBeVisible();
  await expect(unranked).not.toContainText("0.0% WRMR");
  await expect(page.getByText("81.0% WRMR", { exact: true })).toBeVisible();
  expect(
    await page.getByRole("article").first().getAttribute("aria-label"),
  ).toBe("Synthetic Peer reciprocal match");
});
