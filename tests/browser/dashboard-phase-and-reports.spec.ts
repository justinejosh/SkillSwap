import {test,expect,Page} from "@playwright/test";

async function fixture(page:Page){
  const state:any={calendar:[],calendarFails:false,reports:[],posts:[],swaps:[]};
  await page.addInitScript(()=>{localStorage.setItem("knoxite_token","synthetic-phase-token");localStorage.setItem("knoxite_user",JSON.stringify({id:"viewer",role:"USER",name:"Synthetic Viewer"}));localStorage.setItem("knoxite_onboarding_completed","true");});
  await page.route("**/*",async route=>{
    const u=new URL(route.request().url());if(u.origin==="http://127.0.0.1:5174")return route.continue();if(u.origin!=="http://127.0.0.1:5009")return route.abort();const p=u.pathname;
    if(p==="/api/profile")return route.fulfill({json:{id:"viewer",name:"Synthetic Viewer",role:"USER",offeredSkills:[],wantedSkills:[]}});
    if(p==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(p==="/api/swaps")return route.fulfill({json:state.swaps});
    if(p==="/api/sessions")return route.fulfill(state.calendarFails?{status:503,json:{error:"Calendar unavailable"}}:{json:state.calendar});
    if(p==="/api/reports"){
      if(route.request().method()==="POST"){state.posts.push(route.request().postDataJSON());return route.fulfill({status:201,json:{id:"saved",status:"PENDING"}});}
      return route.fulfill({json:state.reports});
    }
    return route.fulfill({json:[]});
  });return state;
}

test("Active Swaps reports agreement, planning, confirmation and review phases independently",async({page})=>{
  const state=await fixture(page);const base={id:"phase",requesterId:"viewer",receiverId:"partner",requester:{id:"viewer",name:"Synthetic Viewer"},receiver:{id:"partner",name:"Synthetic Partner"},offeredSkill:{name:"Python"},wantedSkill:{name:"SQL"},status:"CONFIRMED",integrityVerified:true,sessions:3,requesterApprovedAt:"2026-01-01T00:00Z",receiverApprovedAt:"2026-01-01T00:00Z",requesterSessions:0,receiverSessions:0};
  const cases=[
    {patch:{status:"PENDING_AGREEMENT",receiverApprovedAt:null},text:"Waiting for both parties to agree",progress:false},
    {patch:{receiverApprovedAt:null},text:"Waiting for both parties to agree",progress:false},
    {patch:{},text:"Agreement complete — scheduling pending",progress:false},
    {patch:{},scheduled:true,text:"Waiting for first session",progress:false},
    {patch:{requesterSessions:1},text:"Exchange in progress",progress:true},
    {patch:{requesterSessions:3},text:"Waiting for your partner’s confirmation",progress:true},
    {patch:{receiverSessions:3},text:"Waiting for your confirmation",progress:true},
    {patch:{requesterSessions:3,receiverSessions:3},text:"Sessions confirmed — reviews pending",progress:true},
  ];
  for(const item of cases){state.swaps=[{...base,...item.patch}];state.calendar=item.scheduled?[{swapId:"phase",scheduledAt:"2026-12-01T02:00:00Z"}]:[];await page.goto("/dashboard");const card=page.getByRole("link",{name:"Open exchange with Synthetic Partner",exact:true});await expect(card).toContainText(item.text);await expect(card.getByRole("progressbar")).toHaveCount(item.progress?1:0);if(item.progress)await expect(card).toContainText(`Your confirmations: ${item.patch.requesterSessions||0} / 3`);else await expect(card).not.toContainText("Your confirmations:");expect(state.posts).toHaveLength(0);}
  state.calendarFails=true;state.swaps=[base];await page.reload();await expect(page.getByRole("link",{name:"Open exchange with Synthetic Partner",exact:true})).toContainText("Agreement complete");await expect(page.getByText("scheduling pending",{exact:false})).toHaveCount(0);
  // Receiver perspective uses the same authoritative independent counts.
  state.swaps=[{...base,requesterId:"partner",receiverId:"viewer",requester:base.receiver,receiver:base.requester,requesterSessions:3,receiverSessions:1}];await page.reload();const card=page.getByRole("link",{name:"Open exchange with Synthetic Partner",exact:true});await expect(card).toContainText("Waiting for your confirmation");await expect(card).toContainText("Your confirmations: 1 / 3");
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});for(const dark of [false,true]){await page.evaluate(d=>document.documentElement.classList.toggle("dark",d),dark);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
});

test("report form explains unavailable private image storage and still submits text only",async({page})=>{
  const state=await fixture(page);await page.goto("/report?userId=peer");await expect(page.getByLabel("Supporting Evidence (Optional)",{exact:true})).toHaveCount(0);await expect(page.getByText("Image attachments are not available yet",{exact:false})).toBeVisible();
  await page.getByLabel("Description",{exact:true}).fill("Synthetic testing concern only.");await page.getByRole("button",{name:"Submit Report",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"Report saved"})).toBeVisible();expect(state.posts).toEqual([{targetId:"peer",reason:"NO_SHOW",description:"Synthetic testing concern only."}]);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
