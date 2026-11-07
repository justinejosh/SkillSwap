import { academicInfo, academicSelect } from "../services/academics";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor, requireStudent } from "../middleware/authMiddleware";
import { HttpError } from "../lib/http";
import { portfolioSelect, publicPortfolio } from "../services/portfolios";
import { loadUserMetrics } from "../services/userMetrics";
import { academicProximity } from "../services/academicProximity";
import { compareMatches, wrmr } from "../services/wrmr";
import { AppConfig, studentEmailAllowed } from "../lib/config";
export function matchesRouter(db: PrismaClient, config: AppConfig) {
  const router = express.Router();
  router.use(requireStudent);
  router.get("/", async (req, res) => {
    const userId = actor(req);
    const me = await db.user.findUnique({
      where: { id: userId },
      select: {
        ...academicSelect,
        offeringLinks: { where: { isActive: true }, select: { skillId: true } },
        wantedSkills: { select: { id: true } },
      },
    });
    if (!me) throw new HttpError(404, "User not found.");
    const offered = me.offeringLinks.map((o) => o.skillId);
    const wanted = me.wantedSkills.map((s) => s.id);
    if (!offered.length || !wanted.length) {
      res.json([]);
      return;
    }
    const [swaps, requests] = await Promise.all([
      db.swap.findMany({
        where: {
          OR: [{ requesterId: userId }, { receiverId: userId }],
          status: { in: ["PENDING_AGREEMENT", "CONFIRMED"] },
        },
        select: { requesterId: true, receiverId: true },
      }),
      db.swapRequest.findMany({
        where: {
          OR: [{ requesterId: userId }, { receiverId: userId }],
          status: "PENDING",
        },
        select: { requesterId: true, receiverId: true },
      }),
    ]);
    const excluded = [
      userId,
      ...[...swaps, ...requests].map((s) =>
        s.requesterId === userId ? s.receiverId : s.requesterId,
      ),
    ];
    const candidates = await db.user.findMany({
      where: {
        id: { notIn: excluded },
        isSuspended: false,
        role: "USER",
        offeringLinks: { some: { isActive: true, skillId: { in: wanted } } },
        wantedSkills: { some: { id: { in: offered } } },
      },
      select: { ...portfolioSelect, email: true, emailVerifiedAt: true },
    });
    const eligible = candidates.filter(
      (c) =>
        studentEmailAllowed(c.email, config) &&
        (!config.verificationRequired || c.emailVerifiedAt),
    );
    const metrics = await loadUserMetrics(
      db,
      eligible.map((c) => c.id),
    );
    const matches = eligible
      .map((c) => {
        const publicUser = publicPortfolio(c);
        const m = metrics.get(c.id)!;
        const proximity = academicProximity(academicInfo(me), academicInfo(c));
        const calculated = wrmr(
          m.averageRating,
          m.completionRate,
          proximity.value,
        );
        return {
          ...publicUser,
          metrics: m,
          rating: m.averageRating,
          matchScore: calculated.score,
          matchDetails: {
            ...calculated,
            metricPolicy: m.metricPolicy,
            uniqueRatingPartners: m.uniqueRatingPartners,
            uniqueCompletedPartners: m.uniqueCompletedPartners,
            proximity,
            averageRating: m.averageRating,
            ratingCount: m.ratingCount,
            completionRate: m.completionRate,
            eligibleConcludedSwaps: m.eligibleConcludedSwaps,
          },
          matchingOfferedSkills: publicUser.offeredSkills.filter((s) =>
            wanted.includes(s.id),
          ),
          matchingWantedSkills: publicUser.wantedSkills.filter((s) =>
            offered.includes(s.id),
          ),
        };
      })
      .sort(compareMatches);
    // Keep unranked reciprocal candidates visible; never truncate the pool before scoring.
    res.json(matches);
  });
  return router;
}
