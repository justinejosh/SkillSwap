import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
export function reportsRouter(db: PrismaClient) {
  const router = express.Router();
  router.get("/", async (req, res) => {
    res.json(
      await db.userReport.findMany({
        where: { reporterId: actor(req) },
        select: {
          id: true,
          reason: true,
          description: true,
          status: true,
          resolution: true,
          createdAt: true,
          target: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  router.post("/", async (req, res) => {
    onlyKeys(req.body, ["targetId", "reason", "description"]);
    const targetId = text(req.body.targetId, "Student ID");
    const reason = text(req.body.reason, "Reason", 50);
    if (
      !["NO_SHOW", "HARASSMENT", "MISREPRESENTATION", "OTHER"].includes(reason)
    )
      throw new HttpError(422, "Choose a supported report reason.");
    if (targetId === actor(req))
      throw new HttpError(422, "You cannot report yourself.");
    if (
      !(await db.user.findFirst({
        where: { id: targetId, role: "USER" },
        select: { id: true },
      }))
    )
      throw new HttpError(404, "Student not found.");
    const saved = await db.userReport.create({
      data: {
        reporterId: actor(req),
        targetId,
        reason,
        description: text(req.body.description, "Description", 4000),
      },
      select: { id: true, status: true },
    });
    res.status(201).json(saved);
  });
  return router;
}
