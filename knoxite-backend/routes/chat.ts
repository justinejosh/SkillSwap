import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
import { assertParticipant } from "./swaps";
export function chatRouter(db: PrismaClient) {
  const router = express.Router();
  async function conversation(
    swapId: string,
    userId: string,
    partnerId: string,
  ) {
    const swap = await db.swap.findUnique({ where: { id: swapId } });
    if (!swap) throw new HttpError(404, "Swap not found.");
    assertParticipant(swap, userId);
    if (
      partnerId !==
      (swap.requesterId === userId ? swap.receiverId : swap.requesterId)
    )
      throw new HttpError(422, "Invalid conversation partner.");
    return swap;
  }
  router.post("/send", async (req, res) => {
    onlyKeys(req.body, ["swapId", "receiverId", "content"]);
    const swapId = text(req.body.swapId, "Swap");
    const receiverId = text(req.body.receiverId, "Receiver");
    const swap = await conversation(swapId, actor(req), receiverId);
    if (!["PENDING_AGREEMENT", "CONFIRMED"].includes(swap.status))
      throw new HttpError(
        409,
        "This conversation is read-only because the exchange has ended.",
      );
    const message = await db.message.create({
      data: {
        swapId,
        senderId: actor(req),
        receiverId,
        content: text(req.body.content, "Message", 4000),
      },
    });
    res.status(201).json(message);
  });
  router.get("/conversation/:partnerId", async (req, res) => {
    const swapId = text(req.query.swapId, "Swap");
    const partnerId = String(req.params.partnerId);
    await conversation(swapId, actor(req), partnerId);
    res.json(
      await db.message.findMany({
        where: {
          swapId,
          OR: [
            { senderId: actor(req), receiverId: partnerId },
            { senderId: partnerId, receiverId: actor(req) },
          ],
        },
        orderBy: { createdAt: "asc" },
      }),
    );
  });
  return router;
}
