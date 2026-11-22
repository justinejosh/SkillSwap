import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ReportEvidenceConfig } from "./reportEvidenceConfig";

export interface EvidenceStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export const EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export function s3EvidenceStorage(config: ReportEvidenceConfig): EvidenceStorage {
  const client = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }, maxAttempts: 2,
    // R2-compatible checksums; never disable TLS or send a public-read ACL.
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  const options = () => ({ abortSignal: AbortSignal.timeout(10_000) });
  const checkKey = (key: string) => { if (!/^report-evidence\/[a-f0-9-]{36}\.webp$/.test(key)) throw new Error("Invalid private object reference."); };
  return {
    async put(key, bytes) {
      checkKey(key); if (bytes.length > EVIDENCE_MAX_BYTES) throw new Error("Oversized evidence object.");
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: bytes, ContentType: "image/webp", CacheControl: "private, no-store" }), options());
    },
    async get(key) {
      checkKey(key);
      const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }), options());
      if (!result.Body || !result.ContentLength || result.ContentLength > EVIDENCE_MAX_BYTES || result.ContentType !== "image/webp") { result.Body && "destroy" in result.Body && result.Body.destroy(); throw new Error("Invalid private evidence object."); }
      const chunks: Buffer[] = []; let size = 0;
      // Bound the actual stream too, independently of the provider's header.
      try { for await (const chunk of result.Body as AsyncIterable<Uint8Array>) { size += chunk.length; if (size > EVIDENCE_MAX_BYTES) throw new Error("Oversized evidence response."); chunks.push(Buffer.from(chunk)); } }
      finally { if ("destroy" in result.Body) result.Body.destroy(); }
      if (size !== result.ContentLength) throw new Error("Incomplete evidence response.");
      return Buffer.concat(chunks);
    },
    async remove(key) { checkKey(key); await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), options()); },
  };
}
