export interface ReportEvidenceConfig {
  endpoint: string; bucket: string; region: string; accessKeyId: string; secretAccessKey: string;
  forcePathStyle: boolean; reviewReference: string; retentionDays: number;
}
export function reportEvidenceConfig(env: NodeJS.ProcessEnv): ReportEvidenceConfig | undefined {
  if (env.REPORT_EVIDENCE_ENABLED !== undefined && !["true", "false"].includes(env.REPORT_EVIDENCE_ENABLED))
    throw new Error("REPORT_EVIDENCE_ENABLED must be true or false.");
  if (env.REPORT_EVIDENCE_ENABLED !== "true") return undefined;
  const required = (name: string) => {
    const value = env[name]?.trim();
    if (!value || value.length > 2048 || /replace.with|placeholder|^pending$|^draft$/i.test(value)) throw new Error(`Complete reviewed evidence configuration required: ${name}.`);
    return value;
  };
  const rawEndpoint = required("REPORT_EVIDENCE_S3_ENDPOINT");
  let endpoint: URL;
  try { endpoint = new URL(rawEndpoint); } catch { throw new Error("Evidence storage endpoint must be a valid origin."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
  if ((endpoint.protocol !== "https:" && !(env.NODE_ENV !== "production" && local && endpoint.protocol === "http:")) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== "/")
    throw new Error("Evidence storage requires an HTTPS endpoint origin (loopback HTTP allowed only for local tests).");
  const bucket = required("REPORT_EVIDENCE_S3_BUCKET");
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket)) throw new Error("Invalid private evidence bucket name.");
  const retentionDays = Number(required("REPORT_EVIDENCE_RETENTION_DAYS"));
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new Error("Set the reviewed evidence retention in whole days (1–3650).");
  return { endpoint: endpoint.origin, bucket, region: required("REPORT_EVIDENCE_S3_REGION"), accessKeyId: required("REPORT_EVIDENCE_S3_ACCESS_KEY_ID"), secretAccessKey: required("REPORT_EVIDENCE_S3_SECRET_ACCESS_KEY"), forcePathStyle: env.REPORT_EVIDENCE_S3_FORCE_PATH_STYLE === "true", reviewReference: required("REPORT_EVIDENCE_PRIVACY_REVIEW_REFERENCE"), retentionDays };
}
