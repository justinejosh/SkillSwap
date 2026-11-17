import express from "express";
import { confirmationEligibility } from "../services/sessionConfirmationEligibility";
import { Prisma, PrismaClient } from "@prisma/client";
import { actor, requireStudent } from "../middleware/authMiddleware";
import { HttpError, integer, onlyKeys, text } from "../lib/http";
import { lockSwap, transaction } from "../lib/transaction";
import { AppConfig, studentEmailAllowed } from "../lib/config";
const peerSelect = {
  id: true,
  name: true,
  avatarUrl: true,
  bio: true,
} as const;
const swapInclude = {
  requester: { select: peerSelect },
  receiver: { select: peerSelect },
  offeredSkill: true,
  wantedSkill: true,
} as const;
export function assertParticipant(
  swap: { requesterId: string; receiverId: string },
  id: string,
) {
  if (swap.requesterId !== id && swap.receiverId !== id)
    throw new HttpError(403, "You are not a participant in this exchange.");
}
export function swapRouters(db: PrismaClient, config: AppConfig) {
  const swaps = express.Router();
  const requests = express.Router();
  const reputation = express.Router();
  for (const router of [swaps, requests, reputation])
    router.use(requireStudent);
  swaps.post("/request", async (req, res) => {
    onlyKeys(req.body, [
      "receiverId",
      "offeredSkillId",
      "wantedSkillId",
      "message",
    ]);
    const requesterId = actor(req);
    const receiverId = text(req.body.receiverId, "Receiver");
    const offeredSkillId = text(req.body.offeredSkillId, "Offered skill");
    const wantedSkillId = text(req.body.wantedSkillId, "Wanted skill");
    const message = text(req.body.message ?? "", "Message", 1000, true);
    if (requesterId === receiverId)
      throw new HttpError(422, "You cannot swap with yourself.");
    const result = await transaction(db, async (tx) => {
      for (const id of [requesterId, receiverId].sort())
        await tx.$queryRaw`SELECT id FROM User WHERE id = ${id} FOR UPDATE`;
      const receiver = await tx.user.findFirst({
        where: { id: receiverId, role: "USER", isSuspended: false },
        select: { id: true, email: true, emailVerifiedAt: true },
      });
      if (
        !receiver ||
        !studentEmailAllowed(receiver.email, config) ||
        (config.verificationRequired && !receiver.emailVerifiedAt)
      )
        throw new HttpError(404, "Eligible student not found.");
      const offerings = await tx.userOfferedSkill.count({
        where: {
          isActive: true,
          OR: [
            { userId: requesterId, skillId: offeredSkillId },
            { userId: receiverId, skillId: wantedSkillId },
          ],
        },
      });
      const wants = await tx.user.count({
        where: {
          OR: [
            { id: requesterId, wantedSkills: { some: { id: wantedSkillId } } },
            { id: receiverId, wantedSkills: { some: { id: offeredSkillId } } },
          ],
        },
      });
      if (offerings !== 2 || wants !== 2)
        throw new HttpError(
          422,
          "Both selected skills must form an active reciprocal match.",
        );
      const pair = [
        { requesterId, receiverId },
        { requesterId: receiverId, receiverId: requesterId },
      ];
      const pending = await tx.swapRequest.findFirst({
        where: { OR: pair, status: "PENDING" },
      });
      const active = await tx.swap.findFirst({
        where: { OR: pair, status: { in: ["PENDING_AGREEMENT", "CONFIRMED"] } },
      });
      if (pending || active)
        throw new HttpError(
          409,
          "An exchange with this student is already pending or active.",
        );
      return tx.swapRequest.create({
        data: {
          requesterId,
          receiverId,
          offeredSkillId,
          wantedSkillId,
          message,
          status: "PENDING",
        },
      });
    });
    res.status(201).json(result);
  });
  requests.get("/", async (req, res) => {
    res.json(
      await db.swapRequest.findMany({
        where: {
          OR: [{ requesterId: actor(req) }, { receiverId: actor(req) }],
        },
        include: { ...swapInclude, linkedSwap: { select: { id: true, status: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  requests.patch("/:id/status", async (req, res) => {
    onlyKeys(req.body, ["newStatus"]);
    const status = req.body.newStatus;
    if (status !== "ACCEPTED" && status !== "REJECTED")
      throw new HttpError(422, "Only accept or reject is allowed here.");
    const result = await transaction(db, async (tx) => {
      const id = String(req.params.id);
      await tx.$queryRaw`SELECT id FROM SwapRequest WHERE id = ${id} FOR UPDATE`;
      const request = await tx.swapRequest.findUnique({
        where: { id },
        include: { linkedSwap: true },
      });
      if (!request) throw new HttpError(404, "Request not found.");
      if (request.receiverId !== actor(req))
        throw new HttpError(
          403,
          "Only the receiving student can accept or reject.",
        );
      if (
        request.status === status &&
        (status === "REJECTED" || request.linkedSwap)
      )
        return { ...request, redirectId: request.linkedSwap?.id };
      if (request.status !== "PENDING")
        throw new HttpError(409, "This request is no longer pending.");
      if (status === "ACCEPTED") {
        const requester = await tx.user.findFirst({
          where: { id: request.requesterId, isSuspended: false, role: "USER" },
          select: { email: true, emailVerifiedAt: true },
        });
        if (
          !requester ||
          !studentEmailAllowed(requester.email, config) ||
          (config.verificationRequired && !requester.emailVerifiedAt)
        )
          throw new HttpError(
            409,
            "The requester is no longer eligible for a new exchange.",
          );
        const offerings = await tx.userOfferedSkill.count({
          where: {
            isActive: true,
            OR: [
              { userId: request.requesterId, skillId: request.offeredSkillId },
              { userId: request.receiverId, skillId: request.wantedSkillId },
            ],
          },
        });
        const wants = await tx.user.count({
          where: {
            OR: [
              {
                id: request.requesterId,
                wantedSkills: { some: { id: request.wantedSkillId } },
              },
              {
                id: request.receiverId,
                wantedSkills: { some: { id: request.offeredSkillId } },
              },
            ],
          },
        });
        if (offerings !== 2 || wants !== 2)
          throw new HttpError(
            409,
            "The reciprocal skill selections changed. Review the profiles before sending another request.",
          );
      }
      const unlinked = await tx.swap.count({
        where: {
          requesterId: request.requesterId,
          receiverId: request.receiverId,
          offeredSkillId: request.offeredSkillId,
          wantedSkillId: request.wantedSkillId,
          requestId: null,
          status: { in: ["PENDING_AGREEMENT", "CONFIRMED"] },
        },
      });
      if (unlinked)
        throw new HttpError(
          409,
          "This legacy exchange needs administrator reconciliation before proceeding.",
        );
      const updated = await tx.swapRequest.update({
        where: { id },
        data: { status },
      });
      if (status === "REJECTED") return updated;
      const swap = await tx.swap.create({
        data: {
          requestId: request.id,
          requesterId: request.requesterId,
          receiverId: request.receiverId,
          offeredSkillId: request.offeredSkillId,
          wantedSkillId: request.wantedSkillId,
          status: "PENDING_AGREEMENT",
          integrityVerified: true,
        },
      });
      return { ...updated, redirectId: swap.id };
    });
    res.json(result);
  });
  swaps.get("/", async (req, res) => {
    res.json(
      await db.swap.findMany({
        where: {
          OR: [{ requesterId: actor(req) }, { receiverId: actor(req) }],
        },
        include: swapInclude,
        orderBy: { updatedAt: "desc" },
      }),
    );
  });
  swaps.delete("/cancel/:type/:id", async (req, res) => {
    await transaction(db, async (tx) => {
      const id = String(req.params.id);
      if (req.params.type === "request") {
        await tx.$queryRaw`SELECT id FROM SwapRequest WHERE id = ${id} FOR UPDATE`;
        const r = await tx.swapRequest.findUnique({ where: { id } });
        if (!r) throw new HttpError(404, "Request not found.");
        if (r.requesterId !== actor(req))
          throw new HttpError(
            403,
            "Only the sender can withdraw this request.",
          );
        if (r.status === "WITHDRAWN") return;
        if (r.status !== "PENDING")
          throw new HttpError(
            409,
            "History cannot be deleted. Cancel an active swap from its details.",
          );
        const stranded = await tx.swap.count({
          where: {
            requestId: null,
            requesterId: r.requesterId,
            receiverId: r.receiverId,
            offeredSkillId: r.offeredSkillId,
            wantedSkillId: r.wantedSkillId,
            status: { in: ["PENDING_AGREEMENT", "CONFIRMED"] },
          },
        });
        if (stranded)
          throw new HttpError(
            409,
            "Legacy request requires reconciliation before withdrawal.",
          );
        await tx.swapRequest.update({
          where: { id },
          data: { status: "WITHDRAWN" },
        });
      } else if (req.params.type === "swap") {
        await lockSwap(tx, id);
        const s = await tx.swap.findUnique({ where: { id } });
        if (!s) throw new HttpError(404, "Swap not found.");
        assertParticipant(s, actor(req));
        if (s.status === "CANCELLED") return;
        if (!["PENDING_AGREEMENT", "CONFIRMED"].includes(s.status))
          throw new HttpError(409, "This exchange cannot be cancelled.");
        await tx.swap.update({
          where: { id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
      } else throw new HttpError(422, "Invalid cancellation type.");
    });
    res.json({ message: "Cancelled. Exchange history has been retained." });
  });
  swaps.get("/:id", async (req, res) => {
    const swap = await db.swap.findUnique({
      where: { id: String(req.params.id) },
      include: swapInclude,
    });
    if (!swap) throw new HttpError(404, "Swap not found.");
    assertParticipant(swap, actor(req));
    const requester = swap.requesterId === actor(req);
    const partnerId = requester ? swap.receiverId : swap.requesterId;
    const reviews = await db.review.findMany({
      where: { swapId: swap.id },
      select: { id: true, reviewerId: true, revieweeId: true, rating: true, comment: true, isValidated: true, createdAt: true },
    });
    const own = reviews.find(r => r.reviewerId === actor(req));
    const nextNumber = (requester ? swap.requesterSessions : swap.receiverSessions) + 1;
    const schedule = await db.swapSession.findUnique({where:{swapId_sessionNumber:{swapId:swap.id,sessionNumber:nextNumber}}});
    res.json({
      ...swap,
      confirmationEligibility: confirmationEligibility(swap, actor(req), nextNumber, schedule),
      me: requester ? swap.requester : swap.receiver,
      partner: requester ? swap.receiver : swap.requester,
      canReview: partnerId !== actor(req) && swap.status === "CONFIRMED" && swap.integrityVerified &&
        swap.requesterSessions >= swap.sessions && swap.receiverSessions >= swap.sessions && !own,
      reviewSummary: {
        myReview: own ? { id: own.id, rating: own.rating, comment: own.comment, isValidated: own.isValidated, createdAt: own.createdAt } : null,
        partnerSubmitted: reviews.some(r => r.reviewerId === partnerId && r.revieweeId === actor(req) && r.isValidated),
      },
    });
  });
  swaps.post("/:id/agreement", async (req, res) => {
    onlyKeys(req.body, [
      "sessions",
      "duration",
      "agreedToTerms",
      "agreementVersion",
    ]);
    const sessions = integer(req.body.sessions, "Sessions", 1, 30);
    const duration = integer(req.body.duration, "Duration", 1, 8);
    const version = integer(
      req.body.agreementVersion,
      "Agreement version",
      1,
      1000000,
    );
    if (req.body.agreedToTerms !== true)
      throw new HttpError(422, "Explicit agreement to the terms is required.");
    const swap = await transaction(db, async (tx) => {
      const id = String(req.params.id);
      await lockSwap(tx, id);
      const s = await tx.swap.findUnique({ where: { id } });
      if (!s) throw new HttpError(404, "Swap not found.");
      assertParticipant(s, actor(req));
      if (!s.integrityVerified)
        throw new HttpError(
          409,
          "Legacy agreement needs administrator reconciliation.",
        );
      if (!["PENDING_AGREEMENT", "CONFIRMED"].includes(s.status))
        throw new HttpError(409, "Agreement is closed.");
      if (s.agreementVersion !== version)
        throw new HttpError(
          409,
          "Agreement terms changed. Reload and review before signing.",
        );
      const changed = sessions !== s.sessions || duration !== s.duration;
      if (s.status === "CONFIRMED") {
        if (changed)
          throw new HttpError(409, "A confirmed agreement cannot be edited.");
        return s;
      }
      let requesterApprovedAt = changed ? null : s.requesterApprovedAt;
      let receiverApprovedAt = changed ? null : s.receiverApprovedAt;
      if (s.requesterId === actor(req)) requesterApprovedAt = new Date();
      else receiverApprovedAt = new Date();
      return tx.swap.update({
        where: { id },
        data: {
          sessions,
          duration,
          agreementVersion: changed ? version + 1 : version,
          requesterApprovedAt,
          receiverApprovedAt,
          status:
            requesterApprovedAt && receiverApprovedAt
              ? "CONFIRMED"
              : "PENDING_AGREEMENT",
        },
      });
    });
    res.json({
      message:
        swap.status === "CONFIRMED"
          ? "Both students approved. Exchange confirmed."
          : "Your approval is saved. Waiting for your partner to review these terms.",
      swap,
    });
  });
  swaps.post("/:id/log-session", async (req, res) => {
    onlyKeys(req.body, ["sessionNumber"]);
    const number = integer(req.body.sessionNumber, "Session number", 1, 30);
    const swap = await transaction(db, async (tx) => {
      const id = String(req.params.id);
      await lockSwap(tx, id);
      const s = await tx.swap.findUnique({ where: { id } });
      if (!s) throw new HttpError(404, "Swap not found.");
      assertParticipant(s, actor(req));
      const prior = await tx.sessionConfirmation.findUnique({
        where: {
          swapId_participantId_sessionNumber: {
            swapId: id,
            participantId: actor(req),
            sessionNumber: number,
          },
        },
      });
      if (prior) return s;
      if (s.status !== "CONFIRMED" || !s.integrityVerified)
        throw new HttpError(
          409,
          "Only a confirmed, validated exchange can log sessions.",
        );
      const requester = s.requesterId === actor(req);
      const count = requester ? s.requesterSessions : s.receiverSessions;
      if (number !== count + 1 || number > s.sessions)
        throw new HttpError(
          422,
          "Confirm the next unlogged session within the agreement limit.",
        );
      const schedule = await tx.swapSession.findUnique({ where: { swapId_sessionNumber: { swapId: id, sessionNumber: number } } });
      const eligibility = confirmationEligibility(s, actor(req), number, schedule);
      if (!eligibility.eligible) throw new HttpError(409, eligibility.reason);
      await tx.sessionConfirmation.create({
        data: { swapId: id, participantId: actor(req), sessionNumber: number },
      });
      return tx.swap.update({
        where: { id },
        data: requester
          ? { requesterSessions: { increment: 1 } }
          : { receiverSessions: { increment: 1 } },
      });
    });
    res.json(swap);
  });
  reputation.post("/submit", async (req, res) => {
    onlyKeys(req.body, ["swapId", "partnerId", "rating", "comment"]);
    const swapId = text(req.body.swapId, "Swap");
    const rating = integer(req.body.rating, "Rating", 1, 5);
    const comment = text(req.body.comment ?? "", "Comment", 2000, true);
    const review = await transaction(db, async (tx) => {
      await lockSwap(tx, swapId);
      const s = await tx.swap.findUnique({ where: { id: swapId } });
      if (!s) throw new HttpError(404, "Swap not found.");
      assertParticipant(s, actor(req));
      const revieweeId =
        s.requesterId === actor(req) ? s.receiverId : s.requesterId;
      if (revieweeId === actor(req))
        throw new HttpError(422, "You cannot review yourself.");
      if (req.body.partnerId !== undefined && req.body.partnerId !== revieweeId)
        throw new HttpError(
          422,
          "Review partner does not match this exchange.",
        );
      const existing = await tx.review.findUnique({
        where: { swapId_reviewerId: { swapId, reviewerId: actor(req) } },
      });
      if (existing) {
        if (existing.rating !== rating || (existing.comment || "") !== comment)
          throw new HttpError(409, "An exchange review cannot be replaced.");
        return {
          id: existing.id,
          rating: existing.rating,
          comment: existing.comment,
        };
      }
      if (
        s.status !== "CONFIRMED" ||
        !s.integrityVerified ||
        s.requesterSessions < s.sessions ||
        s.receiverSessions < s.sessions
      )
        throw new HttpError(
          409,
          "Both participants must finish the agreed sessions before reviewing.",
        );
      const saved = await tx.review.create({
        data: {
          swapId,
          reviewerId: actor(req),
          revieweeId,
          rating,
          comment,
          isValidated: true,
        },
      });
      const reviews = await tx.review.findMany({
        where: { swapId, isValidated: true },
        select: { reviewerId: true, revieweeId: true },
      });
      if (
        reviews.some(
          (r) =>
            r.reviewerId === s.requesterId && r.revieweeId === s.receiverId,
        ) &&
        reviews.some(
          (r) =>
            r.reviewerId === s.receiverId && r.revieweeId === s.requesterId,
        )
      ) {
        await tx.swap.update({
          where: { id: swapId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
      return { id: saved.id, rating: saved.rating, comment: saved.comment };
    });
    res.json(review);
  });
  return { swaps, requests, reputation };
}
