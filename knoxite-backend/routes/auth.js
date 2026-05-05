"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// A secret key for signing our login tokens (In production, this goes in the .env file!)
const JWT_SECRET = "knoxite_super_secret_key_2026";
// ==========================================
// 1. REGISTER NEW USER ENDPOINT
// ==========================================
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Check if the user already exists in the MySQL database
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email is already registered." });
        }
        // Hash the password for security (Salt rounds = 10)
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Create the new user in the database
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
            },
        });
        res.status(201).json({ message: "User created successfully!", userId: newUser.id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error during registration." });
    }
});
// ==========================================
// 2. LOGIN ENDPOINT
// ==========================================
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find the user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }
        // Compare the typed password with the hashed password in the database
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid email or password." });
        }
        // Generate a JSON Web Token (JWT) so the frontend knows the user is logged in
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        // Send the token and user data back to the React frontend
        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error during login." });
    }
});
exports.default = router;
