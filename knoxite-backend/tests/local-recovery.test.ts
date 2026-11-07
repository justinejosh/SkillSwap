import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import {
  assertLegacyDataPreserved,
  requireMigrationDatabase,
} from "../scripts/localRecoverySafety";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";

test("historical preservation detects changed values or missing rows, while allowing additive migration history", () => {
  const before = {
    User: {
      columns: ["id", "passwordHash"],
      hashes: ["synthetic-row-a", "synthetic-row-b"],
    },
    _OfferedSkills: { columns: ["A", "B"], hashes: ["synthetic-association"] },
    _prisma_migrations: { columns: ["id"], hashes: ["old-history"] },
  };
  assert.doesNotThrow(() => assertLegacyDataPreserved(before, before));
  assert.throws(
    () =>
      assertLegacyDataPreserved(before, {
        ...before,
        User: { ...before.User, hashes: ["changed-row", "synthetic-row-b"] },
      }),
    /Historical rows changed/,
  );
  assert.throws(
    () =>
      assertLegacyDataPreserved(before, {
        ...before,
        _OfferedSkills: { ...before._OfferedSkills, hashes: [] },
      }),
    /Historical rows changed/,
  );
  const withHistory = {
    ...before,
    _prisma_migrations: {
      columns: ["id"],
      hashes: ["old-history", "new-history"],
    },
  };
  assert.doesNotThrow(() =>
    assertLegacyDataPreserved(before, withHistory, true),
  );
  assert.throws(
    () => assertLegacyDataPreserved(before, withHistory),
    /Historical rows changed/,
  );
});

test("an existing-database approval cannot authorize remote, production, wrong-port or wrong-name targets", () => {
  const names = [
    "DATABASE_URL",
    "NODE_ENV",
    "KNOXITE_LOCAL_DATABASE_ACK",
    "KNOXITE_EXISTING_LOCAL_ACK",
  ];
  const before = Object.fromEntries(
    names.map((key) => [key, process.env[key]]),
  );
  try {
    process.env.NODE_ENV = "development";
    process.env.KNOXITE_LOCAL_DATABASE_ACK = "local-synthetic-or-sanitized";
    process.env.KNOXITE_EXISTING_LOCAL_ACK =
      "backup-and-clone-reviewed-knoxite";
    for (const url of [
      "mysql://synthetic@remote.invalid:3306/knoxite",
      "mysql://synthetic@localhost:3307/knoxite",
      "mysql://synthetic@localhost:3306/other",
    ]) {
      process.env.DATABASE_URL = url;
      assert.throws(
        () => requireMigrationDatabase("unused-proof.json"),
        /restricted/,
      );
    }
    process.env.DATABASE_URL = "mysql://synthetic@localhost:3306/knoxite";
    assert.throws(() => requireMigrationDatabase(), /Refusing database access/);
    process.env.NODE_ENV = "production";
    assert.throws(
      () => requireMigrationDatabase("unused-proof.json"),
      /Explicit authorization/,
    );
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("local maintenance keeps liveness available and blocks application/database work until released", async () => {
  let maintenance = true;
  let queries = 0;
  const db = {
    program: {
      findMany: async () => {
        queries++;
        return [];
      },
    },
    yearLevel: { findMany: async () => [] },
  } as unknown as PrismaClient;
  const config = loadConfig({
    JWT_SECRET: "synthetic-maintenance-test-key-".repeat(3),
  });
  const server = createApp(
    db,
    config,
    async () => {},
    () => maintenance,
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  try {
    assert.equal(
      (await fetch(`http://127.0.0.1:${port}/api/health`)).status,
      200,
    );
    const blocked = await fetch(
      `http://127.0.0.1:${port}/api/auth/academic-options`,
    );
    assert.equal(blocked.status, 503);
    assert.equal(((await blocked.json()) as any).maintenance, true);
    assert.equal(queries, 0);
    maintenance = false;
    await fetch(`http://127.0.0.1:${port}/api/auth/academic-options`);
    assert.equal(queries, 1);
  } finally {
    server.close();
    await once(server, "close");
  }
});
