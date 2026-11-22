import { scheduledSessionEnd } from "../lib/scheduling";
import { HttpError } from "../lib/http";

// The time participation occurred is separate from the server's confirmedAt audit time.
export function actualCompletionTime(value: unknown, now = Date.now()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    throw new HttpError(422, "Enter the actual session completion date and time.");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())
    throw new HttpError(422, "Enter a valid actual completion date.");
  const completedAt = new Date(value);
  if (!Number.isFinite(completedAt.getTime()) || completedAt.getTime() > now)
    throw new HttpError(422, "Actual completion must be a valid time that is not in the future.");
  return completedAt;
}

export function confirmationEligibility(swap: {
  id: string; status: string; integrityVerified: boolean; agreementVersion: number;
  requesterId: string; receiverId: string; requesterSessions: number; receiverSessions: number;
  requesterApprovedAt: Date | null; receiverApprovedAt: Date | null; sessions: number; duration: number | null;
}, participantId: string, number: number, schedule: {swapId:string;sessionNumber:number;scheduledAt:Date;endsAt?:Date|null} | null, now = Date.now()) {
  const validStart = schedule && schedule.swapId === swap.id && schedule.sessionNumber === number && Number.isFinite(schedule.scheduledAt.getTime());
  const base = { sessionNumber: number, eligible: false, serverNow: new Date(now).toISOString(), scheduledAt: validStart ? schedule!.scheduledAt.toISOString() : null, scheduledEndAt: null as string|null };
  const deny = (reason:string) => ({...base, reason});
  if (![swap.requesterId, swap.receiverId].includes(participantId)) return deny("Only exchange participants can confirm sessions.");
  if (swap.status !== "CONFIRMED" || !swap.integrityVerified) return deny("Only an active, confirmed agreement permits new confirmations.");
  const count = swap.requesterId === participantId ? swap.requesterSessions : swap.receiverSessions;
  if (!Number.isInteger(number) || number < 1 || number > swap.sessions || number !== count + 1)
    return deny(number <= count ? "Your confirmation is already recorded." : "Confirm the next session within your agreement.");
  if (!swap.requesterApprovedAt || !swap.receiverApprovedAt || !Number.isInteger(swap.agreementVersion) || swap.agreementVersion < 1 ||
      !Number.isFinite(swap.requesterApprovedAt.getTime()) || !Number.isFinite(swap.receiverApprovedAt.getTime()))
    return deny("The agreement approval history needs administrator review.");
  // Scheduling is planning information, never evidence that participation occurred.
  // Keep a valid saved schedule for reference, including historical fixed terms.
  if (schedule && schedule.swapId === swap.id && schedule.sessionNumber === number && validStart) {
    try { base.scheduledEndAt = scheduledSessionEnd(schedule.scheduledAt, swap.duration, schedule.endsAt).toISOString(); }
    catch { /* An invalid historical schedule must not fabricate a completion time. */ }
  }
  return {...base, eligible: true, reason: "Confirm only a session you actually completed. Your partner must confirm independently; scheduling is optional."};
}
