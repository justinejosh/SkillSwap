import { test, expect, Page } from "@playwright/test";
test.use({ timezoneId: "Asia/Manila" });

async function fixture(page: Page, theme: "light" | "dark" = "light") {
  await page.clock.install({ time: new Date("2030-04-10T02:30:00Z") });
  const a={id:"surface-a",name:"Synthetic Student",role:"USER"},b={id:"surface-b",name:"Synthetic Partner With A Very Long Name That Must Wrap Inside The Exchange Summary"};
  const state:any={status:"CONFIRMED",mine:0,theirs:0,ownReview:null,rows:[],posts:[],approval:"2030-04-10T01:30:00Z",eligible:false,confirmationPosts:0};
  const snapshot=()=>({id:"surface-swap",status:state.status,integrityVerified:true,requesterId:a.id,receiverId:b.id,requester:a,receiver:b,me:a,partner:b,offeredSkill:{id:"python",name:"Python Programming Fundamentals"},wantedSkill:{id:"sql",name:"SQL Fundamentals"},sessions:4,duration:2,agreementVersion:3,requesterApprovedAt:state.approval,receiverApprovedAt:state.approval,requesterSessions:state.mine,receiverSessions:state.theirs,canReview:state.status==="CONFIRMED"&&state.mine===4&&state.theirs===4&&!state.ownReview,reviewSummary:{myReview:state.ownReview,partnerSubmitted:state.status==="COMPLETED"}});
  await page.addInitScript(({theme})=>{localStorage.setItem("knoxite_user",JSON.stringify({id:"surface-a",role:"USER"}));localStorage.setItem("knoxite_token","synthetic-surface-session");localStorage.setItem("theme_surface-a",theme);localStorage.setItem("knoxite_onboarding_completed","true");},{theme});
  await page.route("**/*",async route=>{
    const u=new URL(route.request().url());if(u.origin==="http://127.0.0.1:5174")return route.continue();if(u.origin!=="http://127.0.0.1:5009")return route.abort();
    const path=u.pathname.replace(/\/$/,"");
    if(path==="/api/profile"||path.startsWith("/api/users/"))return route.fulfill({json:{...a,email:"synthetic@fixture.test",bio:"Synthetic biography",programId:"p",yearLevelId:"y",program:{id:"p",label:"BSCS"},yearLevel:{id:"y",name:"1st Year"},department:null,offeredSkills:[],wantedSkills:[],metrics:{averageRating:null,ratingCount:0,completedSwaps:0}}});
    if(path==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(path==="/api/swaps/surface-swap")return route.fulfill({json:{...snapshot(),confirmationEligibility:{eligible:state.eligible,reason:state.eligible?"This session can now be confirmed.":"Refresh status before confirming participation.",scheduledEndAt:null}}});
    if(path==="/api/swaps/surface-swap/log-session"){
      state.confirmationPosts++;
      if(!state.eligible)return route.fulfill({status:409,json:{error:"Agreement changed. Refresh before confirming participation."}});
      state.mine++;return route.fulfill({json:snapshot()});
    }
    if(path==="/api/swaps")return route.fulfill({json:[snapshot()]});
    if(path==="/api/sessions"){
      if(route.request().method()==="POST"){const body=route.request().postDataJSON();state.posts.push(body);state.rows.push({...body,id:"schedule",partner:b,exchangeStatus:state.status,confirmedByMe:false,confirmedByPartner:false});return route.fulfill({status:201,json:body});}
      return route.fulfill({json:state.rows.map((row:any)=>({...row,confirmationEligibility:{eligible:state.eligible,reason:state.eligible?"This session can now be confirmed.":"Agreement changed. Refresh before confirming participation.",scheduledEndAt:"2030-04-10T04:00:00Z"}}))});
    }
    if(path==="/api/leaderboard")return route.fulfill({json:{topMentors:[],viewer:{eligible:false,reasons:[]}}});
    if(path==="/api/academic-options")return route.fulfill({json:{programs:[{id:"p",label:"BSCS",yearLevels:[{id:"y",name:"1st Year"}]}],yearLevels:[{id:"y",name:"1st Year"}]}});
    return route.fulfill({json:[]});
  });return state;
}

for(const theme of ["light","dark"] as const){
  test(`shared ${theme} contours stay static, behind controls and consistent across student routes`,async({page},info)=>{
    test.setTimeout(60000);await fixture(page,theme);
    for(const route of ["/dashboard","/knox-hub","/leaderboard","/notification","/students/surface-b","/profile","/swap-agreement/surface-swap","/swap-details/surface-swap","/calendar?swapId=surface-swap","/chat"]){
      await page.goto(route);const surface=page.locator(".knoxite-surface").first();await expect(surface).toBeVisible();
      const readStyles=()=>surface.evaluate(el=>{const s=getComputedStyle(el),p=getComputedStyle(el,"::before"),c=document.createElement("canvas");c.width=c.height=1;const ctx=c.getContext("2d")!;ctx.fillStyle=p.backgroundColor;ctx.fillRect(0,0,1,1);return{base:s.backgroundColor,image:s.backgroundImage,pointer:p.pointerEvents,animation:p.animationName,mask:p.maskImage,repeat:p.maskRepeat,alpha:ctx.getImageData(0,0,1,1).data[3]/255};});
      // AuthGuard replaces its neutral surface after validation. Retry against
      // the current DOM rather than asserting an empty style from a detached node.
      let styles={} as Awaited<ReturnType<typeof readStyles>>;
      await expect.poll(async()=>{styles=await readStyles();return styles.base;}).toBe(theme==="light"?"rgb(247, 250, 255)":"rgb(17, 28, 46)");
      expect(styles.base).toBe(theme==="light"?"rgb(247, 250, 255)":"rgb(17, 28, 46)");expect(styles.image).toContain("linear-gradient");expect(styles.image).not.toContain("radial-gradient");expect(styles.mask).toContain("svg");expect(styles.repeat).toBe("repeat");expect(styles.alpha).toBeGreaterThan(0);expect(styles.alpha).toBeLessThanOrEqual(.08);expect(styles.pointer).toBe("none");expect(styles.animation).toBe("none");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(route==="/dashboard"){await expect(page.getByRole("heading",{name:"Compatible Peer Matches",exact:true})).toBeVisible();await page.screenshot({path:info.outputPath(`wash-${theme}.png`),fullPage:true});}
    }
    await page.reload();await expect(page.locator("html")).toHaveAttribute("style",`color-scheme: ${theme};`);await page.goBack();await page.goForward();await expect(page.locator("html")).toHaveAttribute("style",`color-scheme: ${theme};`);
  });
  test(`tracking ${theme}: summary, confirmation states and action hierarchy stay truthful`,async({page},info)=>{
    const state=await fixture(page,theme);
    for(const item of [{status:"PENDING_AGREEMENT",mine:0,theirs:0,title:"Agreement awaiting approval"},{status:"CONFIRMED",mine:0,theirs:0,title:"Exchange in progress"},{status:"CONFIRMED",mine:2,theirs:1,title:"Exchange in progress"},{status:"CONFIRMED",mine:4,theirs:2,title:"Waiting for your partner's confirmations"},{status:"CONFIRMED",mine:4,theirs:4,title:"Both Students Confirmed Their Sessions"},{status:"CONFIRMED",mine:4,theirs:4,title:"Your review submitted",ownReview:{rating:4}},{status:"COMPLETED",mine:4,theirs:4,title:"Exchange completed"},{status:"CANCELLED",mine:1,theirs:0,title:"Exchange cancelled"}]){
      Object.assign(state,{ownReview:null},item);await page.goto("/swap-details/surface-swap");await expect(page.getByRole("heading",{name:item.title,exact:true})).toBeVisible();
      const summary=page.getByRole("region",{name:"Exchange summary",exact:true});await expect(summary.getByRole("group",{name:"What you'll teach",exact:true})).toContainText("Python Programming Fundamentals");await expect(summary.getByRole("group",{name:"What you'll learn",exact:true})).toContainText("SQL Fundamentals");await expect(summary).toContainText("8 hours per student");
      await expect(page.getByRole("progressbar",{name:"Your Confirmations",exact:true})).toHaveAttribute("aria-valuenow",String(item.mine/4*100));await expect(page.getByRole("progressbar",{name:"Partner Confirmations",exact:true})).toHaveAttribute("aria-valuenow",String(item.theirs/4*100));
      const closed=["COMPLETED","CANCELLED"].includes(item.status);await expect(page.getByRole("button",{name:"Cancel Exchange",exact:true})).toHaveCount(closed?0:1);await expect(page.getByRole("button",{name:"Schedule Sessions",exact:true})).toHaveCount(item.status==="CONFIRMED"&&Math.max(item.mine,item.theirs)<4?1:0);await expect(page.getByRole("button",{name:"View Sessions",exact:true})).toHaveCount(item.status==="CONFIRMED"&&Math.max(item.mine,item.theirs)>=4?1:0);if(closed)await expect(page.getByText("Confirmations still pending",{exact:true})).toHaveCount(0);
      await expect(page.getByRole("button",{name:/^Confirm Session \d/})).toHaveCount(item.status==="CONFIRMED"&&item.mine<4?1:0);await expect(page.getByRole("button",{name:"Rate Your Swap Partner",exact:true})).toHaveCount(item.status==="CONFIRMED"&&item.mine===4&&item.theirs===4&&!state.ownReview?1:0);
      const width=await page.locator("main").evaluate(el=>el.getBoundingClientRect().width);expect(width).toBeLessThanOrEqual(850);if(info.project.name==="desktop")expect(width).toBeGreaterThanOrEqual(700);else{const summaryBox=(await summary.boundingBox())!,nameBox=(await summary.getByText("Synthetic Partner With A Very Long Name That Must Wrap Inside The Exchange Summary",{exact:true}).boundingBox())!;expect(nameBox.width).toBeGreaterThan(summaryBox.width*.8);}expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.screenshot({path:info.outputPath(`tracking-${theme}.png`),fullPage:true});
    state.status="COMPLETED";await page.getByRole("button",{name:"View Agreement",exact:true}).click();await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();await expect(page.getByRole("spinbutton")).toHaveCount(0);await expect(page.getByRole("checkbox")).toHaveCount(0);await expect(page.locator("time")).toHaveCount(2);await expect(page.getByText("Agreement version 3",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Back to Swap Tracking",exact:true}).click();await page.goBack();await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();
  });
  test(`calendar ${theme}: local-time controls, saved history and readonly closed context`,async({page},info)=>{
    const state=await fixture(page,theme);state.rows=[{id:"past",swapId:"surface-swap",sessionNumber:4,scheduledAt:"2020-01-01T00:00:00Z",partner:{name:"Synthetic Historical Partner"},exchangeStatus:"CONFIRMED",confirmedByMe:true,confirmedByPartner:false}];
    await page.goto("/calendar?swapId=surface-swap");await expect(page.getByRole("heading",{name:"Session Calendar",exact:true})).toBeVisible();const date=page.getByLabel("Date and time (your local time)",{exact:true});await expect(date).toHaveAttribute("min","2030-04-10T10:31");await expect(page.getByText("Time zone: Asia/Manila.",{exact:false})).toBeVisible();await expect(page.getByRole("option",{name:"Session 4 — acknowledged, locked",exact:true})).toBeDisabled();
    await date.fill("2030-04-10T12:00");await page.getByLabel("End date and time (your local time)",{exact:true}).fill("2030-04-10T14:00");await page.getByLabel("HTTPS meeting link (optional)",{exact:true}).fill("https://example.invalid/synthetic-session");await page.getByRole("button",{name:"Save Session Schedule",exact:true}).click();await expect.poll(()=>state.posts.length).toBe(1);expect(state.posts[0].scheduledAt).toBe("2030-04-10T04:00:00.000Z");expect(state.posts[0].endsAt).toBe("2030-04-10T06:00:00.000Z");await expect(page.getByText("Session schedule saved.",{exact:false})).toBeVisible();await expect(page.locator('time[datetime="2020-01-01T00:00:00Z"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`calendar-${theme}.png`),fullPage:true});state.status="COMPLETED";await page.reload();await expect(page.getByRole("button",{name:"Save Session Schedule",exact:true})).toBeDisabled();await expect(page.getByText("This exchange is read-only.",{exact:false})).toBeVisible();expect(state.rows[0].scheduledAt).toBe("2020-01-01T00:00:00Z");
  });
}

test("Tracking permits actual participation when the same exchange has no calendar sessions",async({page})=>{
  const state=await fixture(page);state.eligible=true;
  await page.goto("/swap-details/surface-swap");
  await expect(page.getByRole("button",{name:"Confirm Session 1",exact:true})).toBeEnabled();
  await expect(page.getByText("This session can now be confirmed.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Schedule Sessions",exact:true}).click();
  await expect(page).toHaveURL(/calendar\?swapId=surface-swap/);
  await expect(page.getByText("No sessions scheduled yet.",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText("No sessions scheduled yet.",{exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Back to Swap Tracking",exact:true}).click();
  await expect(page.getByRole("button",{name:"Confirm Session 1",exact:true})).toBeEnabled();
  expect(state.rows).toHaveLength(0);expect(state.posts).toHaveLength(0);
});

test("Tracking refreshes server eligibility and handles a stale confirmation without changing progress",async({page})=>{
  const state=await fixture(page);await page.goto("/swap-details/surface-swap");
  const confirm=page.getByRole("button",{name:"Confirm Session 1",exact:true});await expect(confirm).toBeDisabled();
  state.eligible=true;await page.clock.fastForward(11000);await expect(confirm).toBeEnabled();
  state.eligible=false;await confirm.click();await page.getByLabel("Actual completion date and time",{exact:true}).fill("2030-04-10T10:15");await page.getByRole("button",{name:"Confirm participation",exact:true}).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Agreement changed");expect(state.mine).toBe(0);expect(state.confirmationPosts).toBe(1);
  await page.reload();await expect(confirm).toBeDisabled();
  state.eligible=true;await page.clock.fastForward(11000);await expect(confirm).toBeEnabled();await confirm.click();await page.getByLabel("Actual completion date and time",{exact:true}).fill("2030-04-10T10:15");await page.getByRole("button",{name:"Confirm participation",exact:true}).click();
  await expect(page.getByRole("button",{name:"Confirm Session 2",exact:true})).toBeVisible();expect(state.mine).toBe(1);
});

test("Calendar refreshes authoritative confirmation eligibility without activity renewal",async({page})=>{
  const state=await fixture(page);state.rows=[{id:"scheduled",swapId:"surface-swap",sessionNumber:1,scheduledAt:"2030-04-10T02:00:00Z",partner:{name:"Synthetic Partner"},exchangeStatus:"CONFIRMED",confirmedByMe:false,confirmedByPartner:false}];
  let renewals=0;page.on("request",request=>{if(request.url().includes("session-activity"))renewals++;});
  await page.goto("/calendar?swapId=surface-swap");await expect(page.getByText("Agreement changed. Refresh before confirming participation.",{exact:false})).toBeVisible();
  state.eligible=true;await page.clock.fastForward(16000);await expect(page.getByText("This session can now be confirmed.",{exact:false})).toBeVisible();expect(renewals).toBe(0);
});

test("targeted skill and chat wording preserves the existing exchange navigation",async({page})=>{
  await fixture(page);
  await page.goto("/my-skills");
  await page.getByRole("button",{name:"Add Your First Skill",exact:true}).click();
  await expect(page.getByRole("dialog").getByText("Add a skill you can teach or want to learn.",{exact:true})).toBeVisible();
  await expect(page.getByText(/Expand your trading matrix/)).toHaveCount(0);
  await page.goto("/chat?partnerId=surface-b&swapId=surface-swap");
  await expect(page.getByRole("button",{name:"View Deal",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"View Exchange",exact:true}).click();
  await expect(page).toHaveURL(/swap-agreement\/surface-swap/);
  await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();
});

test("calendar blocks expired today/past inputs and rechecks stale forms and final approvals before POST",async({page})=>{
  const state=await fixture(page);await page.goto("/calendar?swapId=surface-swap");const date=page.getByLabel("Date and time (your local time)",{exact:true}),save=page.getByRole("button",{name:"Save Session Schedule",exact:true});
  for(const value of ["2030-04-09T12:00","2030-04-10T10:29","2030-04-10T10:30"]){await date.fill(value);await save.click();await expect(page.getByRole("alert").filter({hasText:"strictly in the future"})).toBeVisible();expect(state.posts).toHaveLength(0);}
  await date.fill("2030-04-10T10:31");await page.clock.fastForward(120000);await save.click();await expect(page.getByRole("alert").filter({hasText:"strictly in the future"})).toBeVisible();expect(state.posts).toHaveLength(0);
  await date.fill("2030-04-10T12:00");await page.getByLabel("End date and time (your local time)",{exact:true}).fill("2030-04-10T14:00");state.approval="2030-04-10T05:00:00Z";await save.click();await expect(page.getByRole("alert")).toContainText("after both students approved");expect(state.posts).toHaveLength(0);
  state.approval="2030-04-10T01:30:00Z";state.status="CANCELLED";await save.click();await expect(page.getByRole("alert")).toContainText("no longer available");expect(state.posts).toHaveLength(0);
});
