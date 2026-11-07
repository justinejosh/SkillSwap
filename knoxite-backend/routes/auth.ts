import {
  academicOptions,
  validateAcademicSelection,
} from "../services/academics";
import { PrismaClient } from "@prisma/client";
import express, { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { AppConfig, studentEmailAllowed } from "../lib/config";
import { HttpError, onlyKeys, text } from "../lib/http";
import { actor, authentication } from "../middleware/authMiddleware";
import { VerificationMailer } from "../services/email";

function password(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    Buffer.byteLength(value, "utf8") > 72
  )
    throw new HttpError(
      422,
      "Password must have at least 12 characters and at most 72 UTF-8 bytes.",
    );
  return value;
}
function emailAddress(value: unknown): string {
  const email = text(value, "Email", 191).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpError(422, "Enter a valid email address.");
  return email;
}
function throttle(): RequestHandler {
  // Single-process protection; use the deployment's distributed edge limit for multi-instance hosting.
  const windows = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of windows)
      if (value.until <= now) windows.delete(key);
    const key = `${req.ip}:${req.path}`;
    const bucket = windows.get(key) || { count: 0, until: now + 15 * 60_000 };
    bucket.count++;
    windows.set(key, bucket);
    if (bucket.count > 10) {
      res.setHeader("Retry-After", Math.ceil((bucket.until - now) / 1000));
      throw new HttpError(429, "Too many attempts. Try again later.");
    }
    next();
  };
}
export function authRouter(
  db: PrismaClient,
  config: AppConfig,
  mailer: VerificationMailer,
) {
  const router = express.Router();
  const auth = authentication(db, config);
  const limit = throttle();
  router.use((req, res, next) => {
    if (
      req.method === "POST" &&
      [
        "/register",
        "/login",
        "/request-verification",
        "/verify-email",
        "/password",
      ].includes(req.path)
    )
      return limit(req, res, next);
    next();
  });
  router.get("/academic-options", async (_req, res) => {
    res.json(await academicOptions(db));
  });
  async function sendVerification(user: { id: string; email: string }) {
    const token = randomBytes(32).toString("base64url");
    const saved = await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });
    try {
      await mailer(
        user.email,
        `${config.publicAppUrl}/verify-email#token=${token}`,
      );
    } catch (error) {
      await db.emailVerificationToken.update({
        where: { id: saved.id },
        data: { usedAt: new Date() },
      });
      throw error;
    }
  }
  router.post("/register", async (req, res) => {
    onlyKeys(req.body, [
      "name",
      "email",
      "password",
      "programId",
      "yearLevelId",
    ]);
    const name = text(req.body.name, "Name", 100);
    const email = emailAddress(req.body.email);
    const programId = text(req.body.programId, "College program");
    const yearLevelId = text(req.body.yearLevelId, "Year level");
    await validateAcademicSelection(db, programId, yearLevelId);
    if (!config.institutionDomains.length)
      throw new HttpError(
        503,
        "Institutional registration is awaiting the official email-domain configuration.",
      );
    if (!studentEmailAllowed(email, config))
      throw new HttpError(
        422,
        "Use your OLFU Santa Rosa institutional email with the configured campus identifier before @.",
      );
    const passwordHash = await bcrypt.hash(password(req.body.password), 12);
    if (await db.user.findUnique({ where: { email }, select: { id: true } }))
      throw new HttpError(
        409,
        "This email is registered. Sign in or request email verification.",
      );
    const user = await db.user.create({
      data: { name, email, passwordHash, programId, yearLevelId },
      select: { id: true, email: true },
    });
    let verificationSent = false;
    try {
      await sendVerification(user);
      verificationSent = true;
    } catch {
      /* The account remains unverified and can request delivery again. */
    }
    res
      .status(201)
      .json({
        message: verificationSent
          ? "Account created. Verify your institutional email before signing in."
          : "Account created, but verification delivery is unavailable. Request verification again when delivery is restored.",
        verificationSent,
      });
  });
  router.post("/request-verification", async (req, res) => {
    onlyKeys(req.body, ["email"]);
    const email = emailAddress(req.body.email);
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        isSuspended: true,
        role: true,
      },
    });
    if (
      user &&
      !user.emailVerifiedAt &&
      !user.isSuspended &&
      (user.role === "ADMIN" || studentEmailAllowed(user.email, config))
    ) {
      try {
        await sendVerification(user);
      } catch {
        /* Same response for all accounts. */
      }
    }
    res
      .status(202)
      .json({
        message:
          "If an eligible account exists and email delivery is available, a verification message will be sent.",
      });
  });
  router.post("/verify-email", async (req, res) => {
    onlyKeys(req.body, ["token"]);
    const tokenHash = createHash("sha256")
      .update(text(req.body.token, "Token", 200))
      .digest("hex");
    await db.$transaction(async (tx) => {
      const token = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
      });
      if (!token || token.usedAt || token.expiresAt <= new Date())
        throw new HttpError(422, "Verification link is invalid or expired.");
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new HttpError(409, "Verification link has already been used.");
      await tx.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });
    res.json({ message: "Email verified. You can now sign in." });
  });
  router.post("/login", async (req, res) => {
    onlyKeys(req.body, ["email", "password"]);
    const email = emailAddress(req.body.email);
    if (
      typeof req.body.password !== "string" ||
      Buffer.byteLength(req.body.password) > 72
    )
      throw new HttpError(422, "Invalid password input.");
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash)))
      throw new HttpError(401, "Invalid email or password.");
    if (user.role === "USER" && !studentEmailAllowed(user.email, config))
      throw new HttpError(
        403,
        "This student account does not meet the configured Santa Rosa institutional email rule.",
      );
    if (user.isSuspended)
      throw new HttpError(403, "This account is suspended.");
    if (config.verificationRequired && !user.emailVerifiedAt)
      throw new HttpError(
        403,
        "Verify your institutional email before signing in.",
      );
    const session = await db.authSession.create({
      data: {
        userId: user.id,
        userAgent: (req.get("User-Agent") || "Unknown device").slice(0, 191),
        expiresAt: new Date(Date.now() + 7 * 86400_000),
      },
    });
    const token = jwt.sign(
      { tokenVersion: user.tokenVersion },
      config.jwtSecret,
      {
        subject: user.id,
        jwtid: session.id,
        expiresIn: "7d",
        algorithm: "HS256",
        issuer: "knoxite-api",
        audience: "knoxite",
      },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  });
  router.get("/sessions", auth, async (req, res) => {
    const sessions = await db.authSession.findMany({
      where: {
        userId: actor(req),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    res.json(sessions.map((s) => ({ ...s, current: s.id === req.sessionId })));
  });
  router.post("/logout", auth, async (req, res) => {
    await db.authSession.updateMany({
      where: { id: req.sessionId!, userId: actor(req) },
      data: { revokedAt: new Date() },
    });
    res.json({ message: "Signed out." });
  });
  router.post("/password", auth, async (req, res) => {
    onlyKeys(req.body, ["currentPassword", "newPassword"]);
    if (typeof req.body.currentPassword !== "string")
      throw new HttpError(422, "Current password is required.");
    const user = await db.user.findUniqueOrThrow({ where: { id: actor(req) } });
    if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash)))
      throw new HttpError(403, "Current password is incorrect.");
    const passwordHash = await bcrypt.hash(password(req.body.newPassword), 12);
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    res.json({ message: "Password updated. Sign in again on all devices." });
  });
  return router;
}
