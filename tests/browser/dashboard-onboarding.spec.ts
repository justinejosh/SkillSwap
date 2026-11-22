import {test,expect,Page,devices} from "@playwright/test";

async function fixture(page:Page,{hold=false,theme="light",hideFirst=false}:{hold?:boolean;theme?:"light"|"dark";hideFirst?:boolean}={}){
  let release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});if(!hold)release();
  await page.addInitScript(({theme,hideFirst})=>{
    localStorage.setItem("knoxite_token","synthetic-tour-session");localStorage.setItem("knoxite_user",JSON.stringify({id:"tour-student",name:"Synthetic Tour Student",role:"USER"}));
    localStorage.setItem("theme_tour-student",theme);
    if(hideFirst)new MutationObserver(()=>{const button=document.getElementById("tour-knoxhub");if(button)button.style.display="none";}).observe(document,{childList:true,subtree:true});
  },{theme,hideFirst});
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());if(url.origin==="http://127.0.0.1:5174")return route.continue();
    if(url.origin!=="http://127.0.0.1:5009")return route.abort();
    if(["/api/swaps","/api/matches","/api/swap-requests"].includes(url.pathname))await ready;
    if(url.pathname==="/api/auth/session-status")return route.fulfill({json:{enabled:false}});
    if(url.pathname==="/api/profile")return route.fulfill({json:{id:"tour-student",name:"Synthetic Tour Student",role:"USER",offeredSkills:[],wantedSkills:[],metrics:{averageRating:null,completedSwaps:0}}});
    if(url.pathname==="/api/profile/skill-catalog")return route.fulfill({json:{presets:[]}});
    return route.fulfill({json:[]});
  });return{release};
}
async function expectTarget(page:Page,id:string){
  const target=page.locator(`#${id}.driver-active-element`);await expect(target).toBeVisible();
  await expect(target).toHaveJSProperty("tagName","BUTTON");await expect(page.locator("#driver-dummy-element")).toHaveCount(0);
  await expect.poll(()=>target.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest("button")?.id;})).toBe(id);
}
test("loading dashboard never starts a dummy spotlight and starts only when the real target exists",async({page})=>{
  const f=await fixture(page,{hold:true});try{
    await page.goto("/dashboard");await expect(page.getByRole("status",{name:"Loading dashboard...",exact:true})).toBeVisible();
    // Regression: the old fixed 500 ms timer starts while these API responses are pending.
    await page.waitForTimeout(800);await expect(page.locator(".driver-overlay")).toHaveCount(0);
    f.release();await expectTarget(page,"tour-knoxhub");await expect(page.getByRole("button",{name:"Next",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Skip tutorial"})).toBeVisible();
  }finally{f.release();}
});
test("all seven steps spotlight interactive buttons and Next, Previous and Finish complete the tour",async({page})=>{
  await fixture(page);await page.goto("/dashboard");
  const ids=["tour-knoxhub","tour-my-skills","tour-community-forum","tour-leaderboard","tour-nav-messages","tour-nav-notifications","tour-nav-profile"];
  for(let i=0;i<ids.length;i++){
    await expectTarget(page,ids[i]);
    if(i===1){await page.getByRole("button",{name:"Previous",exact:true}).click();await expectTarget(page,ids[0]);await page.getByRole("button",{name:"Next",exact:true}).click();await expectTarget(page,ids[1]);}
    await page.getByRole("button",{name:i===ids.length-1?"Finish":"Next",exact:true}).click();
  }
  await expect(page.locator(".driver-overlay")).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem("knoxite_onboarding_completed"))).toBe("true");
  await page.reload();await expect(page.locator("#tour-knoxhub")).toBeVisible();await expect(page.locator(".driver-overlay")).toHaveCount(0);
});
for(const exit of ["Skip","Escape"] as const)test(`${exit} is accessible and prevents a repeated first-login trap after refresh`,async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");
  if(exit==="Skip"){const skip=page.getByRole("button",{name:"Skip tutorial"});await skip.focus();await expect(skip).toBeFocused();await page.keyboard.press("Enter");}else await page.keyboard.press("Escape");
  await expect(page.locator(".driver-overlay")).toHaveCount(0);await expect(page.locator("body")).not.toHaveClass(/driver-active/);
  await page.reload();await expect(page.locator("#tour-knoxhub")).toBeVisible();await expect(page.locator(".driver-overlay")).toHaveCount(0);
});
test("highlighted navigation remains functional and route changes, browser Back and refresh remove the overlay",async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");await page.locator("#tour-knoxhub").click();
  await expect(page).toHaveURL(/\/knox-hub$/);await expect(page.locator(".driver-overlay")).toHaveCount(0);await expect(page.locator("body")).not.toHaveClass(/driver-active/);
  await page.goBack();await expect(page.locator("#tour-knoxhub")).toBeVisible();await expect(page.locator(".driver-overlay")).toHaveCount(0);
  await page.reload();await expect(page.locator("#tour-knoxhub")).toBeVisible();await expect(page.locator(".driver-overlay")).toHaveCount(0);
});
test("hidden initial targets and a removed later target cannot produce a blocking dummy step",async({page})=>{
  await fixture(page,{hideFirst:true});await page.goto("/dashboard");await expectTarget(page,"tour-my-skills");
  await page.locator("#tour-community-forum").evaluate(el=>el.remove());await page.getByRole("button",{name:"Next",exact:true}).click();await expectTarget(page,"tour-leaderboard");await page.keyboard.press("Escape");await expect(page.locator(".driver-overlay")).toHaveCount(0);
});
test("a target hidden after startup is skipped by native Next and Previous navigation",async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");
  await page.locator("#tour-my-skills").evaluate(el=>{el.style.display="none";});
  await page.getByRole("button",{name:"Next",exact:true}).click();await expectTarget(page,"tour-community-forum");
  await page.getByRole("button",{name:"Previous",exact:true}).click();await expectTarget(page,"tour-knoxhub");
  await page.keyboard.press("Escape");await expect(page.locator(".driver-overlay")).toHaveCount(0);
});
test.describe("Android Chrome touch emulation",()=>{
  test.use({viewport:devices["Pixel 7"].viewport,userAgent:devices["Pixel 7"].userAgent,deviceScaleFactor:devices["Pixel 7"].deviceScaleFactor,isMobile:true,hasTouch:true});
  test("touch users can advance and dismiss without tapping a navigation target",async({page})=>{
    await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");
    for(const id of ["tour-my-skills","tour-community-forum","tour-leaderboard","tour-nav-messages","tour-nav-notifications","tour-nav-profile"]){
      await page.getByRole("button",{name:"Next",exact:true}).tap();await expectTarget(page,id);
      await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
      const box=await page.locator(".driver-popover").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
    }
    await page.getByRole("button",{name:"Skip tutorial"}).tap();await expect(page.locator(".driver-overlay")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveClass(/driver-active/);
  });
});
test("an active tour survives refresh and repositions within the viewport after resizing",async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");await page.reload();await expectTarget(page,"tour-knoxhub");await expect(page.locator(".driver-overlay")).toHaveCount(1);
  for(const width of [360,1280]){
    await page.setViewportSize({width,height:844});await expect.poll(async()=>{const r=await page.locator(".driver-popover").boundingBox();return !!r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=845;}).toBe(true);
    await expectTarget(page,"tour-knoxhub");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.keyboard.press("Escape");
});
for(const theme of ["light","dark"] as const)test(`${theme} tutorial keeps readable, visible keyboard controls`,async({page})=>{
  await fixture(page,{theme});await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");const popover=page.locator(".driver-popover");
  expect(await page.locator("html").evaluate(el=>el.classList.contains("dark"))).toBe(theme==="dark");
  const colors=await popover.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));expect(colors.color).not.toBe(colors.background);
  await expect(page.getByRole("button",{name:"Skip tutorial"})).toBeVisible();const next=page.getByRole("button",{name:"Next",exact:true});await expect(next).toBeEnabled();await next.focus();await expect(next).toBeFocused();expect(await next.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe("none");await page.keyboard.press("Enter");await expectTarget(page,"tour-my-skills");await page.keyboard.press("Escape");
});


