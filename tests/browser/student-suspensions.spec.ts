import { test, expect, Page } from "@playwright/test";
import { suspensionDate } from "../../src/app/lib/suspensionNotice";

const email = "syntheticstudentlag@fixture.example";
const notice = { legacy: false, reason: "Spam or misuse", reasonExplanation: null, explanation: "Synthetic student-facing explanation.", startsAt: "2026-11-26T02:00:00Z", expiresAt: "2026-12-03T02:00:00Z" };
async function fixture(page: Page, role = "ADMIN", theme = "light") {
  const state: any = { requests: [], previews: [], confirmations: [], failPreview: false, failHistory: false, hold: null, history: [], creationEnabled: true, suspended: false, legacy: false };
  await page.addInitScript(({ role, theme }) => {
    if (role !== "anonymous") { localStorage.setItem("knoxite_token", "synthetic-session"); localStorage.setItem("knoxite_user", JSON.stringify({ id: "admin", role })); localStorage.setItem("theme_admin", theme); }
    localStorage.setItem("knoxite_onboarding_completed", "true");
  }, { role, theme });
  await page.route("**/*", async route => {
    const u = new URL(route.request().url()), p = u.pathname, method = route.request().method();
    if (u.origin === "http://127.0.0.1:5174") return route.continue();
    if (u.href === "https://accounts.google.com/gsi/client") return route.fulfill({ contentType: "application/javascript", body: `window.google={accounts:{id:{initialize:function(o){window.syntheticGoogle=o},renderButton:function(el){const b=document.createElement('button');b.type='button';b.textContent='Synthetic Google';b.onclick=function(){window.syntheticGoogle.callback({credential:'synthetic-id-token'})};el.appendChild(b)}}}};` });
    if (u.origin !== "http://127.0.0.1:5009") return route.abort();
    state.requests.push(`${method} ${p}`); const body = route.request().postDataJSON();
    const ok = (json: any, status = 200) => route.fulfill({ status, json });
    if (p === "/api/profile") return ok({ id: "admin", name: "Synthetic Admin", role, offeredSkills: [], wantedSkills: [] });
    if (p === "/api/auth/session-status") return ok({ enabled: false });
    if (p === "/api/auth/recovery-options") return ok({ emailDeliveryAvailable: true });
    if (p === "/api/auth/providers") return ok({ google: { enabled: true, clientId: "synthetic.apps.googleusercontent.com" } });
    if (p === "/api/auth/academic-options") return ok({ programs: [], yearLevels: [], registrationPolicy: { available: true, approved: false, noticeVersion: "SYNTHETIC_ONLY" } });
    if (p === "/api/auth/google/challenge") return ok({ challengeId: "synthetic-challenge", nonce: "n".repeat(43) });
    if (p === "/api/auth/login" || p === "/api/auth/google/login") {
      if (p.endsWith("/login") && !p.includes("google") && body.password !== "synthetic-suspension-password") return ok({ error: "Invalid email or password." }, 401);
      return ok({ error: "Your account access is suspended.", details: { code: "ACCOUNT_SUSPENDED", suspension: state.legacy ? { legacy: true, reason: null, reasonExplanation: null, explanation: "A legacy restriction requires administrator review.", startsAt: null, expiresAt: null } : notice } }, 403);
    }
    if (p === "/api/admin/users") return ok({ users: [{ id: "student", name: "Synthetic Student", email, role: "USER", isSuspended: state.suspended, activeSuspensionId: state.suspended && !state.legacy ? "restriction" : null, createdAt: "2026-01-01T00:00Z" }, { id: "admin", name: "Synthetic Admin", email: "admin@fixture.example", role: "ADMIN", isSuspended: false }], total: 2, page: 1, pageSize: 20, suspensionCreationEnabled: state.creationEnabled });
    if (p === "/api/admin/users/student/suspensions/preview") { state.previews.push(body); if(!state.creationEnabled)return ok({error:"New suspensions are disabled. Existing restrictions, expiry and history remain active."},503); if (state.failPreview) return ok({ error: "Synthetic preview unavailable" }, 503); return ok({ student: { name: "Synthetic Student", email }, reviewedAt: notice.startsAt, confirmationToken: "synthetic-confirmation-proof" }); }
    if (p === "/api/admin/users/student/suspensions" && method === "POST") {
      if(!state.creationEnabled)return ok({error:"New suspensions are disabled."},503); state.confirmations.push(body); if (state.hold) await state.hold;
      state.suspended = true; state.history = [{ id: "restriction", ...body, durationDays: body.durationDays, startsAt: "2026-11-26T02:01:00Z", expiresAt: "2026-12-03T02:01:00Z", status: "ACTIVE", administrator: { name: "Synthetic Admin" }, events: [{ action: "SUSPENDED", createdAt: notice.startsAt, actorAdministrator: { name: "Synthetic Admin" } }] }];
      return ok({ message: "Student temporarily suspended. Existing sessions were revoked; account history is retained.", suspension: state.history[0] }, 201);
    }
    if (p === "/api/admin/users/student/suspensions") { if (state.failHistory) return ok({ error: "Synthetic history unavailable" }, 503); const n = Number(u.searchParams.get("page")); return ok({ student: { name: "Synthetic Student", isSuspended: state.suspended, legacyRestriction: state.legacy }, total: state.history.length, page: n, pageSize: 10, suspensions: state.history.slice((n-1)*10,n*10) }); }
    if (p === "/api/admin/reports") return ok([{ id: "report", reporter: { name: "Synthetic Reporter" }, target: { id: "student", name: "Synthetic Student" }, reason: "OTHER", description: "Synthetic report is not a disciplinary decision.", status: "PENDING", createdAt: notice.startsAt }]);
    return ok([]);
  });
  return state;
}
async function completeForm(page: Page) {
  const d = page.getByRole("alertdialog");
  await d.getByRole("combobox", { name: /^Suspension reason/ }).selectOption("OTHER");
  await d.getByLabel("Explain Other", { exact: true }).fill("Synthetic reviewed reason");
  await d.getByRole("combobox", { name: /^Suspension duration/ }).selectOption("7");
  await d.getByRole("textbox", { name: "Student-facing explanation", exact: true }).fill(notice.explanation);
  await d.getByRole("textbox", { name: "Private administrator notes (optional)", exact: true }).fill("PRIVATE SYNTHETIC NOTES");
  return d;
}

