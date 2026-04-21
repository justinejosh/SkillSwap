import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import swapRoutes from "./routes/swaps"; 
import boardRoutes from "./routes/board";
import chatRoutes from "./routes/chat";
import { authenticateToken } from "./middleware/authMiddleware";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- 1. LEADERBOARD: LIVE RATING AGGREGATION ---
app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id || (req as any).userId;
    const allUsers = await prisma.user.findMany({
      include: { 
        offeredSkills: { select: { name: true }, take: 2 },
        reviewsReceived: { select: { rating: true } } 
      }
    });
    
    const formattedData = allUsers.map((user) => {
      const totalReviews = user.reviewsReceived.length;
      const avgRating = totalReviews > 0 
        ? user.reviewsReceived.reduce((acc, rev) => acc + rev.rating, 0) / totalReviews 
        : 0;

      return {
        id: user.id,
        name: user.name,
        skills: user.offeredSkills.map(s => s.name).join(", ") || "Member",
        rating: avgRating.toFixed(1),
        reviews: totalReviews,
        isCurrentUser: user.id === userId
      };
    }).sort((a, b) => Number(b.rating) - Number(a.rating));

    res.json({ topMentors: formattedData });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// --- 2. MATCHING RADAR: DYNAMIC AVAILABILITY ---
app.get("/api/matches", authenticateToken, async (req, res) => {
  const userId = (req as any).user?.id || (req as any).userId;

  try {
    const activeSwaps = await prisma.swap.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        NOT: { status: "COMPLETED" } 
      },
      select: { requesterId: true, receiverId: true }
    });

    const excludedIds = activeSwaps.flatMap(s => 
      s.requesterId === userId ? [s.receiverId] : [s.requesterId]
    );
    excludedIds.push(userId);

    const recommendedPeers = await prisma.user.findMany({
      where: { id: { notIn: excludedIds } },
      include: {
        offeredSkills: { select: { id: true, name: true } },
        wantedSkills: { select: { id: true, name: true } }
      },
      take: 6
    });

    res.json(recommendedPeers);
  } catch (error) {
    res.status(500).json({ error: "Radar fetch error" });
  }
});

// --- 3. SWAP REQUEST HANDLERS (NOTIFICATION LOGIC) ---

app.post("/api/swaps/request", authenticateToken, async (req, res) => {
  const { receiverId, offeredSkillId, wantedSkillId } = req.body;
  const requesterId = (req as any).user?.id || (req as any).userId;

  try {
    await prisma.swap.create({
      data: {
        status: "PENDING_AGREEMENT",
        sessions: 5,
        requester: { connect: { id: requesterId } },
        receiver: { connect: { id: receiverId } },
        offeredSkill: { connect: { id: offeredSkillId } },
        wantedSkill: { connect: { id: wantedSkillId } },
      }
    });

    const newRequest = await prisma.swapRequest.create({
      data: {
        status: "PENDING", 
        requester: { connect: { id: requesterId } },
        receiver: { connect: { id: receiverId } },
        offeredSkill: { connect: { id: offeredSkillId } },
        wantedSkill: { connect: { id: wantedSkillId } },
      }
    });

    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error("DEBUG REQUEST ERROR:", error.message);
    res.status(500).json({ error: "Check if IDs exist in DB." });
  }
});

