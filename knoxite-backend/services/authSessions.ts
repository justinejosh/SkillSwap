import { Prisma, User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { AppConfig, studentEmailAllowed, pilotSessionAccountAllowed } from "../lib/config";
import { HttpError } from "../lib/http";
import { SESSION_POLICY, sessionLimits, timeoutsEnabled } from "./sessionPolicy";
import { reconcileStudentSuspension, studentSuspensionNotice } from "./studentSuspensions";

export function assertIdentityAllowed(
  user: Pick<User, "role" | "email" | "isSuspended" | "emailVerifiedAt"> & { id?: string },
  config: AppConfig,
) {
  if (!pilotSessionAccountAllowed(user, config))
    throw new HttpError(403, "This account is not authorized for the local OAuth pilot.");
  if (user.role === "USER" && !studentEmailAllowed(user.email, config))
    throw new HttpError(
      403,
      "This student account does not meet the configured Santa Rosa institutional email rule.",
    );
}
export function assertAccountAllowed(user: Pick<User, "role" | "email" | "isSuspended" | "emailVerifiedAt"> & { id?: string; activeSuspensionId?: string | null }, config: AppConfig) {
  assertIdentityAllowed(user, config);
  if (user.isSuspended || user.activeSuspensionId) throw new HttpError(403, "This account is suspended.");
  if (config.verificationRequired && !user.emailVerifiedAt)
    throw new HttpError(
      403,
      "Verify your institutional email before signing in.",
    );
}

// Call inside the caller's user-locked transaction, after credential validation.
export async function issueSession(
  tx: Prisma.TransactionClient,
  config: AppConfig,
  user: User,
  userAgent: string,
) {
  user = await reconcileStudentSuspension(tx, user);
  assertAccountAllowed(user, config);
  const policy = timeoutsEnabled(config);
  // JWT NumericDate uses whole seconds. Persist the identical origin/deadline.
  const now = new Date(policy ? Math.floor(Date.now() / 1000) * 1000 : Date.now());
  const lifetime = policy ? sessionLimits(user.role).absoluteMs : 7 * 86400_000;
  const session = await tx.authSession.create({
    data: {
      userId: user.id,
      userAgent: userAgent.slice(0, 191),
      createdAt: now,
      expiresAt: new Date(now.getTime() + lifetime),
    },
  });
  if (policy)
    await tx.$executeRaw`UPDATE AuthSession SET lastInteractiveAt = ${now} WHERE id = ${session.id}`;
  const token = jwt.sign(
    { tokenVersion: user.tokenVersion, ...(policy ? { iat: now.getTime() / 1000, sessionPolicy: SESSION_POLICY, sessionRole: user.role } : {}) },
    config.jwtSecret,
    {
      subject: user.id,
      jwtid: session.id,
      expiresIn: lifetime / 1000,
      algorithm: "HS256",
      issuer: "knoxite-api",
      audience: "knoxite",
    },
  );
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
}

// Only use after password verification or signed, linked Google identity proof.
// Returning a notice instead of throwing lets authoritative expiration commit.
export async function verifiedIdentityLogin(tx: Prisma.TransactionClient, config: AppConfig, user: User, userAgent: string) {
  user = await reconcileStudentSuspension(tx, user);
  assertIdentityAllowed(user, config);
  if (user.isSuspended || user.activeSuspensionId) return { suspension: await studentSuspensionNotice(tx, user) };
  return issueSession(tx, config, user, userAgent);
}
