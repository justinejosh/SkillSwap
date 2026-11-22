import express from "express";
import { confirmationEligibility } from "../services/sessionConfirmationEligibility";
import { PrismaClient } from "@prisma/client";
import { actor, requireStudent } from "../middleware/authMiddleware";
import { HttpError, integer, onlyKeys, text } from "../lib/http";
import { assertParticipant } from "./swaps";
import { lockSwap, transaction } from "../lib/transaction";
import { assertScheduleTime, parseScheduledAt, scheduledSessionEnd } from "../lib/scheduling";
export function sessionsRouter(db: PrismaClient) {
  const router = express.Router();
  router.use(requireStudent);
  router.get("/", async (req, res) => {
    const rows = await db.swapSession.findMany({
      where: {
        swap: { OR: [{ requesterId: actor(req) }, { receiverId: actor(req) }] },
      },
      include: {
        swap: {
          select: {
            id: true,
            status: true,
            requesterId: true,
            receiverId: true,
            integrityVerified: true, agreementVersion: true, duration: true, sessions: true,
            requesterSessions: true, receiverSessions: true, requesterApprovedAt: true, receiverApprovedAt: true,
            requester: { select: { id: true, name: true } },
            receiver: { select: { id: true, name: true } },
            sessionLogs: {
              select: { sessionNumber: true, participantId: true },
            },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });
    res.json(
      rows.map((row) => ({
        id: row.id,
        swapId: row.swapId,
        sessionNumber: row.sessionNumber,
        scheduledAt: row.scheduledAt,
        endsAt: row.endsAt,
        meetingLink: row.meetingLink,
        confirmationEligibility: confirmationEligibility(row.swap, actor(req), row.sessionNumber, row),
        partner:
          row.swap.requesterId === actor(req)
            ? row.swap.receiver
            : row.swap.requester,
        exchangeStatus: row.swap.status,
        confirmedByMe: row.swap.sessionLogs.some(
          (l) =>
            l.sessionNumber === row.sessionNumber &&
            l.participantId === actor(req),
        ),
        confirmedByPartner: row.swap.sessionLogs.some(
          (l) =>
            l.sessionNumber === row.sessionNumber &&
            l.participantId !== actor(req),
        ),
      })),
    );
  });
  router.post("/", async (req, res) => {
    onlyKeys(req.body, [
      "swapId",
      "sessionNumber",
      "scheduledAt",
      "endsAt",
      "meetingLink",
    ]);
    const swapId = text(req.body.swapId, "Swap");
    const sessionNumber = integer(
      req.body.sessionNumber,
      "Session number",
      1,
      30,
    );
    const scheduledAt = parseScheduledAt(
      text(req.body.scheduledAt, "Scheduled date", 50),
    );
    const endsAt = req.body.endsAt == null ? null : parseScheduledAt(text(req.body.endsAt, "Session end", 50));
    const meetingLink = text(
      req.body.meetingLink ?? "",
      "Meeting link",
      2000,
      true,
    );
    if (meetingLink) {
      let url: URL;
      try {
        url = new URL(meetingLink);
      } catch {
        throw new HttpError(422, "Invalid meeting URL.");
      }
      if (url.protocol !== "https:" || url.username || url.password)
        throw new HttpError(422, "Meeting links must use HTTPS.");
    }
    const result = await transaction(db, async (tx) => {
      await lockSwap(tx, swapId);
      const swap = await tx.swap.findUnique({ where: { id: swapId } });
      if (!swap) throw new HttpError(404, "Swap not found.");
      assertParticipant(swap, actor(req));
      if (
        swap.status !== "CONFIRMED" ||
        !swap.integrityVerified ||
        sessionNumber > swap.sessions
      )
        throw new HttpError(
          409,
          "Schedule a session within a confirmed exchange.",
        );
      if (
        await tx.sessionConfirmation.count({ where: { swapId, sessionNumber } })
      )
        throw new HttpError(
          409,
          "A session already acknowledged by a participant cannot be rescheduled.",
        );
      // Recheck time after acquiring the exchange lock, not at form-open time.
      assertScheduleTime(scheduledAt, swap.requesterApprovedAt, swap.receiverApprovedAt);
      const existing = await tx.swapSession.findUnique({ where: { swapId_sessionNumber: { swapId, sessionNumber } } });
      if (!endsAt && (swap.duration == null || existing?.endsAt))
        throw new HttpError(422, "Choose an end time for this session.");
      if (endsAt && endsAt.getTime() <= scheduledAt.getTime())
        throw new HttpError(422, "The scheduled end must be after the session start.");
      scheduledSessionEnd(scheduledAt, swap.duration, endsAt);
      return tx.swapSession.upsert({
        where: { swapId_sessionNumber: { swapId, sessionNumber } },
        create: {
          swapId,
          sessionNumber,
          scheduledAt,
          endsAt,
          meetingLink: meetingLink || null,
        },
        update: { scheduledAt, endsAt, meetingLink: meetingLink || null },
      });
    });
    res.status(201).json(result);
  });
  return router;
}
