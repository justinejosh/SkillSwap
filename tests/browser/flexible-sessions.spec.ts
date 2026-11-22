import {test,expect,Page} from "@playwright/test";
test.use({timezoneId:"Asia/Manila"});
async function fixture(page:Page){
  await page.clock.install({time:new Date("2030-04-10T02:30:00Z")});
  const state:any={caller:"a",status:"PENDING_AGREEMENT",sessions:4,duration:null,version:1,a:null,b:null,posts:[],rows:[],mine:0,theirs:0,logPosts:[],schedulePosts:[]};
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
      if(route.request().method()==="POST"){const body=route.request().postDataJSON();state.schedulePosts.push(body);state.rows.push({...body,id:String(state.rows.length),partner:{name:"Synthetic Partner"},exchangeStatus:state.status});return route.fulfill({status:201,json:body});}
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

test("compact session plan supports keyboard editing, step navigation and the selected approval payload",async({page})=>{
  const state=await fixture(page);await page.goto("/swap-agreement/flex");
  await page.getByRole("button",{name:"Continue",exact:true}).click();
  const count=page.getByLabel("Total Sessions",{exact:true}),summary=page.locator("#session-commitment");
  const less=page.getByRole("button",{name:"Decrease total sessions",exact:true}),more=page.getByRole("button",{name:"Increase total sessions",exact:true});
  await expect(count).toHaveValue("1");await expect(summary).toHaveText("1 session agreed");await expect(less).toBeDisabled();
  await more.focus();await page.keyboard.press("Enter");await expect(count).toHaveValue("2");await expect(summary).toHaveText("2 sessions agreed");
  await less.focus();await page.keyboard.press("Space");await expect(count).toHaveValue("1");
  await count.fill("3");await count.press("ArrowUp");await expect(count).toHaveValue("4");
  await page.getByRole("button",{name:"Previous Step",exact:true}).click();await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(count).toHaveValue("4");
  await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox").check();
  await page.getByRole("button",{name:"Previous Step",exact:true}).click();await more.click();await expect(summary).toHaveText("5 sessions agreed");
  await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(state.posts).toHaveLength(0);await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true}).click();
  await expect.poll(()=>state.posts.length).toBe(1);expect(state.posts[0]).toEqual({sessions:5,agreementVersion:1,agreedToTerms:true});
});

test("session plan retains integer and 1–30 validation for manual values",async({page})=>{
  const state=await fixture(page);await page.goto("/swap-agreement/flex");await page.getByRole("button",{name:"Continue",exact:true}).click();
  const count=page.getByLabel("Total Sessions",{exact:true}),more=page.getByRole("button",{name:"Increase total sessions",exact:true});
  await expect(count).toHaveAttribute("min","1");await expect(count).toHaveAttribute("max","30");
  for(const value of ["","0","31","1.5"]){
    await count.fill(value);await expect(page.locator("#session-commitment")).toHaveText("Choose 1–30 sessions.");
    await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox").check();await page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true}).click();
    await expect(page.getByText(/Please check:\s*Choose 1–30 sessions\./)).toBeVisible();expect(state.posts).toHaveLength(0);
    await page.getByRole("button",{name:"Previous Step",exact:true}).click();await expect(count).toHaveValue(value);
  }
  await count.fill("30");await expect(more).toBeDisabled();await expect(page.locator("#session-commitment")).toHaveText("30 sessions agreed");
  await page.getByRole("button",{name:"Decrease total sessions",exact:true}).click();await expect(count).toHaveValue("29");
  await count.fill("");await more.click();await expect(count).toHaveValue("1");expect(state.posts).toHaveLength(0);
});

