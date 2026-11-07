import { PrismaClient, Role } from "@prisma/client";
import { Request, RequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppConfig, studentEmailAllowed } from "../lib/config";
import { HttpError } from "../lib/http";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
      sessionId?: string;
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
