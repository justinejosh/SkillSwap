import { EvidenceStorage, s3EvidenceStorage } from "./services/privateEvidenceStorage";
import { ReportEvidenceService } from "./services/reportEvidence";
import { academicOptions, eligibleStudentWhere } from "./services/academics";
import { sessionsRouter } from "./routes/sessions";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { AppConfig, studentEmailAllowed } from "./lib/config";
import { errorHandler, HttpError } from "./lib/http";
import { actor, authentication } from "./middleware/authMiddleware";
import { authRouter } from "./routes/auth";
import { googleRouter } from "./routes/google";
import { googleVerifier, GoogleVerifier } from "./services/googleIdentity";
import { profileRouter } from "./routes/profile";
import { matchesRouter } from "./routes/matches";
import { swapRouters } from "./routes/swaps";
import { assessmentsRouter } from "./routes/assessments";
import { adminRouter } from "./routes/admin";
import { chatRouter } from "./routes/chat";
import { analyticsRouter } from "./routes/analytics";
import { forumRouter } from "./routes/forum";
import { boardRouter } from "./routes/board";
import { reportsRouter } from "./routes/reports";
import {
  portfolio,
  portfolioSelect,
  publicPortfolio,
} from "./services/portfolios";
import { loadUserMetrics } from "./services/userMetrics";
import {
  LEADERBOARD_POLICY,
  leaderboardEligibility,
  compareActivity,
} from "./services/leaderboards";
import { configuredMailer, VerificationMailer } from "./services/email";
export function createApp(
  db: PrismaClient,
  config: AppConfig,
  mailer: VerificationMailer = configuredMailer(),
  maintenance: () => boolean = () => false,
  verifyGoogle: GoogleVerifier = googleVerifier(),
  evidenceStorage?: EvidenceStorage,
) {
  const evidence = config.reportEvidence ? new ReportEvidenceService(db, evidenceStorage ?? s3EvidenceStorage(config.reportEvidence), config.reportEvidence.retentionDays) : undefined;
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    cors({
      origin: (origin, done) =>
        done(null, !origin || config.origins.includes(origin)),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      exposedHeaders: ["Retry-After"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "bypass-tunnel-reminder",
      ],
    }),
  );
  app.use(express.json({ limit: "750kb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use((_req, res, next) => {
    if (maintenance()) {
      res.status(503).json({
        error:
          "Knoxite is temporarily unavailable for maintenance. Please try again later.",
        maintenance: true,
      });
      return;
    }
    next();
  });
  app.use("/api/auth", authRouter(db, config, mailer));
  app.use("/api/auth", googleRouter(db, config, verifyGoogle));
  app.use("/api", authentication(db, config));
  app.get("/api/academic-options", async (_req, res) => {
    res.json(await academicOptions(db));
  });
  app.get("/api/users/:userId/profile", async (req, res) => {
    const result = await portfolio(db, String(req.params.userId), config);
    if (!result) throw new HttpError(404, "Student not found.");
    res.json(result);
  });
  app.get("/api/leaderboard", async (req, res) => {
    const candidates = await db.user.findMany({
      where: eligibleStudentWhere(config),
      select: { ...portfolioSelect, email: true },
    });
    const users = candidates.filter((u) => studentEmailAllowed(u.email, config));
    const metrics = await loadUserMetrics(
      db,
      users.map((u) => u.id),
    );
    res.json({
      policy: LEADERBOARD_POLICY,
      viewer: {
        ...leaderboardEligibility(
          metrics.get(actor(req)) ??
            (await loadUserMetrics(db, [actor(req)])).get(actor(req))!,
        ),
        uniqueCompletedPartners:
          metrics.get(actor(req))?.uniqueCompletedPartners ?? 0,
      },
      topMentors: users
        .filter((u) => leaderboardEligibility(metrics.get(u.id)!).eligible)
        .map((u) => {
          const m = metrics.get(u.id)!;
          const p = publicPortfolio(u);
          return {
            id: p.id,
            name: p.name,
            avatarUrl: p.avatarUrl,
            skills: p.offeredSkills.map((s) => s.name).join(", "),
            rating: m.averageRating,
            reviews: m.ratingCount,
            uniqueRatingPartners: m.uniqueRatingPartners,
            uniqueCompletedPartners: m.uniqueCompletedPartners,
            isCurrentUser: u.id === actor(req),
          };
        })
        .sort(
          (a, b) =>
            (b.rating ?? -1) - (a.rating ?? -1) || a.id.localeCompare(b.id),
        ),
    });
  });
  app.get("/api/leaderboard/swaps", async (_req, res) => {
    const candidates = await db.user.findMany({
      where: eligibleStudentWhere(config),
      select: { id: true, name: true, avatarUrl: true, email: true },
    });
    const users = candidates.filter((u) => studentEmailAllowed(u.email, config));
    const metrics = await loadUserMetrics(
      db,
      users.map((u) => u.id),
    );
    res.json(
      users
        .filter((u) => leaderboardEligibility(metrics.get(u.id)!).eligible)
        .map((u) => ({
          id: u.id, name: u.name, avatarUrl: u.avatarUrl,
          totalSwaps: metrics.get(u.id)!.completedSwaps,
          uniqueCompletedPartners: metrics.get(u.id)!.uniqueCompletedPartners,
          completionRate: metrics.get(u.id)!.completionRate!,
        }))
        .sort(compareActivity),
    );
  });
  const swaps = swapRouters(db, config);
  app.use("/api/sessions", sessionsRouter(db));
  app.use("/api/profile", profileRouter(db));
  app.use("/api/matches", matchesRouter(db, config));
  app.use("/api/swaps", swaps.swaps);
  app.use("/api/swap-requests", swaps.requests);
  app.use("/api/reputation", swaps.reputation);
  app.use("/api/assessments", assessmentsRouter(db));
  app.use("/api/admin", adminRouter(db, evidence, config));
  app.use("/api/chat", chatRouter(db));
  app.use("/api/analytics", analyticsRouter(db));
  app.use("/api/forum", forumRouter(db));
  app.use("/api/board", boardRouter(db));
  app.use("/api/reports", reportsRouter(db, evidence));
  app.use((_req, res) => {
    res.status(404).json({ error: "Endpoint not found." });
  });
  app.use(errorHandler);
  return app;
}
