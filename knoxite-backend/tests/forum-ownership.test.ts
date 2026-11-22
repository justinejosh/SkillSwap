import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { forumRouter } from "../routes/forum";
import { errorHandler } from "../lib/http";

test("forum deletion authorizes the authenticated owner or ADMIN and preserves other posts", async () => {
  const posts = new Map([["owned", { id: "owned", authorId: "owner" }], ["other", { id: "other", authorId: "peer" }]]);
  let deletes = 0;
  const db: any = { post: { findUnique: async ({ where }: any) => posts.get(where.id) || null, delete: async ({ where }: any) => { deletes++; posts.delete(where.id); } } };
  const app = express(); app.use(express.json());
  // Synthetic identity fixture; the production app still verifies JWT/session/role.
  app.use((req, _res, next) => { const token = req.header("Authorization"); if (token === "Bearer owner") { req.userId = "owner"; req.userRole = "USER"; } else if (token === "Bearer admin") { req.userId = "moderator"; req.userRole = "ADMIN"; } next(); });
  app.use("/forum", forumRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as any).port}/forum/posts/`;
  const remove = (id: string, token?: string, body?: unknown) => fetch(url + id, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal((await remove("owned")).status, 401);
    assert.equal((await remove("other", "owner")).status, 403);
    assert.equal((await remove("other", "owner", { authorId: "peer", role: "ADMIN" })).status, 422);
    assert.equal(deletes, 0);
    assert.equal((await remove("owned", "owner")).status, 200);
    assert.equal(posts.has("other"), true);
    assert.equal((await remove("owned", "owner")).status, 404);
    assert.equal((await remove("other", "admin")).status, 200);
    assert.equal(deletes, 2);
  } finally { server.close(); await once(server, "close"); }
});
