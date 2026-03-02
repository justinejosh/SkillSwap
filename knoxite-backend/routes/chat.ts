import express from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();
const prisma = new PrismaClient();

// Send a message
router.post("/send", authenticateToken, async (req: AuthRequest, res: any) => {
  const { receiverId, content } = req.body;
  const message = await prisma.message.create({
    data: {
      content,
      senderId: req.userId!,
      receiverId,
    },
  });
  res.json(message);
});

// Get conversation with a specific user
router.get("/conversation/:partnerId", authenticateToken, async (req: AuthRequest, res: any) => {
  // 1. Force partnerId to be a string
  const partnerId = req.params.partnerId as string;
  
  // 2. Ensure your userId is treated as a string
  const myId = req.userId as string;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: partnerId },
          { senderId: partnerId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;