test("session plan stays compact in both themes and preserves existing proposals and historical terms",async({page},info)=>{
  const state=await fixture(page);state.version=3;state.sessions=7;
  await page.goto("/swap-agreement/flex");await page.getByRole("button",{name:"Continue",exact:true}).click();
  const count=page.getByLabel("Total Sessions",{exact:true}),controls=page.getByRole("group",{name:"Total session controls",exact:true});
  await expect(count).toHaveValue("7");await expect(page.getByText("Agreed Session Commitment",{exact:true})).toHaveCount(0);
  await expect(page.getByText("Python Programming Fundamentals",{exact:true})).toBeVisible();await expect(page.getByText("SQL Fundamentals",{exact:true})).toBeVisible();
  for(const width of [320,375,390,430,1280]){
    await page.setViewportSize({width,height:900});
    for(const dark of [false,true]){
      await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const box=(await controls.boundingBox())!;expect(box.width).toBeLessThanOrEqual(200);expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
      for(const button of await controls.getByRole("button").all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator("#session-commitment")).toHaveText("7 sessions agreed");
      if(width===320)await page.screenshot({path:info.outputPath(`session-plan-${dark?"dark":"light"}.png`),fullPage:true});
    }
  }
  await page.reload();await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(count).toHaveValue("7");
  state.version=1;state.sessions=4;state.duration=2;await page.reload();await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(count).toHaveValue("4");
  await expect(page.getByText(/These pending terms previously used fixed hours/)).toBeVisible();
  state.duration=null;state.sessions=8;state.a="2030-04-10T02:00:00Z";await page.reload();await page.getByRole("button",{name:"Continue",exact:true}).click();await expect(count).toHaveValue("8");expect(state.posts).toHaveLength(0);
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


test("Session Plan emerald text has the requested scoped colors and readable contrast in both themes",async({page})=>{
  await fixture(page);await page.goto("/swap-agreement/flex");await page.getByRole("button",{name:"Continue",exact:true}).click();
  const label=page.getByText("You Learn",{exact:true}),skill=label.locator("..").getByText("SQL Fundamentals",{exact:true});
  for(const dark of [false,true]){
    await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);
    // Wait for existing global theme transitions before measuring contrast.
    for(const [element,token] of [[label,dark?"emerald-400":"emerald-700"],[skill,dark?"emerald-400":"emerald-800"]] as const){
      const read=()=>element.evaluate((el,token)=>{
        const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d")!;
        const rgba=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data];};
        const sample=document.createElement("span");sample.style.color=`var(--color-${token})`;document.body.append(sample);const expected=rgba(getComputedStyle(sample).color);sample.remove();
        let bg=[255,255,255];const ancestors:Element[]=[];for(let node:Element|null=el;node;node=node.parentElement)ancestors.unshift(node);
        for(const node of ancestors){const c=rgba(getComputedStyle(node).backgroundColor),a=c[3]/255;bg=bg.map((v,i)=>c[i]*a+v*(1-a));}
        const fg=rgba(getComputedStyle(el).color);
        const luminance=(c:number[])=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const a=luminance(fg),b=luminance(bg);
        return {matches:fg.every((v,i)=>v===expected[i]),contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
      },token);
      await expect.poll(async()=>(await read()).matches).toBe(true);
      await expect.poll(async()=>(await read()).contrast).toBeGreaterThanOrEqual(4.5);
      console.log(`Session Plan ${dark?"dark":"light"} ${token} contrast ${(await read()).contrast.toFixed(2)}:1`);
    }
  }
});

test("partial participation locks only those sessions including unscheduled participation from either student",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.sessions=3;state.a=state.b="2030-04-10T02:00:00Z";
  for(const participant of ["mine","theirs"]){
    state.mine=state.theirs=0;state[participant]=2;
    await page.goto("/swap-details/flex");await page.getByRole("button",{name:"Schedule Sessions",exact:true}).click();
    await expect(page.getByRole("combobox",{name:"Session number",exact:true})).toHaveValue("3");
    for(const n of [1,2])await expect(page.getByRole("option",{name:`Session ${n} — acknowledged, locked`,exact:true})).toBeDisabled();
    await expect(page.getByText("Participation recorded without a schedule:",{exact:false})).toContainText("Session 1, Session 2");
    await expect(page.getByRole("button",{name:"Save Session Schedule",exact:true})).toBeEnabled();
    expect(state.schedulePosts).toHaveLength(0);expect(state.rows).toHaveLength(0);expect(state.status).toBe("CONFIRMED");
  }
  // A session-level flag also locks that row independently of counter refresh.
  state.mine=state.theirs=0;state.rows=[{id:"scheduled",swapId:"flex",sessionNumber:1,scheduledAt:"2030-04-10T04:00:00Z",endsAt:"2030-04-10T04:30:00Z",confirmedByPartner:true,partner:{name:"Synthetic Partner"},exchangeStatus:"CONFIRMED"}];
  await page.reload();await expect(page.getByRole("combobox",{name:"Session number",exact:true})).toHaveValue("2");
  await expect(page.locator('time[datetime="2030-04-10T04:30:00Z"]')).toBeVisible();
});

