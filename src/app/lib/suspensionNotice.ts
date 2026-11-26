export interface SuspensionNotice {
  legacy: boolean; reason: string | null; reasonExplanation: string | null;
  explanation: string; startsAt: string | null; expiresAt: string | null;
}
// Presentation-only data received after identity proof. Never a session/token,
// never persisted in browser storage, URLs or navigation history.
export function suspensionNotice(details: unknown): SuspensionNotice | null {
  const d = details as { code?: string; suspension?: SuspensionNotice } | undefined;
  const s = d?.suspension;
  if (d?.code !== "ACCOUNT_SUSPENDED" || !s || typeof s.legacy !== "boolean" || typeof s.explanation !== "string") return null;
  if (!s.legacy && (typeof s.reason !== "string" || !s.startsAt || !s.expiresAt || !Number.isFinite(Date.parse(s.startsAt)) || !Number.isFinite(Date.parse(s.expiresAt)))) return null;
  return { legacy: s.legacy, reason: typeof s.reason === "string" ? s.reason : null, reasonExplanation: typeof s.reasonExplanation === "string" ? s.reasonExplanation : null,
    explanation: s.explanation, startsAt: s.legacy ? null : s.startsAt, expiresAt: s.legacy ? null : s.expiresAt };
}
export function suspensionDate(value: string) {
  let zone = "Asia/Manila";
  try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || zone; } catch { /* Campus fallback. */ }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "long", timeZone: zone }).format(new Date(value));
}
