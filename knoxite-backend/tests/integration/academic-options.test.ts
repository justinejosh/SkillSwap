import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { requireLocalDatabase } from "../../scripts/safeDatabase";
import { seedAcademicCatalog } from "../../services/academics";

test("isolated academic catalog initialization returns real IDs without changing student records", async () => {
  const url = requireLocalDatabase();
  assert.match(new URL(url).pathname, /_test$/);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const config = loadConfig({
    JWT_SECRET: "synthetic-academic-catalog-key-".repeat(3),
  });
  const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  try {
    const beforeCount = await db.program.count();
    const beforeUsers = await db.user.count();
    const before = await fetch(
      `http://127.0.0.1:${port}/api/auth/academic-options`,
    );
    assert.equal(before.status, beforeCount === 0 ? 503 : 200);
    assert.equal(
      await db.program.count(),
      beforeCount,
      "Reading the endpoint must not seed or modify the database.",
    );
    await seedAcademicCatalog(db);
    const response = await fetch(
      `http://127.0.0.1:${port}/api/auth/academic-options`,
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as any;
    assert.equal(body.programs.length, 13);
    assert.equal(body.yearLevels.length, 4);
    for (const program of body.programs) {
      assert.equal(program.yearLevels.length, 4);
      assert.equal(program.department, null);
      assert.ok(await db.program.findUnique({ where: { id: program.id } }));
    }
    assert.equal(await db.user.count(), beforeUsers);
  } finally {
    server.close();
    await once(server, "close");
    await db.$disconnect();
  }
});
