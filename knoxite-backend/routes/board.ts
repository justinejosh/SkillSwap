import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { onlyKeys, text } from "../lib/http";
export function boardRouter(db: PrismaClient) {
  const router = express.Router();
  router.get("/", async (_req, res) => {
    const posts = await db.boardPost.findMany({
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      posts.map((p) => ({
        id: p.id,
        authorId: p.author.id,
        author: p.author.name,
        avatarUrl: p.author.avatarUrl,
        title: p.looking,
        category: p.offering,
        content: p.description,
        createdAt: p.createdAt,
      })),
    );
  });
  router.post("/post", async (req, res) => {
    onlyKeys(req.body, ["title", "content", "category"]);
    const post = await db.boardPost.create({
      data: {
        authorId: actor(req),
        looking: text(req.body.title, "Title", 150),
        offering: text(req.body.category, "Category", 50),
        description: text(req.body.content, "Content", 5000),
      },
    });
    res.status(201).json({ message: "Post created.", post });
  });
  return router;
}
