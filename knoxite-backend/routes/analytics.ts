import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/analytics
router.get("/", authenticateToken, async (req, res) => {
  try {
    // 1. User Growth & Engagement Metrics
    const totalUsers = await prisma.user.count();
    const totalReviews = await prisma.review.count();

    // 2. Success Rates & Swap Statistics
    const swapStatusData = await prisma.swap.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    let totalSwaps = 0;
    let completedSwaps = 0;
    let pendingSwaps = 0;
    let activeSwaps = 0;

    swapStatusData.forEach((stat) => {
      totalSwaps += stat._count._all;
      if (stat.status === "COMPLETED") completedSwaps += stat._count._all;
      else if (stat.status === "PENDING_AGREEMENT") pendingSwaps += stat._count._all;
      else activeSwaps += stat._count._all; // CONFIRMED status
    });

    const completionRate = totalSwaps > 0 ? ((completedSwaps / totalSwaps) * 100).toFixed(1) : 0;

    // 3. Skill Trends (Most Wanted vs. Most Offered)
    const trendingSkills = await prisma.skill.findMany({
      select: {
        name: true,
        category: true,
        _count: {
          select: {
            wantedBy: true,
            offeredBy: true,
          }
        }
      }
    });

    // Sort to find the top 5 most wanted skills
    const topWantedSkills = [...trendingSkills]
      .sort((a, b) => b._count.wantedBy - a._count.wantedBy)
      .slice(0, 5)
      .map(s => ({ name: s.name, count: s._count.wantedBy }));

    // Sort to find the top 5 most offered skills
    const topOfferedSkills = [...trendingSkills]
      .sort((a, b) => b._count.offeredBy - a._count.offeredBy)
      .slice(0, 5)
      .map(s => ({ name: s.name, count: s._count.offeredBy }));

    // Construct the final analytics payload
    const dashboardMetrics = {
      systemHealth: {
        totalUsers,
        totalSwaps,
        totalReviews,
      },
      swapMetrics: {
        completedSwaps,
        activeSwaps,
        pendingSwaps,
        completionRate: Number(completionRate),
      },
      skillTrends: {
        topWanted: topWantedSkills,
        topOffered: topOfferedSkills,
      }
    };

    res.json(dashboardMetrics);
  } catch (error) {
    console.error("Analytics Aggregation Error:", error);
    res.status(500).json({ error: "Failed to compile system analytics." });
  }
});

export default router;