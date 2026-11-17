import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { adminRouter } from "../routes/admin";
import { errorHandler } from "../lib/http";
import { departmentNameKey, existingDraftDepartment } from "../services/departmentNames";
import { importDepartmentDraft, reviewedDepartmentDraft } from "../services/departmentDraft";

test("college names normalize case and whitespace without merging different names", () => {
  assert.equal(departmentNameKey("  College  of ARTS and Sciences  "), departmentNameKey("College of Arts and Sciences"));
  assert.notEqual(departmentNameKey("College of Arts"), departmentNameKey("College of Arts and Sciences"));
});
test("draft reuses a uniquely named active college with a different existing code", () => {
  const legacy = { code: "CCS", name: "College of Computer Studies", isActive: true };
  assert.equal(existingDraftDepartment([legacy], "COLLEGE_COMPUTER_STUDIES", legacy.name), legacy);
  const archived = { ...legacy, code: "COLLEGE_COMPUTER_STUDIES", isActive: false };
  assert.equal(existingDraftDepartment([archived, legacy], archived.code, legacy.name), legacy);
});
test("ambiguous, inactive-only and conflicting colleges require review", () => {
  const row = { code: "CCS", name: "College of Computer Studies", isActive: true };
  for (const rows of [[row, { ...row, code: "OTHER" }], [{ ...row, isActive: false }], [{ ...row, name: "Different college" }]])
    assert.throws(() => existingDraftDepartment(rows, "CCS", row.name), (e: any) => e.status === 409);
  assert.equal(existingDraftDepartment([], "CCS", row.name), undefined);
});
test("repeated provisional imports preserve department IDs, mappings and validation evidence", async () => {
  const draft = reviewedDepartmentDraft();
  const departments = draft.departments.map((d) => ({ id: d.code, code: d.code, name: d.name, isActive: true }));
  const computer = departments.find((d) => d.code === "COLLEGE_COMPUTER_STUDIES")!;
  computer.code = "CCS";
  const programs = draft.departments.flatMap((d) => d.programCodes.map((code) => ({ code, departmentId: null as string | null, mappingValidatedAt: null as Date | null, mappingVersion: 0 })));
  const confirmed = programs.find((p) => p.code === "BSN")!;
  confirmed.departmentId = "previously-confirmed-id"; confirmed.mappingValidatedAt = new Date();
  const original = { ...confirmed };
  let created = 0;
  const tx = {
    department: { findMany: async () => departments, create: async () => { created++; throw new Error("No duplicates should be created"); } },
    program: {
      findMany: async () => programs,
      updateMany: async ({ where, data }: any) => {
        const matching = programs.filter((p) => where.code.in.includes(p.code) && p.departmentId === null && p.mappingValidatedAt === null);
        matching.forEach((p) => Object.assign(p, { ...data, mappingVersion: p.mappingVersion + 1 }));
        return { count: matching.length };
      },
    },
  };
  const db = { $transaction: async (fn: any) => fn(tx) } as any;
  assert.equal((await importDepartmentDraft(db)).imported, 12);
  assert.equal((await importDepartmentDraft(db)).imported, 0);
  assert.equal(created, 0);
  assert.equal(programs.find((p) => p.code === "BSCS")!.departmentId, computer.id);
  assert.deepEqual(confirmed, original);
});

test("administrator creation rejects same college under different codes, case or spacing", async () => {
  const rows = [
    { code: "CAS", name: "College of Arts and Sciences", isActive: true },
    { code: "OLD", name: "Archived College", isActive: false },
  ];
  let role: "USER" | "ADMIN" = "USER";
  const tx = { department: { findMany: async () => rows, create: async ({ data }: any) => { rows.push({ ...data, isActive: true }); return data; } } };
  const db = { $transaction: async (fn: any, options: any) => { assert.equal(options.isolationLevel, "Serializable"); return fn(tx); } } as any;
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.userId = "synthetic-admin"; req.userRole = role; next(); });
  app.use(adminRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/academic-options`;
  async function submit(name: string, status: number) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "department", code: "NEW", name }) });
    assert.equal(response.status, status); await response.json();
  }
  try {
    await submit("New College", 403); role = "ADMIN";
    await submit("College of Arts and Sciences", 409);
    await submit("  COLLEGE  OF arts AND sciences ", 409);
    await submit("archived college", 409);
    assert.equal(rows.length, 2);
    await submit("Distinct College", 201); assert.equal(rows.length, 3);
  } finally { server.close(); await once(server, "close"); }
});
