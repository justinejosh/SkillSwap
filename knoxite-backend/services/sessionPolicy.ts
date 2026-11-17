import { Prisma, Role } from "@prisma/client";
import { AppConfig } from "../lib/config";
import { HttpError } from "../lib/http";

export const SESSION_POLICY = "role-idle-absolute-v1";
export const SESSION_WARNING_MS = 5 * 60_000;
export function sessionLimits(role: Role) {
  return role === "ADMIN"
    ? { idleMs: 15 * 60_000, absoluteMs: 4 * 3600_000 }
    : { idleMs: 30 * 60_000, absoluteMs: 8 * 3600_000 };
}
type QueryClient = Pick<Prisma.TransactionClient, "$queryRaw">;
export async function lastInteraction(db: QueryClient, id: string) {
  // Staged SQL-only field: the shared Prisma model/client must remain compatible
  // with recovery-1, which is explicitly not authorized for this migration.
  const rows = await db.$queryRaw<Array<{ lastInteractiveAt: Date | null }>>`
    SELECT lastInteractiveAt FROM AuthSession WHERE id = ${id}`;
  return rows[0]?.lastInteractiveAt ?? null;
}
export function sessionDeadlines(
  session: { createdAt: Date; expiresAt: Date }, role: Role,
  claims: Record<string, unknown>,
  lastInteractiveAt: Date | null, now = new Date(),
) {
  const limits = sessionLimits(role);
  if (claims.sessionPolicy !== SESSION_POLICY || claims.sessionRole !== role ||
      !lastInteractiveAt || !Number.isFinite(lastInteractiveAt.getTime()) ||
      lastInteractiveAt > now || lastInteractiveAt < session.createdAt)
    throw new HttpError(401, "Sign in again to establish a current session.");
  const absolute = Math.min(session.expiresAt.getTime(), session.createdAt.getTime() + limits.absoluteMs);
  const idle = lastInteractiveAt.getTime() + limits.idleMs;
  if (now.getTime() >= Math.min(absolute, idle))
    throw new HttpError(401, "Your session expired. Please sign in again.");
  return {
    enabled: true as const, policy: SESSION_POLICY, serverNow: now.toISOString(),
    idleExpiresAt: new Date(idle).toISOString(), absoluteExpiresAt: new Date(absolute).toISOString(),
    warningSeconds: SESSION_WARNING_MS / 1000,
  };
}
export function timeoutsEnabled(config: AppConfig) { return config.sessionTimeouts === true; }
