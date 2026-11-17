import { assertScheduledSessionEnded } from "../lib/scheduling";

export function confirmationEligibility(swap: {
  id: string; status: string; integrityVerified: boolean; agreementVersion: number;
  requesterId: string; receiverId: string; requesterSessions: number; receiverSessions: number;
  requesterApprovedAt: Date | null; receiverApprovedAt: Date | null; sessions: number; duration: number;
}, participantId: string, number: number, schedule: {swapId:string;sessionNumber:number;scheduledAt:Date} | null, now = Date.now()) {
  const validStart = schedule && Number.isFinite(schedule.scheduledAt.getTime());
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
  if (!schedule || schedule.swapId !== swap.id || schedule.sessionNumber !== number || !validStart)
    return deny("Schedule this session with your partner before confirming it.");
  if (schedule.scheduledAt.getTime() <= Math.max(swap.requesterApprovedAt.getTime(), swap.receiverApprovedAt.getTime()))
    return deny("The schedule predates final agreement approval and needs review.");
  if (Number.isInteger(swap.duration) && swap.duration >= 1 && swap.duration <= 8)
    base.scheduledEndAt = new Date(schedule.scheduledAt.getTime()+swap.duration*3600_000).toISOString();
  try { assertScheduledSessionEnded(schedule.scheduledAt, swap.duration, now); }
  catch (error) { return deny(error instanceof Error ? error.message : "Session timing needs review."); }
  return {...base, eligible: true, reason: "This session can now be confirmed. Confirm only after participating."};
}
