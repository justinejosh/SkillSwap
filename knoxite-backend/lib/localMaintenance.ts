import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
export const localMaintenanceFile = resolve(
  process.env.LOCALAPPDATA || resolve(homedir(), "AppData/Local"),
  "Knoxite/local-upgrade.lock",
);
export const localDatabaseMaintenance = () =>
  process.env.NODE_ENV !== "production" && existsSync(localMaintenanceFile);
