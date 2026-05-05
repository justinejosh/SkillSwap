import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// --- FETCH ALL POSTS (The Feed) ---
router.get("/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: { select: { name: true, avatarUrl: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch forum posts." });
  }
});

// --- CREATE A NEW POST ---
router.post("/posts", authenticateToken, async (req: any, res: any) => {
  const { title, content, category } = req.body;
  const authorId = req.user?.id || req.userId;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  try {
    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        category: category || "GENERAL",
        authorId
      }
    });
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Failed to create post." });
  }
});

// --- FETCH SINGLE POST + COMMENTS ---
router.get("/posts/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true, avatarUrl: true } },
        comments: {
          include: { author: { select: { name: true, avatarUrl: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch post details." });
  }
});

// --- ADD A COMMENT ---
router.post("/posts/:id/comments", authenticateToken, async (req: any, res: any) => {
  const { content } = req.body;
  const postId = req.params.id;
  const authorId = req.user?.id || req.userId;

  try {
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: "Failed to add comment." });
  }
});

export default router;