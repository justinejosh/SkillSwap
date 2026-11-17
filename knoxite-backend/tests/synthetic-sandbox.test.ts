import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireSyntheticEnvironment } from "../development/safety";
import { syntheticMailbox } from "../development/mailbox";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";
import { credentialStatus } from "../development/credentials";
import bcrypt from "bcrypt";
const environment = () => ({
  NODE_ENV: "development",
  KNOXITE_SYNTHETIC_SANDBOX: "true",
  KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
  DATABASE_URL:
    "mysql://synthetic:fixture-only@127.0.0.1:3309/knoxite_sandbox_dev",
  INSTITUTION_EMAIL_DOMAINS: "students.knoxite.test",
  CAMPUS_EMAIL_SUFFIX: "lag",
  EMAIL_VERIFICATION_REQUIRED: "true",
  GOOGLE_SIGN_IN_ENABLED: "false",
  PUBLIC_APP_URL: "http://localhost:5180",
});
test("synthetic entry guards reject production, existing knoxite, remote DBs, real domains and weakened auth", () => {
  assert.ok(requireSyntheticEnvironment(environment()));
  for (const change of [
    { NODE_ENV: "production" },
    { KNOXITE_SYNTHETIC_SANDBOX: "false" },
    { DATABASE_URL: "mysql://synthetic:fixture-only@127.0.0.1:3306/knoxite" },
    {
      DATABASE_URL:
        "mysql://synthetic:fixture-only@remote.example:3309/knoxite_sandbox_dev",
    },
    { INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph" },
    { GOOGLE_SIGN_IN_ENABLED: "true" },
    { EMAIL_VERIFICATION_REQUIRED: "false" },
    { PUBLIC_APP_URL: "https://real.example" },
  ])
    assert.throws(() =>
      requireSyntheticEnvironment({ ...environment(), ...change }),
    );
});
test("private mailbox captures only synthetic account links and preserves token fragments", async () => {
  const dir = mkdtempSync(join(tmpdir(), "knoxite-synthetic-"));
  try {
    const capture = syntheticMailbox(dir, environment());
    const link = `http://localhost:5180/verify-email#token=${"a".repeat(43)}`;
    await capture("syntheticlag@students.knoxite.test", link);
    const messages = JSON.parse(
      readFileSync(join(dir, "mailbox.json"), "utf8"),
    );
    assert.equal(messages[0].link, link);
    assert.match(
      readFileSync(join(dir, "mailbox.html"), "utf8"),
      /No real email was sent/,
    );
    await assert.rejects(() =>
      capture("studentlag@student.fatima.edu.ph", link),
    );
    await assert.rejects(() =>
      capture(
        "syntheticlag@students.knoxite.test",
        link.replace("localhost:5180", "attacker.example"),
      ),
    );
    await assert.rejects(() =>
      capture("syntheticlag@students.knoxite.test", link, "password-reset"),
    );
    assert.equal(
      JSON.parse(readFileSync(join(dir, "mailbox.json"), "utf8")).length,
      1,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("production refuses the synthetic entry and normal application exposes no sandbox routes", async () => {
  const blocked = spawnSync(
    process.execPath,
    [resolve(__dirname, "../development/server.js")],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        KNOXITE_SANDBOX_CONFIG_FILE: "must-not-be-read.json",
      },
      encoding: "utf8",
      timeout: 15000,
    },
  );
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /prohibited in production/);
  const server = createApp(
    {} as PrismaClient,
    loadConfig({ JWT_SECRET: "synthetic-no-bypass-key-".repeat(3) }),
    async () => {},
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as { port: number }).port}/__synthetic/status`,
    );
    assert.equal(response.status, 404);
  } finally {
    server.close();
    await once(server, "close");
  }
});

test("credential diagnostics distinguish current, stale and missing passwords without exposing hashes", async () => {
  const password = "synthetic-check-only-password";
  let user: any = {
    passwordHash: await bcrypt.hash(password, 4),
    emailVerifiedAt: new Date(),
    isSuspended: false,
    role: "USER",
  };
  const db = {
    user: { findUnique: async () => user },
  } as unknown as PrismaClient;
  const current = await credentialStatus(db, {
    email: "syntheticlag@students.knoxite.test",
    password,
  });
  assert.equal(current.passwordMatches, true);
  assert.equal(JSON.stringify(current).includes(password), false);
  assert.equal(JSON.stringify(current).includes(user.passwordHash), false);
  assert.equal(
    (
      await credentialStatus(db, {
        email: "syntheticlag@students.knoxite.test",
        password: "outdated-synthetic-password",
      })
    ).passwordMatches,
    false,
  );
  user = null;
  assert.equal(
    (
      await credentialStatus(db, {
        email: "syntheticlag@students.knoxite.test",
        password,
      })
    ).exists,
    false,
  );
});

test("launcher readiness retries and reports timeout/early exit without a reset", async () => {
  const { waitFor } = require(
    resolve(process.cwd(), "development/sandbox.cjs"),
  );
  let calls = 0;
  await waitFor("unused", (v: any) => v.instanceId === "expected", {
    attempts: 3,
    sleep: async () => {},
    probe: async () =>
      ++calls === 3 ? { instanceId: "expected" } : { instanceId: "wrong" },
  });
  assert.equal(calls, 3);
  await assert.rejects(
    () =>
      waitFor("unused", () => true, {
        attempts: 2,
        sleep: async () => {},
        probe: async () => null,
      }),
    (e: any) => e.code === "BACKEND_NOT_READY",
  );
  await assert.rejects(
    () =>
      waitFor("unused", () => true, {
        attempts: 2,
        sleep: async () => {},
        probe: async () => null,
        alive: () => false,
      }),
    (e: any) => e.code === "BACKEND_EXITED",
  );
});
test("launcher diagnostics show safe causes and redact private config secrets", () => {
  const { SandboxError, failureMessage, redactDiagnostic } = require(
    resolve(process.cwd(), "development/sandbox.cjs"),
  );
  const password = "synthetic-private-sentinel-password";
  assert.ok(!failureMessage(new Error(password)).includes(password));
  assert.match(
    failureMessage(new SandboxError("PORT_OCCUPIED", "Sandbox port occupied")),
    /PORT_OCCUPIED/,
  );
  const redacted = redactDiagnostic(
    new Error(
      `failure ${password} mysql://name:private@127.0.0.1:3309/knoxite_sandbox_dev`,
    ),
    { accounts: [{ password }] },
  );
  assert.ok(!redacted.includes(password));
  assert.ok(!redacted.includes("name:private"));
});

