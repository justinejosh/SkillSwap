import { test, expect, Page } from "@playwright/test";

async function forumFixture(page: Page, owner = true) {
  const state = { deleted: false, failDelete: false, failLoad: false, posts: 0, replies: 0 };
  await page.addInitScript(() => {
    localStorage.setItem("knoxite_token", "synthetic-ui-session");
    localStorage.setItem("knoxite_user", JSON.stringify({ id: "viewer", role: "USER", name: "Same Name" }));
    localStorage.setItem("knoxite_onboarding_completed", "true");
  });
  const post = { id: "discussion", authorId: owner ? "viewer" : "someone-else", author: { id: owner ? "viewer" : "someone-else", name: "Same Name" }, title: "Synthetic discussion", content: "Synthetic content only", category: "GENERAL", createdAt: "2026-01-01T00:00:00Z", comments: [] };
  await page.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.origin === "http://127.0.0.1:5174") return route.continue();
    if (u.origin !== "http://127.0.0.1:5009") return route.abort();
    const p = u.pathname;
    if (p === "/api/profile") return route.fulfill({ json: { id: "viewer", role: "USER", name: "Same Name", offeredSkills: [], wantedSkills: [] } });
    if (p === "/api/auth/session-status") return route.fulfill({ json: { enabled: false } });
    if (p === "/api/forum/posts/discussion" && route.request().method() === "DELETE") {
      state.posts++;
      if (state.failDelete) return route.fulfill({ status: 503, json: { error: "Synthetic deletion unavailable" } });
      state.deleted = true; return route.fulfill({ json: { message: "Thread removed." } });
    }
    if (p === "/api/forum/posts/discussion") return route.fulfill({ json: post });
    if (p === "/api/forum/posts") {
      if (state.failLoad) return route.fulfill({ status: 503, json: { error: "Synthetic forum unavailable" } });
      return route.fulfill({ json: state.deleted ? [] : [post] });
    }
    return route.fulfill({ json: [] });
  });
  return Object.assign(state, { post });
}

test("post deletion uses exact ownership, confirmation and recoverable errors", async ({ page }) => {
  const state = await forumFixture(page);
  await page.goto("/community-forum/discussion");
  await page.getByRole("button", { name: "Delete Post", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep Post" }).click();
  await expect(page.getByRole("button",{name:"Delete Post",exact:true})).toBeFocused();
  expect(state.posts).toBe(0);
  state.failDelete = true;
  await page.getByRole("button", { name: "Delete Post", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Post", exact: true }).click();
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("Synthetic deletion unavailable");
  state.failDelete = false;
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete Post", exact: true }).click();
  await expect(page).toHaveURL(/\/community-forum$/);
  await expect(page.getByText("No active discussions yet", { exact: true })).toBeVisible();
});

test("another author with the same name has no owner-delete control", async ({ page }) => {
  await forumFixture(page, false);
  await page.goto("/community-forum/discussion");
  await expect(page.getByRole("heading", { name: "Synthetic discussion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete Post", exact: true })).toHaveCount(0);
});

test("forum error is distinct from empty and can retry without losing the header", async ({ page }) => {
  const state = await forumFixture(page); state.failLoad = true;
  await page.goto("/community-forum");
  await expect(page.getByRole("alert")).toContainText("Synthetic forum unavailable");
  await expect(page.getByText("No active discussions yet", { exact: true })).toHaveCount(0);
  state.failLoad = false;
  await page.getByRole("button", { name: "Retry discussions" }).click();
  await expect(page.getByText("Synthetic discussion", { exact: true })).toBeVisible();
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      await page.evaluate(d => document.documentElement.classList.toggle("dark", d), dark);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("email verification handles missing links, retry, success and return navigation", async ({ page }) => {
  let fail = true, submissions = 0;
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname === "/api/auth/verify-email") {
      submissions++;
      return route.fulfill({ status: fail ? 422 : 200, json: fail ? { error: "Synthetic expired verification link" } : { message: "Email verified. You can now sign in." } });
    }
    return route.fulfill({ json: { google: { enabled: false }, emailDeliveryAvailable: false } });
  });
  await page.goto("/verify-email");
  await expect(page.getByRole("button", { name: "Verify Email" })).toBeDisabled();
  await expect(page.getByText(/Open the verification link/)).toBeVisible();
  await page.goto("/verify-email#token=synthetic-verification-only");
  await page.getByRole("button", { name: "Verify Email" }).click();
  await expect(page.getByRole("alert")).toContainText("expired verification");
  fail = false;
  await page.getByRole("button", { name: "Verify Email" }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await expect(page.getByRole("button", { name: "Verify Email" })).toHaveCount(0);
  expect(submissions).toBe(2);
  expect(new URL(page.url()).hash).toBe("");
  await page.getByRole("link", { name: "Return to sign in or request a new link" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("forum cards are keyboard links and long author names stay inside the card",async({page},info)=>{
  const state=await forumFixture(page);
  state.post.author.name="SyntheticLongStudentName".repeat(10);
  await page.setViewportSize({width:320,height:840});
  await page.goto("/community-forum");
  await expect(page.getByLabel("Search discussions",{exact:true})).toBeVisible();
  await expect(page.getByLabel("Filter discussions by category",{exact:true})).toBeVisible();
  await expect(page.getByText("Synthetic discussion",{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath("forum-keyboard-review.png")});
  const title=page.getByText("Synthetic discussion",{exact:true});
  expect(await title.evaluate(el=>el.closest("a")?.getAttribute("href")||null)).toBe("/community-forum/discussion");
  const card=page.getByRole("link",{name:"Synthetic discussion",exact:true});
  await expect(card).toHaveCSS("display","block");
  for(const dark of [false,true]){
    await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);
    expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await card.focus();await expect(card).toBeFocused();
  }
  await page.keyboard.press("Enter");await expect(page).toHaveURL(/\/community-forum\/discussion$/);
});
