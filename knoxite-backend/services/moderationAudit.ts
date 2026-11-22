import { HttpError, text } from "../lib/http";
export const MODERATION_REASONS = ["HARASSMENT", "INAPPROPRIATE", "SPAM", "PRIVACY", "OTHER"] as const;
export function moderationReason(body: { reason?: unknown; explanation?: unknown }) {
  const reason = text(body.reason, "Moderation reason", 32);
  if (!MODERATION_REASONS.includes(reason as typeof MODERATION_REASONS[number])) throw new HttpError(422, "Choose a supported moderation reason.");
  const explanation = text(body.explanation ?? "", "Explanation", 250, reason !== "OTHER");
  if (reason !== "OTHER" && explanation) throw new HttpError(422, "Use an explanation only for Other.");
  return { reason, explanation: explanation || null };
}
