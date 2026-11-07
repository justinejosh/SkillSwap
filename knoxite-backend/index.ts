import "dotenv/config";
import { createApp } from "./app";
import { loadConfig } from "./lib/config";
import { prisma } from "./lib/db";
import { localDatabaseMaintenance } from "./lib/localMaintenance";
const config = loadConfig();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const database = new URL(process.env.DATABASE_URL);
if (
  process.env.NODE_ENV !== "production" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
)
  throw new Error(
    "Development requires an isolated local database. Remote databases are blocked.",
  );
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Invalid PORT.");
const server = createApp(
  prisma,
  config,
  undefined,
  localDatabaseMaintenance,
).listen(
  port,
  process.env.HOST ||
    (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  () => console.log(`Knoxite API listening on port ${port}`),
);
for (const event of ["SIGINT", "SIGTERM"] as const)
  process.once(event, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
