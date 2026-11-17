import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
export function privateSandbox() {
  const root = process.cwd();
  const require = createRequire(join(root, "package.json"));
  const profiles = require(join(root, "knoxite-backend/development/sandboxProfiles.cjs"));
  const base = join(process.env.LOCALAPPDATA!, "Knoxite/sandbox");
  const selection = join(base, "active-profile.json");
  const profile = profiles.layout(existsSync(selection) ? JSON.parse(readFileSync(selection, "utf8")).profile : "legacy");
  const directory = join(base, profile.folder);
  const settings = JSON.parse(readFileSync(join(directory, "settings.json"), "utf8"));
  return { directory, settings, profile, api: `http://localhost:${profile.apiPort}`, directApi: `http://127.0.0.1:${profile.apiPort}` };
}
