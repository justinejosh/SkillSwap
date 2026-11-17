import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { isolatedAssessmentApp } from "./assessment-isolation";
import type { Page } from "@playwright/test";

async function browserStudent(page:Page,f:Awaited<ReturnType<typeof isolatedAssessmentApp>>,account:any){
  page.setDefaultTimeout(12000);
  await page.addInitScript(({token,user})=>{localStorage.setItem("knoxite_token",token);localStorage.setItem("knoxite_user",JSON.stringify(user));},{token:account.token,user:account.user});
  await page.route("**/*",async route=>{
    const u=new URL(route.request().url());
    if(u.origin==="http://localhost:5181")return route.continue();
    if(["http://127.0.0.1:5019","http://localhost:5019"].includes(u.origin)&&u.pathname.startsWith("/api/")){
      const response=await route.fetch({url:f.api+u.pathname.slice(4)+u.search,maxRedirects:0});return route.fulfill({response});
    }
    return route.abort();
  });
}

async function student(f:Awaited<ReturnType<typeof isolatedAssessmentApp>>,label:string){
  const programs=await f.call("GET","/auth/academic-options",200);
  const p=programs.programs.find((p:any)=>p.code==="BSCS");
  const email=`${label}-${randomBytes(6).toString("hex")}lag@assessment.knoxite.test`;
  await f.call("POST","/auth/register",201,undefined,{name:`Synthetic ${label}`,email,password:f.password,programId:p.id,yearLevelId:p.yearLevels[0].id});
  await f.call("POST","/auth/verify-email",200,undefined,{token:new URL(f.deliveries.get(email)!).hash.slice(7)});
  return f.call("POST","/auth/login",200,undefined,{email,password:f.password});
}
test("rollback-only MySQL: self-report and forged case-variant target IDs are rejected; peers remain reportable",async()=>{
  const f=await isolatedAssessmentApp();
  try{
    const a=await student(f,"reporter"),b=await student(f,"peer");
    for(const targetId of [a.user.id,a.user.id.toUpperCase()])await f.call("POST","/reports",422,a.token,{targetId,reason:"OTHER",description:"Synthetic forbidden self report"});
    await f.call("POST","/reports",201,a.token,{targetId:b.user.id,reason:"OTHER",description:"Synthetic legitimate peer report"});
    const own=await f.call("GET","/reports",200,a.token);expect(own).toHaveLength(1);expect(own[0].target.id).toBe(b.user.id);
    await f.sharedUnchanged();
  }finally{await f.close();}
});

