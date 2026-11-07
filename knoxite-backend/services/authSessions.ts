import { Prisma, User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { AppConfig, studentEmailAllowed } from "../lib/config";
import { HttpError } from "../lib/http";

export function assertAccountAllowed(
  user: Pick<User, "role" | "email" | "isSuspended" | "emailVerifiedAt">,
  config: AppConfig,
) {
  if (user.role === "USER" && !studentEmailAllowed(user.email, config))
    throw new HttpError(
      403,
      "This student account does not meet the configured Santa Rosa institutional email rule.",
    );
  if (user.isSuspended) throw new HttpError(403, "This account is suspended.");
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
  assertAccountAllowed(user, config);
  const session = await tx.authSession.create({
    data: {
      userId: user.id,
      userAgent: userAgent.slice(0, 191),
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
