import express from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { ReportEvidenceService } from "../services/reportEvidence";
import { EVIDENCE_MAX_BYTES } from "../services/privateEvidenceStorage";
import { actor, requireStudent } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
export function reportsRouter(db: PrismaClient, evidence?: ReportEvidenceService) {
  let activeUploads = 0;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: EVIDENCE_MAX_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 16_000, fieldNameSize: 100 } }).single("evidence");
  const router = express.Router();
  router.get("/capabilities", requireStudent, (_req, res) => { res.json({ imageEvidenceEnabled: !!evidence, maxImageBytes: EVIDENCE_MAX_BYTES, acceptedImageTypes: ["image/jpeg", "image/png", "image/webp"] }); });
  router.get("/", async (req, res) => {
    res.json(
      await db.userReport.findMany({
        where: { reporterId: actor(req) },
        select: {
          id: true,
          reason: true,
          description: true,
          status: true,
          resolution: true,
          createdAt: true,
          target: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  router.post("/", requireStudent, async (req, res) => {
    const multipart = !!req.is("multipart/form-data");
    if (multipart && !evidence) throw new HttpError(503, "Image attachments are not available yet. Remove the image to submit a text-only report.");
    if (multipart && activeUploads >= 2) throw new HttpError(429, "Image uploads are busy. Keep your image selected and retry shortly.");
    if (multipart) activeUploads++;
    try {
      if (multipart) {
        req.setTimeout(30_000, () => req.destroy());
        await new Promise<void>((resolve, reject) => {
          const aborted = () => reject(new HttpError(400, "Image upload interrupted."));
          req.once("aborted", aborted);
          upload(req, res, err => { req.off("aborted", aborted); if (err) reject(new HttpError(err.code === "LIMIT_FILE_SIZE" ? 413 : 422, err.code === "LIMIT_FILE_SIZE" ? "Choose one image no larger than 5 MB." : "Send one JPG, PNG or WebP image and the report fields only.")); else resolve(); });
        });
      }
    onlyKeys(req.body, ["targetId", "reason", "description"]);
    const targetId = text(req.body.targetId, "Student ID");
    const reason = text(req.body.reason, "Reason", 50);
    if (
      !["NO_SHOW", "HARASSMENT", "MISREPRESENTATION", "OTHER"].includes(reason)
    )
      throw new HttpError(422, "Choose a supported report reason.");
    if (targetId === actor(req))
      throw new HttpError(422, "You cannot report yourself.");
    const target = await db.user.findFirst({
        where: { id: targetId, role: "USER" },
        select: { id: true },
      });
    if (!target)
      throw new HttpError(404, "Student not found.");
    // MySQL IDs can compare case-insensitively. Compare resolved identities,
    // not just the request spelling, before recording a peer report.
    if (target.id === actor(req))
      throw new HttpError(422, "You cannot report yourself.");
    const data = { reporterId: actor(req), targetId: target.id, reason, description: text(req.body.description, "Description", 4000) };
    const saved = req.file && evidence
      ? await evidence.submit(data, req.file)
      : await db.userReport.create({ data, select: { id: true, status: true } });
    res.status(201).json(saved);
    } finally { if (multipart) activeUploads--; }
  });
  return router;
}
