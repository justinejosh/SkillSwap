import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// 1. GET USER PROFILE & SKILLS
// ==========================================
// Notice we put 'authenticateToken' in the middle. The Security Guard checks the token first!
router.get("/", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    // Find the user by the ID safely locked inside their JWT token
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { 
        offeredSkills: true, 
        wantedSkills: true 
      } // Bring their skills with them!
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Never send the hashed password back to the frontend! 
    const { passwordHash, ...safeUser } = user;
    
    res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error fetching profile." });
  }
});

// ==========================================
// 2. ADD AN OFFERED SKILL
// ==========================================
router.post("/skills/offer", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    const { name, category } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        offeredSkills: {
          // This is the magic defense-ready feature: No duplicate skills!
          connectOrCreate: {
            where: { name: name.toLowerCase() },
            create: { name: name.toLowerCase(), category: category || "General" }
          }
        }
      },
      include: { offeredSkills: true } // Return the updated list
    });

    res.status(200).json({ 
      message: "Skill added to your offerings!", 
      offeredSkills: updatedUser.offeredSkills 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add offered skill." });
  }
});

// ==========================================
// 3. ADD A WANTED SKILL
// ==========================================
router.post("/skills/want", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    const { name, category } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        wantedSkills: {
          connectOrCreate: {
            where: { name: name.toLowerCase() },
            create: { name: name.toLowerCase(), category: category || "General" }
          }
        }
      },
      include: { wantedSkills: true }
    });

    res.status(200).json({ 
      message: "Skill added to your wishlist!", 
      wantedSkills: updatedUser.wantedSkills 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add wanted skill." });
  }
});

export default router;