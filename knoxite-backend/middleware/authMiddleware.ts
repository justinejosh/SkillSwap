import { PrismaClient, Role } from "@prisma/client";
import { Request, RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppConfig, studentEmailAllowed, pilotSessionAccountAllowed } from "../lib/config";
import { HttpError } from "../lib/http";
import { lastInteraction, sessionDeadlines, timeoutsEnabled, SESSION_POLICY } from "../services/sessionPolicy";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      sessionId?: string;
      sessionTokenVersion?: number;
      sessionIssuedRole?: Role;
      sessionTiming?: ReturnType<typeof sessionDeadlines>;
    }
  }
}
export interface AuthRequest extends Request {}
export function actor(req: Request): string {
  if (!req.userId) throw new HttpError(401, "Authentication required.");
  return req.userId;
}
export function authentication(
  db: PrismaClient,
  config: AppConfig,
): RequestHandler {
  return async (req, _res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.header("Authorization") || "");
    if (!match) throw new HttpError(401, "Authentication required.");
    let claims: JwtPayload;
    try {
      const decoded = jwt.verify(match[1], config.jwtSecret, {
        algorithms: ["HS256"],
        audience: "knoxite",
        issuer: "knoxite-api",
      });
      if (
        typeof decoded === "string" ||
        typeof decoded.sub !== "string" ||
        !decoded.sub ||
        typeof decoded.jti !== "string" ||
        !Number.isInteger(decoded.tokenVersion)
      )
        throw new Error("Invalid claims");
      claims = decoded;
    } catch {
      throw new HttpError(
        401,
        "Invalid or expired session. Please sign in again.",
      );
    }
    const session = await db.authSession.findFirst({
      where: {
        id: claims.jti,
        userId: claims.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isSuspended: true,
            tokenVersion: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
    if (!session || session.user.tokenVersion !== claims.tokenVersion)
      throw new HttpError(401, "Session has been revoked.");
    if (timeoutsEnabled(config) && claims.sessionPolicy === SESSION_POLICY && claims.sessionRole !== session.user.role) {
      await db.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new HttpError(401, "Your account role changed. Please sign in again.");
    }
    if (timeoutsEnabled(config))
      req.sessionTiming = sessionDeadlines(session, session.user.role, claims,
        await lastInteraction(db, session.id));
    if (!pilotSessionAccountAllowed(session.user, config))
      throw new HttpError(403, "This account is not authorized for the local OAuth pilot.");
    if (
      session.user.role === "USER" &&
      !studentEmailAllowed(session.user.email, config)
    )
      throw new HttpError(
        403,
        "This student account is outside the configured campus email rule.",
      );
    if (session.user.isSuspended)
      throw new HttpError(403, "This account is suspended.");
    if (config.verificationRequired && !session.user.emailVerifiedAt)
      throw new HttpError(
        403,
        "Verify your institutional email before continuing.",
      );
    req.userId = session.user.id;
    req.userRole = session.user.role;
    req.sessionId = session.id;
    req.sessionTokenVersion = claims.tokenVersion;
    req.sessionIssuedRole = claims.sessionRole as Role | undefined;
    next();
  };
}
export const requireAdmin: RequestHandler = (req, _res, next) => {
  actor(req);
  if (req.userRole !== "ADMIN")
    throw new HttpError(403, "Administrator access required.");
  next();
};
export const requireStudent: RequestHandler = (req, _res, next) => {
  actor(req);
  if (req.userRole !== "USER")
    throw new HttpError(403, "Student access required.");
  next();
};
