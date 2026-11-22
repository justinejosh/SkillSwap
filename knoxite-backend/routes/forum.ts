import { moderationReason } from "../services/moderationAudit";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
import { transaction } from "../lib/transaction";
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
  router.delete("/posts/:postId/comments/:commentId", async (req, res) => {
    const userId = actor(req);
    onlyKeys(req.body ?? {}, req.userRole === "ADMIN" ? ["reason", "explanation"] : []);
    const review = req.userRole === "ADMIN" ? moderationReason(req.body ?? {}) : null;
    await transaction(db, async tx => {
      const postId = String(req.params.postId);
      // Serialize reply removal with other removals of this thread. The existing
      // foreign key and atomic delete also protect concurrent thread deletion.
      await tx.$queryRaw`SELECT id FROM Post WHERE id = ${postId} FOR UPDATE`;
      const post = await tx.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) throw new HttpError(404, "Thread not found.");
      const comment = await tx.comment.findFirst({
        where: { id: String(req.params.commentId), postId: post.id },
        select: { id: true, authorId: true },
      });
      if (!comment) throw new HttpError(404, "Reply not found in this thread.");
      if (comment.authorId !== userId && req.userRole !== "ADMIN")
        throw new HttpError(403, "Only the reply author or an administrator can delete this reply.");
      if (review) await tx.adminAudit.create({ data: { administratorId: userId, threadId: post.id, commentId: comment.id, commentAuthorId: comment.authorId, action: "DELETE_REPLY", ...review } });
      const deleted = await tx.comment.deleteMany({ where: {
        id: comment.id, postId: post.id,
        ...(req.userRole === "ADMIN" ? {} : { authorId: userId }),
      } });
      if (!deleted.count) throw new HttpError(404, "Reply already removed.");
    });
    res.json({ message: "Reply removed." });
  });
  router.delete("/posts/:id", async (req, res) => {
    const userId = actor(req);
    onlyKeys(req.body ?? {}, []);
    const id = String(req.params.id);
    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new HttpError(404, "Post not found.");
    if (post.authorId !== userId && req.userRole !== "ADMIN")
      throw new HttpError(403, "Only the author or an administrator can delete this post.");
    // Existing schema cascades only this post's comments. There are no stored likes,
    // attachments or forum-notification relations to invent or orphan.
    await db.post.delete({ where: { id } });
    res.json({ message: "Thread removed." });
  });
  return router;
}
