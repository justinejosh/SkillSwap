import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import matchRoutes from "./routes/matches"; 
import swapRoutes from "./routes/swaps"; 
import boardRoutes from "./routes/board";
import chatRoutes from "./routes/chat";
import { authenticateToken } from "./middleware/authMiddleware";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes

//MENTORS TAB or kung ano man
app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  console.log("✅ Advanced Leaderboard route hit!"); // New message to confirm fix
  try {

    //const userId = (req as any).user?.id;
    // Check all common places the ID might be stored
    const userId = (req as any).user?.id || (req as any).userId || (req as any).user?.sub;
    
    // 1. Fetch all users
    const allUsers = await prisma.user.findMany({
      include: {
        offeredSkills: { select: { name: true }, take: 2 }
      },
      orderBy: { name: 'asc' } 
    });
    console.log("Logged in User ID from Token:", userId);
    console.log("IDs in Database:", allUsers.map(u => u.id));
    
    // 2. Format the data
    const formattedData = allUsers.map((user, index) => ({
      id: user.id,
      name: user.name,
      skills: user.offeredSkills.map(s => s.name).join(", ") || "New Member",
      rating: 0, //placeholder
      reviews: 0,  //placeholder
      rank: index + 1,
      isCurrentUser: user.id === userId
    }));

    // 3. Send the object the frontend is looking for
    res.json({
      topMentors: formattedData.slice(0, 10),
      currentUserStats: formattedData.find(u => u.isCurrentUser) || null
    });
  } catch (error) {
    console.error("❌ Leaderboard Error:", error);
    res.status(500).json({ error: "Failed" });
  }
});
// End of Mentors tab

//Swaps tab
app.get("/api/leaderboard/swaps", authenticateToken, async (req: any, res: any) => {
  try {
    // 1. Get users ordered by their "completed swaps" count
    const swappers = await prisma.user.findMany({
      include: {
        // We count how many swaps they participated in
        _count: true,
        offeredSkills: { select: { name: true }, take: 1 }
      },
    });

    // 2. Format the data so the frontend can read it easily
    const formattedSwappers = swappers
      .map((user: any) => {
        const sCount = user.count?.senderSwaps || 0;
        const rCount = user.count?.receiverSwaps || 0;

        return {
           id: user.id,
        name: user.name,
        totalSwaps: sCount + rCount,
        skill: user.offeredSkills[0]?.name || "Generalist"
        };  
      })

      // Sort by highest swap count first
      .sort((a, b) => b.totalSwaps - a.totalSwaps)
      .slice(0, 10) // Top 10 only
      .map((user, index) => ({ ...user, rank: index + 1 }));

    res.json(formattedSwappers);
  } catch (error) {
    console.error("❌ Swaps leaderboard failed:", error);
    res.status(500).json({ error: "Failed to fetch swappers" });
  }
});
// end of swaps tab


// rated tabs
  app.get("/api/leaderboard/rated", authenticateToken, async (req: any, res: any) => {
  try {
    const usersWithReviews = await prisma.user.findMany({
      include: {
        // We fetch the reviews to calculate the average on the fly
        reviewsReceived: {
          select: { rating: true }
        },
        offeredSkills: { select: { name: true }, take: 1 }
      }
    });

    const formattedRated = usersWithReviews
      .map((user: any) => {
        const reviews = user.reviewsReceived || [];
        
        // Calculate the average by summing ratings and dividing by count
        const totalScore = reviews.reduce((acc: number, rev: any) => acc + (rev.rating || 0), 0);
        const avgRating = reviews.length > 0 ? totalScore / reviews.length : 0;

        return {
          id: user.id,
          name: user.name,
          rating: avgRating,
          reviewCount: reviews.length,
          skill: user.offeredSkills?.[0]?.name || "Expert"
        };
      })
      // Only show users who actually have at least one rating
      .filter((u: any) => u.reviewCount > 0) 
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 10)
      .map((user: any, index: number) => ({ ...user, rank: index + 1 }));

    res.json(formattedRated);
  } catch (error) {
    console.error("❌ Rated leaderboard calculation failed:", error);
    res.status(500).json({ error: "Failed to fetch top rated mentors" });
  }
});
//end of rate tabs

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchRoutes); 
app.use("/api/swaps", swapRoutes); 
app.use("/api/chat", chatRoutes);
app.use("/api/board", boardRoutes);



app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "success", message: "Knoxite Backend is running flawlessly!" });
});

// GET: Fetch real details for the agreement page
// GET: Fetch real details for the agreement page
app.get("/api/swaps/:id", authenticateToken, async (req, res: any) => {
  const id = req.params.id as string; 
  
  // Try to find the ID in common places middleware stores it
  const userId = (req as any).user?.id || (req as any).userId;

  if (!userId) {
    console.log("❌ Auth Error: No user ID found in request. Check if token is being sent.");
    return res.status(401).json({ message: "Unauthorized: Please log in again." });
  }

  try {
    // @ts-ignore
    const swap = await prisma.swap.findUnique({
      where: { id: id },
      include: {
        requester: true,
        receiver: true,
        offeredSkill: true,
        wantedSkill: true,
      },
    }) as any; 

    if (!swap) return res.status(404).json({ message: "Swap not found" });

    // Determine partner logic
    const partner = swap.requesterId === userId ? swap.receiver : swap.requester;

    res.json({
      partner: { name: partner?.name || "Partner" },
      offeredSkill: swap.offeredSkill?.name || "No Skill Listed",
      wantedSkill: swap.wantedSkill?.name || "No Skill Listed",
    });
  } catch (error) {
    console.error("Database fetch error:", error);
    res.status(500).json({ message: "Database error" });
  }
});

// POST: Save the finalized agreement to the database
app.post("/api/swaps/:id/agreement", authenticateToken, async (req, res: any) => {
  const id = req.params.id as string; 
  try {
    // @ts-ignore
    const updatedSwap = await prisma.swap.update({
      where: { id: id },
      data: { status: "CONFIRMED" },
    });

    console.log(`✅ Agreement finalized for Swap ID: ${id}`);
    res.status(200).json({ message: "Agreement signed!", updatedSwap });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Failed to save agreement" });
  }
});

// START THE SERVER - DO NOT REMOVE THIS
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Knoxite Server is live on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://192.168.1.21:${PORT}`);
});