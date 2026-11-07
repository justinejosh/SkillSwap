import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";

test("academic-options availability failures remain safe and recoverable", async (t) => {
  let failure: unknown = null;
  let configured = false;
  const logs: unknown[][] = [];
  t.mock.method(console, "error", (...values: unknown[]) => logs.push(values));
  const year = { id: "year-1", code: "YEAR_1", name: "1st Year", order: 1 };
  const db = {
    program: {
      findMany: async () => {
        if (failure) throw failure;
        return configured
          ? [
              {
                id: "program",
                code: "BSCS",
                label: "BSCS",
                mappingValidatedAt: null,
                department: null,
                yearLevels: [year],
              },
            ]
          : [];
      },
    },
    yearLevel: { findMany: async () => (configured ? [year] : []) },
  } as unknown as PrismaClient;
  const config = loadConfig({
    JWT_SECRET: "synthetic-availability-key-".repeat(3),
  });
  const server = createApp(db, config, async () => {}).listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const request = () =>
    fetch(`http://127.0.0.1:${port}/api/auth/academic-options`);
  try {
    await t.test(
      "missing tables and columns return 503 without exposing database errors",
      async () => {
        for (const code of ["P2021", "P2022"]) {
          failure = Object.assign(new Error("private-db-credential-sentinel"), {
            code,
          });
          const response = await request();
          assert.equal(response.status, 503);
          const body = (await response.json()) as any;
          assert.match(body.error, /College programs and year levels/);
          assert.ok(!JSON.stringify(body).includes(code));
          assert.ok(
            !JSON.stringify(body).includes("private-db-credential-sentinel"),
          );
        }
        assert.deepEqual(
          logs.map((line) => line[1]),
          ["P2021", "P2022"],
        );
        assert.ok(
          !JSON.stringify(logs).includes("private-db-credential-sentinel"),
        );
      },
    );
    await t.test(
      "connection initialization failures also use the recoverable service response",
      async () => {
        failure = Object.assign(new Error("private-connection-url-sentinel"), {
          errorCode: "P1001",
        });
        const response = await request();
        assert.equal(response.status, 503);
        assert.ok(
          !(await response.text()).includes("private-connection-url-sentinel"),
        );
      },
    );
    await t.test(
      "an unconfigured catalog is unavailable and a later retry returns persisted selections",
      async () => {
        failure = null;
        assert.equal((await request()).status, 503);
        configured = true;
        const response = await request();
        assert.equal(response.status, 200);
        const body = (await response.json()) as any;
        assert.equal(body.programs[0].id, "program");
        assert.equal(body.programs[0].yearLevels[0].id, "year-1");
        assert.equal(body.programs[0].department, null);
      },
    );
  } finally {
    server.close();
    await once(server, "close");
  }
});
