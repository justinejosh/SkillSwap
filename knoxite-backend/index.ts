import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import matchRoutes from "./routes/matches"; // <-- 1. Import the match algorithm

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchRoutes); // <-- 2. Expose the endpoint

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "success", message: "Knoxite Backend is running flawlessly!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Knoxite Server is running on http://localhost:${PORT}`);
});