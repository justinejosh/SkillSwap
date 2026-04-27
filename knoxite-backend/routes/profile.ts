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

  // ==========================================
// 4. REMOVE A SKILL (OFFERED OR WANTED)
// ==========================================
router.delete("/skills/:type/:skillId", authenticateToken, async (req: AuthRequest, res: any) => {
  const type = req.params.type as string;
  const skillId = req.params.skillId as string; // 🚀 Force type to string
  const userId = req.userId as string;

  try {
    // We update directly inside the call to avoid 'updateData' typing issues
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        [type === "offer" ? "offeredSkills" : "wantedSkills"]: {
          disconnect: { id: skillId }
        }
      },
      include: { 
        offeredSkills: true, 
        wantedSkills: true 
      }
    });

    res.status(200).json({ 
      message: `Skill removed from your ${type === "offer" ? "offerings" : "wishlist"}!`,
      // Using type casting (as any) here prevents the property access error
      offeredSkills: (updatedUser as any).offeredSkills,
      wantedSkills: (updatedUser as any).wantedSkills
    });
  } catch (error: any) {
    console.error("Delete Skill Error:", error.message);
    res.status(500).json({ error: "Failed to remove skill from your profile." });
  }
});

export default router;