import express, { Request } from "express";
import { requireRegistrationConsent, recordRegistrationConsent } from "../services/registrationConsent";
import { GoogleAuthChallenge, Prisma, PrismaClient } from "@prisma/client";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import { AppConfig, studentEmailAllowed, pilotAccountAllowed } from "../lib/config";
import { HttpError, onlyKeys, text } from "../lib/http";
import {
  actor,
  authentication,
  requireStudent,
} from "../middleware/authMiddleware";
import {
  eligibleGoogleIdentity,
  GoogleVerifier,
} from "../services/googleIdentity";
import { issueSession } from "../services/authSessions";
import { validateAcademicSelection } from "../services/academics";
import { throttle } from "./auth";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const collision = () =>
  new HttpError(
    409,
    "This identity or email already belongs to a Knoxite account. Sign in using your existing method, then link Google in Account security. Use account recovery if needed.",
  );
const invalid = () =>
  new HttpError(
    422,
    "Google sign-in expired or was already used. Start again.",
  );
function sameHash(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}

export function googleRouter(
  db: PrismaClient,
  config: AppConfig,
  verify: GoogleVerifier,
) {
  const router = express.Router();
  const auth = authentication(db, config);
  const transact = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) =>
    db.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 15000,
    });
  router.get("/providers", (_req, res) =>
    res.json({
      google: {
        enabled: config.google.enabled,
        ...(config.google.enabled ? { clientId: config.google.clientId } : {}),
      },
    }),
  );
  // Works against the old schema while Google is disabled: no new-table query.
  router.get("/methods", auth, async (req, res) => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: actor(req) },
      select: { passwordHash: true, email: true, role: true },
    });
    const identity =
      config.google.enabled && user.role === "USER"
        ? await db.externalIdentity.findUnique({
            where: {
              userId_provider: { userId: actor(req), provider: "GOOGLE" },
            },
            select: { id: true },
          })
        : null;
    res.json({
      hasPassword: !!user.passwordHash,
      email: user.email,
      googleEnabled: config.google.enabled && user.role === "USER",
      googleLinked: config.google.enabled ? !!identity : null,
    });
  });
  router.use(
    "/google",
    (req, _res, next) => {
      if (!config.google.enabled)
        throw new HttpError(
          503,
          "Google Sign-In is disabled pending institutional and security approval. Use email and password.",
        );
      if (!config.origins.includes(req.get("Origin") || ""))
        throw new HttpError(403, "Unapproved authentication origin.");
      if (!req.is("application/json"))
        throw new HttpError(415, "Use an application/json request.");
      next();
    },
    throttle(),
  );

  async function freshPassword(req: Request) {
    const user = await db.user.findUniqueOrThrow({ where: { id: actor(req) } });
    if (!user.passwordHash)
      throw new HttpError(
        422,
        "Set up your email/password fallback through account recovery before changing linked sign-in methods.",
      );
    if (
      typeof req.body.currentPassword !== "string" ||
      Buffer.byteLength(req.body.currentPassword) > 72 ||
      !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))
    )
      throw new HttpError(403, "Current password is incorrect.");
    return user;
  }
  async function challenge(req: Request, purpose: "LOGIN" | "LINK") {
    const browserProofHash = text(
      req.body.browserProofHash,
      "Browser proof",
      64,
    );
    if (!/^[a-f0-9]{64}$/.test(browserProofHash)) throw invalid();
    const user = purpose === "LINK" ? await freshPassword(req) : null;
    const nonce = random();
    await db.googleAuthChallenge.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const saved = await db.googleAuthChallenge.create({
      data: {
        purpose,
        nonceHash: digest(nonce),
        browserProofHash,
        policyVersion: config.google.policyVersion,
        userId: user?.id,
        sessionId: user ? req.sessionId : null,
        tokenVersion: user?.tokenVersion,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    return { challengeId: saved.id, nonce };
  }
  router.post("/google/challenge", async (req, res) => {
    onlyKeys(req.body, ["browserProofHash"]);
    res.json(await challenge(req, "LOGIN"));
  });
  router.post(
    "/google/link/challenge",
    auth,
    requireStudent,
    async (req, res) => {
      onlyKeys(req.body, ["browserProofHash", "currentPassword"]);
      res.json(await challenge(req, "LINK"));
    },
  );

  function validateChallenge(
    saved: GoogleAuthChallenge | null,
    req: Request,
    purpose: string,
  ) {
    const proof = req.body.browserProof;
    if (
      !saved ||
      saved.purpose !== purpose ||
      saved.usedAt ||
      saved.expiresAt <= new Date() ||
      saved.policyVersion !== config.google.policyVersion ||
      typeof proof !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(proof) ||
      !sameHash(saved.browserProofHash, digest(proof))
    )
      throw invalid();
    if (
      purpose === "LINK" &&
      (saved.userId !== actor(req) || saved.sessionId !== req.sessionId)
    )
      throw invalid();
    return saved;
  }
  async function consume(tx: Prisma.TransactionClient, id: string) {
    const changed = await tx.googleAuthChallenge.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (changed.count !== 1) throw invalid();
  }
  async function credential(req: Request, purpose: "LOGIN" | "LINK") {
    onlyKeys(req.body, ["challengeId", "credential", "browserProof"]);
    const id = text(req.body.challengeId, "Challenge", 100);
    const saved = validateChallenge(
      await db.googleAuthChallenge.findUnique({ where: { id } }),
      req,
      purpose,
    );
    const payload = await verify(
      text(req.body.credential, "Google credential", 16384),
      config.google.clientId,
    );
    const identity = eligibleGoogleIdentity(payload, config);
    const nonce = (payload as typeof payload & { nonce?: string }).nonce;
    if (
      typeof nonce !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(nonce) ||
      !sameHash(saved.nonceHash, digest(nonce))
    )
      throw invalid();
    return { saved, identity };
  }
  router.post("/google/login", async (req, res) => {
    const { saved, identity } = await credential(req, "LOGIN");
    const result = await transact(async (tx) => {
      await consume(tx, saved.id);
      const linked = await tx.externalIdentity.findUnique({
        where: {
          provider_subject: { provider: "GOOGLE", subject: identity.subject },
        },
      });
      if (linked) {
        await tx.$queryRaw`SELECT id FROM User WHERE id = ${linked.userId} FOR UPDATE`;
        const currentLink = await tx.externalIdentity.findUnique({
          where: { id: linked.id },
        });
        const user = await tx.user.findUniqueOrThrow({
          where: { id: linked.userId },
        });
        if (
          !currentLink ||
          user.role !== "USER" ||
          user.email.toLowerCase() !== identity.email
        )
          throw new HttpError(
            403,
            "The linked institutional identity changed. Contact the administrator.",
          );
        const session = await issueSession(
          tx,
          config,
          user,
          req.get("User-Agent") || "Unknown device",
        );
        await tx.externalIdentity.update({
          where: { id: linked.id },
          data: {
            lastVerifiedAt: new Date(),
            verifiedEmail: identity.email,
            hostedDomain: identity.hostedDomain,
            policyVersion: config.google.policyVersion,
          },
        });
        return session;
      }
      if (
        await tx.user.findUnique({
          where: { email: identity.email },
          select: { id: true },
        })
      )
        throw collision();
      const pending = await tx.googleAuthChallenge.create({
        data: {
          purpose: "ONBOARD",
          nonceHash: saved.nonceHash,
          browserProofHash: saved.browserProofHash,
          policyVersion: config.google.policyVersion,
          subject: identity.subject,
          verifiedEmail: identity.email,
          hostedDomain: identity.hostedDomain,
          displayName: identity.name,
          expiresAt: saved.expiresAt,
        },
      });
      return {
        requiresOnboarding: true,
        onboardingId: pending.id,
        email: identity.email,
        name: identity.name,
      };
    });
    res.json(result);
  });
  router.post("/google/onboard", async (req, res) => {
    onlyKeys(req.body, [
      "onboardingId",
      "browserProof",
      "name",
      "programId",
      "yearLevelId",
      "termsAccepted",
      "noticeVersion",
    ]);
    if (req.body.termsAccepted !== true)
      throw new HttpError(
        422,
        "Accept the Terms of Service and Privacy Policy.",
      );
    const consentVersion = requireRegistrationConsent(req.body.termsAccepted, req.body.noticeVersion, config);
    const id = text(req.body.onboardingId, "Onboarding", 100);
    const name = text(req.body.name, "Display name", 100);
    const programId = text(req.body.programId, "College program");
    const yearLevelId = text(req.body.yearLevelId, "Year level");
    const result = await transact(async (tx) => {
      await tx.$queryRaw`SELECT id FROM GoogleAuthChallenge WHERE id = ${id} FOR UPDATE`;
      const pending = validateChallenge(
        await tx.googleAuthChallenge.findUnique({ where: { id } }),
        req,
        "ONBOARD",
      );
      if (!pending.subject || !pending.verifiedEmail || !pending.hostedDomain)
        throw invalid();
      if (
        !config.google.hostedDomains.includes(pending.hostedDomain) ||
        !studentEmailAllowed(pending.verifiedEmail, config)
      )
        throw invalid();
      if (!pilotAccountAllowed(pending.verifiedEmail, config))
        throw new HttpError(403, "This account is not authorized for the local OAuth pilot.");
      await validateAcademicSelection(tx, programId, yearLevelId);
      await consume(tx, id);
      if (
        (await tx.user.findUnique({
          where: { email: pending.verifiedEmail },
          select: { id: true },
        })) ||
        (await tx.externalIdentity.findUnique({
          where: {
            provider_subject: { provider: "GOOGLE", subject: pending.subject },
          },
        }))
      )
        throw collision();
      const user = await tx.user.create({
        data: {
          name,
          email: pending.verifiedEmail,
          passwordHash: null,
          role: "USER",
          emailVerifiedAt: new Date(),
          programId,
          yearLevelId,
        },
      });
      await recordRegistrationConsent(tx, user.id, consentVersion);
      await tx.externalIdentity.create({
        data: {
          provider: "GOOGLE",
          subject: pending.subject,
          userId: user.id,
          verifiedEmail: pending.verifiedEmail,
          hostedDomain: pending.hostedDomain,
          policyVersion: config.google.policyVersion,
        },
      });
      return issueSession(
        tx,
        config,
        user,
        req.get("User-Agent") || "Unknown device",
      );
    });
    res.status(201).json(result);
  });
  router.post("/google/link", auth, requireStudent, async (req, res) => {
    const { saved, identity } = await credential(req, "LINK");
    await transact(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${actor(req)} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor(req) },
      });
      const session = await tx.authSession.findFirst({
        where: {
          id: req.sessionId,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (
        !session ||
        user.role !== "USER" ||
        user.tokenVersion !== saved.tokenVersion ||
        user.isSuspended ||
        !user.emailVerifiedAt ||
        user.email.toLowerCase() !== identity.email
      )
        throw new HttpError(
          403,
          "The authenticated account and institutional Google identity must match. Start again if your account changed.",
        );
      await consume(tx, saved.id);
      if (
        await tx.externalIdentity.findFirst({
          where: {
            OR: [
              { provider: "GOOGLE", subject: identity.subject },
              { provider: "GOOGLE", userId: user.id },
            ],
          },
        })
      )
        throw collision();
      await tx.externalIdentity.create({
        data: {
          provider: "GOOGLE",
          subject: identity.subject,
          userId: user.id,
          verifiedEmail: identity.email,
          hostedDomain: identity.hostedDomain,
          policyVersion: config.google.policyVersion,
        },
      });
    });
    res.json({
      message:
        "Google linked to your existing account. Your profile and exchange history are preserved.",
    });
  });
  router.delete("/google/link", auth, requireStudent, async (req, res) => {
    onlyKeys(req.body, ["currentPassword"]);
    const verified = await freshPassword(req);
    await transact(async (tx) => {
      await tx.$queryRaw`SELECT id FROM User WHERE id = ${actor(req)} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor(req) },
      });
      const session = await tx.authSession.findFirst({
        where: {
          id: req.sessionId,
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (
        !session ||
        user.role !== "USER" ||
        user.passwordHash !== verified.passwordHash ||
        user.tokenVersion !== verified.tokenVersion ||
        !user.emailVerifiedAt ||
        user.isSuspended
      )
        throw invalid();
      await tx.externalIdentity.deleteMany({
        where: { userId: user.id, provider: "GOOGLE" },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.googleAuthChallenge.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    res.json({
      message: "Google unlinked. Sign in again using email and password.",
    });
  });
  return router;
}
