import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import sharp from "sharp";
import { sanitizeEvidence } from "../services/evidenceImage";
import { reportEvidenceConfig } from "../services/reportEvidenceConfig";
import { s3EvidenceStorage } from "../services/privateEvidenceStorage";
import { moderationReason } from "../services/moderationAudit";
import { ReportEvidenceService } from "../services/reportEvidence";
import express from "express";
import { reportsRouter } from "../routes/reports";
import { errorHandler } from "../lib/http";

const settings = { REPORT_EVIDENCE_ENABLED: "true", REPORT_EVIDENCE_S3_ENDPOINT: "https://storage.example.invalid", REPORT_EVIDENCE_S3_BUCKET: "synthetic-evidence", REPORT_EVIDENCE_S3_REGION: "auto", REPORT_EVIDENCE_S3_ACCESS_KEY_ID: "synthetic-key", REPORT_EVIDENCE_S3_SECRET_ACCESS_KEY: "synthetic-secret-only", REPORT_EVIDENCE_PRIVACY_REVIEW_REFERENCE: "TEST-ONLY-NOT-APPROVAL", REPORT_EVIDENCE_RETENTION_DAYS: "7" };
test("evidence defaults off and activation refuses incomplete configuration or unsafe endpoints", () => {
  assert.equal(reportEvidenceConfig({}), undefined);
  for (const key of Object.keys(settings).filter(k => k !== "REPORT_EVIDENCE_ENABLED")) assert.throws(() => reportEvidenceConfig({ ...settings, [key]: "" }));
  for (const endpoint of ["http://remote.invalid", "https://u:p@storage.invalid", "https://storage.invalid/path", "file:///tmp/storage"]) assert.throws(() => reportEvidenceConfig({ ...settings, REPORT_EVIDENCE_S3_ENDPOINT: endpoint }));
  assert.throws(() => reportEvidenceConfig({ ...settings, NODE_ENV: "production", REPORT_EVIDENCE_S3_ENDPOINT: "http://127.0.0.1:1234" }));
  assert.ok(reportEvidenceConfig(settings));
});
for (const format of ["png", "jpeg", "webp"] as const) test(`${format} evidence fully decodes, re-encodes and strips metadata`, async () => {
  const image = await sharp({ create: { width: 20, height: 12, channels: 3, background: "blue" } }).withMetadata({ exif: { IFD0: { Artist: "SYNTHETIC PRIVATE METADATA" } } }).toFormat(format).toBuffer();
  const result = await sanitizeEvidence(image, `image/${format}`), meta = await sharp(result.bytes).metadata();
  assert.equal(meta.format, "webp"); assert.equal(meta.width, 20); assert.equal(meta.height, 12); assert.equal(meta.exif, undefined); assert.equal(meta.icc, undefined); assert.equal(result.mimeType, "image/webp");
  assert.equal(result.bytes.includes(Buffer.from("SYNTHETIC PRIVATE METADATA")), false);
});
test("invalid, spoofed, oversized and over-dimensioned evidence is rejected before storage", async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(() => sanitizeEvidence(png, "image/jpeg"));
  for (const bytes of [Buffer.alloc(0), Buffer.alloc(5*1024*1024+1), Buffer.from("<svg onload=alert(1)>"), png.subarray(0, 30)]) await assert.rejects(() => sanitizeEvidence(bytes, "image/png"));
  const wide = await sharp({ create: { width: 8001, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(() => sanitizeEvidence(wide, "image/png"));
  const pixels = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(() => sanitizeEvidence(pixels, "image/png"));
});
test("moderation reasons and Other explanation are bounded and explicitly validated", () => {
  for (const reason of ["HARASSMENT", "INAPPROPRIATE", "SPAM", "PRIVACY"]) assert.equal(moderationReason({ reason }).explanation, null);
  assert.equal(moderationReason({ reason: "OTHER", explanation: "  Synthetic explanation  " }).explanation, "Synthetic explanation");
  for (const body of [{}, { reason: "unknown" }, { reason: "OTHER" }, { reason: "OTHER", explanation: "x".repeat(251) }, { reason: "SPAM", explanation: "not permitted" }]) assert.throws(() => moderationReason(body));
});
test("S3 adapter uses signed private requests, bounded reads and retryable removal against an owned loopback service", async () => {
  const objects = new Map<string, Buffer>(); let requests = 0;
  const server = createServer(async (req, res) => {
    assert.match(req.headers.authorization || "", /^AWS4-HMAC-SHA256 /); assert.equal(req.headers["x-amz-acl"], undefined); requests++;
    const key = req.url!.split("?")[0];
    if (req.method === "PUT") { const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); objects.set(key, Buffer.concat(chunks)); res.writeHead(200); res.end(); }
    else if (req.method === "DELETE") { objects.delete(key); res.writeHead(204); res.end(); }
    else { const bytes = objects.get(key); if (!bytes) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "Content-Type": "image/webp", "Content-Length": bytes.length }); res.end(bytes); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const storage = s3EvidenceStorage(reportEvidenceConfig({ ...settings, REPORT_EVIDENCE_S3_ENDPOINT: `http://127.0.0.1:${(server.address() as any).port}`, REPORT_EVIDENCE_S3_FORCE_PATH_STYLE: "true" })!);
  const key = "report-evidence/00000000-0000-4000-8000-000000000000.webp", bytes = Buffer.from("synthetic-adapter-bytes");
  try { await storage.put(key, bytes); assert.deepEqual(await storage.get(key), bytes); await storage.remove(key); await storage.remove(key); await assert.rejects(() => storage.get(key)); await assert.rejects(() => storage.put("../arbitrary", bytes)); assert.equal(objects.size, 0); assert.ok(requests >= 5); }
  finally { server.close(); server.closeAllConnections(); await once(server, "close"); }
});
test("preview never serves bytes without a successful administrator access audit", async () => {
  const bytes = Buffer.from("synthetic"), hash = (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex");
  const db: any = { reportEvidence: { findUnique: async () => ({ id: "e", state: "ATTACHED", reportId: "r", objectKey: "opaque", byteLength: bytes.length, sha256: hash, createdAt: new Date() }) }, adminAudit: { create: async () => { throw new Error("Synthetic audit write failure"); } } };
  const service = new ReportEvidenceService(db, { put: async () => {}, remove: async () => {}, get: async () => bytes }, 7);
  await assert.rejects(() => service.preview("r", "admin"), /audit write failure/);
});
test("multipart report descriptions preserve the existing 4000-character Unicode allowance", async () => {
  let received = "";
  const db: any = { user: { findFirst: async () => ({ id: "peer" }) } };
  const evidence: any = { submit: async (data: any) => { received = data.description; return { id: "report", status: "PENDING" }; } };
  const app = express(); app.use(express.json({ limit: "750kb" })); app.use((req, _res, next) => { req.userId = "reporter"; req.userRole = "USER"; next(); }); app.use(reportsRouter(db, evidence)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const body = new FormData(); body.set("targetId", "peer"); body.set("reason", "OTHER"); body.set("description", "備".repeat(4000)); body.set("evidence", new Blob([new Uint8Array([1])], { type: "image/png" }), "synthetic.png");
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/`, { method: "POST", body });
    assert.equal(response.status, 201); assert.equal(received, "備".repeat(4000));
  } finally { server.close(); await once(server, "close"); }
});


test("malformed storage origins cannot disclose input values in startup errors", () => {
  assert.throws(() => reportEvidenceConfig({...settings,REPORT_EVIDENCE_S3_ENDPOINT:"SYNTHETIC_PRIVATE_INVALID_INPUT"}), (error: any) => !Object.hasOwn(error,"input") && !String(error).includes("SYNTHETIC_PRIVATE_INVALID_INPUT"));
});
