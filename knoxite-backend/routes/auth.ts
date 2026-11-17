import {
  academicOptions,
  validateAcademicSelection,
} from "../services/academics";
import { PrismaClient } from "@prisma/client";
import express, { RequestHandler } from "express";
import { registrationPolicy, requireRegistrationConsent, recordRegistrationConsent } from "../services/registrationConsent";
import bcrypt from "bcrypt";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { AppConfig, studentEmailAllowed, pilotAccountAllowed } from "../lib/config";
import { HttpError, onlyKeys, text } from "../lib/http";
import { actor, authentication } from "../middleware/authMiddleware";
import { VerificationMailer } from "../services/email";
import { issueSession, assertAccountAllowed } from "../services/authSessions";
import { loginThrottle } from "../lib/loginThrottle";
import { lastInteraction, sessionDeadlines, SESSION_POLICY, timeoutsEnabled } from "../services/sessionPolicy";

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
function opaqueToken(value: unknown): string {
  // All issued tokens are 32 random bytes encoded as 43 base64url characters.
  // Reject altered or prefixed links before looking up any token.
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new HttpError(
      422,
      "This account link is invalid. Request a new link.",
    );
  return value;
}
export function throttle(): RequestHandler {
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
        "/request-verification",
        "/verify-email",
        "/password",
        "/request-password-reset",
        "/reset-password",
      ].includes(req.path)
    )
      return limit(req, res, next);
    next();
  });
  router.get("/academic-options", async (_req, res) => {
    res.json({ ...await academicOptions(db), registrationPolicy: registrationPolicy(config) });
  });
  const emailDeliveryAvailable = () => mailer.isConfigured?.() ?? true;
  function requireDelivery() {
    if (!emailDeliveryAvailable())
      throw new HttpError(
        503,
        "Email delivery is not configured. Verification and emailed password recovery are unavailable. Contact the Knoxite administrator.",
      );
  }
  router.get("/recovery-options", (_req, res) => {
    res.json({ emailDeliveryAvailable: emailDeliveryAvailable() });
  });
  // A keyed, purpose-separated hash safely reuses the expiring one-use store.
  // A recovery token (or prefixed token) cannot become a verification preimage,
  // even for a verification consumer from an older deployment revision.
  // Existing verification hashes and links retain their previous format.
  const resetTokenHash = (token: string) =>
    createHmac("sha256", config.jwtSecret)
      .update(`knoxite:password-reset:v1:${token}`)
      .digest("hex");
  const recoverable = (user: {
    isSuspended: boolean;
    role: string;
    email: string;
  }) =>
    !user.isSuspended &&
    (user.role === "ADMIN" || studentEmailAllowed(user.email, config));
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
      "termsAccepted",
      "noticeVersion",
    ]);
    const consentVersion = requireRegistrationConsent(req.body.termsAccepted, req.body.noticeVersion, config);
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
        config.institutionDomains.includes("student.fatima.edu.ph")
          ? "Use your university-issued email in the confirmed initials/surname/four-digit Laguna format. Contact the administrator for an eligibility review if your issued address differs."
          : "Use your OLFU Santa Rosa institutional email with the configured campus identifier before @.",
      );
    if (!pilotAccountAllowed(email, config))
      throw new HttpError(403, "This account is not authorized for the local OAuth pilot.");
    const passwordHash = await bcrypt.hash(password(req.body.password), 12);
    if (await db.user.findUnique({ where: { email }, select: { id: true } }))
      throw new HttpError(
        409,
        "This email is registered. Sign in or request email verification.",
      );
    const user = await db.$transaction(async tx => {
      const saved = await tx.user.create({
      data: { name, email, passwordHash, programId, yearLevelId },
      select: { id: true, email: true },
      });
      await recordRegistrationConsent(tx, saved.id, consentVersion);
      return saved;
    });
    let verificationSent = false;
    try {
      await sendVerification(user);
      verificationSent = true;
    } catch {
      /* The account remains unverified and can request delivery again. */
    }
    res.status(201).json({
      message: verificationSent
        ? "Account created. Verify your institutional email before signing in."
        : "Account created, but verification delivery is unavailable. Request verification again when delivery is restored.",
      verificationSent,
    });
  });
  router.post("/request-verification", async (req, res) => {
    onlyKeys(req.body, ["email"]);
    const email = emailAddress(req.body.email);
    requireDelivery();
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
    res.status(202).json({
      message:
        "If an eligible account exists and email delivery is available, a verification message will be sent.",
    });
  });
  router.post("/request-password-reset", async (req, res) => {
    onlyKeys(req.body, ["email"]);
    const email = emailAddress(req.body.email);
    requireDelivery();
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, isSuspended: true },
    });
    if (user && recoverable(user)) {
      const token = randomBytes(32).toString("base64url");
      const saved = await db.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: resetTokenHash(token),
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      });
      try {
        await mailer(
          user.email,
          `${config.publicAppUrl}/reset-password#token=${token}`,
          "password-reset",
        );
      } catch {
        await db.emailVerificationToken.update({
          where: { id: saved.id },
          data: { usedAt: new Date() },
        });
        // Do not disclose whether the address exists or delivery to it failed.
      }
    }
    res
      .status(202)
      .json({
        message:
          "If an eligible account exists, a password reset link will be sent. The link expires after 15 minutes. If no message arrives, contact the Knoxite administrator.",
      });
  });
  router.post("/reset-password", async (req, res) => {
    onlyKeys(req.body, ["token", "newPassword"]);
    const tokenHash = resetTokenHash(opaqueToken(req.body.token));
    const newPassword = password(req.body.newPassword);
    const saved = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    const invalid = () =>
      new HttpError(
        422,
        "Password reset link is invalid or expired. Request a new link.",
      );
    if (!saved || saved.usedAt || saved.expiresAt <= new Date())
      throw invalid();
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.$transaction(async (tx) => {
      // Serialize resets for the same account, including different valid links.
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${saved.userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: saved.userId },
        select: { email: true, role: true, isSuspended: true },
      });
      if (!user || !recoverable(user)) throw invalid();
      const consumed = await tx.emailVerificationToken.updateMany({
        where: { id: saved.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw invalid();
      await tx.user.update({
        where: { id: saved.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: saved.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.emailVerificationToken.updateMany({
        where: { userId: saved.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    res.json({
      message:
        "Password reset. Sign in with your new password. Institutional email verification is still required for unverified accounts.",
    });
  });
  router.post("/verify-email", async (req, res) => {
    onlyKeys(req.body, ["token"]);
    const tokenHash = createHash("sha256")
      .update(opaqueToken(req.body.token))
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
  router.post("/login", loginThrottle(), async (req, res) => {
    onlyKeys(req.body, ["email", "password"]);
    const email = emailAddress(req.body.email);
    if (
      typeof req.body.password !== "string" ||
      Buffer.byteLength(req.body.password) > 72
    )
      throw new HttpError(422, "Invalid password input.");
    const user = await db.user.findUnique({ where: { email } });
    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(req.body.password, user.passwordHash))
    )
      throw new HttpError(401, "Invalid email or password.");
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      if (current.passwordHash !== user.passwordHash)
        throw new HttpError(401, "Credentials changed. Please sign in again.");
      return issueSession(
        tx,
        config,
        current,
        req.get("User-Agent") || "Unknown device",
      );
    });
    res.json(result);
  });
  router.get("/session-status", auth, (req, res) => {
    res.json(req.sessionTiming ?? { enabled: false });
  });
  router.post("/session-activity", auth, async (req, res) => {
    if (!timeoutsEnabled(config)) throw new HttpError(404, "Session activity is not enabled.");
    if (!config.origins.includes(req.get("Origin") || ""))
      throw new HttpError(403, "Use the configured Knoxite application.");
    onlyKeys(req.body, ["interaction"]);
    if (!["pointer", "key", "touch", "scroll", "stay"].includes(req.body.interaction))
      throw new HttpError(422, "Explicit user interaction is required.");
    const timing = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${actor(req)} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM AuthSession WHERE id = ${req.sessionId!} FOR UPDATE`;
      const session = await tx.authSession.findFirst({
        where: { id: req.sessionId!, userId: actor(req), revokedAt: null },
        select: { createdAt: true, expiresAt: true, user: { select: {
          role: true, email: true, isSuspended: true, emailVerifiedAt: true, tokenVersion: true,
        } } },
      });
      if (!session || session.user.tokenVersion !== req.sessionTokenVersion)
        throw new HttpError(401, "Session has been revoked.");
      assertAccountAllowed(session.user, config);
      const now = new Date();
      const claims = { sessionPolicy: SESSION_POLICY, sessionRole: req.sessionIssuedRole };
      sessionDeadlines(session, session.user.role, claims, await lastInteraction(tx, req.sessionId!), now);
      await tx.$executeRaw`UPDATE AuthSession SET lastInteractiveAt = ${now}
        WHERE id = ${req.sessionId!} AND revokedAt IS NULL`;
      return sessionDeadlines(session, session.user.role, claims, now, now);
    });
    res.json(timing);
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
    if (!user.passwordHash)
      throw new HttpError(
        422,
        "Set up your email/password fallback through an emailed password reset link first.",
      );
    if (
      Buffer.byteLength(req.body.currentPassword) > 72 ||
      !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))
    )
      throw new HttpError(403, "Current password is incorrect.");
    const passwordHash = await bcrypt.hash(password(req.body.newPassword), 12);
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${user.id} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      assertAccountAllowed(current, config);
      if (
        current.passwordHash !== user.passwordHash ||
        current.tokenVersion !== user.tokenVersion
      )
        throw new HttpError(
          409,
          "Your credentials changed. Sign in again before changing your password.",
        );
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    res.json({ message: "Password updated. Sign in again on all devices." });
  });
  return router;
}
