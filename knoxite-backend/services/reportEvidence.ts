import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { transaction } from "../lib/transaction";
import { HttpError } from "../lib/http";
import { EvidenceStorage } from "./privateEvidenceStorage";
import { sanitizeEvidence } from "./evidenceImage";

export class ReportEvidenceService {
  constructor(private db: PrismaClient, private storage: EvidenceStorage, private retentionDays: number) {
    if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error("Reviewed evidence retention is required.");
  }

  async submit(data: { reporterId: string; targetId: string; reason: string; description: string }, file: { buffer: Buffer; mimetype: string }) {
    const { bytes, ...metadata } = await sanitizeEvidence(file.buffer, file.mimetype);
    const id = randomUUID(), objectKey = `report-evidence/${id}.webp`;
    // Durable intent precedes external I/O, including uncertain upload outcomes.
    await this.db.reportEvidence.create({ data: { id, objectKey, ...metadata } });
    try {
      await this.storage.put(objectKey, bytes);
      return await transaction(this.db, async tx => {
        const report = await tx.userReport.create({ data, select: { id: true, status: true } });
        const attached = await tx.reportEvidence.updateMany({ where: { id, reportId: null, state: "PENDING" }, data: { reportId: report.id, state: "ATTACHED" } });
        if (attached.count !== 1) throw new Error("Evidence attachment changed.");
        return report;
      });
    } catch {
      // A lost commit acknowledgement must never delete an attached object.
      let current;
      try { current = await this.db.reportEvidence.findUnique({ where: { id } }); }
      catch { throw new HttpError(503, "The report result could not be confirmed. Check Your reports before retrying; your selected image has not been discarded."); }
      if (current?.state === "ATTACHED" && current.reportId) {
        const report = await this.db.userReport.findUnique({ where: { id: current.reportId }, select: { id: true, status: true } });
        if (report) return report;
      }
      // Keep the intent even after immediate removal succeeds: an uncertain PUT
      // can finish after its caller times out. A later sweep removes it again.
      try { await this.removePending(id, false); } catch { /* Durable PENDING intent remains retryable. */ }
      throw new HttpError(503, "The image could not be saved. No report was created. Keep the image selected and retry, or remove it to submit a text-only report.");
    }
  }

  private async removePending(id: string, final: boolean) {
    return transaction(this.db, async tx => {
      await tx.$queryRaw`SELECT id FROM ReportEvidence WHERE id = ${id} FOR UPDATE`;
      const row = await tx.reportEvidence.findUnique({ where: { id } });
      if (!row || row.reportId || !["PENDING", "CLEANUP_PENDING"].includes(row.state)) return false;
      if (final && row.createdAt.getTime() > Date.now() - 3600_000) return false;
      await this.storage.remove(row.objectKey);
      if (final) await tx.reportEvidence.delete({ where: { id } });
      else await tx.reportEvidence.update({ where: { id }, data: { state: "CLEANUP_PENDING" } });
      return true;
    });
  }

  async cleanupOrphans() {
    const rows = await this.db.reportEvidence.findMany({ where: { reportId: null, state: { in: ["PENDING", "CLEANUP_PENDING"] }, createdAt: { lte: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: "asc" }, take: 10, select: { id: true } });
    let removed = 0, failed = 0;
    for (const row of rows) { try { if (await this.removePending(row.id, true)) removed++; } catch { failed++; } }
    return { inspected: rows.length, removed, failed }; // No keys or content in the response.
  }

  async preview(reportId: string, administratorId: string) {
    const evidence = await this.db.reportEvidence.findUnique({ where: { reportId } });
    if (!evidence || evidence.state !== "ATTACHED") throw new HttpError(404, "No image evidence is attached to this report.");
    if (evidence.createdAt.getTime() <= Date.now() - this.retentionDays * 86400_000)
      throw new HttpError(410, "This image has reached the configured retention limit and awaits authorized removal.");
    let bytes: Buffer;
    try { bytes = await this.storage.get(evidence.objectKey); }
    catch { throw new HttpError(503, "Private evidence storage is unavailable. The report remains unchanged."); }
    if (bytes.length !== evidence.byteLength || createHash("sha256").update(bytes).digest("hex") !== evidence.sha256)
      throw new HttpError(503, "Evidence integrity check failed. The image was not served.");
    // Fail closed if access auditing is unavailable; no bytes sent before this.
    await this.db.adminAudit.create({ data: { administratorId, action: "VIEW_REPORT_EVIDENCE", reportId, evidenceId: evidence.id } });
    return bytes;
  }

  async purgeExpired(administratorId: string, confirm: boolean) {
    const cutoff = new Date(Date.now() - this.retentionDays * 86400_000);
    const where = { state: "ATTACHED", reportId: { not: null }, createdAt: { lte: cutoff } };
    const eligible = await this.db.reportEvidence.count({ where });
    if (!confirm) return { eligible, removed: 0, failed: 0, retentionDays: this.retentionDays };
    const rows = await this.db.reportEvidence.findMany({ where, orderBy: { createdAt: "asc" }, take: 10, select: { id: true } });
    let removed = 0, failed = 0;
    for (const { id } of rows) {
      try {
        const changed = await transaction(this.db, async tx => {
          await tx.$queryRaw`SELECT id FROM ReportEvidence WHERE id = ${id} FOR UPDATE`;
          const row = await tx.reportEvidence.findUnique({ where: { id } });
          if (!row?.reportId || row.state !== "ATTACHED" || row.createdAt > cutoff) return false;
          await tx.adminAudit.create({ data: { administratorId, action: "DELETE_EXPIRED_REPORT_EVIDENCE", reportId: row.reportId, evidenceId: id } });
          await this.storage.remove(row.objectKey);
          await tx.reportEvidence.delete({ where: { id } });
          return true;
        });
        if (changed) removed++;
      } catch { failed++; } // Retain the record and retry uncertain removals.
    }
    return { eligible, removed, failed, retentionDays: this.retentionDays };
  }
}
