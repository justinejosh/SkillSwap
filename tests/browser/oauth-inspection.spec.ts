// Fully mocked Google SDK/claims. No real Google account or network is used.
import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { join } from "node:path";
import { once } from "node:events";
const require = createRequire(join(process.cwd(), "package.json"));
const local = require(join(process.cwd(), "knoxite-backend/development/oauthLocal.cjs"));
test("local claim-inspection UI reports hd without authenticating or retaining a Google credential", async ({ page }) => {
  const env = { NODE_ENV: "development", JWT_SECRET: "synthetic-probe-key-".repeat(3), INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph", GOOGLE_SIGN_IN_ENABLED: "false", GOOGLE_CLIENT_ID: "synthetic.apps.googleusercontent.com" };
  const app = local.inspectionApp(env, async (credential: string) => ({ iss: "https://accounts.google.com", aud: env.GOOGLE_CLIENT_ID, sub: "synthetic-subject", iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, email: "aasample1234lag@student.fatima.edu.ph", email_verified: true, hd: "observed.fixture.example", nonce: credential.replace("synthetic-", "") }));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const api = `http://127.0.0.1:${(server.address() as any).port}`;
  let calls = 0;
  try {
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === "/local-probe") return route.fulfill({ contentType: "text/html", body: local.probePage(env.GOOGLE_CLIENT_ID) });
      if (u.href === "https://accounts.google.com/gsi/client") return route.fulfill({ contentType: "application/javascript", body: `window.google={accounts:{id:{initialize:function(o){window.__probe=o},renderButton:function(el){const b=document.createElement('button');b.textContent='Continue with Google';b.onclick=()=>window.__probe.callback({credential:'synthetic-'+window.__probe.nonce});el.appendChild(b)}}}};` });
      if (["/challenge", "/inspect"].includes(u.pathname)) {
        calls++; const response = await route.fetch({ url: api + u.pathname, headers: { ...route.request().headers(), origin: "http://localhost:5181" } });
        return route.fulfill({ response });
      }
      return route.abort();
    });
    await page.goto("/local-probe");
    await page.getByRole("button", { name: "Prepare Google inspection", exact: true }).click();
    await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
    await expect(page.getByRole("status")).toContainText('"hostedDomain": "observed.fixture.example"');
    await expect(page.getByRole("status")).toContainText('"knoxiteAccessGranted": false');
    expect(calls).toBe(2);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({});
    expect(await page.evaluate(() => ({ ...sessionStorage }))).toEqual({});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { server.close(); await once(server, "close"); }
});
