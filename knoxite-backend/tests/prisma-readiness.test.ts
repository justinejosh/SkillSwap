import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
const { clientMatchesSchema } = require(
  resolve(process.cwd(), "scripts/ensure-prisma-client.cjs"),
);
const ready = {
  schema: "model User {\n id String @id\n}",
  generatedSchema: "model User {\n id String @id\n}",
  installedVersion: "6.19.3",
  generatedVersion: "6.19.3",
  modelNames: { User: "User" },
  constructorType: "function",
};

test("a current Prisma client is reusable without replacing a Windows engine DLL", () => {
  assert.equal(clientMatchesSchema(ready), true);
  assert.equal(
    clientMatchesSchema({
      ...ready,
      generatedSchema: ready.schema.replace(/\n/g, "\r\n"),
    }),
    true,
  );
});
test("missing, placeholder, version-mismatched and stale clients require generation", () => {
  assert.equal(
    clientMatchesSchema({ ...ready, generatedSchema: undefined }),
    false,
  );
  assert.equal(clientMatchesSchema({ ...ready, modelNames: undefined }), false);
  assert.equal(
    clientMatchesSchema({ ...ready, generatedVersion: "6.19.2" }),
    false,
  );
  assert.equal(
    clientMatchesSchema({
      ...ready,
      generatedSchema: ready.schema + "\nmodel Program { id String @id }",
    }),
    false,
  );
  assert.equal(
    clientMatchesSchema({ ...ready, constructorType: "undefined" }),
    false,
  );
});
