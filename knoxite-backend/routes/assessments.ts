import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor, requireStudent } from "../middleware/authMiddleware";
import { HttpError, onlyKeys } from "../lib/http";
import {
  assessmentAvailability,
  startAssessment,
  submitAssessment,
  viewAssessment,
} from "../services/assessmentService";
export function assessmentsRouter(db: PrismaClient) {
  const router = express.Router();
  router.use(requireStudent);
  router.get("/offerings/:id", async (req, res) => {
    res.json(
      await assessmentAvailability(db, String(req.params.id), actor(req)),
    );
  });
  router.post("/offerings/:id/attempts", async (req, res) => {
    onlyKeys(req.body, ["level"]);
    if (req.body.level !== "BASIC" && req.body.level !== "ADVANCED")
      throw new HttpError(422, "Choose BASIC or ADVANCED.");
    res
      .status(201)
      .json(
        await startAssessment(
          db,
          String(req.params.id),
          actor(req),
          req.body.level,
        ),
      );
  });
  router.get("/attempts/:id", async (req, res) => {
    res.json(await viewAssessment(db, String(req.params.id), actor(req)));
  });
  router.post("/attempts/:id/submit", async (req, res) => {
    onlyKeys(req.body, ["answers"]);
    res.json(
      await submitAssessment(
        db,
        String(req.params.id),
        actor(req),
        req.body.answers,
      ),
    );
  });
  return router;
}
