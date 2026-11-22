import { test, expect, Page } from "@playwright/test";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWNQTX6tmvyaAUIBACWKBc2Bdg5IAAAAAElFTkSuQmCC", "base64");
const webp = Buffer.from("UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoCAAIAAUAmJaACdLoB+AADsAD+71Ev/ucD2cD2cD+Ov/5sCBmh86AA", "base64");
async function themeColors(page:Page,dark:boolean){
  return page.evaluate(value=>{const sample=document.createElement("span");sample.style.backgroundColor=value?"var(--color-slate-900)":"white";sample.style.color=value?"var(--color-slate-100)":"var(--color-slate-900)";document.body.append(sample);const style=getComputedStyle(sample),result={background:style.backgroundColor,color:style.color};sample.remove();return result;},dark);
}
async function fixture(page: Page, role = "USER", enabled = true) {
  const state: any = { uploads: 0, json: [], failUpload: false, failPreview: false, requests: [], mutations: [], audits: [], replies: [{ id: "reply", content: "Synthetic reply for human moderation", author: { id: "peer", name: "Synthetic Author" }, createdAt: "2026-11-23T00:00:00Z" }] };
  await page.addInitScript(role => {
    localStorage.setItem("knoxite_token", "synthetic-evidence-browser-session"); localStorage.setItem("knoxite_user", JSON.stringify({ id: "viewer", role })); localStorage.setItem("knoxite_onboarding_completed", "true");
    const revoke = URL.revokeObjectURL.bind(URL); (window as any).revokedImages = []; URL.revokeObjectURL = value => { (window as any).revokedImages.push(value); revoke(value); };
  }, role);
  const report = { id: "report", reporter: { id: "viewer", name: "Synthetic Reporter" }, target: { id: "peer", name: "Synthetic Target" }, reason: "OTHER", description: "Synthetic concern with a private supporting image", status: "PENDING", hasEvidence: true, createdAt: "2026-11-23T00:00Z" };
  await page.route("**/*", async route => {
    const u = new URL(route.request().url()), path = u.pathname, method = route.request().method();
    if (u.origin === "http://127.0.0.1:5174") return route.continue(); if (u.origin !== "http://127.0.0.1:5009") return route.abort(); state.requests.push(`${method} ${path}`);
    if (path === "/api/profile") return route.fulfill({ json: { id: "viewer", role, name: "Synthetic Viewer", offeredSkills: [], wantedSkills: [] } });
    if (path === "/api/auth/session-status") return route.fulfill({ json: { enabled: false } });
    if (path === "/api/reports/capabilities") return route.fulfill({ json: { imageEvidenceEnabled: enabled } });
    if (path === "/api/reports") {
      if (method === "POST") {
        if ((route.request().headers()["content-type"] || "").startsWith("multipart/form-data")) { state.uploads++; expect(route.request().postDataBuffer()!.includes(png)).toBe(true); if (state.failUpload) return route.fulfill({ status: 503, json: { error: "Synthetic upload failed. No report was created." } }); }
        else state.json.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: { id: "new", status: "PENDING" } });
      }
      return route.fulfill({ json: [] });
    }
    if (path === "/api/admin/reports") return route.fulfill({ json: [report] });
    if (path === "/api/admin/reports/report/evidence") return state.failPreview ? route.fulfill({ status: 503, json: { error: "Synthetic private storage unavailable" } }) : route.fulfill({ body: webp, contentType: "image/webp", headers: { "Cache-Control": "private, no-store" } });
    if (path === "/api/admin/moderation-audit") return route.fulfill({ json: { records: state.audits, total: state.audits.length, page: 1, pageSize: 20 } });
    const post = { id: "thread", title: "Synthetic moderation thread", content: "Original thread retained", category: "GENERAL", author: { id: "peer", name: "Synthetic Author" }, createdAt: "2026-11-23T00:00Z", _count: { comments: state.replies.length } };
    if (path === "/api/forum/posts/thread/comments/reply" && method === "DELETE") { const body = route.request().postDataJSON(); state.mutations.push(body); state.audits.push({ id: "audit", administratorId: "viewer", threadId: "thread", commentId: "reply", commentAuthorId: "peer", action: "DELETE_REPLY", ...body, createdAt: "2026-11-23T00:00Z" }); state.replies = []; return route.fulfill({ json: { message: "Reply removed." } }); }
    if (path === "/api/forum/posts") return route.fulfill({ json: [post] });
    if (path === "/api/forum/posts/thread") return route.fulfill({ json: { ...post, comments: state.replies } });
    return route.fulfill({ json: [] });
  }); return state;
}
test("disabled evidence shows only a neutral note while text reporting works", async ({ page }) => {
  const state = await fixture(page, "USER", false); await page.goto("/report?userId=peer"); await expect(page.locator('input[type="file"]')).toHaveCount(0); await expect(page.getByText("Image attachments are not available yet.", { exact: false })).toBeVisible();
  await page.getByLabel("Description", { exact: true }).fill("Synthetic text-only concern"); await page.getByRole("button", { name: "Submit Report", exact: true }).click(); await expect.poll(() => state.json.length).toBe(1); expect(state.uploads).toBe(0);
});
test("enabled image selection previews, replaces and removes without persisting files in browser storage", async ({ page }) => {
  await fixture(page); await page.goto("/report?userId=peer"); const input = page.getByLabel("Supporting Evidence (Optional)", { exact: true });
  await input.setInputFiles({ name: "first.png", mimeType: "image/png", buffer: png }); const preview = page.getByAltText("Selected supporting evidence preview"); await expect(preview).toBeVisible(); const old = await preview.getAttribute("src");
  await input.setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: png }); await expect.poll(() => preview.getAttribute("src")).not.toBe(old); expect(await page.evaluate(value => (window as any).revokedImages.includes(value), old)).toBe(true);
  for (const width of [320, 375, 390, 430, 1280]) { await page.setViewportSize({ width, height: 900 }); for (const dark of [false, true]) { await page.evaluate(d => document.documentElement.classList.toggle("dark", d), dark); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); } }
  await page.getByRole("button", { name: "Remove Image", exact: true }).click(); await expect(preview).toHaveCount(0); expect(await page.evaluate(() => Object.values(localStorage).some(value => value.includes("first.png") || value.startsWith("data:image")))).toBe(false);
});
test("upload failure retains the chosen image and description; successful retry submits multipart exactly once", async ({ page }) => {
  const state = await fixture(page); state.failUpload = true; await page.goto("/report?userId=peer"); await page.getByLabel("Description", { exact: true }).fill("Synthetic description to retain"); await page.getByLabel("Supporting Evidence (Optional)", { exact: true }).setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: png }); await expect(page.getByAltText("Selected supporting evidence preview")).toBeVisible();
  await page.getByRole("button", { name: "Submit Report", exact: true }).click(); await expect(page.getByRole("alert")).toContainText("No report was created"); await expect(page.getByAltText("Selected supporting evidence preview")).toBeVisible(); await expect(page.getByLabel("Description", { exact: true })).toHaveValue("Synthetic description to retain"); expect(state.json).toHaveLength(0);
  state.failUpload = false; await page.getByRole("button", { name: "Submit Report", exact: true }).click(); await expect(page.getByRole("status").filter({ hasText: "Report saved" })).toBeVisible(); await expect(page.getByAltText("Selected supporting evidence preview")).toHaveCount(0); expect(state.uploads).toBe(2);
});
test("invalid and oversized selections block submission until explicitly removed or replaced", async ({ page }) => {
  const state = await fixture(page); await page.goto("/report?userId=peer"); await page.getByLabel("Description", { exact: true }).fill("Synthetic concern"); const input = page.getByLabel("Supporting Evidence (Optional)", { exact: true }), submit = page.getByRole("button", { name: "Submit Report", exact: true });
  for (const file of [{ name: "unsupported.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }, { name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5*1024*1024+1) }, { name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") }]) { await input.setInputFiles(file); await expect(page.getByRole("alert")).toBeVisible(); await expect(submit).toBeDisabled(); }
  expect(state.uploads).toBe(0); await page.getByRole("button", { name: "Remove Image", exact: true }).click(); await expect(submit).toBeEnabled(); await submit.click(); await expect.poll(() => state.json.length).toBe(1);
});
test("administrator reason is required, audited, and viewable after the reply is gone", async ({ page }, info) => {
  if(info.project.name==="mobile")await page.setViewportSize({width:320,height:640});
  const state = await fixture(page, "ADMIN"); await page.goto("/admin-dashboard?section=forum"); await page.getByRole("button", { name: "Inspect thread", exact: true }).click(); await page.getByRole("button", { name: "Delete reply by Synthetic Author", exact: true }).click(); const dialog = page.getByRole("alertdialog"), remove = dialog.getByRole("button", { name: "Delete Reply", exact: true }); await expect(remove).toBeDisabled();
  await page.getByLabel("Moderation reason", { exact: true }).selectOption("OTHER"); await expect(remove).toBeDisabled(); await page.getByLabel("Short explanation", { exact: true }).fill("Synthetic review reason only");
  for (const dark of [false, true]) { await page.evaluate(value => document.documentElement.classList.toggle("dark", value), dark); const expected = await themeColors(page,dark); await expect(dialog).toHaveCSS("background-color",expected.background); await expect(dialog).toHaveCSS("color",expected.color); }
  await dialog.screenshot({path:info.outputPath("moderation-dark.png")});
  await remove.click(); await expect(dialog).toHaveCount(0); expect(state.mutations).toEqual([{ reason: "OTHER", explanation: "Synthetic review reason only" }]);
  await expect(page.getByText("Original thread retained", { exact: true })).toBeVisible(); await page.getByRole("button", { name: "View moderation history", exact: true }).click(); const audit = page.getByRole("region", { name: "Moderation audit history", exact: true }); await expect(audit).toContainText("Synthetic review reason only"); await expect(audit).not.toContainText("Synthetic reply for human moderation"); await audit.getByText("Affected records", { exact: true }).click(); await expect(audit).toContainText("viewer"); await expect(audit).toContainText("reply");
});
test("administrator private preview uses a revocable blob and shows safe storage errors", async ({ page }, info) => {
  const state = await fixture(page, "ADMIN"); await page.goto("/admin/assessments?section=reports"); await page.getByRole("button", { name: "View Evidence", exact: true }).click(); const dialog = page.getByRole("dialog"); const image = dialog.getByAltText("Supporting image attached to this report"); await expect(image).toBeVisible(); const url = await image.getAttribute("src"); expect(url).toMatch(/^blob:/);
  for (const dark of [false,true]) { await page.evaluate(value => document.documentElement.classList.toggle("dark", value), dark); await expect(dialog).toHaveCSS("background-color",(await themeColors(page,dark)).background); }
   await dialog.screenshot({path:info.outputPath("evidence-preview-dark.png")}); await expect(dialog).toContainText("Synthetic concern with a private supporting image"); await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); expect(await page.evaluate(value => (window as any).revokedImages.includes(value), url)).toBe(true);
  state.failPreview = true; await page.getByRole("button", { name: "View Evidence", exact: true }).click(); await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Synthetic private storage unavailable"); await expect(page.getByAltText("Supporting image attached to this report")).toHaveCount(0);
});
