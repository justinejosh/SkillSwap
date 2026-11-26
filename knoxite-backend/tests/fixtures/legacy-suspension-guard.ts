// Frozen legacy guard from b5c1bcead1590e6290ba1c93a0adffe64d688d10, services/authSessions.ts.
// Original function SHA-256 (LF, including final newline): c273d04856e5671aef5222ac7a8d6fe248d87936503958baa720f11caef8e41c
// Test-only compatibility evidence; never imported by application code.
import { User } from "@prisma/client";
import { AppConfig, studentEmailAllowed, pilotSessionAccountAllowed } from "../../lib/config";
import { HttpError } from "../../lib/http";
export function assertAccountAllowed(
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
  if (user.isSuspended) throw new HttpError(403, "This account is suspended.");
  if (config.verificationRequired && !user.emailVerifiedAt)
    throw new HttpError(
      403,
      "Verify your institutional email before signing in.",
    );
}
