import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const presets = JSON.parse(readFileSync("knoxite-backend/config/skill-catalog.json", "utf8")).skills;
async function fixture(page: Page, unavailable = false) {
  const state = { offered: [] as any[], wanted: [] as any[], submits: [] as any[], removals: [] as string[], removalFailure: false };
  await page.addInitScript(() => {
    localStorage.setItem("knoxite_token", "synthetic-session");
    localStorage.setItem("knoxite_user", JSON.stringify({ id: "owner", name: "Synthetic Student", role: "USER" }));
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:5174") return route.continue();
    if (url.origin !== "http://127.0.0.1:5009") return route.abort();
    const path = url.pathname.replace(/^\/api/, ""); let data: any = {};
    if (path === "/profile") data = { id: "owner", role: "USER", name: "Synthetic Student", offeredSkills: state.offered, wantedSkills: state.wanted };
    else if (path === "/profile/skill-catalog") {
      if (unavailable) return route.fulfill({ status: 503, json: { error: "Catalog temporarily unavailable" } });
      data = { presets: presets.map((p: any) => ({ ...p, skillId: `canonical-${p.key}` })) };
    } else if (path.startsWith("/profile/skills/") && route.request().method() === "DELETE") {
      state.removals.push(path);
      if(state.removalFailure)return route.fulfill({status:409,json:{error:"Skill could not be removed. Please retry."}});
      state.offered=state.offered.filter(s=>!path.endsWith(`/${s.id}`));
      state.wanted=state.wanted.filter(s=>!path.endsWith(`/${s.id}`));
    } else if (path.startsWith("/profile/skills/") && route.request().method() === "POST") {
      const body = route.request().postDataJSON(); state.submits.push(body);
      const p = presets.find((p: any) => p.key === body.presetKey);
      const skill = { id: p ? `canonical-${p.key}` : "custom-id", name: p?.name ?? body.name, category: p?.category ?? body.category };
      const offered = path.endsWith("/offer"); const list = offered ? state.offered : state.wanted;
      if (!list.some((s) => s.id === skill.id)) list.push({ ...skill, offeringId: "offering-" + skill.id, tier: "NOT_ASSESSED", basicAvailable: false, advancedAvailable: false });
      data = { skill, created: true, offering: { id: "offering-" + skill.id, tier: "NOT_ASSESSED", basicAvailable: false } };
    }
    return route.fulfill({ json: data });
  });
  await page.goto("/my-skills");
  await page.getByRole("button", { name: "+ Add Skill", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  return state;
}
async function category(page: Page, name: string) {
  await page.getByLabel("Domain Category", { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
  await page.getByLabel("Choose a Skill", { exact: true }).focus();
}

test("skill removal uses a cancellable accessible dialog and preserves errors for retry",async({page})=>{
  const state=await fixture(page);
  state.offered.push({id:"synthetic-python",offeringId:"synthetic-offering",name:"Python Programming Fundamentals",category:"Technology",tier:"AMATEUR",basicAvailable:true,advancedAvailable:false});
  await page.getByRole("dialog").getByRole("button",{name:"Close",exact:true}).click();await page.reload();
  let nativeDialogs=0;page.on("dialog",async dialog=>{nativeDialogs++;await dialog.dismiss();});
  const remove=page.getByRole("button",{name:"Remove Python Programming Fundamentals",exact:true});
  await remove.click();const dialog=page.getByRole("alertdialog");
  await expect(dialog).toContainText("Earned tiers and assessment history will be retained");expect(state.removals).toHaveLength(0);
  await dialog.getByRole("button",{name:"Keep Skill",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(remove).toBeFocused();
  await remove.click();state.removalFailure=true;
  await dialog.getByRole("button",{name:"Remove Skill",exact:true}).click();await expect(dialog.getByRole("alert")).toContainText("Please retry");expect(state.offered).toHaveLength(1);await expect(page.getByRole("button",{name:"Remove Python Programming Fundamentals",exact:true,includeHidden:true})).toHaveCount(1);
  state.removalFailure=false;await dialog.getByRole("button",{name:"Remove Skill",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(remove).toHaveCount(0);
  expect(state.removals).toHaveLength(2);expect(nativeDialogs).toBe(0);
});
test("every category supplies ten presets, with case-insensitive keyboard selection and canonical offered payload", async ({ page }) => {
  const state = await fixture(page);
  for (const name of ["Technology", "Creative", "Music", "Language", "Lifestyle", "Business", "Academic", "Other"]) {
    await category(page, name);
    await expect(page.getByRole("listbox", { name: "Skill presets" }).getByRole("option")).toHaveCount(10);
  }
  await category(page, "Technology");
  const input = page.getByLabel("Choose a Skill", { exact: true });
  await input.fill("pYtHoN");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveText(["Python Programming Fundamentals"]);
  await input.press("ArrowDown"); await input.press("Enter");
  await expect(input).toHaveValue("Python Programming Fundamentals");
  await page.getByRole("button", { name: "Save Skill", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.submits).toEqual([{ presetKey: "python-programming-fundamentals" }]);
  expect(state.offered[0].id).toBe("canonical-python-programming-fundamentals");
  await expect(page.getByText("Not Assessed", { exact: true })).toBeVisible();
  await expect(page.getByText("Assessment Unavailable", { exact: true })).toBeVisible();
});
test("wanted skills select the same catalog reference by touch or mouse", async ({ page }) => {
  const state = await fixture(page);
  await page.getByLabel("Exchange Direction", { exact: true }).click();
  await page.getByRole("option", { name: "Wants to Learn (Request a skill)", exact: true }).click();
  await category(page, "Language");
  await page.getByLabel("Choose a Skill", { exact: true }).fill("grammar");
  await page.getByRole("option", { name: "English Grammar", exact: true }).click();
  await page.getByRole("button", { name: "Save Skill", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.submits).toEqual([{ presetKey: "english-grammar" }]);
  expect(state.wanted[0].id).toBe("canonical-english-grammar"); expect(state.offered).toHaveLength(0);
});
test("arbitrary text cannot be saved and historical custom skills remain readable", async ({ page }) => {
  const state = await fixture(page);
  state.offered.push({ id: "legacy", name: "Historical weaving", category: "creative", tier: "AMATEUR", offeringId: "legacy-offering", basicAvailable: false });
  await category(page, "Creative");
  await page.getByLabel("Choose a Skill", { exact: true }).fill("Asd");
  await expect(page.getByRole("status")).toHaveText("No matching preset skills");
  await expect(page.getByRole("button", { name: "Save Skill", exact: true })).toBeDisabled();
  expect(state.submits).toHaveLength(0);
  await expect(page.getByRole("dialog")).not.toContainText(/suggest a new skill|custom skill|enter your own/i);
  await category(page, "Music");
  await page.getByLabel("Choose a Skill", { exact: true }).fill("Acoustic Guitar Basics");
  await expect(page.getByRole("button", { name: "Save Skill", exact: true })).toBeDisabled();
  await page.getByRole("option", { name: "Acoustic Guitar Basics", exact: true }).click();
  await page.getByRole("button", { name: "Save Skill", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.offered).toHaveLength(2); expect(state.offered[0].tier).toBe("AMATEUR");
  await expect(page.getByText("Historical weaving", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("catalog failure prevents arbitrary fallback submissions", async ({ page }) => {
  const state = await fixture(page, true);
  await expect(page.getByRole("alert")).toContainText("The preset catalog is unavailable");
  await page.getByLabel("Choose a Skill", { exact: true }).fill("Asd");
  await expect(page.getByRole("button", { name: "Save Skill", exact: true })).toBeDisabled();
  expect(state.submits).toHaveLength(0);
});