test("health checks distinguish unavailable, foreign, stale and malformed backends", async () => {
  const { backendStatus, assertBackend } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const settings = { instanceId: "expected", environment: { JWT_SECRET: "synthetic-health-secret" } };
  const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  for (const [request, state, code] of [
    [async () => { throw Object.assign(new Error(), { cause: { code: "ECONNREFUSED" } }); }, "missing", "BACKEND_UNAVAILABLE"],
    [async () => { throw new Error("timeout"); }, "unresponsive", "BACKEND_UNRESPONSIVE"],
    [json({ synthetic: true, instanceId: "foreign" }), "foreign", "INSTANCE_MISMATCH"],
    [json({ synthetic: true, instanceId: "expected" }), "outdated", "BACKEND_OUTDATED"],
    [json({ error: "not found" }, 404), "invalid-response", "BACKEND_PROTOCOL_MISMATCH"],
    [json({ instanceId: "expected" }), "invalid-response", "BACKEND_PROTOCOL_MISMATCH"],
    [json({ synthetic: true, instanceId: "expected", protocol: 1, pid: 123, startedAt: "today", proof: "0".repeat(64) }), "settings-mismatch", "SETTINGS_MISMATCH"],
    [async () => new Response("<html>another app</html>"), "invalid-response", "BACKEND_PROTOCOL_MISMATCH"],
    [async () => new Response("{", { headers: { "content-type": "application/json" } }), "invalid-response", "BACKEND_PROTOCOL_MISMATCH"],
  ] as const) {
    const result = await backendStatus(settings, request);
    assert.equal(result.state, state);
    assert.throws(() => assertBackend(result), (e: any) => e.code === code);
  }
});

