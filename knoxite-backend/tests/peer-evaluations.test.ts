import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { adminRouter } from "../routes/admin";
import { errorHandler } from "../lib/http";
import { overviewReviewWhere } from "../services/reviewReporting";

test("peer evaluation endpoint is ADMIN-only, bounded, filtered and read-only", async () => {
  const calls: any[] = []; let role: "USER" | "ADMIN" | undefined;
  const db: any = { review: {
    count: async (args: any) => { calls.push({ method: "count", ...args }); return 0; },
    findMany: async (args: any) => { calls.push({ method: "findMany", ...args }); return []; },
  } };
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { if (role) { req.userId = "synthetic-viewer"; req.userRole = role; } next(); }); app.use(adminRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); const url = `http://127.0.0.1:${(server.address() as any).port}/peer-evaluations`;
  try {
    assert.equal((await fetch(url)).status, 401); role = "USER"; assert.equal((await fetch(url)).status, 403); assert.equal(calls.length, 0);
    role = "ADMIN"; const response = await fetch(url); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { page: 1, pageSize: 20, total: 0, validation: "COUNTED", reviews: [] });
    assert.deepEqual(calls[0].where, overviewReviewWhere); assert.deepEqual(calls[1].where, overviewReviewWhere); assert.equal(calls[1].take, 20); assert.equal(calls[1].skip, 0);
    assert.deepEqual(calls[1].select.reviewer, { select: { name: true } }); assert.deepEqual(calls[1].select.reviewee, { select: { name: true } });
    calls.length = 0; assert.equal((await fetch(url + "?page=3&pageSize=10&rating=4&validation=UNVALIDATED&sort=oldest&search=Student")).status, 200);
    assert.deepEqual(calls[0].where, { isValidated: false, rating: 4, OR: [{ reviewer: { name: { contains: "Student" } } }, { reviewee: { name: { contains: "Student" } } }] });
    assert.equal(calls[1].take, 10); assert.equal(calls[1].skip, 20); assert.deepEqual(calls[1].orderBy, [{ createdAt: "asc" }, { id: "asc" }]);
    calls.length = 0;
    for (const query of ["page=0", "page=-1", "page=1.2", "pageSize=51", "pageSize=0", "rating=0", "rating=6", "rating=3.5", "validation=bogus", "sort=bogus", "search=" + "x".repeat(101)]) assert.equal((await fetch(url + "?" + query)).status, 422, query);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal((await fetch(url, { method })).status, 404);
    assert.equal(calls.length, 0);
  } finally { server.close(); await once(server, "close"); }
});