test("rollback-only two-student lifecycle: negotiation, sessions, individual reviews, completion and closed history",async({browser})=>{
  test.setTimeout(180000);
  const f=await isolatedAssessmentApp();
  const ca=await browser.newContext(),cb=await browser.newContext();
  try{
    const a=await student(f,"requester"),b=await student(f,"receiver"),outsider=await student(f,"outsider");
    const skills=await f.db.skill.findMany({where:{name:{in:["Python Programming Fundamentals","JavaScript Fundamentals"]}}});
    const py=skills.find((s:any)=>s.name==="Python Programming Fundamentals"),js=skills.find((s:any)=>s.name==="JavaScript Fundamentals");
    expect(!!py&&!!js).toBe(true);
    for(const [who,offer,want] of [[a,py,js],[b,js,py]]){
      await f.call("POST","/profile/skills/offer",201,who.token,{skillId:offer.id});
      await f.call("POST","/profile/skills/want",201,who.token,{skillId:want.id});
    }
    const create=async()=>{const r=await f.call("POST","/swaps/request",201,a.token,{receiverId:b.user.id,offeredSkillId:py.id,wantedSkillId:js.id,message:"Synthetic regression exchange"});return r;};
    const candidates=await f.call("GET","/matches",200,a.token);
    expect(candidates.some((candidate:any)=>candidate.id===b.user.id)).toBe(true);
    const req=await create();
    const accepted=await f.call("PATCH",`/swap-requests/${req.id}/status`,200,b.token,{newStatus:"ACCEPTED"});
    const id=accepted.redirectId;
    let s=await f.call("GET",`/swaps/${id}`,200,a.token);
    const approve=(who:any,version:number,duration=1)=>f.call("POST",`/swaps/${id}/agreement`,200,who.token,{sessions:2,duration,agreementVersion:version,agreedToTerms:true});
    s=(await approve(a,s.agreementVersion)).swap;
    expect(s.requesterApprovedAt).toBeTruthy();expect(s.receiverApprovedAt).toBeNull();
    const stale=s.agreementVersion;
    s=(await approve(b,stale,2)).swap;
    expect(s.agreementVersion).toBe(stale+1);expect(s.requesterApprovedAt).toBeNull();expect(s.receiverApprovedAt).toBeTruthy();
    await f.call("POST",`/swaps/${id}/agreement`,409,a.token,{sessions:2,duration:1,agreementVersion:stale,agreedToTerms:true});
    s=(await approve(a,s.agreementVersion,2)).swap;expect(s.status).toBe("CONFIRMED");
    const agreed=await f.db.swap.findUnique({where:{id}});
    await f.call("POST",`/swaps/${id}/agreement`,409,a.token,{sessions:2,duration:3,agreementVersion:s.agreementVersion,agreedToTerms:true});
    await approve(b,s.agreementVersion,2);expect(await f.db.swap.findUnique({where:{id}})).toEqual(agreed);
    await f.call("GET",`/swaps/${id}`,403,outsider.token);
    await f.call("POST",`/swaps/${id}/agreement`,403,outsider.token,{sessions:2,duration:2,agreementVersion:s.agreementVersion,agreedToTerms:true});
    const matches=await f.call("GET","/matches",200,a.token);
    expect(matches.some((candidate:any)=>candidate.id===b.user.id)).toBe(false); // Active partner is intentionally excluded.
    await f.call("POST","/chat/send",201,a.token,{swapId:id,receiverId:b.user.id,content:"Synthetic readiness message"});
    const messages=await f.call("GET",`/chat/conversation/${a.user.id}?swapId=${id}`,200,b.token);
    expect(messages.some((m:any)=>m.content==="Synthetic readiness message")).toBe(true);
    await f.call("GET",`/chat/conversation/${a.user.id}?swapId=${id}`,403,outsider.token);
    for(const n of [1,2])await f.call("POST","/sessions",201,a.token,{swapId:id,sessionNumber:n,scheduledAt:new Date(Date.now()+n*86400000).toISOString(),meetingLink:"https://example.invalid/synthetic-session"});
    const pa=await ca.newPage(),pb=await cb.newPage();
    await browserStudent(pa,f,a);await browserStudent(pb,f,b);
    await pa.goto(`http://localhost:5181/swap-details/${id}`);await pb.goto(`http://localhost:5181/swap-details/${id}`);
    await expect(pa.getByRole("button",{name:"Confirm Session 1",exact:true})).toBeVisible();
    for(const n of [1,2]){await pa.getByRole("button",{name:`Confirm Session ${n}`,exact:true}).click();}
    await expect(pa.getByRole("heading",{name:"Waiting for your partner's confirmations"})).toBeVisible();
    await pb.getByRole("button",{name:"Confirm Session 1",exact:true}).click();
    await f.call("POST","/reputation/submit",409,a.token,{swapId:id,rating:4,comment:"Too early"});
    await pb.getByRole("button",{name:"Confirm Session 2",exact:true}).click();
    await pa.getByRole("button",{name:"Refresh status",exact:true}).click();
    for(const p of [pa,pb]){await expect(p.getByRole("heading",{name:"Both Students Confirmed Their Sessions"})).toBeVisible();await expect(p.getByRole("button",{name:"Rate Your Swap Partner",exact:true})).toBeVisible();}
    s=await f.call("GET",`/swaps/${id}`,200,a.token);expect(s.status).toBe("CONFIRMED");expect(s.canReview).toBe(true);
    await f.call("POST","/reputation/submit",422,a.token,{swapId:id,partnerId:a.user.id,rating:4,comment:"Wrong recipient"});
    for(const rating of [0,6])await f.call("POST","/reputation/submit",422,a.token,{swapId:id,rating,comment:"Invalid rating"});
    await f.call("POST","/reputation/submit",403,outsider.token,{swapId:id,rating:5,comment:"Outsider"});
    await pa.getByRole("button",{name:"Rate Your Swap Partner",exact:true}).click();
    await expect(pa.getByRole("button",{name:"Submit Review",exact:true})).toBeDisabled();
    await pa.getByRole("radio",{name:"4 out of 5 stars"}).focus();await pa.keyboard.press("Space");await pa.getByLabel("Comment (optional)").fill("Synthetic requester feedback");
    await pa.getByRole("button",{name:"Submit Review",exact:true}).click();
    await expect(pa.getByRole("heading",{name:"Your review submitted"})).toBeVisible();
    await expect(pa.getByText("Waiting for your partner's review. Your review is saved.",{exact:true})).toBeVisible();
    await pa.reload();await expect(pa.getByRole("heading",{name:"Your review submitted"})).toBeVisible();await expect(pa.getByRole("radio")).toHaveCount(0);
    const pending=await f.call("GET",`/swaps/${id}`,200,b.token);expect(pending.status).toBe("CONFIRMED");expect(pending.reviewSummary).toEqual({myReview:null,partnerSubmitted:true});expect(pending.canReview).toBe(true);
    await pb.getByRole("button",{name:"Rate Your Swap Partner",exact:true}).click();await pb.getByRole("radio",{name:"5 out of 5 stars"}).focus();await pb.keyboard.press("Space");await pb.getByLabel("Comment (optional)").fill("Synthetic receiver feedback");await pb.getByRole("button",{name:"Submit Review",exact:true}).click();
    await expect(pb.getByText("Exchange completed. Both students have submitted their reviews.",{exact:true})).toBeVisible();
    await pa.getByRole("button",{name:"Refresh status",exact:true}).click();await expect(pa.getByText("Exchange completed. Both students have submitted their reviews.",{exact:true})).toBeVisible();
    const completed=await f.db.swap.findUnique({where:{id},include:{reviews:true,sessionLogs:true,schedule:true}});
    expect(completed.status).toBe("COMPLETED");expect(completed.reviews).toHaveLength(2);expect(completed.sessionLogs).toHaveLength(4);expect(completed.schedule).toHaveLength(2);
    const first=await f.call("POST","/reputation/submit",200,a.token,{swapId:id,rating:4,comment:"Synthetic requester feedback"});
    expect(first.id).toBe(completed.reviews.find((r:any)=>r.reviewerId===a.user.id).id);
    await f.call("POST","/reputation/submit",409,a.token,{swapId:id,rating:5,comment:"Changed review"});
    for(const who of [a,b])await f.call("POST",`/swaps/${id}/agreement`,409,who.token,{sessions:3,duration:3,agreementVersion:s.agreementVersion,agreedToTerms:true});
    await f.call("POST",`/swaps/${id}/log-session`,409,a.token,{sessionNumber:3});
    await f.call("POST","/sessions",409,a.token,{swapId:id,sessionNumber:1,scheduledAt:new Date(Date.now()+86400000).toISOString()});
    expect(await f.db.swap.findUnique({where:{id},include:{reviews:true,sessionLogs:true,schedule:true}})).toEqual(completed);
    for(const p of [pa,pb]){
      await p.goto(`http://localhost:5181/swap-agreement/${id}`);await expect(p.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();await expect(p.getByRole("spinbutton")).toHaveCount(0);await expect(p.getByText("Agreement version",{exact:false})).toBeVisible();
      await p.reload();await expect(p.getByRole("heading",{name:"Skill Swap Agreement",exact:true})).toBeVisible();await p.getByRole("button",{name:"Back to Swap Tracking",exact:true}).click();await expect(p.getByRole("heading",{name:"Exchange completed",exact:true})).toBeVisible();await p.goBack();await expect(p.getByRole("spinbutton")).toHaveCount(0);
    }
    const metrics=(await f.call("GET","/analytics/me",200,a.token)).metrics;expect(metrics.validatedCompletedSwaps).toBe(1);expect(metrics.uniqueCompletedPartners).toBe(1);expect(metrics.averageRating).toBe(5);expect(metrics.completionRate).toBe(1);
    const rankings=await f.call("GET","/leaderboard",200,a.token);
    expect(rankings.viewer.eligible).toBe(false);
    expect(rankings.topMentors.some((r:any)=>r.id===a.user.id)).toBe(false);
    await f.call("POST","/chat/send",409,a.token,{swapId:id,receiverId:b.user.id,content:"Must remain read-only"});
    const request2=await create(),accept2=await f.call("PATCH",`/swap-requests/${request2.id}/status`,200,b.token,{newStatus:"ACCEPTED"});
    await f.call("DELETE",`/swaps/cancel/swap/${accept2.redirectId}`,200,a.token);
    await f.call("POST",`/swaps/${accept2.redirectId}/agreement`,409,b.token,{sessions:1,duration:1,agreementVersion:1,agreedToTerms:true});
    expect((await f.call("GET","/analytics/me",200,a.token)).metrics).toEqual(metrics);
    const withdrawn=await create();await f.call("DELETE",`/swaps/cancel/request/${withdrawn.id}`,200,a.token);await f.call("GET",`/swaps/${withdrawn.id}`,404,a.token);
    const rejected=await create();await f.call("PATCH",`/swap-requests/${rejected.id}/status`,200,b.token,{newStatus:"REJECTED"});
    const history=await f.call("GET","/swap-requests",200,a.token);expect(history.find((r:any)=>r.id===req.id).linkedSwap.status).toBe("COMPLETED");expect(history.find((r:any)=>r.id===withdrawn.id).status).toBe("WITHDRAWN");expect(history.find((r:any)=>r.id===rejected.id).status).toBe("REJECTED");
    await f.sharedUnchanged();
  }finally{try{await Promise.allSettled([ca.close(),cb.close()]);}finally{await f.close();}}
});

test("rollback-only current-policy characterization: unscheduled and premature confirmations remain possible",async({browser})=>{
  const f=await isolatedAssessmentApp();
  const ca=await browser.newContext(),cb=await browser.newContext();
  try{
    const a=await student(f,"confirmation-a"),b=await student(f,"confirmation-b"),outsider=await student(f,"confirmation-outsider");
    const skills=await f.db.skill.findMany({where:{name:{in:["Python Programming Fundamentals","JavaScript Fundamentals"]}}});
    const py=skills.find((s:any)=>s.name==="Python Programming Fundamentals"),js=skills.find((s:any)=>s.name==="JavaScript Fundamentals");
    for(const [who,offer,want] of [[a,py,js],[b,js,py]]){
      await f.call("POST","/profile/skills/offer",201,who.token,{skillId:offer.id});
      await f.call("POST","/profile/skills/want",201,who.token,{skillId:want.id});
    }
    const request=await f.call("POST","/swaps/request",201,a.token,{receiverId:b.user.id,offeredSkillId:py.id,wantedSkillId:js.id});
    const accepted=await f.call("PATCH",`/swap-requests/${request.id}/status`,200,b.token,{newStatus:"ACCEPTED"});const id=accepted.redirectId;
    const future=new Date(Date.now()+86400000).toISOString();
    await f.call("POST",`/swaps/${id}/log-session`,409,a.token,{sessionNumber:1});
    await f.call("POST","/sessions",409,a.token,{swapId:id,sessionNumber:1,scheduledAt:future});
    let swap=await f.call("GET",`/swaps/${id}`,200,a.token);
    for(const who of [a,b])swap=(await f.call("POST",`/swaps/${id}/agreement`,200,who.token,{sessions:2,duration:1,agreementVersion:swap.agreementVersion,agreedToTerms:true})).swap;
    const pa=await ca.newPage(),pb=await cb.newPage();await browserStudent(pa,f,a);await browserStudent(pb,f,b);
    await pa.goto(`http://localhost:5181/swap-details/${id}`);
    await pb.goto(`http://localhost:5181/calendar?swapId=${id}`);
    await expect(pb.getByText("No sessions scheduled yet.",{exact:true})).toBeVisible();
    await expect(pa.getByRole("button",{name:"Confirm Session 1",exact:true})).toBeEnabled();
    for(const number of [0,2,3])await f.call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:number});
    await f.call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:1,participantId:b.user.id});
    await f.call("POST",`/swaps/${id}/log-session`,403,outsider.token,{sessionNumber:1});
    await f.call("POST","/sessions",403,outsider.token,{swapId:id,sessionNumber:1,scheduledAt:future});
    await pa.getByRole("button",{name:"Confirm Session 1",exact:true}).click();
    await expect(pa.getByRole("button",{name:"Confirm Session 2",exact:true})).toBeVisible();
    await f.call("POST",`/swaps/${id}/log-session`,200,a.token,{sessionNumber:1});
    let current=await f.call("GET",`/swaps/${id}`,200,a.token);
    expect(current.requesterSessions).toBe(1);expect(current.receiverSessions).toBe(0);
    expect(await f.db.swapSession.count({where:{swapId:id}})).toBe(0);
    expect(await f.db.sessionConfirmation.count({where:{swapId:id}})).toBe(1);
    await pb.reload();await expect(pb.getByText("No sessions scheduled yet.",{exact:true})).toBeVisible();
    await f.call("POST","/sessions",409,a.token,{swapId:id,sessionNumber:3,scheduledAt:future});
    await f.call("POST","/sessions",201,a.token,{swapId:id,sessionNumber:2,scheduledAt:future});
    // Characterize the gap, not an approved attendance rule: start and end are still in the future.
    await f.call("POST",`/swaps/${id}/log-session`,200,a.token,{sessionNumber:2});
    for(const number of [1,2])await f.call("POST",`/swaps/${id}/log-session`,200,b.token,{sessionNumber:number});
    current=await f.call("GET",`/swaps/${id}`,200,a.token);
    expect(current.status).toBe("CONFIRMED");expect(current.canReview).toBe(true);
    expect(current.requesterSessions).toBe(2);expect(current.receiverSessions).toBe(2);
    expect(await f.db.review.count({where:{swapId:id}})).toBe(0);
    const before=await f.db.swap.findUnique({where:{id},include:{sessionLogs:true,schedule:true}});
    await f.call("POST","/sessions",409,b.token,{swapId:id,sessionNumber:2,scheduledAt:new Date(Date.now()+2*86400000).toISOString()});
    expect(await f.db.swap.findUnique({where:{id},include:{sessionLogs:true,schedule:true}})).toEqual(before);
    await f.sharedUnchanged();
  }finally{try{await Promise.allSettled([ca.close(),cb.close()]);}finally{await f.close();}}
});