test("native spotlight interpolates across sidebar and header; rapid navigation stays serialized",async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");
  await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
  await expect(page.locator("body")).toHaveClass(/driver-fade/);
  expect(await page.locator("body").evaluate(el=>el.style.getPropertyValue("--driver-animation-duration"))).toBe("300ms");
  for(const id of ["tour-my-skills","tour-community-forum","tour-leaderboard"]){
    await page.getByRole("button",{name:"Next",exact:true}).click();await expectTarget(page,id);
    await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
  }
  const scrollBefore=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  const paths=await page.evaluate(async()=>{
    const samples:string[]=[];
    document.querySelector<HTMLButtonElement>(".driver-popover-next-btn")!.click();
    // Native keyboard events during the same transition must not skip steps.
    for(let i=0;i<12;i++)window.dispatchEvent(new KeyboardEvent("keyup",{key:i%2?"ArrowLeft":"ArrowRight"}));
    const started=performance.now();
    await new Promise<void>(resolve=>{
      function sample(){samples.push(document.querySelector(".driver-overlay path")?.getAttribute("d")||"");
        if(performance.now()-started<350)requestAnimationFrame(sample);else resolve();}
      requestAnimationFrame(sample);
    });return samples;
  });
  expect(new Set(paths.filter(Boolean)).size).toBeGreaterThan(2);
  await expectTarget(page,"tour-nav-messages");await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
  expect(await page.evaluate(()=>({x:scrollX,y:scrollY}))).toEqual(scrollBefore);
  await expect(page.locator(".driver-popover")).toHaveCount(1);await expect(page.locator(".driver-overlay")).toHaveCount(1);
  await page.getByRole("button",{name:"Previous",exact:true}).click();await expectTarget(page,"tour-leaderboard");
  // Exit must work even while a native transition is still running.
  await page.keyboard.press("Escape");await expect(page.locator(".driver-overlay")).toHaveCount(0);
  await expect(page.locator(".driver-popover")).toHaveCount(0);
});