app.get("/api/swap-requests", authenticateToken, async (req, res) => {
  const userId = (req as any).user?.id || (req as any).userId;

  try {
    const requests = await prisma.swapRequest.findMany({
      where: {
        OR: [
          { receiverId: userId },
          { requesterId: userId }
        ]
      },
      include: {
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        offeredSkill: { select: { name: true } }, 
        wantedSkill: { select: { name: true } }   
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

app.patch("/api/swap-requests/:id/status", authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  const { newStatus } = req.body;

  try {
    const updatedRequest = await prisma.swapRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    if (newStatus === "ACCEPTED") {
      const relatedSwap = await prisma.swap.findFirst({
        where: {
          requesterId: updatedRequest.requesterId,
          receiverId: updatedRequest.receiverId,
          offeredSkillId: updatedRequest.offeredSkillId,
          wantedSkillId: updatedRequest.wantedSkillId,
          status: "PENDING_AGREEMENT"
        }
      });

      if (relatedSwap) {
        return res.json({ ...updatedRequest, redirectId: relatedSwap.id });
      }
    }

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// --- 4. SWAP MANAGEMENT & SESSION LOGGING ---
app.get("/api/swaps", authenticateToken, async (req, res) => {
  const userId = (req as any).user?.id || (req as any).userId;
  try {
    const swaps = await prisma.swap.findMany({
      where: { OR: [{ requesterId: userId }, { receiverId: userId }] },
      include: {
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        offeredSkill: { select: { name: true } },
        wantedSkill: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(swaps);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch swaps" });
  }
});

app.get("/api/swaps/:id", authenticateToken, async (req, res: any) => {
  const swapId = req.params.id as string;
  const userId = (req as any).user?.id || (req as any).userId;
  try {
    const swap = await prisma.swap.findUnique({
      where: { id: swapId },
      include: {
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        offeredSkill: true, 
        wantedSkill: true,
      },
    }) as any;
    if (!swap) return res.status(404).json({ message: "Swap not found" });
    const isRequester = swap.requesterId === userId;
    const partner = isRequester ? swap.receiver : swap.requester;
    res.json({ ...swap, partner: { id: partner?.id, name: partner?.name } });
  } catch (error) {
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/swaps/:id/log-session", authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  try {
    const current = await prisma.swap.findUnique({ where: { id } });
    if (!current || current.completedSessions >= current.sessions) {
      return res.status(400).json({ error: "Session limit reached" });
    }
    const updated = await prisma.swap.update({
      where: { id },
      data: { completedSessions: current.completedSessions + 1 }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to log session" });
  }
});

// --- 5. FINALIZE AGREEMENT (SET SESSIONS) ---
// 🚀 THIS FIXES THE 404 IN SWAP AGREEMENT STEP 3
app.post("/api/swaps/:id/agreement", authenticateToken, async (req, res) => {
  const id = req.params.id as string;
  const { sessions } = req.body;

  try {
    const updatedSwap = await prisma.swap.update({
      where: { id },
      data: {
        sessions: Number(sessions),
        status: "CONFIRMED", 
      }
    });

    res.json({ 
      message: "Agreement finalized!", 
      swap: updatedSwap 
    });
  } catch (error: any) {
    console.error("Agreement Error:", error.message);
    res.status(500).json({ error: "Failed to save agreement." });
  }
});

// --- 6. REPUTATION & FINALIZATION ---
app.post("/api/reputation/submit", authenticateToken, async (req, res) => {
  const { swapId, partnerId, rating, comment } = req.body;
  const reviewerId = (req as any).user?.id || (req as any).userId;

  try {
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          rating: Number(rating),
          comment: comment || "",
          reviewer: { connect: { id: reviewerId } },
          reviewee: { connect: { id: partnerId } },
          swap: { connect: { id: swapId } }
        }
      });
      await tx.swap.update({ 
        where: { id: swapId }, 
        data: { status: "COMPLETED" } 
      });
      return newReview;
    });
    res.json(review);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- 7. DELETION & CANCELLATION ---
app.delete("/api/swaps/cancel/:type/:id", authenticateToken, async (req, res) => {
  const type = req.params.type as string; 
  const id = req.params.id as string; 

  try {
    if (type === "request") {
      await prisma.swapRequest.delete({ where: { id } });
    } else {
      await prisma.swap.delete({ where: { id } });
    }
    res.json({ message: "Cancelled successfully" });
  } catch (error: any) {
    res.status(500).json({ error: "Record not found or already deleted" });
  }
});

// --- EXTERNAL ROUTE DELEGATION ---
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/board", boardRoutes);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Knoxite Server Live on Port ${PORT}`);
});