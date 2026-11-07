import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor, requireAdmin } from "../middleware/authMiddleware";
import { loadUserMetrics } from "../services/userMetrics";
export function analyticsRouter(db: PrismaClient) {
  const router = express.Router();
  router.get("/me", async (req, res) => {
    const id = actor(req);
    const metrics = (await loadUserMetrics(db, [id])).get(id)!;
    const [skills, exchanges] = await Promise.all([
      db.userOfferedSkill.findMany({
        where: { userId: id, isActive: true },
        select: {
          tier: true,
          tierAwardedAt: true,
          skill: { select: { id: true, name: true } },
        },
      }),
      db.swap.findMany({
        where: { OR: [{ requesterId: id }, { receiverId: id }] },
        select: {
          id: true,
          status: true,
          sessions: true,
          requesterSessions: true,
          receiverSessions: true,
          requesterId: true,
          createdAt: true,
          completedAt: true,
          integrityVerified: true,
        },
      }),
    ]);
    res.json({ metrics, skills, exchanges });
  });
  router.get("/", requireAdmin, async (_req, res) => {
    const [users, swaps, skills, totalReviews] = await Promise.all([
      db.user.findMany({
        where: { role: "USER" },
        select: { id: true, createdAt: true },
      }),
      db.swap.findMany({
        select: {
          status: true,
          integrityVerified: true,
          completedAt: true,
          cancelledAt: true,
          requesterApprovedAt: true,
          receiverApprovedAt: true,
        },
      }),
      db.skill.findMany({
        select: {
          name: true,
          _count: {
            select: {
              wantedBy: true,
              offeringLinks: { where: { isActive: true } },
            },
          },
        },
      }),
      db.review.count({
        where: {
          isValidated: true,
          swap: { integrityVerified: true, status: "COMPLETED" },
        },
      }),
    ]);
    const metrics = [
      ...(
        await loadUserMetrics(
          db,
          users.map((u) => u.id),
        )
      ).values(),
    ];
    const completedSwaps =
      metrics.reduce((n, m) => n + m.validatedCompletedSwaps, 0) / 2;
    const eligibleConcludedSwaps =
      metrics.reduce((n, m) => n + m.eligibleConcludedSwaps, 0) / 2;
    const legacyConcludedSwaps =
      metrics.reduce((n, m) => n + m.legacyConcludedSwaps, 0) / 2;
    const completionRate =
      legacyConcludedSwaps || !eligibleConcludedSwaps
        ? null
        : (completedSwaps / eligibleConcludedSwaps) * 100;
    const monthlyCompletion = Array.from({ length: 6 }, (_, i) => {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1),
      );
      const end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
      );
      const concluded = swaps.filter((s) => {
        const date =
          s.status === "COMPLETED"
            ? s.completedAt
            : s.status === "CANCELLED"
              ? s.cancelledAt
              : null;
        return (
          s.integrityVerified &&
          s.requesterApprovedAt &&
          s.receiverApprovedAt &&
          date &&
          date >= start &&
          date < end
        );
      });
      const completed = concluded.filter(
        (s) => s.status === "COMPLETED",
      ).length;
      return {
        period: start.toISOString().slice(0, 7),
        rate: concluded.length ? (completed / concluded.length) * 100 : null,
        completed,
      };
    });
    res.json({
      systemHealth: {
        totalUsers: users.length,
        totalSwaps: swaps.length,
        totalReviews,
      },
      swapMetrics: {
        completedSwaps,
        activeSwaps: swaps.filter((s) => s.status === "CONFIRMED").length,
        pendingSwaps: swaps.filter((s) => s.status === "PENDING_AGREEMENT")
          .length,
        completionRate,
        eligibleConcludedSwaps,
        legacyConcludedSwaps,
      },
      skillTrends: {
        topWanted: [...skills]
          .sort((a, b) => b._count.wantedBy - a._count.wantedBy)
          .slice(0, 5)
          .map((s) => ({ name: s.name, count: s._count.wantedBy })),
        topOffered: [...skills]
          .sort((a, b) => b._count.offeringLinks - a._count.offeringLinks)
          .slice(0, 5)
          .map((s) => ({ name: s.name, count: s._count.offeringLinks })),
      },
      monthlyCompletion,
    });
  });
  return router;
}