for (const theme of ["light", "dark"]) {
  test(`${theme} suspension dialog validates, preserves values, confirms once and shows private ADMIN history`, async ({ page }, info) => {
    const state = await fixture(page, "ADMIN", theme); await page.goto("/admin-dashboard?section=students");
    const row = page.getByRole("row").filter({ hasText: email });
    await expect(page.getByRole("row").filter({ hasText: "admin@fixture.example" }).getByRole("button", { name: "Suspend account", exact: true })).toBeDisabled();
    await row.getByRole("button", { name: "Suspend account", exact: true }).click(); const d = page.getByRole("alertdialog");
    await expect(d.getByRole("button", { name: "Review Suspension", exact: true })).toBeDisabled();
    await completeForm(page); await d.getByLabel("Explain Other", { exact: true }).fill(" "); await expect(d.getByRole("button", { name: "Review Suspension", exact: true })).toBeDisabled();
    await d.getByLabel("Explain Other", { exact: true }).fill("Synthetic reviewed reason");
    state.failPreview = true; await d.getByRole("button", { name: "Review Suspension", exact: true }).click(); await expect(d.getByRole("alert")).toContainText("preview unavailable");
    state.failPreview = false; await d.getByRole("button", { name: "Review Suspension", exact: true }).click(); await expect(d).toContainText("The suspension begins when Confirm Suspension succeeds.");await expect(d.getByText("Exact expiration", { exact: true })).toHaveCount(0);
    await expect(d).toContainText("immediately revokes"); await expect(d).toContainText("7 days"); await expect(d).toContainText(notice.explanation);
    const originalViewport=page.viewportSize()!;
    for (const width of [320,390,1280]) { await page.setViewportSize({ width, height: 844 }); await d.getByRole("button", { name: "Confirm Suspension", exact: true }).scrollIntoViewIfNeeded(); await expect(d.getByRole("button", { name: "Confirm Suspension", exact: true })).toBeInViewport(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await page.setViewportSize(originalViewport);await d.getByRole("button",{name:"Confirm Suspension",exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:info.outputPath(`suspension-summary-${theme}.png`)});
    await d.getByRole("button", { name: "Cancel", exact: true }).click(); expect(state.confirmations).toHaveLength(0);
    await row.getByRole("button", { name: "Suspend account", exact: true }).click(); await expect(d.getByRole("textbox", { name: "Student-facing explanation", exact: true })).toHaveValue(notice.explanation);
    await d.getByRole("button", { name: "Review Suspension", exact: true }).click(); let release:()=>void=()=>{}; state.hold = new Promise<void>(resolve=>{release=resolve;});
    await d.getByRole("button", { name: "Confirm Suspension", exact: true }).click(); await expect(d.getByRole("button", { name: "Suspending...", exact: true })).toBeDisabled(); await d.getByRole("button", { name: "Suspending...", exact: true }).evaluate((b:HTMLButtonElement)=>b.click()); expect(state.confirmations).toHaveLength(1); release();
    await expect(d).toHaveCount(0);await expect(page.getByRole("status").filter({hasText:"Student temporarily suspended."})).toContainText("Started:");await expect(page.getByRole("status").filter({hasText:"Student temporarily suspended."})).toContainText(suspensionDate("2026-11-26T02:01:00Z")); await expect(row.getByRole("button", { name: "Suspend account", exact: true })).toBeDisabled();
    await row.getByRole("button", { name: "Suspension history for Synthetic Student", exact: true }).click();
    const history = page.getByRole("region", { name: "Student suspension history", exact: true }); await expect(history).toContainText("Active temporary suspension"); await expect(history).toContainText("PRIVATE SYNTHETIC NOTES"); await expect(history).toContainText("Suspended by Synthetic Admin");
    expect(state.confirmations[0]).toMatchObject({ durationDays:7, reason:"OTHER", reasonExplanation:"Synthetic reviewed reason", confirmationToken:"synthetic-confirmation-proof" });
    expect(state.requests.some((r:string)=>r.startsWith("DELETE"))).toBe(false);
  });
  test(`${theme} password proof shows a private notice without storing tokens or leaking failed-login details`, async ({page},info)=>{
    const state=await fixture(page,"anonymous",theme);await page.goto("/login");await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),theme==="dark");
    await page.getByLabel("Email Address",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill("wrong-synthetic-password");await page.getByRole("button",{name:"Sign in",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("Invalid email or password.");await expect(page.getByRole("heading",{name:"Your Account Has Been Suspended",exact:true})).toHaveCount(0);
    await page.getByLabel("Password",{exact:true}).fill("synthetic-suspension-password");await page.getByRole("button",{name:"Sign in",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Your Account Has Been Suspended",exact:true})).toBeVisible();await expect(page.getByText(notice.explanation,{exact:true})).toBeVisible();await expect(page.getByText("Spam or misuse",{exact:true})).toBeVisible();
    await expect(page.locator("body")).not.toContainText("PRIVATE SYNTHETIC NOTES");expect(await page.evaluate(()=>localStorage.getItem("knoxite_token"))).toBeNull();expect(state.requests.filter((r:string)=>r.includes("/profile")||r.includes("/admin/"))).toHaveLength(0);
    const originalViewport=page.viewportSize()!;
    for(const width of [320,375,390,430,1280]){await page.setViewportSize({width,height:844});await expect(page.getByRole("button",{name:"Back to sign in",exact:true})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.setViewportSize(originalViewport);await page.screenshot({path:info.outputPath(`student-notice-${theme}.png`)});await page.reload();await expect(page.getByRole("heading",{name:"Your Account Has Been Suspended",exact:true})).toHaveCount(0);
    state.legacy=true;await page.getByLabel("Email Address",{exact:true}).fill(email);await page.getByLabel("Password",{exact:true}).fill("synthetic-suspension-password");await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByText("A legacy restriction requires administrator review.",{exact:true})).toBeVisible();await expect(page.getByText("Suspension expires",{exact:true})).toHaveCount(0);
  });
}
test("Google sign-in and signup show the same verified suspension notice without creating a session",async({page})=>{
  const state=await fixture(page,"anonymous");
  for(const path of ["/login","/signup"]){await page.goto(path);await page.getByRole("button",{name:"Synthetic Google",exact:true}).click();await expect(page.getByRole("heading",{name:"Your Account Has Been Suspended",exact:true})).toBeVisible();await expect(page.getByText(notice.explanation,{exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem("knoxite_token"))).toBeNull();}
  expect(state.requests.filter((r:string)=>r.includes("/google/onboard"))).toHaveLength(0);
});
test("ADMIN history has distinct loading, error, empty, expired, legacy and paginated states",async({page})=>{
  const state=await fixture(page);
  await page.route("**/api/admin/users?**",route=>route.fulfill({json:{users:[{id:"student",name:"Synthetic Student",email,role:"USER",isSuspended:false},{id:"other-student",name:"Another Student",email:"anotherlag@fixture.example",role:"USER",isSuspended:false}],total:2,page:1,pageSize:20}}));
  await page.goto("/admin-dashboard?section=students");
  let release:()=>void=()=>{};const hold=new Promise<void>(resolve=>{release=resolve;});await page.route("**/api/admin/users/student/suspensions?page=1",async route=>{await hold;await route.fallback();});
  await page.getByRole("button",{name:"Suspension history for Synthetic Student",exact:true}).click();await expect(page.getByRole("status",{name:"Loading suspension history...",exact:true})).toBeVisible();state.failHistory=true;release();
  const h=page.getByRole("region",{name:"Student suspension history",exact:true});await expect(h.getByRole("alert")).toContainText("history unavailable");await expect(h.getByText("No temporary suspension records.",{exact:true})).toHaveCount(0);
  state.failHistory=false;await h.getByRole("button",{name:"Retry history",exact:true}).click();await expect(h.getByText("No temporary suspension records.",{exact:true})).toBeVisible();await expect(h).toBeFocused();
  state.suspended=true;state.legacy=true;state.history=Array.from({length:12},(_,i)=>({id:`record-${i}`,reason:"SPAM_MISUSE",studentExplanation:"Historical synthetic explanation",privateNotes:"Private historical note",durationDays:1,startsAt:notice.startsAt,expiresAt:notice.expiresAt,status:"EXPIRED",expiredAt:notice.expiresAt,reactivatedAt:notice.expiresAt,administrator:{name:"Synthetic Admin"},events:[{action:"EXPIRED",createdAt:notice.expiresAt}]}));
  await h.getByRole("button",{name:"Close history",exact:true}).click();await page.getByRole("button",{name:"Suspension history for Synthetic Student",exact:true}).click();await expect(h).toContainText("Legacy suspension — review required");await expect(h.locator("article")).toHaveCount(10);await expect(h).toContainText("Expired temporary suspension");await h.getByRole("button",{name:"Next",exact:true}).click();await expect(h.locator("article")).toHaveCount(2);
  await expect(h.getByRole("button",{name:/Restore|Extend|Delete|Unsuspend/})).toHaveCount(0);
  let releaseOther:()=>void=()=>{};const otherPending=new Promise<void>(resolve=>{releaseOther=resolve;});
  await page.route("**/api/admin/users/other-student/suspensions?**",async route=>{await otherPending;await route.fulfill({json:{student:{name:"Another Student",isSuspended:false,legacyRestriction:false},page:1,pageSize:10,total:0,suspensions:[]}});});
  await page.getByRole("button",{name:"Suspension history for Another Student",exact:true}).click();
  await expect(h.getByRole("status",{name:"Loading suspension history...",exact:true})).toBeVisible();await expect(h).not.toContainText("Private historical note");await expect(h).toContainText("Another Student");
  releaseOther();await expect(h.getByText("No temporary suspension records.",{exact:true})).toBeVisible();
});
test("reports use the same mandatory suspension workflow without automatic penalties",async({page})=>{
  const state=await fixture(page);await page.goto("/admin/assessments?section=reports");await page.getByRole("button",{name:"Suspend Student",exact:true}).click();await expect(page.getByRole("alertdialog").getByRole("button",{name:"Review Suspension",exact:true})).toBeDisabled();await page.getByRole("button",{name:"Cancel",exact:true}).click();expect(state.confirmations).toHaveLength(0);expect(state.previews).toHaveLength(0);
});

test("recovery disables creation while history and recoverable report errors remain available",async({page})=>{
  const state=await fixture(page);state.creationEnabled=false;
  await page.goto("/admin-dashboard?section=students");
  await expect(page.getByRole("status").filter({hasText:"New suspensions are disabled"})).toBeVisible();
  await expect(page.getByRole("row").filter({hasText:email}).getByRole("button",{name:"Suspend account",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Suspension history for Synthetic Student",exact:true}).click();
  await expect(page.getByRole("region",{name:"Student suspension history",exact:true})).toContainText("No temporary suspension records.");
  await page.goto("/admin/assessments?section=reports");
  await page.getByRole("button",{name:"Suspend Student",exact:true}).click();const d=await completeForm(page);
  await d.getByRole("button",{name:"Review Suspension",exact:true}).click();
  await expect(d.getByRole("alert")).toContainText("New suspensions are disabled");
  await expect(d.getByRole("textbox",{name:"Student-facing explanation",exact:true})).toHaveValue(notice.explanation);
  expect(state.confirmations).toHaveLength(0);expect(state.suspended).toBe(false);
});
test("long student names fit narrow suspension dialogs and history; closing restores keyboard focus",async({page})=>{
  await fixture(page);const name="S".repeat(100);await page.setViewportSize({width:320,height:844});
  await page.route("**/api/admin/users?**",route=>route.fulfill({json:{users:[{id:"student",name,email,role:"USER",isSuspended:false}],page:1,pageSize:20,total:1}}));
  await page.goto("/admin-dashboard?section=students");await page.getByRole("button",{name:"Suspend account",exact:true}).click();
  const d=page.getByRole("alertdialog");await expect(d.getByRole("heading",{name:`Suspend ${name}?`,exact:true})).toBeVisible();
  const box=await d.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);expect(await d.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await d.getByRole("button",{name:"Cancel",exact:true}).click();const trigger=page.getByRole("button",{name:`Suspension history for ${name}`,exact:true});await trigger.click();
  const h=page.getByRole("region",{name:"Student suspension history",exact:true});await expect(h).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await h.getByRole("button",{name:"Close history",exact:true}).click();await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute("aria-expanded","false");
});
