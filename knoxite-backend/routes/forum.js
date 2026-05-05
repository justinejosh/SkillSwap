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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch forum posts." });
    }
});
// --- CREATE A NEW POST ---
router.post("/posts", authMiddleware_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch post details." });
    }
});
// --- ADD A COMMENT ---
router.post("/posts/:id/comments", authMiddleware_1.authenticateToken, async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to add comment." });
    }
});
exports.default = router;
