import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function fixture(page: Page, status="COMPLETED", theme?: "light"|"dark") {
  const me={id:"student-a",name:"Synthetic Student",role:"USER",bio:"",avatarUrl:null};
  const partner={id:"student-b",name:"Synthetic Partner With A Very Long Name For Responsive Testing",bio:"",avatarUrl:null};
  const state:any={status,version:1,myReview:null,partnerReviewSubmitted:false,posts:0,agreementPosts:0,activeUser:me,requestPosts:0};
  const profile={...me,email:"fixturelag@fixture.test",program:null,yearLevel:null,department:null,offeredSkills:[],wantedSkills:[],metrics:{averageRating:null,ratingCount:0,completedSwaps:0}};
  const swap=()=>({id:"swap-a",requesterId:me.id,receiverId:partner.id,me,partner,requester:me,receiver:partner,offeredSkill:{id:"python",name:"Python Programming Fundamentals"},wantedSkill:{id:"java",name:"Java Programming Fundamentals"},status:state.status,integrityVerified:true,agreementVersion:state.version,duration:1,sessions:2,requesterSessions:2,receiverSessions:2,requesterApprovedAt:"2026-11-14T01:00:00Z",receiverApprovedAt:"2026-11-14T01:01:00Z",canReview:state.status==="CONFIRMED"&&!state.myReview,reviewSummary:{myReview:state.myReview,partnerSubmitted:state.partnerReviewSubmitted}});
  await page.addInitScript(({theme})=>{if(!localStorage.getItem("knoxite_token")){localStorage.setItem("knoxite_token","synthetic-session");localStorage.setItem("knoxite_user",JSON.stringify({id:"student-a",role:"USER"}));}if(theme&&!localStorage.getItem("theme_student-a"))localStorage.setItem("theme_student-a",theme);localStorage.setItem("knoxite_onboarding_completed","true");},{theme});
  await page.route("**/*",async route=>{
    const u=new URL(route.request().url()),method=route.request().method();
    if(u.origin==="http://127.0.0.1:5174")return route.continue();
    if(u.origin!=="http://127.0.0.1:5009")return route.abort();
    if(u.pathname.replace(/\/$/,"")==="/api/profile")return route.fulfill({json:{...profile,...state.activeUser}});
    if(u.pathname==="/api/auth/login"){state.activeUser={...partner,role:"USER",email:"fixture-b@fixture.test"};return route.fulfill({json:{token:"synthetic-b",user:state.activeUser}});}
    if(u.pathname==="/api/auth/logout")return route.fulfill({json:{message:"Signed out"}});
    if(u.pathname.startsWith("/api/users/"))return route.fulfill({json:{...profile,id:u.pathname.split("/")[3]}});
    if(u.pathname==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(u.pathname==="/api/swaps/swap-a")return route.fulfill({json:swap()});
    if(u.pathname==="/api/swaps")return route.fulfill({json:state.swaps||[]});
    if(u.pathname==="/api/swap-requests")return route.fulfill({json:[{id:"request-a",requesterId:me.id,receiverId:partner.id,requester:me,receiver:partner,status:"ACCEPTED",offeredSkill:swap().offeredSkill,wantedSkill:swap().wantedSkill,linkedSwap:{id:"swap-a",status:state.status},createdAt:new Date().toISOString()}]});
    if(u.pathname==="/api/reputation/submit"&&method==="POST") {state.posts++;const body=route.request().postDataJSON();state.myReview={id:"review-a",rating:body.rating,comment:body.comment,isValidated:true};return route.fulfill({json:state.myReview});}
    if(u.pathname==="/api/swaps/swap-a/agreement"&&method==="POST"){state.agreementPosts++;return route.fulfill({status:409,json:{error:"Agreement is closed."}});}
    if(u.pathname==="/api/auth/providers")return route.fulfill({json:{google:{enabled:false}}});
    if(u.pathname==="/api/leaderboard")return route.fulfill({json:{topMentors:[],viewer:{eligible:false}}});
    if(u.pathname==="/api/matches")return route.fulfill({json:state.matches||[]});
    if(u.pathname==="/api/academic-options")return route.fulfill({json:{programs:[],yearLevels:[]}});
    if(u.pathname==="/api/swaps/request"){state.requestPosts++;return route.fulfill({status:409,json:{error:"An exchange with this student is already pending or active."}});}
    if(u.pathname==="/api/profile/skill-catalog")return route.fulfill({json:{presets:[]}});
    if(u.pathname==="/api/swaps/cancel/swap/swap-a"&&method==="DELETE"){
      state.cancellations=(state.cancellations||0)+1;
      if(state.cancelFailure)return route.fulfill({status:409,json:{error:"Exchange changed. Refresh before trying again."}});
      state.status="CANCELLED";return route.fulfill({json:{message:"Exchange cancelled"}});
    }
    return route.fulfill({json:[]});
  });return state;
}

test("dashboard exchange links and account dropdown support keyboard navigation",async({page})=>{
  const state=await fixture(page,"CONFIRMED","light");
  state.swaps=[{id:"swap-a",status:"CONFIRMED",requesterId:"student-a",receiverId:"student-b",requester:state.activeUser,receiver:{id:"student-b",name:"Synthetic Partner"},sessions:3,requesterSessions:1,receiverSessions:0,offeredSkill:{name:"Python Programming Fundamentals"},wantedSkill:{name:"Java Programming Fundamentals"}}];
  await page.goto("/dashboard");
  const trigger=page.getByTitle("Account Menu",{exact:true});
  await trigger.focus();await page.keyboard.press("Enter");await expect(trigger).toHaveAttribute("aria-expanded","true");
  await page.keyboard.press("Tab");await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute("aria-expanded","false");
  const exchange=page.getByRole("link",{name:"Open exchange with Synthetic Partner",exact:true});
  await expect(exchange).toBeVisible();await exchange.focus();await page.keyboard.press("Enter");await expect(page).toHaveURL(/\/swap-details\/swap-a$/);
});

test("exchange cancellation requires explicit confirmation and retains actionable errors",async({page})=>{
  const state=await fixture(page,"CONFIRMED","dark");
  let nativeDialogs=0;page.on("dialog",async dialog=>{nativeDialogs++;await dialog.dismiss();});
  await page.goto("/swap-details/swap-a");
  await page.getByRole("button",{name:"Cancel Exchange",exact:true}).click();
  const dialog=page.getByRole("alertdialog");
  await expect(dialog).toContainText("agreement, sessions and reviews will remain");expect(state.cancellations||0).toBe(0);
  await dialog.getByRole("button",{name:"Keep Exchange",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole("button",{name:"Cancel Exchange",exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Cancel Exchange",exact:true}).click();state.cancelFailure=true;
  await dialog.getByRole("button",{name:"Cancel Exchange",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("Refresh before trying again");
  await expect(dialog.getByRole("button",{name:"Cancel Exchange",exact:true})).toBeEnabled();state.cancelFailure=false;
  await dialog.getByRole("button",{name:"Cancel Exchange",exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Cancel Exchange",exact:true})).toHaveCount(0);expect(state.cancellations).toBe(2);expect(nativeDialogs).toBe(0);
});
test("closed agreement has no finalize wizard or signing controls",async({page})=>{
  await fixture(page);await page.goto("/swap-agreement/swap-a");
  await expect(page.getByText("Finalize Swap",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
});

test("peer reporting remains visible while direct self-report is disabled",async({page})=>{
  await fixture(page);await page.goto("/students/student-b");await expect(page.getByRole("link",{name:"Report a concern about this student"})).toBeVisible();
  await page.goto("/report?userId=STUDENT-A");await expect(page.getByRole("button",{name:"Submit Report",exact:false})).toBeDisabled();
});

for(const status of ["CANCELLED","REJECTED","WITHDRAWN","CONFIRMED"]){
  test(`${status} agreement is read-only after direct loading, refresh and back`,async({page})=>{
    const state=await fixture(page,status);await page.goto("/swap-agreement/swap-a");
    await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();await expect(page.getByRole("spinbutton")).toHaveCount(0);await expect(page.getByRole("checkbox")).toHaveCount(0);
    if(status==="CONFIRMED")await expect(page.getByText(/exchange is still in progress/)).toBeVisible();
    await page.reload();await expect(page.getByText(/Agreement version 1/)).toBeVisible();
    await page.getByRole("button",{name:"Back to Swap Tracking",exact:true}).click();await page.goBack();await expect(page.getByRole("spinbutton")).toHaveCount(0);expect(state.agreementPosts).toBe(0);
  });
}

test("stale signing tab checks current status before posting and renders closed terms",async({page})=>{
  const state=await fixture(page,"PENDING_AGREEMENT");await page.goto("/swap-agreement/swap-a");
  await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByLabel("Total Sessions",{exact:true}).fill("3");await page.getByRole("button",{name:"Continue",exact:true}).click();await page.getByRole("checkbox").check();
  state.status="COMPLETED";
  await page.getByRole("button",{name:"Sign Bilateral Agreement",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();await expect(page.getByRole("alert")).toContainText("agreement changed");await expect(page.getByRole("spinbutton")).toHaveCount(0);expect(state.agreementPosts).toBe(0);
});

test("pending approval notices update on focus and completed notifications open historical agreement",async({page})=>{
  const state=await fixture(page,"PENDING_AGREEMENT");await page.goto("/swap-agreement/swap-a");await expect(page.getByRole("button",{name:"Continue",exact:true})).toBeVisible();state.status="COMPLETED";
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();
  await page.goto("/notification");await page.getByRole("tab",{name:/History/}).click();await expect(page.getByText("Completed",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Review Agreement",exact:true})).toHaveCount(0);await page.getByRole("link",{name:"View Agreement",exact:true}).click();await expect(page.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();
});

for(const theme of ["light","dark"] as const){
  test(`${theme}: rating, saved review, completion, focus and responsive layout`,async({page},info)=>{
    const state=await fixture(page,"CONFIRMED",theme);await page.goto("/reputation?swapId=swap-a&partnerId=forged-recipient");
    await expect(page.getByRole("button",{name:"Submit Review",exact:true})).toBeDisabled();
    await page.getByRole("radio",{name:"3 out of 5 stars"}).focus();await page.keyboard.press("Space");await expect(page.getByRole("radio",{name:"3 out of 5 stars"})).toBeChecked();
    const textarea=page.getByLabel("Comment (optional)");await textarea.fill("Synthetic evaluation, never saved to a shared database.");await textarea.focus();
    expect(await textarea.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe("none");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`evaluation-${theme}.png`),fullPage:true});
    await page.getByRole("button",{name:"Submit Review",exact:true}).click();await expect(page.getByRole("heading",{name:"Your review submitted"})).toBeVisible();expect(state.posts).toBe(1);
    await page.reload();await expect(page.getByText("Waiting for your partner's review. Your review is saved.",{exact:true})).toBeVisible();await expect(page.getByRole("radio")).toHaveCount(0);
    state.status="COMPLETED";state.partnerReviewSubmitted=true;await page.getByRole("button",{name:"Refresh status",exact:true}).click();await expect(page.getByText("Exchange completed. Both students have submitted their reviews.",{exact:true})).toBeVisible();expect(state.posts).toBe(1);
  });
  test(`${theme}: preference survives routes, refresh, back and forward`,async({page})=>{
    await fixture(page,"COMPLETED",theme);
    for(const route of ["/dashboard","/swap-agreement/swap-a","/swap-details/swap-a","/reputation?swapId=swap-a","/students/student-b","/profile","/notification"]){
      await page.goto(route);await expect(page.locator("html")).toHaveAttribute("style",`color-scheme: ${theme};`);await page.reload();await expect(page.locator("html")).toHaveClass(theme==="dark"?/dark/:/^(?!.*dark)/);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    }
    await page.goBack();await expect(page.locator("html")).toHaveClass(theme==="dark"?/dark/:/^(?!.*dark)/);await page.goForward();await expect(page.locator("html")).toHaveClass(theme==="dark"?/dark/:/^(?!.*dark)/);
  });
}

test("profile toggle syncs two tabs and keeps separate account preferences after logout/login",async({page,context})=>{
  await fixture(page,"COMPLETED","light");const second=await context.newPage();await fixture(second,"COMPLETED","light");
  await page.goto("/dashboard");await second.goto("/swap-agreement/swap-a");await page.getByTitle("Account Menu",{exact:true}).click();await page.getByRole("button",{name:"Dark Mode",exact:true}).click();
  await expect(page.getByRole("button",{name:"Dark Mode",exact:true})).toHaveAttribute("aria-pressed","true");await expect(second.locator("html")).toHaveClass(/dark/);await second.reload();await expect(second.locator("html")).toHaveClass(/dark/);
  await page.evaluate(()=>localStorage.setItem("theme_student-b","light"));
  page.on("dialog",d=>d.accept());await page.getByRole("button",{name:"Log Out",exact:true}).click();
  await page.goto("/login");await page.getByLabel("Email Address",{exact:true}).fill("fixture-b@fixture.test");await page.getByLabel("Password",{exact:true}).fill("synthetic-password-not-a-real-credential");await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page).toHaveURL(/dashboard/);await expect(page.locator("html")).not.toHaveClass(/dark/);await expect(second.locator("html")).not.toHaveClass(/dark/);
  expect(await page.evaluate(()=>({a:localStorage.getItem("theme_student-a"),b:localStorage.getItem("theme_student-b")}))).toEqual({a:"dark",b:"light"});
});

test("long match lists expand accessibly without hiding the reciprocal skills",async({page})=>{
  const state=await fixture(page);const skills=Array.from({length:12},(_,i)=>({id:`skill-${i}`,name:`Synthetic skill ${i}`,tier:"NOT_ASSESSED"}));
  state.matches=[{id:"student-b",name:"Synthetic Partner With A Very Long Name For Responsive Testing",avatarUrl:null,matchScore:85,offeredSkills:skills,wantedSkills:skills,matchingOfferedSkills:[skills[11]],matchingWantedSkills:[skills[10]],matchDetails:{averageRating:4.5,ratingCount:1,uniqueRatingPartners:1,completionRate:1,proximity:{value:.5,reason:"Synthetic academic fixture"},missing:[]}}];
  await page.goto("/dashboard");const card=page.getByRole("article",{name:/Synthetic Partner/});await expect(card.getByRole("group",{name:"What you'll learn",exact:true})).toContainText("Synthetic skill 11");await expect(card.getByRole("group",{name:"What you'll teach",exact:true})).toContainText("Synthetic skill 10");await expect(card.getByText("Limited evidence:",{exact:false})).toBeVisible();
  const expand=card.getByRole("button",{name:/Show all skills/});await expand.click();await expect(card.getByRole("button",{name:"Show fewer skills"})).toHaveAttribute("aria-expanded","true");await expect(card.locator("li")).toHaveCount(12);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

for(const path of ["/dashboard","/knox-hub"]){
  for(const theme of ["light","dark"] as const){
    test(`reciprocal exchange panels at ${path} in ${theme} keep both students' perspectives`,async({page},info)=>{
      const state=await fixture(page,"CONFIRMED",theme);
      const catalog=JSON.parse(readFileSync("knoxite-backend/config/skill-catalog.json","utf8")).skills;
      const canonical=(name:string)=>{const p=catalog.find((s:any)=>s.name===name);expect(p).toBeTruthy();return{id:`canonical-${p.key}`,name:p.name,tier:"NOT_ASSESSED"};};
      const first=[canonical("Python Programming Fundamentals"),canonical("JavaScript Fundamentals")];
      const second=[canonical("Bookkeeping Fundamentals"),canonical("English Grammar")];
      for(const viewer of ["student-a","student-b"]){
        state.activeUser={id:viewer,name:`Synthetic ${viewer}`,role:"USER"};
        const learn=viewer==="student-a"?first:second,teach=viewer==="student-a"?second:first;
        state.matches=[{id:viewer==="student-a"?"student-b":"student-a",name:"Synthetic Exchange Partner",avatarUrl:null,matchScore:88.7,offeredSkills:learn,wantedSkills:teach,matchingOfferedSkills:learn,matchingWantedSkills:teach,matchDetails:{averageRating:4,ratingCount:1,uniqueRatingPartners:1,completionRate:1,proximity:{value:.8,reason:"Same department, different year level."},missing:[]}}];
        await page.addInitScript(({viewer,theme})=>localStorage.setItem(`theme_${viewer}`,theme),{viewer,theme});
        await page.goto(path);
        const card=page.getByRole("article",{name:"Synthetic Exchange Partner reciprocal match",exact:true});
        const exchange=card.getByRole("region",{name:"Your Skill Exchange",exact:true});
        const learning=exchange.getByRole("group",{name:"What you'll learn",exact:true}),teaching=exchange.getByRole("group",{name:"What you'll teach",exact:true});
        await expect(exchange.getByRole("heading",{name:"Your Skill Exchange",exact:true})).toBeVisible();
        for(const skill of learn){await expect(learning.getByText(skill.name,{exact:true})).toBeVisible();await expect(teaching).not.toContainText(skill.name);}
        for(const skill of teach){await expect(teaching.getByText(skill.name,{exact:true})).toBeVisible();await expect(learning).not.toContainText(skill.name);}
        await expect(card).not.toContainText("You can learn:");await expect(card).not.toContainText("You can teach:");
        await expect(card.getByText("88.7% Match Score",{exact:true})).toBeVisible();await expect(card.getByRole("button",{name:"Request Swap",exact:true})).toBeEnabled();
        const exchangeBox=(await exchange.boundingBox())!,ratingBox=(await card.getByText("Peer rating:",{exact:false}).boundingBox())!;
        expect(exchangeBox.y+exchangeBox.height).toBeLessThanOrEqual(ratingBox.y);
        await expect(card).toContainText("Exchange completion: 100.0%");await expect(card).toContainText("Academic similarity: 80%");await expect(card).toContainText("Limited evidence:");await expect(card.getByRole("link",{name:"View Profile",exact:true})).toBeVisible();
        const a=(await learning.boundingBox())!,b=(await teaching.boundingBox())!;
        if(info.project.name==="mobile"){expect(Math.abs(a.x-b.x)).toBeLessThan(1);expect(b.y).toBeGreaterThanOrEqual(a.y+a.height);}
        else{expect(Math.abs(a.y-b.y)).toBeLessThan(1);expect(b.x).toBeGreaterThanOrEqual(a.x+a.width);}
        for(const panel of [learning,teaching]){
          const ratios=await panel.evaluate(el=>{
            const c=document.createElement("canvas");c.width=c.height=1;const ctx=c.getContext("2d")!;
            const pixel=()=>[...ctx.getImageData(0,0,1,1).data].slice(0,3);
            const lum=(v:number[])=>v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
            ctx.fillStyle=getComputedStyle(el.closest("article")!).backgroundColor;ctx.fillRect(0,0,1,1);ctx.fillStyle=getComputedStyle(el).backgroundColor;ctx.fillRect(0,0,1,1);const bg=lum(pixel());
            return ["dt","dd"].map(tag=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=getComputedStyle(el.querySelector(tag)!).color;ctx.fillRect(0,0,1,1);const fg=lum(pixel());return(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);});
          });
          for(const ratio of ratios)expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        if(viewer==="student-a")await card.screenshot({path:info.outputPath(`exchange-${theme}.png`)});
      }
    });
  }
}

for(const path of ["/dashboard","/knox-hub"]){
  test(`request errors at ${path} stay inline without discarding the request form`,async({page})=>{
    const state=await fixture(page);state.matches=[{id:"student-b",name:"Synthetic Partner",avatarUrl:null,matchScore:null,offeredSkills:[],wantedSkills:[],matchingOfferedSkills:[{id:"py",name:"Python"}],matchingWantedSkills:[{id:"js",name:"JavaScript"}],matchDetails:{averageRating:null,ratingCount:0,completionRate:null,proximity:{value:null,reason:"Academic details unavailable"},missing:["No ratings"]}}];
    let dialogs=0;page.on("dialog",d=>{dialogs++;void d.dismiss();});await page.goto(path);await page.getByRole("button",{name:"Request Swap",exact:true}).click();const modal=page.getByRole("dialog");await modal.getByRole("button",{name:"Send Swap Request",exact:true}).click();await expect(modal.getByRole("alert")).toContainText("already pending or active");expect(dialogs).toBe(0);expect(state.requestPosts).toBe(1);await expect(modal.getByRole("button",{name:"Send Swap Request",exact:true})).toBeEnabled();
  });
}
test("own public profile has no peer report action",async({page})=>{
  await fixture(page);await page.goto("/students/student-a");await expect(page.getByRole("heading",{name:"Synthetic Student",exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Report a concern about this student"})).toHaveCount(0);
});
test("default light account does not become dark on direct agreement refresh under a dark OS",async({page})=>{
  await page.emulateMedia({colorScheme:"dark"});await fixture(page);await page.goto("/swap-agreement/swap-a");
  await expect(page.locator("html")).not.toHaveClass(/dark/);await page.reload();await expect(page.locator("html")).not.toHaveClass(/dark/);
});
test("evaluation typing has contrast in the saved dark theme",async({page})=>{
  await fixture(page,"CONFIRMED","dark");await page.goto("/reputation?swapId=swap-a&partnerId=student-b");await page.locator("textarea").fill("Synthetic readable evaluation");
  const contrast=await page.locator("textarea").evaluate(el=>{const s=getComputedStyle(el);const rgb=(v:string)=>{const canvas=document.createElement("canvas");canvas.width=canvas.height=1;const ctx=canvas.getContext("2d")!;ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3)};const luminance=(v:number[])=>v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((a,n,i)=>a+n*[.2126,.7152,.0722][i],0);const a=luminance(rgb(s.color)),b=luminance(rgb(s.backgroundColor));return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

for(const theme of ["light","dark"] as const){
  test(`chat empty state is centered and usable in ${theme}`,async({page},info)=>{
    await fixture(page,"COMPLETED",theme);await page.goto("/chat");
    await expect(page.getByRole("heading",{name:"No Active Swaps Yet",exact:true})).toBeVisible();
    const back=page.getByRole("button",{name:"Return to Dashboard",exact:true});
    const box=(await back.locator("..").boundingBox())!,viewport=page.viewportSize()!;
    expect(Math.abs(box.x+box.width/2-viewport.width/2)).toBeLessThan(2);
    expect(Math.abs(box.y+box.height/2-viewport.height/2)).toBeLessThan(2);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`chat-empty-${theme}.png`)});
    await back.click();await expect(page).toHaveURL(/\/dashboard$/);
  });
}

test("chat loading skeleton preserves navigation and fits below its header",async({page})=>{
  await fixture(page);let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});
  await page.route("**/api/swaps",async route=>{await gate;await route.fulfill({json:[]});});
  try{
    await page.goto("/chat");const status=page.getByRole("status",{name:"Loading conversations...",exact:true});await expect(status).toBeVisible();
    await expect(page.getByRole("button",{name:"Return",exact:true})).toBeVisible();
    await expect(status).toHaveAttribute("data-loading-layout","messages");
    const box=(await status.boundingBox())!,header=(await page.locator("header").boundingBox())!,viewport=page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y).toBeGreaterThanOrEqual(header.y+header.height);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{release();}
  await expect(page.getByRole("heading",{name:"No Active Swaps Yet",exact:true})).toBeVisible();
});

test("chat request failure is not presented as an empty inbox and can be retried",async({page})=>{
  await fixture(page);let available=false;
  await page.route("**/api/swaps",route=>route.fulfill({status:available?200:503,json:available?[]:{error:"Conversations are temporarily unavailable."}}));
  await page.goto("/chat");await expect(page.getByRole("heading",{name:"Unable to load conversations",exact:true})).toBeVisible();await expect(page.getByRole("alert")).toContainText("temporarily unavailable");await expect(page.getByRole("heading",{name:"No Active Swaps Yet",exact:true})).toHaveCount(0);
  available=true;await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByRole("heading",{name:"No Active Swaps Yet",exact:true})).toBeVisible();
});


test("narrow-screen student UI review",async({page},info)=>{
  await fixture(page,"COMPLETED","dark");
  await page.setViewportSize({width:320,height:740});
  const issues:any[]=[];
  for(const path of ["/dashboard","/knox-hub","/my-skills","/notification","/swap-details/swap-a","/swap-agreement/swap-a","/reputation?swapId=swap-a","/profile","/students/student-b","/chat","/calendar","/leaderboard"]){
    await page.goto(path);await page.waitForTimeout(150);
    await page.screenshot({path:info.outputPath(path.replace(/[^a-z0-9]/gi,"_")+".png")});
    const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,controls:[...document.querySelectorAll<HTMLElement>("button,a,input,select")].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<0||r.right>innerWidth+1)&&!el.closest("[class*=overflow-x-auto],.admin-scroll")}).map(el=>({text:el.textContent?.trim().slice(0,70),tag:el.tagName,x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width}))}));
    if(result.width>result.viewport||result.controls.length)issues.push({path,...result});
  }
  expect(issues).toEqual([]);
});


test("responsive student polish keeps headings readable and full badge guidance accessible",async({page},info)=>{
  await fixture(page,"COMPLETED");
  for(const theme of ["light","dark"] as const){
    await page.addInitScript(theme=>localStorage.setItem("theme_student-a",theme),theme);
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:840});await page.goto("/dashboard");
      const headings=page.locator(".dashboard-section-heading");await expect(headings).toHaveCount(2);
      for(const row of await headings.all()){
        const heading=await row.getByRole("heading").boundingBox(),button=await row.getByRole("button").boundingBox();
        if(width<640)expect(button!.y).toBeGreaterThanOrEqual(heading!.y+heading!.height);
        else expect(Math.abs(button!.y-heading!.y)).toBeLessThan(10);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      if(width===320)await page.screenshot({path:info.outputPath(`dashboard-${theme}.png`)});
      await page.goto("/profile");
      await expect(page.getByText("Knoxite v1.0",{exact:true})).not.toHaveCSS("position","fixed");
      await expect(page.getByRole("group",{name:"Exchange statistics"}).getByText("No reviews yet",{exact:true})).toBeVisible();
      expect((await page.getByRole("group",{name:"Exchange statistics"}).getByText("No reviews yet",{exact:true}).boundingBox())!.height).toBeLessThan(44);
      if(width===320)await page.screenshot({path:info.outputPath(`profile-${theme}.png`)});
      await page.goto("/my-skills");
      await expect(page.locator(".knoxite-surface").first()).toBeVisible();
      const summary=page.getByText("About skill badges",{exact:true});await summary.click();
      await expect(page.getByText(/not professional certifications/)).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.goto("/community-forum");await expect(page.locator(".knoxite-surface").first()).toBeVisible();
    }
  }
});


test("remaining student workspaces keep visible content and controls inside narrow viewports",async({page},info)=>{
  await fixture(page,"COMPLETED");
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/analytics/me",route=>route.fulfill({json:{metrics:{completedSwaps:0,averageRating:null},skills:[],exchanges:[]}}));
  await page.route("**/api/forum/posts/ui-post",route=>route.fulfill({json:{id:"ui-post",title:"Synthetic discussion for layout review",content:"Synthetic discussion content.",category:"GENERAL",author:{id:"student-b",name:"Synthetic Partner"},createdAt:"2026-11-01T00:00:00Z",comments:[],_count:{comments:0}}}));
  await page.route("**/api/assessments/offerings/ui-offering",route=>route.fulfill({json:{offeringId:"ui-offering",skillName:"Python Programming Fundamentals",tier:"NOT_ASSESSED",isActive:true,levels:["BASIC","ADVANCED"].map(level=>({level,supported:false,eligible:false,reason:"Assessment unavailable",activeAttemptId:null,nextEligibleAt:null,passingPercent:null,questionCount:null,learningOutcomes:null,attemptCount:0})),attempts:[]}}));
  for(const width of [320,1280]){
    await page.setViewportSize({width,height:840});
    for(const path of ["/achievements","/activity-timeline","/security","/report?userId=student-b","/community-forum/ui-post","/assessments/offerings/ui-offering"]){
      await page.goto(path);await expect(page.locator("main").first()).toBeVisible();await page.waitForTimeout(100);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
      if(width===320)await page.screenshot({path:info.outputPath(path.replace(/[^a-z0-9]/gi,"_")+".png")});
    }
  }
  expect(errors).toEqual([]);
});
