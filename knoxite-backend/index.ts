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