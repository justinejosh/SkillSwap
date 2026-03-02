import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// GET all board posts
router.get("/", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    const posts = await prisma.boardPost.findMany({
      include: {
        author: { select: { name: true, avatarUrl: true } } // Bring the author's name with the post!
      },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch board posts." });
  }
});

// CREATE a new board post
router.post("/", authenticateToken, async (req: AuthRequest, res: any) => {
  try {
    const { looking, offering, description } = req.body;

    const newPost = await prisma.boardPost.create({
      data: {
        looking,
        offering,
        description,
        authorId: req.userId! // The secure user ID from the token
      },
      include: {
        author: { select: { name: true } }
      }
    });

    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Failed to create board post." });
  }
});

export default router;