test("all participation changes actions to View Sessions and preserves independent confirmations and historical schedules",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.sessions=3;state.a=state.b="2030-04-10T02:00:00Z";
  state.rows=[{id:"saved",swapId:"flex",sessionNumber:1,scheduledAt:"2030-04-10T02:00:00Z",endsAt:"2030-04-10T02:20:00Z",meetingLink:"https://example.invalid/original",partner:{name:"Synthetic Partner"},exchangeStatus:"CONFIRMED",confirmedByMe:false,confirmedByPartner:true}];
  const before=JSON.stringify(state.rows);
  for(const [mine,theirs] of [[3,0],[0,3],[3,3]]){
    Object.assign(state,{mine,theirs});await page.goto("/swap-details/flex");
    await expect(page.getByRole("button",{name:"Schedule Sessions",exact:true})).toHaveCount(0);
    if(mine===0)await expect(page.getByRole("button",{name:"Confirm Session 1",exact:true})).toBeEnabled();
    await page.getByRole("button",{name:"View Sessions",exact:true}).click();
    await expect(page.getByText("All agreed sessions have recorded participation.",{exact:false})).toBeVisible();
    await expect(page.getByRole("button",{name:"Save Session Schedule",exact:true})).toBeDisabled();
    await expect(page.getByLabel("Date and time (your local time)",{exact:true})).toBeDisabled();
    await expect(page.getByLabel("HTTPS meeting link (optional)",{exact:true})).toBeDisabled();
    await expect(page.locator('time[datetime="2030-04-10T02:20:00Z"]')).toBeVisible();
    await page.reload();await expect(page.getByRole("button",{name:"Save Session Schedule",exact:true})).toBeDisabled();
    await page.goto("/swap-agreement/flex");await expect(page.getByRole("button",{name:"View Sessions",exact:true})).toBeVisible();
    await expect(page.getByRole("button",{name:"Schedule Later",exact:true})).toHaveCount(0);
    expect(state.status).toBe("CONFIRMED");expect(state.schedulePosts).toHaveLength(0);expect(state.logPosts).toHaveLength(0);expect(JSON.stringify(state.rows)).toBe(before);
  }
});

test("stale calendar rechecks participation before saving and refresh selects the next eligible session",async({page})=>{
  const state=await fixture(page);state.status="CONFIRMED";state.a=state.b="2030-04-10T02:00:00Z";
  await page.goto("/calendar?swapId=flex");await page.getByLabel("Date and time (your local time)",{exact:true}).fill("2030-04-10T12:00");
  await page.getByLabel("End date and time (your local time)",{exact:true}).fill("2030-04-10T12:30");state.theirs=1;
  await page.getByRole("button",{name:"Save Session Schedule",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("acknowledged session cannot be rescheduled");expect(state.schedulePosts).toHaveLength(0);
  await page.getByRole("button",{name:"Refresh calendar",exact:true}).click();
  await expect(page.getByRole("combobox",{name:"Session number",exact:true})).toHaveValue("2");await expect(page.getByLabel("Date and time (your local time)",{exact:true})).toHaveValue("");
  await page.getByLabel("Date and time (your local time)",{exact:true}).fill("2030-04-10T12:00");await page.getByLabel("End date and time (your local time)",{exact:true}).fill("2030-04-10T12:30");
  await page.getByRole("button",{name:"Save Session Schedule",exact:true}).click();await expect.poll(()=>state.schedulePosts.length).toBe(1);
  expect(state.schedulePosts[0].sessionNumber).toBe(2);expect(state.mine).toBe(0);expect(state.theirs).toBe(1);expect(state.rows).toHaveLength(1);
});