test("health proof binds the current private key, instance, process and fresh challenge", async () => {
  const { backendStatus, assertBackend } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const identity = require(resolve(process.cwd(), "development/identity.cjs"));
  const settings = { instanceId: "expected", environment: { JWT_SECRET: "synthetic-health-secret" } };
  let previous: any;
  const result = await backendStatus(settings, async (url: string, options: any) => {
    assert.equal(new URL(url).hostname, "127.0.0.1");
    assert.equal(new URL(url).port, "5010");
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    const challenge = new URL(url).searchParams.get("challenge");
    const status = { synthetic: true, instanceId: "expected", protocol: identity.protocol, pid: 123, startedAt: "2026-11-08T00:00:00Z" };
    previous = { ...status, proof: identity.proof(settings, challenge, status) };
    assert.equal(identity.verify(settings, challenge, { ...previous, pid: 456 }), false);
    assert.equal(identity.verify({ ...settings, environment: { JWT_SECRET: "different-private-key" } }, challenge, previous), false);
    return Response.json(previous);
  });
  assertBackend(result);
  assert.equal(result.pid, 123);
  assert.equal((await backendStatus(settings, async () => Response.json(previous))).state, "settings-mismatch");
});

test("lifecycle lock blocks concurrent commands, recovers a dead owner and retains unknown locks", () => {
  const { lifecycleLock } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const dir = mkdtempSync(join(tmpdir(), "knoxite-lock-test-"));
  const file = join(dir, "lifecycle.lock");
  try {
    const release = lifecycleLock(file);
    assert.throws(() => lifecycleLock(file), (e: any) => e.code === "LIFECYCLE_BUSY");
    release();
    assert.equal(existsSync(file), false);
    writeFileSync(file, JSON.stringify({ pid: 987654, token: "dead-owner" }));
    lifecycleLock(file, () => false)();
    assert.equal(existsSync(file), false);
    writeFileSync(file, "incomplete");
    assert.throws(() => lifecycleLock(file, () => false), (e: any) => e.code === "LIFECYCLE_BUSY");
    assert.equal(readFileSync(file, "utf8"), "incomplete");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("readiness never swallows a definitive wrong-instance failure", async () => {
  const { waitFor, assertBackend } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  await assert.rejects(() => waitFor("unused", (v: any) => assertBackend(v), {
    attempts: 2, sleep: async () => {}, probe: async () => ({ state: "foreign" }),
  }), (e: any) => e.code === "INSTANCE_MISMATCH");
});

function databaseFixture() {
  const settings = { instanceId: "synthetic-fixture" };
  const container = {
    Id: "fixture-container", Name: "/knoxite-synthetic-mysql",
    Config: { Image: "mysql:8.4", Labels: { "knoxite.synthetic": settings.instanceId } },
    Mounts: [{ Type: "volume", Name: "knoxite-synthetic-mysql-data", Destination: "/var/lib/mysql", RW: true }],
    HostConfig: { PortBindings: { "3306/tcp": [{ HostIp: "127.0.0.1", HostPort: "3309" }] } },
  };
  const volume = { Name: "knoxite-synthetic-mysql-data", CreatedAt: "fixture-created-at", Labels: { "knoxite.synthetic": settings.instanceId } };
  return { settings, container, volume };
}
test("database ownership verifies BOTH labels, exact named volume and loopback binding", () => {
  const { ownershipReport, ownsDatabase } = require(resolve(process.cwd(), "development/databaseIdentity.cjs"));
  const { settings, container, volume } = databaseFixture();
  assert.equal(ownsDatabase(ownershipReport(settings, container, volume)), true);
  for (const mutate of [
    (c: any, v: any) => { c.Config.Labels["knoxite.synthetic"] = "older-container"; },
    (c: any, v: any) => { v.Labels["knoxite.synthetic"] = "older-volume"; },
    (c: any, v: any) => { c.Mounts[0].Name = "different-volume"; },
    (c: any, v: any) => { c.Mounts[0].Type = "bind"; },
    (c: any, v: any) => { c.Mounts[0].RW = false; },
    (c: any, v: any) => { c.Mounts.push({ ...c.Mounts[0] }); },
    (c: any, v: any) => { c.HostConfig.PortBindings["3306/tcp"][0].HostIp = "0.0.0.0"; },
    (c: any, v: any) => { c.HostConfig.PortBindings["3306/tcp"][0].HostPort = "3306"; },
    (c: any, v: any) => { c.HostConfig.PortBindings["3306/tcp"].push({ HostIp: "::", HostPort: "3309" }); },
    (c: any, v: any) => { c.Config.Image = "unverified-image"; },
  ]) {
    const c = structuredClone(container), v = structuredClone(volume);
    mutate(c, v);
    assert.equal(ownsDatabase(ownershipReport(settings, c, v)), false);
  }
  assert.equal(ownsDatabase(ownershipReport(settings, container, null)), false);
});
test("missing settings never authorize regeneration beside old Docker resources or a backup", () => {
  const { mayInitialize } = require(resolve(process.cwd(), "development/databaseIdentity.cjs"));
  assert.equal(mayInitialize(false, null, null, false), true);
  for (const [container, volume, checkpoint] of [[{}, null, false], [null, {}, false], [null, null, true], [{}, {}, true]])
    assert.equal(mayInitialize(false, container, volume, checkpoint), false);
});
test("recovery requires the complete checkpoint bound to the exact container and volume", () => {
  const { checkpointMatches } = require(resolve(process.cwd(), "development/databaseIdentity.cjs"));
  const { settings, container, volume } = databaseFixture();
  const checkpoint = { format: 1, settings, settingsText: JSON.stringify(settings), containerId: container.Id, volumeCreatedAt: volume.CreatedAt };
  assert.equal(checkpointMatches(checkpoint, { container, volume }), true);
  for (const change of [
    { format: 2 }, { containerId: "older-container" }, { volumeCreatedAt: "older-volume" },
    { settingsText: "malformed private data" }, { settingsText: JSON.stringify({ instanceId: "regenerated" }) },
    { settings: { instanceId: "regenerated" }, settingsText: JSON.stringify({ instanceId: "regenerated" }) },
  ]) assert.equal(checkpointMatches({ ...checkpoint, ...change }, { container, volume }), false);
  assert.equal(checkpointMatches(checkpoint, { container: null, volume }), false);
});
test("recovery restores a complete verified fixture and preserves displaced settings; failures never write", async () => {
  const { restoreCheckpoint } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const { settings, container, volume } = databaseFixture();
  const checkpoint = { format: 1, settings, settingsText: JSON.stringify(settings), containerId: container.Id, volumeCreatedAt: volume.CreatedAt };
  const dir = mkdtempSync(join(tmpdir(), "knoxite-recovery-test-"));
  const file = join(dir, "settings.json");
  const displaced = JSON.stringify({ instanceId: "regenerated-fixture", password: "synthetic-fixture-only" });
  try {
    writeFileSync(file, displaced);
    let validated = 0;
    await assert.rejects(() => restoreCheckpoint({ ...checkpoint, containerId: "wrong" }, { container, volume }, file, async () => { validated++; }));
    assert.equal(validated, 0);
    assert.equal(readFileSync(file, "utf8"), displaced);
    await assert.rejects(() => restoreCheckpoint(checkpoint, { container, volume }, file, async () => { throw new Error("Synthetic credential proof failed"); }));
    assert.equal(readFileSync(file, "utf8"), displaced);
    assert.equal(readdirSync(dir).length, 1);
    await restoreCheckpoint(checkpoint, { container, volume }, file, async (candidate: any) => {
      assert.deepEqual(candidate, settings);
      validated++;
    });
    assert.equal(validated, 1);
    assert.equal(readFileSync(file, "utf8"), checkpoint.settingsText);
    const archive = readdirSync(dir).find((name) => name.startsWith("settings.displaced."));
    assert.ok(archive);
    assert.equal(readFileSync(join(dir, archive), "utf8"), displaced);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("replacement uses a closed separate layout and never accepts an arbitrary database target", () => {
  const { layout } = require(resolve(process.cwd(), "development/sandboxProfiles.cjs"));
  const original = layout("legacy"), replacement = layout("replacement");
  for (const key of ["folder", "container", "volume", "dbName", "dbPort", "apiPort"])
    assert.notEqual(original[key], replacement[key]);
  for (const name of ["production", "../legacy", "knoxite", "", "toString"])
    assert.throws(() => layout(name));
  const env = { ...environment(), KNOXITE_SANDBOX_PROFILE: "replacement", DATABASE_URL: "mysql://synthetic:fixture-only@127.0.0.1:3310/knoxite_sandbox_replacement_dev" };
  assert.ok(requireSyntheticEnvironment(env));
  assert.throws(() => requireSyntheticEnvironment({ ...env, DATABASE_URL: environment().DATABASE_URL }));
  assert.throws(() => requireSyntheticEnvironment({ ...env, KNOXITE_SANDBOX_PROFILE: "legacy" }));
});
test("replacement ownership cannot adopt an otherwise matching original container or volume", () => {
  const { ownershipReport, ownsDatabase } = require(resolve(process.cwd(), "development/databaseIdentity.cjs"));
  const { settings, container, volume } = databaseFixture();
  const replacement = { ...settings, environment: { KNOXITE_SANDBOX_PROFILE: "replacement" } };
  assert.equal(ownsDatabase(ownershipReport(replacement, container, volume)), false);
});
test("relocation requires one previous checkout plus exact executable, owner, PID, start time and frontend port", () => {
  const { previousRoot, processMatches } = require(resolve(process.cwd(), "development/relocation.cjs"));
  const old = resolve(tmpdir(), "knoxite-relocation-fixture");
  const launchedAt = "2026-11-08T00:00:00Z";
  const records = {
    backend: { entry: join(old, "knoxite-backend/dist/development/server.js"), pid: 123, launchedAt },
    frontend: { entry: join(old, "node_modules/vite/bin/vite.js"), pid: 124, launchedAt },
  };
  assert.equal(previousRoot(records), old);
  assert.equal(previousRoot({ ...records, frontend: { ...records.frontend, entry: join(old, "unrelated.js") } }), null);
  const observed = { pid: 124, executable: process.execPath, command: `"${process.execPath}" "${records.frontend.entry}" --host 127.0.0.1 --port 5180 --strictPort`, owner: "fixture-sid", createdAt: launchedAt };
  assert.equal(processMatches(records.frontend, observed, process.execPath, "fixture-sid", true), true);
  for (const changes of [
    { pid: 999 }, { owner: "other-user" }, { executable: "unrelated.exe" },
    { createdAt: "2026-11-08T01:00:00Z" }, { command: observed.command.replace("5180", "5173") },
    { command: observed.command.replace("--strictPort", "") },
  ]) assert.equal(processMatches(records.frontend, { ...observed, ...changes }, process.execPath, "fixture-sid", true), false);
});
test("transport retries recover a transient reset without accepting a foreign instance", async () => {
  const { backendStatus } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const identity = require(resolve(process.cwd(), "development/identity.cjs"));
  const settings = { instanceId: "fixture", environment: { JWT_SECRET: "synthetic-fixture-key" } };
  let calls = 0;
  const result = await backendStatus(settings, async (url: string) => {
    if (++calls === 1) throw Object.assign(new Error(), { cause: { code: "ECONNRESET" } });
    const status = { synthetic: true, instanceId: "fixture", protocol: identity.protocol, pid: 123, startedAt: "fixture-start" };
    return Response.json({ ...status, proof: identity.proof(settings, new URL(url).searchParams.get("challenge"), status) });
  });
  assert.equal(result.state, "ready"); assert.equal(calls, 2);
  calls = 0;
  assert.equal((await backendStatus(settings, async () => {
    calls++; throw Object.assign(new Error(), { cause: { code: "ECONNRESET" } });
  })).state, "unresponsive");
  assert.equal(calls, 3);
  calls = 0;
  assert.equal((await backendStatus(settings, async () => {
    calls++; return Response.json({ synthetic: true, instanceId: "foreign" });
  })).state, "foreign");
  assert.equal(calls, 1);
});
test("initial settings creation is exclusive and cannot overwrite an existing identity", () => {
  const { createSettings } = require(resolve(process.cwd(), "development/sandbox.cjs"));
  const dir = mkdtempSync(join(tmpdir(), "knoxite-exclusive-settings-"));
  const file = join(dir, "settings.json");
  try {
    createSettings(file, { instanceId: "first-fixture" });
    const original = readFileSync(file);
    assert.throws(() => createSettings(file, { instanceId: "second-fixture" }), (e: any) => e.code === "SETTINGS_ALREADY_EXIST");
    assert.equal(readFileSync(file).equals(original), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("all recovery generations keep allocator layouts and strict database guards aligned", () => {
  const profiles = require(resolve(process.cwd(), "development/sandboxProfiles.cjs"));
  const { layoutForSlot } = require(resolve(process.cwd(), "development/replacementAllocation.cjs"));
  for (let slot = 1; slot <= 8; slot++) {
    const expected = layoutForSlot(slot);
    assert.deepEqual(profiles.layout(expected.name), expected);
    const env = { ...environment(), KNOXITE_SANDBOX_PROFILE: expected.name, DATABASE_URL: `mysql://synthetic:fixture-only@127.0.0.1:${expected.dbPort}/${expected.dbName}` };
    assert.ok(requireSyntheticEnvironment(env));
    assert.throws(() => requireSyntheticEnvironment({ ...env, DATABASE_URL: environment().DATABASE_URL }));
    assert.throws(() => requireSyntheticEnvironment({ ...env, KNOXITE_SANDBOX_PROFILE: "legacy" }));
  }
});
