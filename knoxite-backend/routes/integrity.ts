import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { HttpError, integer, onlyKeys, text } from "../lib/http";
import { transaction } from "../lib/transaction";
import { loadMetricOutcomes } from "../services/userMetrics";
import {
  exchangeIntegritySignals,
  INTEGRITY_REVIEW_REASON,
  INTEGRITY_SIGNAL_POLICY,
  parseIntegrityCase,
} from "../services/exchangeIntegrity";

// Mounted beneath adminRouter's server-verified requireAdmin middleware.
export function integrityRouter(db: PrismaClient) {
  const router = express.Router();
  router.get("/signals", async (_req, res) => {
    const signals = exchangeIntegritySignals(await loadMetricOutcomes(db));
    const users = await db.user.findMany({
      where: { id: { in: [...new Set(signals.flatMap((p) => p.userIds))] } },
      select: { id: true, name: true },
    });
    res.json({
      policy: INTEGRITY_SIGNAL_POLICY,
      signals,
      users,
      explanation:
        "Repeated exchanges and repeated mutual five-star reviews are review signals, not findings of misconduct. Timing values are observations; no unapproved speed threshold is applied. Signals do not suspend accounts, delete history, or change assessment tiers.",
    });
  });
  router.get("/reviews", async (_req, res) => {
    const cases = await db.userReport.findMany({
      where: { reason: INTEGRITY_REVIEW_REASON },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      cases.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,
        resolvedById: row.resolvedById,
        details: parseIntegrityCase(row.description),
      })),
    );
  });
  router.post("/reviews", async (req, res) => {
    onlyKeys(req.body, ["userIds", "notes"]);
    if (
      !Array.isArray(req.body.userIds) ||
      req.body.userIds.length !== 2 ||
      req.body.userIds.some(
        (id: unknown) => typeof id !== "string" || !id || id.length > 191,
      ) ||
      new Set(req.body.userIds).size !== 2
    )
      throw new HttpError(422, "Choose two distinct student accounts.");
    const userIds = [...req.body.userIds].sort() as string[];
    const notes = text(req.body.notes, "Review notes", 3000);
    const saved = await transaction(db, async (tx) => {
      for (const id of userIds)
        await tx.$queryRaw`SELECT id FROM User WHERE id = ${id} FOR UPDATE`;
      if (
        (await tx.user.count({
          where: { id: { in: userIds }, role: "USER" },
        })) !== 2
      )
        throw new HttpError(404, "Student pair not found.");
      const evidence = exchangeIntegritySignals(
        await loadMetricOutcomes(tx, userIds),
      ).find((s) => s.userIds[0] === userIds[0] && s.userIds[1] === userIds[1]);
      if (!evidence)
        throw new HttpError(
          409,
          "No current repeated-partner evidence for this pair.",
        );
      const pending = await tx.userReport.findMany({
        where: {
          targetId: userIds[0],
          reason: INTEGRITY_REVIEW_REASON,
          status: "PENDING",
        },
      });
      const existing = pending.find(
        (c) =>
          JSON.stringify(parseIntegrityCase(c.description)?.userIds) ===
          JSON.stringify(userIds),
      );
      if (existing) return { id: existing.id, status: existing.status };
      const details = {
        kind: INTEGRITY_SIGNAL_POLICY,
        revision: 1,
        userIds,
        evidence,
        events: [
          {
            at: new Date().toISOString(),
            administratorId: actor(req),
            action: "OPENED",
            notes,
          },
        ],
      };
      return tx.userReport.create({
        data: {
          reporterId: actor(req),
          targetId: userIds[0],
          reason: INTEGRITY_REVIEW_REASON,
          description: JSON.stringify(details),
        },
        select: { id: true, status: true },
      });
    });
    res.status(201).json(saved);
  });
  router.patch("/reviews/:id", async (req, res) => {
    onlyKeys(req.body, ["revision", "disposition", "notes"]);
    const revision = integer(req.body.revision, "Review revision", 1, 1000000);
    const disposition = req.body.disposition;
    if (!["FOLLOW_UP", "NO_ACTION", "REVIEWED"].includes(disposition))
      throw new HttpError(422, "Choose a neutral review disposition.");
    const notes = text(req.body.notes, "Disposition notes", 3000);
    const id = String(req.params.id);
    await transaction(db, async (tx) => {
      await tx.$queryRaw`SELECT id FROM UserReport WHERE id = ${id} FOR UPDATE`;
      const row = await tx.userReport.findFirst({
        where: { id, reason: INTEGRITY_REVIEW_REASON },
      });
      if (!row) throw new HttpError(404, "Integrity review not found.");
      const details = parseIntegrityCase(row.description);
      if (!details || details.revision !== revision || row.status !== "PENDING")
        throw new HttpError(
          409,
          "Review changed or is closed. Reload its history.",
        );
      const event = {
        at: new Date().toISOString(),
        administratorId: actor(req),
        action: disposition,
        notes,
      };
      const updated = {
        ...details,
        revision: revision + 1,
        events: [...details.events, event],
      };
      if (Buffer.byteLength(JSON.stringify(updated), "utf8") > 60000)
        throw new HttpError(
          409,
          "This review's history is full. Preserve it and open a follow-up review through the team.",
        );
      await tx.userReport.update({
        where: { id },
        data: {
          description: JSON.stringify(updated),
          status:
            disposition === "FOLLOW_UP"
              ? "PENDING"
              : disposition === "NO_ACTION"
                ? "DISMISSED"
                : "RESOLVED",
          resolution: `${disposition}: ${notes}`,
          resolvedById: disposition === "FOLLOW_UP" ? null : actor(req),
          resolvedAt: disposition === "FOLLOW_UP" ? null : new Date(),
        },
      });
    });
    res.json({
      message:
        "Review recorded. Exchange history, account access, assessment tiers, and scoring validation flags were not changed.",
    });
  });
  return router;
}
