import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { issueSession } from "../../services/authSessions";
import { assertRuntimeSchema } from "../../services/schemaReadiness";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";

test("moderation and private evidence on independently owned disposable MySQL", async t => {
  const db = new PrismaClient({ datasources: { db: { url: requireOwnedFixtureDatabase() } } });
  const config = loadConfig({ JWT_SECRET: "synthetic-evidence-jwt-key-".repeat(3), EMAIL_VERIFICATION_REQUIRED: "false", INSTITUTION_EMAIL_DOMAINS: "fixture.example", SESSION_TIMEOUTS_ENABLED: "true", REPORT_EVIDENCE_ENABLED: "true", REPORT_EVIDENCE_S3_ENDPOINT: "https://synthetic-storage.example.invalid", REPORT_EVIDENCE_S3_BUCKET: "synthetic-evidence", REPORT_EVIDENCE_S3_REGION: "auto", REPORT_EVIDENCE_S3_ACCESS_KEY_ID: "synthetic", REPORT_EVIDENCE_S3_SECRET_ACCESS_KEY: "synthetic", REPORT_EVIDENCE_PRIVACY_REVIEW_REFERENCE: "TEST-ONLY-NOT-HUMAN-APPROVAL", REPORT_EVIDENCE_RETENTION_DAYS: "7" });
  const objects = new Map<string, Buffer>(); let failPut = false, failRemove = false, changePending = false;
  const storage = {
    async put(key: string, bytes: Buffer) { objects.set(key, bytes); if (failPut) throw new Error("Synthetic ambiguous upload failure"); if (changePending) await db.reportEvidence.updateMany({ where: { objectKey: key }, data: { state: "CLEANUP_PENDING" } }); },
    async get(key: string) { const bytes = objects.get(key); if (!bytes) throw new Error("Synthetic missing object"); return bytes; },
    async remove(key: string) { if (failRemove) throw new Error("Synthetic removal failure"); objects.delete(key); },
  };
  await assertRuntimeSchema(db, config);
  const users = await Promise.all(["owner", "peer", "admin"].map((name, i) => db.user.create({ data: { name: `SYNTHETIC ${name}`, email: `synthetic${randomUUID().replaceAll("-", "")}lag@fixture.example`, role: i === 2 ? "ADMIN" : "USER", emailVerifiedAt: new Date() } })));
  const tokens = await Promise.all(users.map(user => db.$transaction(tx => issueSession(tx, config, user, "Synthetic regression session"))));
  const server = createApp(db, config, async () => {}, undefined, undefined, storage).listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  async function call(method: string, path: string, expected: number, as?: number, body?: any) {
    const multipart = body instanceof FormData;
    const response = await fetch(base + path, { method, headers: { ...(as === undefined ? {} : { Authorization: `Bearer ${tokens[as].token}` }), ...(!multipart && body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
    assert.equal(response.status, expected, `${method} ${path}: ${await response.clone().text()}`); return response;
  }
  const png = await sharp({ create: { width: 12, height: 8, channels: 3, background: "blue" } }).withMetadata({ exif: { IFD0: { Artist: "SYNTHETIC SECRET METADATA" } } }).png().toBuffer();
  function form(bytes = png, type = "image/png") { const body = new FormData(); body.set("targetId", users[1].id); body.set("reason", "OTHER"); body.set("description", "Synthetic private concern"); body.set("evidence", new Blob([new Uint8Array(bytes)], { type }), "synthetic.png"); return body; }
  try {
    await t.test("admin reason, actor and audit write are atomic; student removal remains reason-free", async () => {
      const post = await db.post.create({ data: { authorId: users[0].id, title: "SYNTHETIC THREAD", content: "Synthetic thread" } });
      const reply = await db.comment.create({ data: { postId: post.id, authorId: users[0].id, content: "MUST NOT BE RETAINED IN AUDIT" } });
      const path = `/forum/posts/${post.id}/comments/${reply.id}`;
      await call("DELETE", path, 401); await call("DELETE", path, 403, 1);
      for (const body of [{}, { reason: "OTHER" }, { reason: "SPAM", administratorId: users[1].id }, { reason: "OTHER", explanation: "x".repeat(251) }]) await call("DELETE", path, 422, 2, body);
      await call("DELETE", `/forum/posts/missing/comments/${reply.id}`, 404, 2, { reason: "SPAM" });
      const remove = () => fetch(base + path, { method: "DELETE", headers: { Authorization: `Bearer ${tokens[2].token}`, "Content-Type": "application/json" }, body: JSON.stringify({ reason: "SPAM" }) });
      const responses = await Promise.all([remove(), remove()]); assert.deepEqual(responses.map(r=>r.status).sort(),[200,404]);
      const audit = await db.adminAudit.findUniqueOrThrow({ where: { commentId: reply.id } });
      assert.equal(audit.administratorId, users[2].id); assert.equal(audit.commentAuthorId, users[0].id); assert.equal(audit.threadId, post.id); assert.equal(audit.reason, "SPAM"); assert.equal(JSON.stringify(audit).includes("MUST NOT BE RETAINED"), false);
      assert.ok(await db.post.findUnique({ where: { id: post.id } }));
      const own = await db.comment.create({ data: { postId: post.id, authorId: users[0].id, content: "Student removal" } }); await call("DELETE", `/forum/posts/${post.id}/comments/${own.id}`, 200, 0); assert.equal(await db.adminAudit.count({ where: { commentId: own.id } }), 0);
      const held = await db.comment.create({ data: { postId: post.id, authorId: users[0].id, content: "Synthetic blocked audit" } });
      await db.adminAudit.create({ data: { administratorId: users[2].id, threadId: post.id, commentId: held.id, commentAuthorId: users[0].id, action: "DELETE_REPLY", reason: "OTHER", explanation: "Synthetic duplicate to force audit-write rejection" } });
      await call("DELETE", `/forum/posts/${post.id}/comments/${held.id}`, 409, 2, { reason: "PRIVACY" }); assert.ok(await db.comment.findUnique({ where: { id: held.id } }));
      await call("GET", "/admin/moderation-audit", 401); await call("GET", "/admin/moderation-audit", 403, 0); const records = await (await call("GET", `/admin/moderation-audit?threadId=${post.id}`, 200, 2)).json() as any; assert.equal(records.total, 2);
      await db.post.delete({ where: { id: post.id } }); assert.equal(await db.adminAudit.count({ where: { threadId: post.id } }), 2);
    });
    await t.test("a deletion failure rolls back its successful audit insert in real MySQL", async () => {
      const infrastructure=require("../../../development/fourBlockersEnvironment.cjs");const owned=infrastructure.open(process.env.KNOXITE_CI_FIXTURE_MANIFEST);infrastructure.verify(owned);
      const owner=new PrismaClient({datasources:{db:{url:owned.url}}});
      const post=await db.post.create({data:{authorId:users[0].id,title:"SYNTHETIC HELD THREAD",content:"Synthetic preservation fixture"}});
      const reply=await db.comment.create({data:{postId:post.id,authorId:users[0].id,content:"Synthetic held reply"}});
      try {
        await owner.$executeRawUnsafe("CREATE TABLE SyntheticReplyHold (id VARCHAR(191) PRIMARY KEY, commentId VARCHAR(191) NOT NULL, CONSTRAINT SyntheticReplyHold_fk FOREIGN KEY (commentId) REFERENCES Comment(id) ON DELETE RESTRICT) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        await owner.$executeRaw`INSERT INTO SyntheticReplyHold(id,commentId) VALUES('hold',${reply.id})`;
        await call("DELETE", `/forum/posts/${post.id}/comments/${reply.id}`, 500, 2, {reason:"SPAM"});
        assert.ok(await db.comment.findUnique({where:{id:reply.id}}));assert.equal(await db.adminAudit.count({where:{commentId:reply.id}}),0);assert.ok(await db.post.findUnique({where:{id:post.id}}));
      } finally {await owner.$executeRawUnsafe("DROP TABLE SyntheticReplyHold");await owner.$disconnect();}
    });
    let reportId = "";
    await t.test("one optional sanitized image commits with its report; only audited admins can retrieve it", async () => {
      await call("GET", "/reports/capabilities", 401); await call("POST", "/reports", 401, undefined, form()); await call("POST", "/reports", 403, 2, form());
      assert.equal((await (await call("GET", "/reports/capabilities", 200, 0)).json() as any).imageEvidenceEnabled, true);
      const result = await (await call("POST", "/reports", 201, 0, form())).json() as any; reportId = result.id;
      const metadata = await db.reportEvidence.findUniqueOrThrow({ where: { reportId } }); assert.equal(metadata.state, "ATTACHED"); assert.match(metadata.objectKey, /^report-evidence\/[a-f0-9-]{36}\.webp$/);
      const rows = await (await call("GET", "/admin/reports", 200, 2)).json() as any[]; assert.equal(rows.find(r => r.id === reportId).hasEvidence, true); assert.equal(JSON.stringify(rows).includes(metadata.objectKey), false);
      const mine = await (await call("GET", "/reports", 200, 0)).json(); assert.equal(JSON.stringify(mine).includes(metadata.objectKey), false); assert.equal(JSON.stringify(mine).includes("sha256"), false);
      await call("GET", `/admin/reports/${reportId}/evidence`, 401); await call("GET", `/admin/reports/${reportId}/evidence`, 403, 0); await call("GET", `/admin/reports/${reportId}/evidence`, 403, 1);
      const response = await call("GET", `/admin/reports/${reportId}/evidence`, 200, 2); const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(response.headers.get("content-type"), "image/webp"); assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      const image = await sharp(bytes).metadata(); assert.equal(image.exif, undefined); assert.equal(image.format, "webp"); assert.equal(image.width, 12); assert.equal(image.height, 8);
      assert.equal(await db.adminAudit.count({ where: { action: "VIEW_REPORT_EVIDENCE", reportId, administratorId: users[2].id } }), 1);
      await call("GET", `/admin/reports/${randomUUID()}/evidence`, 404, 2);
      const original = objects.get(metadata.objectKey)!; objects.set(metadata.objectKey, Buffer.from("corrupt")); await call("GET", `/admin/reports/${reportId}/evidence`, 503, 2); objects.set(metadata.objectKey, original);
      assert.equal(await db.adminAudit.count({ where: { action: "VIEW_REPORT_EVIDENCE", reportId } }), 1);
      await call("POST", "/reports", 201, 0, { targetId: users[1].id, reason: "OTHER", description: "Text only stays supported" });
    });
    await t.test("invalid and forged uploads cannot create reports, objects or evidence references", async () => {
      const before = [await db.userReport.count(), await db.reportEvidence.count(), objects.size];
      for (const [bytes, type] of [[Buffer.from("<svg>unsafe</svg>"), "image/png"], [png.subarray(0, 25), "image/png"], [png, "image/jpeg"]] as const) await call("POST", "/reports", 422, 0, form(bytes, type));
      await call("POST", "/reports", 413, 0, form(Buffer.alloc(5*1024*1024+1)));
      const multiple = form(); multiple.append("evidence", new Blob([new Uint8Array(png)], { type: "image/png" }), "second.png"); await call("POST", "/reports", 422, 0, multiple);
      const forged = form(); forged.set("objectKey", "another-report.webp"); await call("POST", "/reports", 422, 0, forged);
      const self = form(); self.set("targetId", users[0].id); await call("POST", "/reports", 422, 0, self);
      assert.deepEqual([await db.userReport.count(), await db.reportEvidence.count(), objects.size], before);
    });
    await t.test("ambiguous storage failure, failed cleanup and attachment failure never silently create text-only reports", async () => {
      const reports = await db.userReport.count(); failPut = failRemove = true;
      await call("POST", "/reports", 503, 0, form()); assert.equal(await db.userReport.count(), reports); assert.ok(await db.reportEvidence.count({ where: { reportId: null } }));
      failPut = failRemove = false; changePending = true; await call("POST", "/reports", 503, 0, form()); changePending = false; assert.equal(await db.userReport.count(), reports);
      await db.reportEvidence.updateMany({ where: { reportId: null }, data: { createdAt: new Date(Date.now()-7200_000) } });
      await call("POST", "/admin/report-evidence/cleanup", 403, 0, {}); const cleanup = await (await call("POST", "/admin/report-evidence/cleanup", 200, 2, {})).json() as any;
      assert.equal(cleanup.failed, 0); assert.equal(cleanup.removed, 2); assert.equal(await db.reportEvidence.count({ where: { reportId: null } }), 0); assert.ok(await db.reportEvidence.findUnique({ where: { reportId } }));
      assert.equal(objects.size, 1);
    });
    await t.test("configured retention is dry-run by default and purges only expired evidence with audit and report preservation", async () => {
      const reports = await db.userReport.count();
      await db.reportEvidence.update({where:{reportId},data:{createdAt:new Date(Date.now()-8*86400_000)}});
      await call("GET", `/admin/reports/${reportId}/evidence`, 410, 2);
      await call("POST", "/admin/report-evidence/retention", 403, 0, {confirm:true});
      const dry = await(await call("POST", "/admin/report-evidence/retention", 200, 2, {})).json() as any;assert.equal(dry.eligible,1);assert.equal(dry.removed,0);assert.equal(objects.size,1);
      await call("POST", "/admin/report-evidence/retention", 422, 2, {confirm:"true"});
      const result=await(await call("POST", "/admin/report-evidence/retention", 200, 2, {confirm:true})).json() as any;assert.equal(result.removed,1);assert.equal(result.failed,0);assert.equal(objects.size,0);assert.equal(await db.userReport.count(),reports);assert.ok(await db.userReport.findUnique({where:{id:reportId}}));assert.equal(await db.adminAudit.count({where:{action:"DELETE_EXPIRED_REPORT_EVIDENCE",reportId}}),1);
    });
    await t.test("default-off server rejects attachments and preserves ordinary JSON reporting", async () => {
      const disabledConfig = { ...config, reportEvidence: undefined };
      const disabled = createApp(db, disabledConfig, async () => {}, undefined, undefined, storage).listen(0, "127.0.0.1"); await once(disabled, "listening");
      const url = `http://127.0.0.1:${(disabled.address() as any).port}/api/reports`;
      try { const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${tokens[0].token}` }, body: form() }); assert.equal(response.status, 503); const caps = await fetch(url + "/capabilities", { headers: { Authorization: `Bearer ${tokens[0].token}` } }); assert.equal((await caps.json() as any).imageEvidenceEnabled, false); }
      finally { disabled.close(); await once(disabled, "close"); }
    });
  } finally { server.close(); await once(server, "close"); await db.$disconnect(); }
});
