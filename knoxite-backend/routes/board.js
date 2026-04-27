"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// GET all board posts
router.get("/", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const posts = await prisma.boardPost.findMany({
            include: {
                author: { select: { name: true, avatarUrl: true } } // Bring the author's name with the post!
            },
            orderBy: { createdAt: "desc" }
        });
        res.status(200).json(posts);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch board posts." });
    }
});
// CREATE a new board post
router.post("/", authMiddleware_1.authenticateToken, async (req, res) => {
    try {
        const { looking, offering, description } = req.body;
        const newPost = await prisma.boardPost.create({
            data: {
                looking,
                offering,
                description,
                authorId: req.userId // The secure user ID from the token
            },
            include: {
                author: { select: { name: true } }
            }
        });
        res.status(201).json(newPost);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create board post." });
    }
});
exports.default = router;
