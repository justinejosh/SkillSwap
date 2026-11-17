import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { loginThrottle, LOGIN_WINDOW_MS } from "../lib/loginThrottle";
import { errorHandler } from "../lib/http";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";

test("successful logins and server errors do not consume or clear the shared failed-login budget", async () => {
  let time = 1000;
  const app = express(); app.use(express.json());
  app.post("/login", loginThrottle(() => time), (req, res) => res.sendStatus(req.body.status));
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/login`;
  const call = async (status: number, email = "alice@fixture.example") => {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, email }) });
    const text = await response.text(); return { response, text };
  };
  try {
    for (let i = 0; i < 20; i++) assert.equal((await call(200)).response.status, 200);
    for (let i = 0; i < 12; i++) assert.equal((await call(503)).response.status, 503);
    for (let i = 0; i < 9; i++) assert.equal((await call(401, `unknown-${i}@fixture.example`)).response.status, 401);
    // Signing into an attacker's valid account cannot wipe shared failures.
    assert.equal((await call(200, "valid@fixture.example")).response.status, 200);
    assert.equal((await call(403)).response.status, 403);
    const blocked = await call(200);
    assert.equal(blocked.response.status, 429);
    assert.equal(blocked.response.headers.get("Retry-After"), "900");
    assert.equal(JSON.parse(blocked.text).details.retryAfterSeconds, 900);
    time += 1000;
    assert.equal((await call(200)).response.headers.get("Retry-After"), "899");
    time += LOGIN_WINDOW_MS;
    assert.equal((await call(200)).response.status, 200);
  } finally { server.close(); await once(server, "close"); }
});

test("parallel requests reserve capacity before authentication and settle only once", async () => {
  const app = express(), held: express.Response[] = [];
  app.post("/login", loginThrottle(), (_req, res) => { held.push(res); });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/login`;
  const call = () => fetch(url, { method: "POST" });
  const waitCount = async (count: number) => {
    for (let i = 0; i < 200 && held.length < count; i++) await new Promise((r) => setTimeout(r, 5));
    assert.equal(held.length, count);
  };
  const inFlight = Array.from({ length: 10 }, call);
  try {
    await waitCount(10);
    const busy = await call(); assert.equal(busy.status, 429);
    assert.equal(busy.headers.get("Retry-After"), "1"); await busy.json();
    held[0].sendStatus(200); await (await inFlight[0]).text();
    const extra = call(); await waitCount(11);
    for (const res of held.slice(1)) res.sendStatus(401);
    await Promise.all([...inFlight.slice(1), extra].map(async (r) => (await r).text()));
    const blocked = await call(); assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("Retry-After")) > 1); await blocked.json();
  } finally {
    for (const res of held) if (!res.writableEnded) res.end();
    await Promise.allSettled(inFlight);
    server.close(); await once(server, "close");
  }
});

test("actual auth route permits repeated account switching while retaining password, eligibility and suspension checks", async () => {
  const password = "synthetic-login-fixture-only";
  const hash = await bcrypt.hash(password, 4);
  const users = ["alice", "bob"].map((name) => ({
    id: randomUUID(), name, email: `${name}lag@fixture.example`, passwordHash: hash,
    emailVerifiedAt: new Date(), isSuspended: false, role: "USER", tokenVersion: 0,
  }));
  let issued = 0, lookups = 0;
  const tx = {
    $queryRaw: async () => [],
    user: { findUniqueOrThrow: async ({ where }: any) => users.find((u) => u.id === where.id) },
    authSession: { create: async ({ data }: any) => { issued++; return { id: randomUUID(), ...data }; } },
  };
  const db = { user: { findUnique: async ({ where }: any) => { lookups++; return users.find((u) => u.email === where.email) || null; } }, $transaction: async (fn: any) => fn(tx) } as unknown as PrismaClient;
  const config = loadConfig({ JWT_SECRET: "synthetic-login-fixture-key-".repeat(3), INSTITUTION_EMAIL_DOMAINS: "fixture.example", CAMPUS_EMAIL_SUFFIX: "lag", EMAIL_VERIFICATION_REQUIRED: "true" });
  const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth/login`;
  const login = (email: string, value = password) => fetch(base, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" }, body: JSON.stringify({ email, password: value }) });
  try {
    for (let i = 0; i < 20; i++) {
      const user = users[i % 2]; const response = await login(` ${user.email.toUpperCase()} `);
      assert.equal(response.status, 200); const body: any = await response.json();
      assert.ok(body.user.id === user.id && typeof body.token === "string");
    }
    users[0].isSuspended = true;
    let response = await login(users[0].email); assert.equal(response.status, 403); await response.json();
    users[0].isSuspended = false; (users[0] as any).emailVerifiedAt = null;
    response = await login(users[0].email); assert.equal(response.status, 403); await response.json();
    users[0].emailVerifiedAt = new Date();
    for (let i = 0; i < 8; i++) {
      response = await login(`unknown-${i}lag@fixture.example`, "wrong-fixture-password");
      assert.equal(response.status, 401); await response.json();
    }
    const before = lookups;
    response = await login(users[1].email); assert.equal(response.status, 429);
    assert.equal(lookups, before); assert.equal(issued, 20);
    assert.match(response.headers.get("Access-Control-Expose-Headers") || "", /Retry-After/i);
    await response.json();
  } finally { server.close(); await once(server, "close"); }
});
