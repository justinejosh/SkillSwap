import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    // STEP 1: Get the current user's profile to see what they have and want
    const me = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { offeredSkills: true, wantedSkills: true }
    });

    if (!me || me.offeredSkills.length === 0 || me.wantedSkills.length === 0) {
      return res.status(400).json({ 
        error: "You must add at least one offered skill and one wanted skill to see matches." 
      });
    }

    // Extract just the ID strings for easy comparison
    const myOfferedIds = me.offeredSkills.map(skill => skill.id);
    const myWantedIds = me.wantedSkills.map(skill => skill.id);

    // STEP 2 & 3: The Reciprocal Filter
    // Find users who offer what I want AND want what I offer
    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: req.userId }, // Don't match me with myself!
        offeredSkills: { some: { id: { in: myWantedIds } } }, // They offer what I want
        wantedSkills: { some: { id: { in: myOfferedIds } } }  // They want what I offer
      },
      include: {
        offeredSkills: true,
        wantedSkills: true,
        reviewsReceived: true // Bring their past ratings so we can calculate their weight
      }
    });

    // STEP 4: The Weighted Ranking (The Math)
    const rankedMatches = potentialMatches.map(user => {
      // A. Calculate how many skills specifically overlap between us
      const matchingOfferedCount = user.offeredSkills.filter(s => myWantedIds.includes(s.id)).length;
      const matchingWantedCount = user.wantedSkills.filter(s => myOfferedIds.includes(s.id)).length;
      
      // Base weight from skill alignment
      const skillWeight = matchingOfferedCount + matchingWantedCount;

      // B. Calculate Reputation Weight (Average Rating)
      let averageRating = 0;
      if (user.reviewsReceived.length > 0) {
        const totalStars = user.reviewsReceived.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalStars / user.reviewsReceived.length;
      }

      // C. The Final WRMR Formula
      // Let's say skills are worth 2 points each, and reputation adds up to 5 points
      const matchScore = (skillWeight * 2) + averageRating;

      // Clean up the object to send back to the React frontend
      const { passwordHash, ...safeUser } = user;
      
      return {
        ...safeUser,
        matchDetails: {
          overlappingSkills: skillWeight,
          averageRating: averageRating.toFixed(1),
          totalMatchScore: matchScore.toFixed(2)
        }
      };
    });

    // STEP 5: Sort the array so the highest match score is at the very top
    rankedMatches.sort((a, b) => parseFloat(b.matchDetails.totalMatchScore) - parseFloat(a.matchDetails.totalMatchScore));

    res.status(200).json(rankedMatches);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to calculate WRMR matches." });
  }
});

export default router;