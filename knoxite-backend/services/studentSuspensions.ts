import { Prisma, PrismaClient, User, SuspensionReason } from "@prisma/client";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { AppConfig } from "../lib/config";
import { HttpError, onlyKeys, text } from "../lib/http";
import { transaction } from "../lib/transaction";

export const suspensionReasons: Record<SuspensionReason, string> = {
  HARASSMENT: "Harassment or inappropriate behavior",
  REPEATED_VIOLATIONS: "Repeated platform violations",
  FRAUDULENT_EXCHANGE: "Fraudulent exchange activity",
  SPAM_MISUSE: "Spam or misuse",
  ELIGIBILITY_VIOLATION: "Verified eligibility violation",
  OTHER: "Other",
};
export const suspensionDays = [1, 3, 7, 14, 30] as const;
export const SUSPENSION_PROTOCOL_VERSION = 2;
type State = Pick<User, "id" | "role" | "isSuspended" | "activeSuspensionId" | "tokenVersion">;
export interface SuspensionInput {
  reason: SuspensionReason; durationDays: number; reasonExplanation: string | null;
  studentExplanation: string; privateNotes: string | null;
}
export function suspensionInput(body: unknown, confirmation = false): SuspensionInput {
  onlyKeys(body, ["reason", "durationDays", "reasonExplanation", "studentExplanation", "privateNotes", ...(confirmation ? ["confirmationToken"] : [])]);
  const b = body as Record<string, unknown>;
  if (typeof b.reason !== "string" || !Object.hasOwn(suspensionReasons, b.reason)) throw new HttpError(422, "Select a supported suspension reason.");
  if (typeof b.durationDays !== "number" || !suspensionDays.includes(b.durationDays as any)) throw new HttpError(422, "Select 24 hours, 3, 7, 14 or 30 days.");
  const reasonExplanation = text(b.reasonExplanation ?? "", "Other reason explanation", 500, b.reason !== "OTHER");
  if (b.reason !== "OTHER" && reasonExplanation) throw new HttpError(422, "Only Other uses an additional reason explanation.");
  return { reason: b.reason as SuspensionReason, durationDays: b.durationDays, reasonExplanation: reasonExplanation || null,
    studentExplanation: text(b.studentExplanation, "Student-facing explanation", 2000), privateNotes: text(b.privateNotes ?? "", "Private administrator notes", 2000, true) || null };
}
const digest = (input: SuspensionInput) => createHash("sha256").update(JSON.stringify(input)).digest("hex");
const quoteIssuer = "knoxite-suspension-preview", quoteAudience = "knoxite-suspension-confirmation";
function requireCreation(config: AppConfig) {
  if (config.suspensionCreationEnabled !== true) throw new HttpError(503, "New suspensions are disabled. Existing restrictions, expiry and history remain active.");
}

