import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const catalog=JSON.parse(readFileSync("knoxite-backend/config/skill-catalog.json","utf8")).skills;
const academic=JSON.parse(readFileSync("knoxite-backend/config/academic-catalog.json","utf8"));
const departments=JSON.parse(readFileSync("knoxite-backend/config/provisional-departments.json","utf8"));
async function fixture(page:Page,{role="ADMIN",theme="light",empty=false}={}) {
  page.setDefaultTimeout(10000);
  const state:any={role,requests:[],mutations:[],failure:"",failRetire:false,users:Array.from({length:25},(_,i)=>({id:`u-${i}`,name:`Synthetic Account ${i}`,email:`synthetic-account-${i}-long-address@fixture.test`,role:i===0?"ADMIN":"USER",isSuspended:i===2,createdAt:"2026-11-01T00:00:00Z"})),reports:[{id:"report",reporter:{name:"Synthetic Reporter"},target:{id:"u-1",name:"Synthetic Reported Student"},reason:"NO_SHOW",status:"PENDING",description:"Synthetic concern, not real student data.",createdAt:"2026-11-01T00:00:00Z"}],catalog:catalog.map((p:any,i:number)=>({...p,skillId:`s-${i}`,supply:i===0?0:i===1?9:2,demand:i===0?8:i===1?0:3,availability:"AVAILABLE"}))};
  state.catalog[5]={...state.catalog[5],supply:null,demand:null,availability:"NOT_INITIALIZED"};
  state.banks=empty?[]:catalog.slice(0,15).map((s:any,i:number)=>({id:`bank-${i}`,title:`Synthetic ${s.name}`,skill:{id:`s-${i}`,name:s.name,category:s.category},level:i%2?"ADVANCED":"BASIC",versions:[2,1].map(v=>({id:`v-${i}-${v}`,version:v,status:v===2?"PUBLISHED":"RETIRED",questionCount:i%2?6:10,passingPercent:80,durationMinutes:20,maxStarts:3,windowHours:168,cooldownHours:24,_count:{attempts:i},learningOutcomes:"Synthetic fixture learning objectives.",createdAt:"2026-11-01T00:00Z",validatedAt:"2026-11-02T00:00Z",validatedById:"synthetic-reviewer",publishedAt:"2026-11-03T00:00Z",validationNotes:JSON.stringify({scope:"Local project-owner/team pilot only; not faculty or university approval",sourceHash:"b".repeat(64)}),items:[{prompt:"SYNTHETIC PRIVATE PROMPT",competency:"Fixture only",rubric:"Synthetic grading rule",options:[{text:"PRIVATE KEY FIXTURE",isCorrect:true}]}]}))}));
  if(!empty)state.banks[0].versions.unshift({...state.banks[0].versions[0],id:"draft",version:3,status:"DRAFT",validatedAt:null,validationNotes:null});
  state.programs=academic.programs.map((p:any)=>{const d=departments.departments.find((d:any)=>d.programCodes.includes(p.code));return{...p,id:p.code,department:{id:d.code,name:d.name},mappingValidatedAt:"2026-11-01T00:00Z",mappingValidatedById:"synthetic-admin",mappingVersion:1,mappingNotes:"Synthetic mapping evidence; not an institutional approval.",yearLevels:academic.yearLevels.slice(0,["BSIT","BSIHM-CA","BSIHM-HACLO"].includes(p.code)?1:4).map((y:any)=>({...y,id:y.code}))};});
  state.months=[{period:"2026-06",rate:null,completed:0,eligibleConcluded:0,excludedConcluded:0},{period:"2026-07",rate:null,completed:0,eligibleConcluded:0,excludedConcluded:2},{period:"2026-08",rate:0,completed:0,eligibleConcluded:1,excludedConcluded:0},{period:"2026-09",rate:null,completed:0,eligibleConcluded:0,excludedConcluded:0},{period:"2026-10",rate:null,completed:0,eligibleConcluded:0,excludedConcluded:0},{period:"2026-11",rate:80,completed:4,eligibleConcluded:5,excludedConcluded:0}];
  state.mentors=empty?[]:[{id:"ranked",name:"Synthetic Mentor",rating:4.5,reviews:4,uniqueCompletedPartners:2}];state.activity=empty?[]:[{id:"ranked",name:"Synthetic Mentor",uniqueCompletedPartners:2,completionRate:.8,totalSwaps:12}];
  state.posts=empty?[]:[{id:"post",title:"Synthetic forum thread",content:"Full synthetic discussion",category:"GENERAL",author:{name:"Synthetic Author"},createdAt:"2026-11-01T00:00Z",_count:{comments:1}}];
  await page.addInitScript(({theme})=>{localStorage.setItem("knoxite_token","synthetic-admin-session");localStorage.setItem("knoxite_user",JSON.stringify({id:"admin",role:"ADMIN"}));if(!localStorage.getItem("theme_admin"))localStorage.setItem("theme_admin",theme);localStorage.setItem("knoxite_onboarding_completed","true");},{theme});
  await page.route("**/*",async route=>{const u=new URL(route.request().url()),p=u.pathname,m=route.request().method();if(u.origin==="http://127.0.0.1:5174")return route.continue();if(u.origin!=="http://127.0.0.1:5009")return route.abort();state.requests.push(`${m} ${p}`);
    if(state.failure===p)return route.fulfill({status:503,json:{error:"Synthetic endpoint unavailable"}});
    if(m!=="GET"){const body=route.request().postDataJSON();state.mutations.push({path:p,method:m,body});if(state.failRetire&&p.endsWith("/retire"))return route.fulfill({status:503,json:{error:"Retirement unavailable in fixture"}});if(p==="/api/auth/logout")return route.fulfill({json:{message:"Signed out"}});if(p==="/api/admin/reports/report"){state.reports[0]={...state.reports[0],status:body.status,resolution:body.resolution};}return route.fulfill({status:p.endsWith("/versions")?201:200,json:{id:"synthetic-new",message:"Synthetic action saved"}});}
    if(p==="/api/profile")return route.fulfill({json:{id:"admin",name:"Synthetic Admin",role:state.role,email:"private-admin@fixture.test",offeredSkills:[],wantedSkills:[],metrics:{}}});
    if(p==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(p==="/api/analytics")return route.fulfill({json:{systemHealth:{totalUsers:2,totalReviews:8,totalSwaps:5},swapMetrics:{completedSwaps:4,activeSwaps:0,pendingSwaps:1,legacyConcludedSwaps:0},monthlyCompletion:state.months,skillTrends:{catalog:state.catalog},reporting:{undatedConcluded:0}}});
    if(p==="/api/admin/dashboard-data")return route.fulfill({json:{stats:{totalUsers:3,reportedIssues:1},recentUsers:[]}});
    if(p==="/api/admin/users"){let rows=state.users.filter((a:any)=>(!u.searchParams.get("role")||a.role===u.searchParams.get("role"))&&(!u.searchParams.get("status")||a.isSuspended===(u.searchParams.get("status")==="SUSPENDED"))&&`${a.name} ${a.email}`.toLowerCase().includes((u.searchParams.get("search")||"").toLowerCase()));const page=Number(u.searchParams.get("page"));return route.fulfill({json:{users:rows.slice((page-1)*20,page*20),page,pageSize:20,total:rows.length}});}
    if(p==="/api/admin/assessments")return route.fulfill({json:state.banks});
    if(p==="/api/admin/assessment-catalog")return route.fulfill({json:catalog.map((s:any,i:number)=>({...s,id:`s-${i}`}))});
    if(p==="/api/admin/academic-programs")return route.fulfill({json:{programs:state.programs,departments:departments.departments.map((d:any)=>({...d,id:d.code,isActive:true})),yearLevels:academic.yearLevels.map((y:any)=>({...y,id:y.code})),provisionalDraft:departments}});
    if(p==="/api/admin/reports")return route.fulfill({json:empty?[]:state.reports});
    if(p==="/api/forum/posts")return route.fulfill({json:state.posts});
    if(p==="/api/forum/posts/post")return route.fulfill({json:{...state.posts[0],comments:[{id:"reply",content:"Synthetic reply",author:{name:"Synthetic Replier"}}]}});
    if(p==="/api/leaderboard")return route.fulfill({json:{topMentors:state.mentors}});if(p==="/api/leaderboard/swaps")return route.fulfill({json:state.activity});
    if(p==="/api/admin/integrity/signals")return route.fulfill({json:{signals:[],users:[]}});if(p==="/api/admin/integrity/reviews")return route.fulfill({json:[]});
    return route.fulfill({json:[]});
  });return state;
}
async function nav(page:Page,name:string){const toggle=page.getByRole("button",{name:"Administrator navigation",exact:true});if(await toggle.isVisible())await toggle.click();await page.getByRole("navigation",{name:"Admin navigation",exact:true}).getByRole("link",{name,exact:true}).click();}

test("student server role cannot mount administrative workspaces or fetch private keys",async({page})=>{
  const state=await fixture(page,{role:"USER"});for(const url of ["/admin-dashboard","/admin/assessments","/admin/integrity"]){await page.goto(url);await expect(page).toHaveURL(/\/dashboard$/);await expect(page.getByRole("navigation",{name:"Admin navigation",exact:true})).toHaveCount(0);}expect(state.requests.filter((p:string)=>p.includes("/admin/")||p.endsWith("/analytics"))).toEqual([]);
});
test("shared admin navigation supports all workspaces, direct links, Back and truthful overview metrics",async({page},info)=>{
  const state=await fixture(page);await page.goto("/admin-dashboard");await expect(page.getByRole("heading",{name:"Registered Students",exact:true}).locator("..")).toContainText("2");await expect(page.getByRole("heading",{name:"Completed Swaps",exact:true}).locator("..")).toContainText("4");await expect(page.getByText("All registered accounts (includes ADMIN)",{exact:true}).locator("..")).toContainText("3");
  for(const title of ["Analytics & Trends","Student Management","Assessment Management","Forum Moderation","Reports","Leaderboard Audit","Integrity Review","Academic Configuration","Overview"]){await nav(page,title);await expect(page.getByRole("heading",{level:1,name:title,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.reload();await page.getByRole("button",{name:"Refresh data",exact:true}).click();expect(state.mutations).toHaveLength(0);await page.screenshot({path:info.outputPath("overview.png"),fullPage:true});await page.goto("/analytics");await expect(page).toHaveURL(/section=analytics/);await expect(page.getByRole("heading",{name:"Skill Supply vs. Demand",exact:true})).toBeVisible();
});
test("supply/demand filters, sorting, zero and missing values keep full skill names and readable chart data",async({page},info)=>{
  await fixture(page);await page.goto("/admin-dashboard?section=analytics");await page.getByRole("combobox",{name:"Skill category",exact:true}).selectOption("technology");await page.getByRole("combobox",{name:"Entries shown",exact:true}).selectOption("all");await page.getByText("Accessible supply/demand data table",{exact:true}).click();const table=page.getByRole("table",{name:"Current filtered preset skill supply and demand",exact:true});await expect(table.locator("tbody tr")).toHaveCount(10);const python=table.getByRole("row").filter({hasText:"Python Programming Fundamentals"});await expect(python.locator("td")).toHaveText(["Python Programming Fundamentals","technology","0","8","+8"]);await page.getByLabel("Search skills",{exact:true}).fill("PYTHON");await expect(table.locator("tbody tr")).toHaveCount(1);await page.getByLabel("Search skills",{exact:true}).fill("");await page.getByRole("combobox",{name:"Sort skills",exact:true}).selectOption("supply");await expect(table.locator("tbody tr").first()).toContainText("Java Programming Fundamentals");await page.getByRole("combobox",{name:"Sort skills",exact:true}).selectOption("shortage");await expect(table.locator("tbody tr").first()).toContainText("Python Programming Fundamentals");
  const moduleResult=await page.evaluate(async()=>{const {skillRows}=await import(String("/src/app/components/admin/AdminAnalytics.tsx"));const rows=[{key:"zero",name:"Z",category:"technology",supply:0,demand:0},{key:"b",name:"B",category:"technology",supply:3,demand:5},{key:"a",name:"A",category:"technology",supply:1,demand:4},{key:"missing",name:"Unknown",category:"technology",supply:null,demand:null}];return["demand","supply","shortage","alphabetical"].map(sort=>skillRows(rows,"","",sort).map((r:any)=>r.key));});expect(moduleResult).toEqual([["b","a","zero","missing"],["b","a","zero","missing"],["a","b","zero","missing"],["a","b","missing","zero"]]);
  await page.getByRole("combobox",{name:"Skill category",exact:true}).selectOption("business");await expect(table.locator("tbody tr")).toHaveCount(10);await expect(table).toContainText("Accounting Information Systems Basics");await page.screenshot({path:info.outputPath("analytics.png"),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("chart skill labels expose counts on keyboard focus and hover without squeezing mobile tables",async({page})=>{
  await fixture(page);await page.goto("/admin-dashboard?section=analytics");
  await page.getByRole("combobox",{name:"Skill category",exact:true}).selectOption("technology");
  const label=page.getByRole("img",{name:"Python Programming Fundamentals",exact:true});
  await label.focus();await expect(label.getByRole("tooltip")).toContainText("Supply: 0; Demand: 8");
  await page.keyboard.press("Escape");await expect(label.getByRole("tooltip")).toHaveCount(0);
  await page.getByLabel("Search skills",{exact:true}).focus();await label.hover();
  await expect(label.getByRole("tooltip")).toContainText("Supply: 0; Demand: 8");
  await page.getByText("Accessible supply/demand data table",{exact:true}).click();
  expect(await page.getByRole("table",{name:"Current filtered preset skill supply and demand",exact:true}).evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(640);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("monthly evidence distinguishes real zero from no outcomes and excluded evidence",async({page})=>{
  await fixture(page);await page.goto("/admin-dashboard?section=analytics");const table=page.getByRole("table",{name:"Monthly completion evidence in UTC",exact:true});await expect(table.getByRole("row").filter({hasText:"2026-08"})).toContainText("0.0%");await expect(table.getByRole("row").filter({hasText:"2026-06"})).toContainText("No concluded exchanges");await expect(table.getByRole("row").filter({hasText:"2026-07"})).toContainText("No eligible outcomes");await expect(table.getByRole("row").filter({hasText:"2026-11"})).toContainText("80.0%");await page.getByRole("combobox",{name:"Reporting period",exact:true}).selectOption("3");await expect(table.locator("tbody tr")).toHaveCount(3);
});
test("assessment directory filters and pagination keep private details collapsed and versions deep-linkable",async({page},info)=>{
  await fixture(page);await page.goto("/admin/assessments");const table=page.getByRole("table");await expect(table.locator("tbody tr")).toHaveCount(10);await expect(page.getByText("PRIVATE KEY FIXTURE",{exact:false})).toHaveCount(0);await page.getByRole("button",{name:"Next",exact:true}).click();await expect(page.getByText("Page 2 of 4",{exact:false})).toBeVisible();await page.getByLabel("Search assessment banks",{exact:true}).fill("Python");await expect(table.locator("tbody tr")).toHaveCount(3);await page.getByRole("combobox",{name:"Publication status",exact:true}).selectOption("PUBLISHED");await expect(table.locator("tbody tr")).toHaveCount(1);await page.getByRole("button",{name:"Details for Python Programming Fundamentals BASIC version 2",exact:true}).click();await expect(page).toHaveURL(/version=v-0-2/);const details=page.getByRole("region",{name:"Assessment version details",exact:true});await expect(details).toBeFocused();await expect(details).toBeInViewport();await expect(details).toContainText("Pass 80%");await details.getByText("Review & Publication Evidence",{exact:true}).click();await expect(details).toContainText("b".repeat(64));await expect(details).toContainText("not faculty or university approval");await details.getByText("Inspect private questions and grading",{exact:true}).click();await expect(details).toContainText("PRIVATE KEY FIXTURE");await page.reload();await expect(page.getByRole("region",{name:"Assessment version details",exact:true})).toBeVisible();await page.getByRole("button",{name:"Close details",exact:true}).click();await page.goBack();await expect(page.getByRole("region",{name:"Assessment version details",exact:true})).toBeVisible();await page.screenshot({path:info.outputPath("assessments.png"),fullPage:true});
});
test("assessment retirement identifies the exact version, requires confirmation and reports failures",async({page})=>{
  const state=await fixture(page);state.failRetire=true;await page.goto("/admin/assessments?version=v-0-2");await page.getByRole("button",{name:"Retire Version",exact:true}).click();await expect(page.getByRole("alertdialog")).toContainText("Python Programming Fundamentals · BASIC · version 2");await page.getByRole("button",{name:"Cancel",exact:true}).click();expect(state.mutations).toHaveLength(0);await page.getByRole("button",{name:"Retire Version",exact:true}).click();await page.getByRole("button",{name:"Confirm",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Retirement unavailable");expect(state.mutations).toHaveLength(1);expect(state.banks[0].versions.find((v:any)=>v.id==="v-0-2").status).toBe("PUBLISHED");
});
test("import validates JSON and confirms DRAFT-only behavior without automatic setup",async({page})=>{
  const state=await fixture(page);await page.goto("/admin/assessments?section=import");await page.getByLabel("Question bank JSON",{exact:true}).fill("{broken");await page.getByRole("button",{name:"Import Draft",exact:true}).click();await expect(page.getByRole("alert")).toContainText("Invalid question-bank JSON");expect(state.mutations).toHaveLength(0);await page.getByLabel("Question bank JSON",{exact:true}).fill(JSON.stringify({skillId:"s-0",level:"BASIC",title:"SYNTHETIC FIXTURE ONLY",learningOutcomes:"Unreviewed synthetic test fixture",questionCount:10,passingPercent:80,durationMinutes:20,items:Array.from({length:10},(_,i)=>({kind:"MULTIPLE_CHOICE",prompt:`Synthetic test-only item ${i}`,competency:"Synthetic test fixture",rubric:"Fixture only",points:1,options:[0,1,2,3].map(n=>({text:`Fixture option ${n}`,isCorrect:n===0}))}))}));await page.getByRole("button",{name:"Import Draft",exact:true}).click();await expect(page.getByRole("alertdialog")).toContainText("DRAFT version only");await page.getByRole("button",{name:"Confirm",exact:true}).click();await expect(
  page.getByRole("status").filter({ hasText: "Draft imported." })
).toContainText("unavailable to students");expect(state.mutations.map((m:any)=>m.path)).toEqual(["/api/admin/assessments/versions"]);
});
test("academic workspace preserves thirteen mappings and first-year-only program options without writes",async({page})=>{
  const state=await fixture(page);await page.goto("/admin/assessments?section=academic");await page.getByLabel("Search academic programs",{exact:true}).fill("BSIT");const program=page.getByRole("table",{name:"Academic program directory",exact:true}).locator("tbody tr");await expect(program).toHaveCount(1);await expect(program).toContainText("1st Year");await expect(program).toContainText("Validation recorded");await page.getByLabel("Stored mapping evidence for BSIT",{exact:true}).click();await expect(page.getByText("Synthetic mapping evidence; not an institutional approval.",{exact:true})).toBeVisible();await page.getByText("Configure permitted program year levels",{exact:true}).click();await page.getByLabel("Configure year levels for a program",{exact:false}).selectOption("BSIT");await expect(page.getByRole("checkbox",{name:"1st Year",exact:true})).toBeChecked();for(const name of ["2nd Year","3rd Year","4th Year"])await expect(page.getByRole("checkbox",{name,exact:true})).not.toBeChecked();expect(state.programs).toHaveLength(13);expect(state.mutations).toHaveLength(0);
});
test("academic directory shows canonical program labels without redundant internal codes",async({page})=>{
  const state=await fixture(page);
  const original=JSON.stringify(state.programs);
  await page.goto("/admin/assessments?section=academic");
  const rows=page.getByRole("table",{name:"Academic program directory",exact:true}).locator("tbody tr");
  await expect(rows).toHaveCount(13);
  await expect(rows.locator("td:first-child")).toHaveText(state.programs.map((p:any)=>p.label));
  await expect(rows.locator("td:first-child .admin-record-caption")).toHaveCount(0);
  for(const [code,label] of [["BS_PHARM","BS PHARM"],["BS_PSYCH","BS PSYCH"],["BSTOM","BSTom"]]){
    await page.getByLabel("Search academic programs",{exact:true}).fill(code);
    await expect(rows).toHaveCount(1);
    await expect(rows.locator("td:first-child")).toHaveText(label);
  }
  expect(JSON.stringify(state.programs)).toBe(original);
  expect(state.mutations).toHaveLength(0);
});

test("account management distinguishes admins, limits result pages and confirms consequential actions",async({page})=>{
  const state=await fixture(page);await page.goto("/admin-dashboard?section=students");await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(20);const admin=page.getByRole("row").filter({hasText:"Synthetic Account 0"});await expect(admin.getByRole("button",{name:"Suspend account",exact:true})).toBeDisabled();await page.getByRole("button",{name:"Next",exact:true}).click();await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(5);await page.getByLabel("Search accounts",{exact:true}).fill("Synthetic Account 1");await expect(page.getByText("Page 1 of 1",{exact:false})).toBeVisible();await page.getByRole("row").filter({hasText:"Synthetic Account 1"}).first().getByRole("button",{name:"Suspend account",exact:true}).click();await expect(page.getByRole("alertdialog")).toContainText("revoke existing sessions");await page.getByRole("button",{name:"Cancel",exact:true}).click();expect(state.mutations).toHaveLength(0);
});
test("forum inspection and reports preserve explicit moderation actions and case notes",async({page})=>{
  const state=await fixture(page);await page.goto("/admin-dashboard?section=forum");await page.getByRole("button",{name:"Inspect thread",exact:true}).click();await expect(page.getByRole("region",{name:"Thread inspection",exact:true})).toContainText("Synthetic reply");await page.getByRole("button",{name:"Delete thread",exact:true}).click();await page.getByRole("button",{name:"Cancel",exact:true}).click();expect(state.mutations).toHaveLength(0);await page.goto("/admin/assessments?section=reports");await page.getByLabel("Resolution notes for Synthetic Reported Student",{exact:true}).fill("Synthetic reviewed disposition");await page.getByRole("button",{name:"Dismiss",exact:true}).click();await page.getByRole("button",{name:"Confirm",exact:true}).click();await expect(page.getByText("Resolution: Synthetic reviewed disposition",{exact:true})).toBeVisible();expect(state.mutations.map((m:any)=>m.path)).toEqual(["/api/admin/reports/report"]);
});
test("leaderboard audit shows approved metrics and honest empty states without invented points",async({page})=>{
  const state=await fixture(page);await page.goto("/admin-dashboard?section=leaderboard");await expect(page.getByRole("table")).toContainText("4.5/5");await page.getByRole("tab",{name:"Most Active",exact:true}).click();await expect(page.getByRole("table")).toContainText("80.0%");await expect(page.getByRole("columnheader",{name:"Raw completed exchanges",exact:true})).toBeVisible();state.mentors=[];state.activity=[];await page.getByRole("button",{name:"Refresh data",exact:true}).click();await expect(page.getByRole("status")).toContainText("two distinct completed partners");expect(state.mutations).toHaveLength(0);
});
test("dark mode persists across admin routes, and read failures do not fabricate empty records",async({page},info)=>{
  const state=await fixture(page,{theme:"dark",empty:true});await page.goto("/admin-dashboard");await expect(page.locator("html")).toHaveClass(/dark/);await page.goto("/admin/assessments");await expect(page.getByRole("status")).toContainText("No question banks");await page.goto("/admin/integrity");await expect(page.getByText("No repeated-partner signals are available.",{exact:true})).toBeVisible();await page.reload();await expect(page.locator("html")).toHaveClass(/dark/);await page.screenshot({path:info.outputPath("integrity-dark.png"),fullPage:true});state.failure="/api/admin/assessments";await page.goto("/admin/assessments");await expect(page.getByRole("alert")).toContainText("unavailable");await expect(page.getByText("No question banks.",{exact:false})).toHaveCount(0);await expect(page.getByRole("button",{name:"Retry loading records",exact:true})).toBeVisible();state.failure="";await page.getByRole("button",{name:"Retry loading records",exact:true}).click();await expect(page.getByRole("alert")).toHaveCount(0);await expect(page.getByRole("status")).toContainText("No question banks");expect(state.mutations).toHaveLength(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

async function readableContrast(page:Page, foreground:string, background:string) {
  const ratio=await page.evaluate(({foreground,background})=>{
    const context=document.createElement("canvas").getContext("2d")!;
    function luminance(color:string){
      context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);
      const [r,g,b]=Array.from(context.getImageData(0,0,1,1).data).slice(0,3).map(v=>{const c=v/255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);});
      return .2126*r+.7152*g+.0722*b;
    }
    const text=luminance(getComputedStyle(document.querySelector(foreground)!).color);
    const surface=luminance(getComputedStyle(document.querySelector(background)!).backgroundColor);
    return (Math.max(text,surface)+.05)/(Math.min(text,surface)+.05);
  },{foreground,background});
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

for (const theme of ["light", "dark"]) {
  test(`${theme} visual polish keeps admin metrics, workspaces and evidence readable without mutations`, async ({ page }, info) => {
    test.setTimeout(45000);
    const state = await fixture(page, { theme });
    await page.goto("/admin-dashboard");
    const root = page.locator(".admin-console");
    const metrics = page.locator(".admin-metric");
    await expect(metrics).toHaveCount(4);
    await expect(page.locator(".admin-metric-icon svg")).toHaveCount(4);
    await expect(page.locator(".admin-metric-value")).toHaveText(["2", "0", "4", "8"]);
    const heights = await metrics.evaluateAll(nodes => nodes.map(n => Math.round(n.getBoundingClientRect().height)));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(2);
    const typography = await root.evaluate(el => ({
      font: getComputedStyle(el).fontFamily,
      pattern: getComputedStyle(el, "::before").maskImage,
      animation: getComputedStyle(el, "::before").animationName,
      metricSize: parseFloat(getComputedStyle(el.querySelector(".admin-metric-value")!).fontSize),
    }));
    expect(typography.font).toContain("system-ui");expect(typography.pattern).toContain("svg");
    expect(typography.animation).toBe("none");expect(typography.metricSize).toBeGreaterThanOrEqual(40);
    await readableContrast(page,".admin-metric-description",".admin-metric");
    await readableContrast(page,".admin-metric h2",".admin-metric");
    await page.screenshot({ path: info.outputPath(`overview-${theme}.png`), fullPage: true });
    const destinations = ["/admin-dashboard?section=analytics", "/admin/assessments", "/admin/assessments?section=academic", "/admin-dashboard?section=students", "/admin-dashboard?section=forum", "/admin/assessments?section=reports", "/admin-dashboard?section=leaderboard", "/admin/integrity"];
    for (const url of destinations) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
      else await expect(page.locator("html")).not.toHaveClass(/dark/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto("/admin/assessments?section=academic");
    const table = page.getByRole("table", { name: "Academic program directory", exact: true });
    await expect(table.locator("tbody tr")).toHaveCount(13);
    await readableContrast(page,".admin-table th",".admin-table th");
    for (const code of ["BSIT", "BSIHM-CA", "BSIHM-HACLO"]) {
      // Read by the stored fixture ID, rather than deriving academic configuration.
      const actual = state.programs.find((p: any) => p.code === code);
      expect(actual.yearLevels).toHaveLength(1);
    }
    state.programs[0].mappingValidatedAt = null;
    await page.reload();
    await expect(table).toContainText("Provisional");
    await page.screenshot({ path: info.outputPath(`academic-${theme}.png`), fullPage: true });
    await page.goto("/admin/assessments?version=v-0-2");
    await expect(page.getByRole("region", { name: "Assessment version details", exact: true })).toBeFocused();
    await page.getByText("Review & Publication Evidence", { exact: true }).click();
    await expect(page.getByText("b".repeat(64), { exact: false })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`assessment-${theme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Retire Version", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveClass(/admin-dialog/);
    await readableContrast(page,".admin-dialog [data-slot=alert-dialog-description]",".admin-dialog");
    await page.screenshot({ path: info.outputPath(`confirmation-${theme}.png`) });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.reload();
    if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
    else await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", {name:"Dark Mode",exact:true}).click();
    if(theme === "dark")await expect(page.locator("html")).not.toHaveClass(/dark/);
    else await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    if(theme === "dark")await expect(page.locator("html")).not.toHaveClass(/dark/);
    else await expect(page.locator("html")).toHaveClass(/dark/);
    expect(state.mutations).toHaveLength(0);
  });
}
