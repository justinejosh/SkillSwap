// Deliberately separate from index.ts. No production route can enable capture.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireSyntheticEnvironment } from "./safety";
import { syntheticMailbox } from "./mailbox";
import { loadConfig } from "../lib/config";
import { createApp } from "../app";
import express from "express";
// The launcher and compiled entry share this development-only protocol.
const identity = require(resolve(
  __dirname, "../../development/identity.cjs",
));

if (process.env.NODE_ENV === "production")
  throw new Error("Synthetic entry point is prohibited in production.");
const configFile = process.env.KNOXITE_SANDBOX_CONFIG_FILE;
if (!configFile)
  throw new Error(
    "Use the sandbox launcher; a private configuration is required.",
  );
const settings = JSON.parse(readFileSync(configFile, "utf8"));
const profile = require(resolve(__dirname, "../../development/sandboxProfiles.cjs")).forSettings(settings);
const env = settings.environment as NodeJS.ProcessEnv;
const url = requireSyntheticEnvironment(env);
const db = new PrismaClient({ datasources: { db: { url } } });
const app = express();
const startedAt = new Date().toISOString();
app.get("/__synthetic/status", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const status = {
    synthetic: true, instanceId: settings.instanceId,
    protocol: identity.protocol, pid: process.pid, startedAt,
  };
  const challenge = req.query.challenge;
  res.json({ ...status, ...(typeof challenge === "string" && /^[a-f0-9]{64}$/.test(challenge)
    ? { proof: identity.proof(settings, challenge, status) } : {}) });
});
app.use(
  createApp(db, loadConfig(env), syntheticMailbox(dirname(configFile), env)),
);
const server = app.listen(profile.apiPort, "127.0.0.1", () => {
  console.log(
    `${startedAt} Synthetic Knoxite backend listening on 127.0.0.1:${profile.apiPort}; pid=${process.pid}; protocol=${identity.protocol}; no real mail; Google disabled.`,
  );
});
server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(`${new Date().toISOString()} Backend listener failed: ${error.code || "UNKNOWN"}.`);
  process.exitCode = 1;
  void db.$disconnect();
});
for (const event of ["uncaughtException", "unhandledRejection"] as const)
  process.once(event, () => {
    // Fail closed; never continue an uncertain process or log private payloads.
    console.error(`${new Date().toISOString()} Backend fatal ${event}; process terminating.`);
    process.exit(1);
  });
process.once("exit", (code) => console.log(`${new Date().toISOString()} Backend exit; code=${code}.`));
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    console.log(`${new Date().toISOString()} Backend stopping; signal=${signal}.`);
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
