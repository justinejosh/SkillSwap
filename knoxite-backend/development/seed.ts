import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireSyntheticEnvironment } from "./safety";
import { CapturedMail } from "./mailbox";

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Synthetic seed prohibited in production.");
  const file = process.env.KNOXITE_SANDBOX_CONFIG_FILE;
  if (!file) throw new Error("Private sandbox configuration required.");
  const settings = JSON.parse(readFileSync(file, "utf8"));
  const profiles = require(resolve(__dirname, __dirname.endsWith("dist/development") || __dirname.endsWith("dist\\development") ? "../../development/sandboxProfiles.cjs" : "sandboxProfiles.cjs"));
  const api = `http://127.0.0.1:${profiles.forSettings(settings).apiPort}`;
  const { backendStatus } = require(resolve(__dirname, __dirname.endsWith("dist/development") || __dirname.endsWith("dist\\development") ? "../../development/sandbox.cjs" : "sandbox.cjs"));
  if ((await backendStatus(settings)).state !== "ready")
    throw new Error("Wrong sandbox server.");
  const db = new PrismaClient({
    datasources: {
      db: { url: requireSyntheticEnvironment(settings.environment) },
    },
  });
  async function post(path: string, body: unknown, token?: string) {
    const response = await fetch(api + "/api" + path, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(
        `Synthetic setup API failed (${response.status}). Check private backend logs.`,
      );
    return response.json() as Promise<any>;
  }
  try {
    const program = await db.program.findUniqueOrThrow({
      where: { code: "BSCS" },
      include: { yearLevels: { orderBy: { order: "asc" } } },
    });
    for (const [i, account] of settings.accounts.entries()) {
      if (
        await db.user.findUnique({
          where: { email: account.email },
          select: { id: true },
        })
      )
        continue; // Never reset existing sandbox passwords/data.
      await post("/auth/register", {
        name: account.name,
        email: account.email,
        password: account.password,
        programId: program.id,
        yearLevelId: program.yearLevels[i % 2].id,
      });
      const messages: CapturedMail[] = JSON.parse(
        readFileSync(join(dirname(file), "mailbox.json"), "utf8"),
      );
      const delivery = messages.find(
        (m) => m.to === account.email && m.purpose === "verification",
      );
      if (!delivery)
        throw new Error("Synthetic verification was not captured.");
      await post("/auth/verify-email", {
        token: new URLSearchParams(new URL(delivery.link).hash.slice(1)).get(
          "token",
        ),
      });
      // Administrative exploration is confined to this guarded synthetic seed;
      // public registration and all normal role checks remain unchanged.
      if (account.role === "ADMIN")
        await db.user.update({
          where: { email: account.email },
          data: { role: "ADMIN" },
        });
      const login = await post("/auth/login", {
        email: account.email,
        password: account.password,
      });
      const pair = i % 2 ? ["JavaScript", "Python"] : ["Python", "JavaScript"];
      if (account.role !== "ADMIN") {
        await post(
          "/profile/skills/offer",
          { name: pair[0], category: "technology" },
          login.token,
        );
        await post(
          "/profile/skills/want",
          { name: pair[1], category: "technology" },
          login.token,
        );
      }
      await post("/auth/logout", {}, login.token);
    }
    console.log(
      "Synthetic accounts initialized through registration, captured verification, and password login. No ratings, tiers or official mappings fabricated.",
    );
  } finally {
    await db.$disconnect();
  }
}
void main().catch(() => {
  console.error(
    "Synthetic seeding failed; existing records were not reset. Inspect local prerequisites.",
  );
  process.exitCode = 1;
});