test("reduced motion disables spotlight and popover animation without losing seven-step navigation",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});await fixture(page);await page.goto("/dashboard");
  for(const [i,id] of ["tour-knoxhub","tour-my-skills","tour-community-forum","tour-leaderboard","tour-nav-messages","tour-nav-notifications","tour-nav-profile"].entries()){
    await expectTarget(page,id);await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
    await expect(page.locator("body")).toHaveClass(/driver-simple/);
    for(const selector of [".driver-overlay",".driver-popover",`#${id}`]){
      expect(await page.locator(selector).evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
    }
    await page.getByRole("button",{name:i===6?"Finish":"Next",exact:true}).click();
  }
  await expect(page.locator(".driver-overlay")).toHaveCount(0);
});

test("changing reduced motion mid-tour and skipping cancels movement and leaves no overlay",async({page})=>{
  await fixture(page);await page.goto("/dashboard");await expectTarget(page,"tour-knoxhub");
  await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await page.emulateMedia({reducedMotion:"reduce"});await expectTarget(page,"tour-my-skills");
  await expect(page.locator(".driver-popover-next-btn")).toBeEnabled();
  expect(await page.locator(".driver-popover").evaluate(el=>getComputedStyle(el).animationName)).toBe("none");
  await page.getByRole("button",{name:"Skip tutorial"}).click();
  await page.waitForTimeout(350);
  await expect(page.locator(".driver-overlay,.driver-popover")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/driver-active/);
});