// Call under the stable User row lock. Only the exact owned restriction can be
// released. A separate token-version change leaves access restricted for review.
export async function reconcileStudentSuspension<T extends State>(tx: Prisma.TransactionClient, user: T, now = new Date()): Promise<T> {
  if (!user.activeSuspensionId) return user;
  const record = await tx.studentSuspension.findUnique({ where: { id: user.activeSuspensionId } });
  if (!record || record.userId !== user.id || record.status !== "ACTIVE" || record.expiresAt > now) return user;
  const release = user.role === "USER" && user.isSuspended && user.tokenVersion === record.enforcedTokenVersion;
  await tx.studentSuspension.update({ where: { id: record.id }, data: { status: "EXPIRED", expiredAt: now, reactivatedAt: release ? now : null } });
  await tx.suspensionAudit.create({ data: { suspensionId: record.id, action: release ? "EXPIRED" : "EXPIRED_RESTRICTION_RETAINED", createdAt: now } });
  await tx.user.update({ where: { id: user.id }, data: { activeSuspensionId: null, ...(release ? { isSuspended: false } : {}) } });
  // Never un-revoke sessions or reduce tokenVersion.
  return { ...user, activeSuspensionId: null, ...(release ? { isSuspended: false } : {}) };
}
export async function reconcileSuspensionById(db: PrismaClient, id: string) {
  return transaction(db, async tx => {
    await tx.$queryRaw`SELECT id FROM User WHERE id = ${id} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id } });
    return user ? reconcileStudentSuspension(tx, user) : null;
  });
}
export async function reconcileDueSuspensions(db: PrismaClient) {
  // Bounded batches, no dependence on an awake worker. Each record changes
  // state transactionally, so concurrent directory requests cannot double-expire.
  const now = new Date(); let after = "";
  for (;;) {
    const due = await db.studentSuspension.findMany({ where: { status: "ACTIVE", expiresAt: { lte: now }, ...(after ? { id: { gt: after } } : {}), user: { activeSuspensionId: { not: null } } }, select: { id: true, userId: true }, take: 100, orderBy: { id: "asc" } });
    if (!due.length) return;
    for (const { userId } of due) await reconcileSuspensionById(db, userId);
    after = due[due.length - 1].id;
    if (due.length < 100) return;
  }
}

export async function studentSuspensionNotice(tx: Prisma.TransactionClient, user: State) {
  const record = user.activeSuspensionId ? await tx.studentSuspension.findUnique({ where: { id: user.activeSuspensionId } }) : null;
  if (!record || record.userId !== user.id || record.status !== "ACTIVE" || record.enforcedTokenVersion !== user.tokenVersion) {
    return { legacy: true, reason: null, reasonExplanation: null, explanation: "Your account has a restriction that requires administrator review. An automatic restoration date is not available.", startsAt: null, expiresAt: null };
  }
  return { legacy: false, reason: suspensionReasons[record.reason], reasonExplanation: record.reasonExplanation, explanation: record.studentExplanation,
    startsAt: record.startsAt.toISOString(), expiresAt: record.expiresAt.toISOString() };
}

export interface AdministratorAuthority { id: string; tokenVersion: number; sessionId: string }
async function lockedTarget(tx: Prisma.TransactionClient, authority: AdministratorAuthority, id: string) {
  for (const userId of [...new Set([authority.id, id])].sort()) await tx.$queryRaw`SELECT id FROM User WHERE id = ${userId} FOR UPDATE`;
  const admin = await tx.user.findUnique({ where: { id: authority.id } });
  const session = await tx.authSession.findFirst({ where: { id: authority.sessionId, userId: authority.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
  if (!session || !admin || admin.role !== "ADMIN" || admin.isSuspended || admin.activeSuspensionId || admin.tokenVersion !== authority.tokenVersion) throw new HttpError(403, "Active administrator authorization is required.");
  const target = await tx.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Student account not found.");
  if (target.role !== "USER") throw new HttpError(403, "Administrator accounts cannot be suspended.");
  const current = await reconcileStudentSuspension(tx, target);
  if (current.isSuspended || current.activeSuspensionId) throw new HttpError(409, "This account is already restricted. Review its suspension history.");
  return current;
}
export async function previewStudentSuspension(db: PrismaClient, config: AppConfig, authority: AdministratorAuthority, id: string, body: unknown) {
  requireCreation(config);
  const input = suspensionInput(body);
  return transaction(db, async tx => {
    const user = await lockedTarget(tx, authority, id);
    const reviewedAt = new Date();
    // Review proof binds identity and terms, never the eventual suspension time.
    // Version 2 rejects pre-correction proofs; it grants no API/login session.
    const confirmationToken = jwt.sign({ proofVersion: SUSPENSION_PROTOCOL_VERSION, subjectUserId: id, administratorId: authority.id, sessionId: authority.sessionId, digest: digest(input), reviewedAt: reviewedAt.toISOString() }, config.jwtSecret,
      { algorithm: "HS256", issuer: quoteIssuer, audience: quoteAudience, expiresIn: 120 });
    return { student: { name: user.name, email: user.email }, reviewedAt, confirmationToken };
  });
}
export async function suspendStudent(db: PrismaClient, config: AppConfig, authority: AdministratorAuthority, id: string, body: unknown) {
  requireCreation(config);
  const input = suspensionInput(body, true);
  let quote: jwt.JwtPayload;
  try {
    const value = jwt.verify(text((body as any).confirmationToken, "Confirmation", 3000), config.jwtSecret, { algorithms: ["HS256"], issuer: quoteIssuer, audience: quoteAudience });
    if (typeof value === "string" || value.proofVersion !== SUSPENSION_PROTOCOL_VERSION || value.subjectUserId !== id || value.administratorId !== authority.id || value.sessionId !== authority.sessionId || value.digest !== digest(input)) throw new Error();
    quote = value;
  } catch { throw new HttpError(409, "Review the suspension again; its confirmation is missing, changed or expired."); }
  return transaction(db, async tx => {
    const user = await lockedTarget(tx, authority, id), now = new Date();
    const reviewedAt = new Date(quote.reviewedAt);
    // Recheck inside the transaction: waiting for a lock cannot extend validity.
    if (!Number.isFinite(+reviewedAt) || +reviewedAt > +now || +now - +reviewedAt >= 120_000 || !Number.isInteger(quote.exp) || +now >= quote.exp! * 1000) throw new HttpError(409, "Review the suspension again; its confirmation expired.");
    const startsAt = now, expiresAt = new Date(+now + input.durationDays * 86400_000);
    const suspension = await tx.studentSuspension.create({ data: { userId: id, administratorId: authority.id, ...input, startsAt, expiresAt, createdAt: now, updatedAt: now, enforcedTokenVersion: user.tokenVersion + 1 } });
    await tx.user.update({ where: { id }, data: { isSuspended: true, activeSuspensionId: suspension.id, tokenVersion: { increment: 1 } } });
    await tx.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } });
    await tx.suspensionAudit.create({ data: { suspensionId: suspension.id, actorAdministratorId: authority.id, action: "SUSPENDED", createdAt: now } });
    return { message: "Student temporarily suspended. Existing sessions were revoked; account history is retained.", suspension };
  });
}