test("rollback-only MySQL scheduling rejects forged dates and protects acknowledged/closed records",async()=>{
  const f=await isolatedAssessmentApp();
  try{
    const a=await student(f,"scheduler"),b=await student(f,"scheduled-peer");
    const rows=await f.db.skill.findMany({where:{name:{in:["Python Programming Fundamentals","JavaScript Fundamentals"]}}});
    const py=rows.find((s:any)=>s.name==="Python Programming Fundamentals"),js=rows.find((s:any)=>s.name==="JavaScript Fundamentals");
    for(const [user,offer,want] of [[a,py,js],[b,js,py]]){await f.call("POST","/profile/skills/offer",201,user.token,{skillId:offer.id});await f.call("POST","/profile/skills/want",201,user.token,{skillId:want.id});}
    const request=await f.call("POST","/swaps/request",201,a.token,{receiverId:b.user.id,offeredSkillId:py.id,wantedSkillId:js.id});
    const accepted=await f.call("PATCH",`/swap-requests/${request.id}/status`,200,b.token,{newStatus:"ACCEPTED"});const id=accepted.redirectId;
    let swap=await f.call("GET",`/swaps/${id}`,200,a.token);
    for(const user of [a,b])swap=(await f.call("POST",`/swaps/${id}/agreement`,200,user.token,{sessions:2,duration:1,agreementVersion:swap.agreementVersion,agreedToTerms:true})).swap;
    const before=await f.db.swap.findUnique({where:{id}}),now=Date.now();
    const approval=Math.max(Date.parse(swap.requesterApprovedAt),Date.parse(swap.receiverApprovedAt));
    for(const date of [new Date(now-86400000).toISOString(),new Date(now-60000).toISOString(),new Date(approval).toISOString(),"invalid","2030-02-30T10:00:00Z",new Date(now+86400000).toISOString().slice(0,19)])
      await f.call("POST","/sessions",422,a.token,{swapId:id,sessionNumber:1,scheduledAt:date});
    expect(await f.db.swapSession.count({where:{swapId:id}})).toBe(0);expect(await f.db.swap.findUnique({where:{id}})).toEqual(before);
    const future=new Date(now+86400000),offset=new Date(future.getTime()+8*3600000).toISOString().replace("Z","+08:00");
    const scheduled=await f.call("POST","/sessions",201,a.token,{swapId:id,sessionNumber:1,scheduledAt:offset});expect(scheduled.scheduledAt).toBe(future.toISOString());
    await f.call("POST",`/swaps/${id}/log-session`,200,a.token,{sessionNumber:1});
    // Existing acknowledgement policy deliberately remains independent of elapsed schedule time.
    const logged=await f.db.sessionConfirmation.count({where:{swapId:id}});expect(logged).toBe(1);
    const scheduleBefore=await f.db.swapSession.findMany({where:{swapId:id}});
    await f.call("POST","/sessions",409,b.token,{swapId:id,sessionNumber:1,scheduledAt:new Date(now+2*86400000).toISOString()});
    await f.call("DELETE",`/swaps/cancel/swap/${id}`,200,b.token);
    await f.call("POST","/sessions",409,a.token,{swapId:id,sessionNumber:2,scheduledAt:new Date(now+2*86400000).toISOString()});
    expect(await f.db.swapSession.findMany({where:{swapId:id}})).toEqual(scheduleBefore);expect(await f.db.sessionConfirmation.count({where:{swapId:id}})).toBe(logged);
    await f.sharedUnchanged();
  }finally{await f.close();}
});
