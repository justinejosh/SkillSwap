import {test,expect,Page} from "@playwright/test";
test.use({timezoneId:"Asia/Manila"});
async function fixture(page:Page){
  await page.clock.install({time:new Date("2030-04-10T02:30:00Z")});
  const state:any={caller:"a",status:"PENDING_AGREEMENT",sessions:4,duration:null,version:1,a:null,b:null,posts:[],rows:[],mine:0,theirs:0,logPosts:[]};
  const snapshot=()=>({id:"flex",status:state.status,integrityVerified:true,agreementVersion:state.version,sessions:state.sessions,duration:state.duration,requesterId:"a",receiverId:"b",requester:{id:"a",name:"Synthetic A"},receiver:{id:"b",name:"Synthetic B"},me:{id:state.caller},partner:{id:state.caller==="a"?"b":"a"},offeredSkill:{id:"python",name:"Python Programming Fundamentals"},wantedSkill:{id:"sql",name:"SQL Fundamentals"},requesterApprovedAt:state.a,receiverApprovedAt:state.b,requesterSessions:state.mine,receiverSessions:state.theirs,confirmationEligibility:{eligible:false,reason:"Schedule this session with your partner before confirming it."},reviewSummary:{myReview:null,partnerSubmitted:false}});
  await page.addInitScript(()=>{localStorage.setItem("knoxite_token","synthetic-flex-session");localStorage.setItem("knoxite_user",JSON.stringify({id:"a",role:"USER"}));localStorage.setItem("knoxite_onboarding_completed","true");});
  await page.route("**/*",async route=>{
    const u=new URL(route.request().url());if(u.origin==="http://127.0.0.1:5174")return route.continue();if(u.origin!=="http://127.0.0.1:5009")return route.abort();
    if(u.pathname==="/api/profile")return route.fulfill({json:{id:state.caller,name:"Synthetic Student",role:"USER",offeredSkills:[],wantedSkills:[]}});
    if(u.pathname==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(u.pathname==="/api/swaps/flex/agreement"){
      const body=route.request().postDataJSON();state.posts.push(body);
      if(body.sessions!==state.sessions||state.duration!==null){state.version++;state.a=null;state.b=null;}state.sessions=body.sessions;state.duration=null;state[state.caller]="2030-04-10T02:00:00Z";
      if(state.a&&state.b)state.status="CONFIRMED";return route.fulfill({json:{message:state.status==="CONFIRMED"?"Both students approved. Exchange confirmed.":"Your approval is saved.",swap:snapshot()}});
    }
    if(u.pathname==="/api/swaps/flex")return route.fulfill({json:{...snapshot(),confirmationEligibility:{eligible:state.status==="CONFIRMED"&&!!state.a&&!!state.b&&state.mine<state.sessions,reason:"Confirm only actual participation; scheduling is optional."}}});
    if(u.pathname==="/api/swaps/flex/log-session"){const body=route.request().postDataJSON();state.logPosts.push(body);state.mine++;return route.fulfill({json:snapshot()});}
    if(u.pathname==="/api/swaps")return route.fulfill({json:[snapshot()]});
    if(u.pathname==="/api/sessions"){
      if(route.request().method()==="POST"){const body=route.request().postDataJSON();state.rows.push({...body,id:String(state.rows.length),partner:{name:"Synthetic Partner"},exchangeStatus:state.status});return route.fulfill({status:201,json:body});}
      return route.fulfill({json:state.rows});
    }
    return route.fulfill({json:[]});
  });return state;
}
test("total-only agreement supports both approvals and stays responsive without fixed-hour fields",async({page})=>{
  const state=await fixture(page);await page.goto("/swap-agreement/flex");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  await expect(page.getByLabel("Hours Per Session",{exact:true})).toHaveCount(0);
  await page.getByLabel("Total Sessions",{exact:true}).fill("5");
  for(const width of [320,375,390,430,1280]){await page.setViewportSize({width,height:900});for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.getByLabel("Total Sessions",{exact:true})).toBeVisible();}}
  await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true}).click();
  await expect.poll(()=>state.posts.length).toBe(1);expect(state.posts[0]).toEqual({sessions:5,agreementVersion:1,agreedToTerms:true});expect(state.b).toBeNull();
  state.caller="b";await page.reload();await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(page.getByLabel("Total Sessions",{exact:true})).toHaveValue("5");await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true}).click();
  await expect(page.getByText("Agreement confirmed. Your exchange is still in progress; these terms are read-only.",{exact:true})).toBeVisible();expect(state.posts[1]).not.toHaveProperty("duration");
});
test("calendar saves different individual ranges, rejects invalid ends and retains history on refresh",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.sessions=5;state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/calendar?swapId=flex");const start=page.getByLabel("Date and time (your local time)",{exact:true}),end=page.getByLabel("End date and time (your local time)",{exact:true}),save=page.getByRole("button",{name:"Save Session Schedule",exact:true});
  await start.fill("2030-04-10T12:00");await end.fill("2030-04-10T11:59");await save.click();await expect(page.getByRole("alert")).toContainText("end after its start");expect(state.rows).toHaveLength(0);
  await end.fill("2030-04-10T12:20");await save.click();await expect.poll(()=>state.rows.length).toBe(1);
  await page.getByRole("combobox",{name:"Session number",exact:true}).selectOption("2");await start.fill("2030-04-11T12:00");await end.fill("2030-04-11T13:15");await save.click();await expect.poll(()=>state.rows.length).toBe(2);
  expect(state.rows.map((r:any)=>(Date.parse(r.endsAt)-Date.parse(r.scheduledAt))/60000)).toEqual([20,75]);
  await page.reload();await expect(page.getByRole("heading",{name:"Session 1 with Synthetic Partner",exact:true})).toBeVisible();await expect(page.locator('time[datetime="2030-04-10T04:20:00.000Z"]')).toBeVisible();
  for(const width of [320,375,390,430,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(save).toBeVisible();}
  expect(state.mine).toBe(0);expect(state.theirs).toBe(0);expect(state.status).toBe("CONFIRMED");
  state.rows.push({id:"missing-time",swapId:"flex",sessionNumber:3,scheduledAt:null,endsAt:null,partner:{name:"Synthetic Partner"},exchangeStatus:"CONFIRMED"});
  await page.reload();await expect(page.getByText("Not scheduled yet",{exact:true})).toBeVisible();await expect(page.getByText("Invalid Date",{exact:false})).toHaveCount(0);
});
test("three of five bilateral confirmations display sixty percent without completing the exchange",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.sessions=5;state.mine=state.theirs=3;state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/swap-details/flex");await expect(page.getByRole("progressbar")).toHaveCount(2);for(const bar of await page.getByRole("progressbar").all())await expect(bar).toHaveAttribute("aria-valuenow","60");
  await expect(page.getByRole("heading",{name:"Exchange in progress",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Confirm Session 4",exact:true})).toBeEnabled();
});
test("historical closed agreements keep saved fixed terms and have no editing controls",async({page})=>{
  const state=await fixture(page);state.status="COMPLETED";state.duration=2;state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/swap-agreement/flex");await expect(page.getByText("Hours per session (historical terms)",{exact:true})).toBeVisible();await expect(page.getByText("8 hours per student",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByText("8 hours per student",{exact:true})).toBeVisible();expect(state.posts).toHaveLength(0);
});

test("unscheduled actual participation requires a real non-future time and leaves scheduling untouched",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/swap-details/flex");
  await page.getByRole("button",{name:"Confirm Session 1",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await expect(dialog.getByRole("button",{name:"Confirm participation",exact:true})).toBeDisabled();
  await dialog.getByLabel("Actual completion date and time",{exact:true}).fill("2030-04-11T10:15");
  await dialog.getByRole("button",{name:"Confirm participation",exact:true}).click();
  await expect(dialog.getByRole("alert")).toContainText("not a future time");expect(state.logPosts).toHaveLength(0);
  await dialog.getByLabel("Actual completion date and time",{exact:true}).fill("2030-04-10T10:15");
  for(const width of [320,375,390,430,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(dialog.getByRole("button",{name:"Confirm participation",exact:true})).toBeVisible();}
  await dialog.getByRole("button",{name:"Confirm participation",exact:true}).click();
  await expect.poll(()=>state.logPosts.length).toBe(1);
  expect(state.logPosts[0]).toEqual({sessionNumber:1,completedAt:"2030-04-10T02:15:00.000Z"});expect(state.rows).toHaveLength(0);expect(state.theirs).toBe(0);expect(state.status).toBe("CONFIRMED");
  await page.reload();await expect(page.getByRole("button",{name:"Confirm Session 2",exact:true})).toBeEnabled();
});

test("completion dialog has branded actions and a usable close target in both themes",async({page},info)=>{
  const state=await fixture(page);state.status="CONFIRMED";state.a=state.b="2030-04-10T02:00:00Z";
  await page.setViewportSize({width:320,height:740});await page.goto("/swap-details/flex");
  await page.getByRole("button",{name:"Confirm Session 1",exact:true}).click();
  const dialog=page.getByRole("dialog");
  await dialog.getByLabel("Actual completion date and time",{exact:true}).fill("2030-04-10T10:15");
  await expect.poll(()=>dialog.evaluate(el=>getComputedStyle(el).opacity)).toBe("1");
  await page.screenshot({path:info.outputPath("completion-dialog-review.png")});
  const close=dialog.getByRole("button",{name:"Close",exact:true});
  const box=await close.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(32);expect(box!.height).toBeGreaterThanOrEqual(32);
  for(const dark of [false,true]){
    await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);
    expect(await dialog.getByRole("button",{name:"Confirm participation",exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor)).toBe(await page.evaluate(()=>{const sample=document.createElement("span");sample.style.backgroundColor="var(--color-blue-600)";document.body.append(sample);const color=getComputedStyle(sample).backgroundColor;sample.remove();return color;}));
    expect(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true);
    expect(await dialog.locator("form").evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  }
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);expect(state.logPosts).toHaveLength(0);
});

test("confirmation dialog respects reduced motion",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});const state=await fixture(page);state.status="CONFIRMED";state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/swap-details/flex");await page.getByRole("button",{name:"Confirm Session 1",exact:true}).click();
  const dialog=page.getByRole("dialog");await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  expect(await page.locator('[data-slot="dialog-overlay"]').evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);
});
