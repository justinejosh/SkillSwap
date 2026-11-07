import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor, requireAdmin } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
export function forumRouter(db: PrismaClient) {
  const router = express.Router();
  const author = { select: { id: true, name: true, avatarUrl: true } } as const;
  router.get("/posts", async (_req, res) => {
    res.json(
      await db.post.findMany({
        include: { author, _count: { select: { comments: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  router.post("/posts", async (req, res) => {
    onlyKeys(req.body, ["title", "content", "category"]);
    res
      .status(201)
      .json(
        await db.post.create({
          data: {
            authorId: actor(req),
            title: text(req.body.title, "Title", 150),
            content: text(req.body.content, "Content", 10000),
            category: text(req.body.category ?? "GENERAL", "Category", 50),
          },
        }),
      );
  });
  router.get("/posts/:id", async (req, res) => {
    const post = await db.post.findUnique({
      where: { id: String(req.params.id) },
      include: {
        author,
        comments: { include: { author }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!post) throw new HttpError(404, "Post not found.");
    res.json(post);
  });
  router.post("/posts/:id/comments", async (req, res) => {
    onlyKeys(req.body, ["content"]);
    res
      .status(201)
      .json(
        await db.comment.create({
          data: {
            postId: String(req.params.id),
            authorId: actor(req),
            content: text(req.body.content, "Comment", 5000),
          },
        }),
      );
  });
  router.delete("/posts/:id", requireAdmin, async (req, res) => {
    await db.post.delete({ where: { id: String(req.params.id) } });
    res.json({ message: "Thread removed." });
  });
  return router;
}
