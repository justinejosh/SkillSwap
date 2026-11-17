import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { join } from "node:path";
test.skip(process.env.KNOXITE_COLLECTION_BROWSER !== "true", "Owned OAuth collection fixture opt-in only");
test.use({ baseURL: "http://localhost:5181", trace: "off", screenshot: "off", video: "off" });
for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  test(`15 published assessments display and Basic/Advanced progression renders at ${viewport.width}px`,async({page})=>{
    test.setTimeout(120000);await page.setViewportSize(viewport);
    const require=createRequire(join(process.cwd(),"package.json"));
    const f=await require(join(process.cwd(),"knoxite-backend/development/assessmentCollectionFixture.cjs")).openFixture();
    try{
      page.on("dialog", dialog => dialog.accept());
      await page.context().route("**/*",async route=>{
        const u=new URL(route.request().url());
        if(u.pathname.startsWith("/api/")) {const response=await route.fetch({url:f.api+u.pathname.slice(4)+u.search,maxRedirects:0});return route.fulfill({response});}
        return u.origin==="http://localhost:5181"?route.continue():route.abort();
      });
      await page.addInitScript(({token,id})=>{localStorage.setItem("knoxite_token",token);localStorage.setItem("knoxite_user",JSON.stringify({id,role:"USER"}));},{token:f.token,id:f.studentId});
      await page.goto("/my-skills");await expect(page.getByRole("button",{name:"Take Assessment",exact:true})).toHaveCount(15);
      await expect(page.getByText("Assessment Unavailable",{exact:true})).toHaveCount(0);
      const offer=f.offerings[0];
      await page.goto(`/assessments/offerings/${offer.id}`);
      await expect(page.getByRole("button",{name:"Take Advanced Assessment",exact:true})).toBeDisabled();
      for(const level of ["BASIC","ADVANCED"]){
        const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith(`/offerings/${offer.id}/attempts`)&&r.request().method()==="POST");
        await page.getByRole("button",{name:level==="BASIC"?"Take Basic Assessment":"Take Advanced Assessment",exact:true}).click();
        const attempt=await(await responsePromise).json();
        await expect(page.locator("fieldset")).toHaveCount(level==="BASIC"?10:6);
        for(const answer of await f.correct(attempt.id)){
          const q=attempt.questions.find((q:any)=>q.id===answer.questionId),choice=q.options.find((o:any)=>o.id===answer.optionId);
          await page.locator("fieldset").filter({hasText:q.prompt}).getByRole("radio",{name:choice.text,exact:true}).check();
        }
        await page.getByRole("button",{name:"Submit Assessment",exact:true}).click();
        await expect(page.getByText(level==="BASIC"?"Amateur":"Verified",{exact:true}).first()).toBeVisible();
        if(level==="BASIC"){
          await page.getByRole("button",{name:"Maybe Later",exact:true}).click();
          await page.goto("/my-skills");await expect(page.getByRole("button",{name:"Upgrade to Verified",exact:true})).toHaveCount(1);
          await page.getByRole("button",{name:"Upgrade to Verified",exact:true}).click();
          await expect(page.getByRole("button",{name:"Take Advanced Assessment",exact:true})).toBeEnabled();
        }
      }
      await page.goto("/my-skills");await expect(page.getByRole("button",{name:"Take Assessment",exact:true})).toHaveCount(14);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }finally{await f.close()}
  });
}
