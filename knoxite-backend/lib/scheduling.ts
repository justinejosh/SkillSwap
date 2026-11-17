import { HttpError } from "./http";

// Explicit offsets avoid interpreting API timestamps in the server's timezone.
export function parseScheduledAt(raw: string): Date {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.exec(raw);
  const start = new Date(raw);
  if (!parts || !Number.isFinite(start.getTime()))
    throw new HttpError(422, "Choose a valid session date and time with a timezone.");
  const offset = parts[7] === "Z" ? 0 : (parts[7][0] === "+" ? 1 : -1) * (Number(parts[7].slice(1, 3)) * 60 + Number(parts[7].slice(4)));
  const wall = new Date(start.getTime() + offset * 60_000);
  const actual = [wall.getUTCFullYear(), wall.getUTCMonth() + 1, wall.getUTCDate(), wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds()];
  if (actual.some((n, i) => n !== Number(parts[i + 1] || 0)))
    throw new HttpError(422, "Choose a valid calendar date and time.");
  return start;
}

export function assertScheduleTime(start: Date, requesterApproval: Date | null, receiverApproval: Date | null, now = Date.now()) {
  if (!Number.isFinite(start.getTime()) || start.getTime() <= now || start.getTime() > now + 366 * 86400_000)
    throw new HttpError(422, "Choose a session start strictly in the future, within one year.");
  if (!requesterApproval || !receiverApproval || !Number.isFinite(requesterApproval.getTime()) || !Number.isFinite(receiverApproval.getTime()))
    throw new HttpError(409, "This agreement's approval history needs administrator review before scheduling.");
  if (start.getTime() <= Math.max(requesterApproval.getTime(), receiverApproval.getTime()))
    throw new HttpError(422, "Choose a session start after both students approved the agreement.");
}

// Enforced for new confirmations. Historical acknowledgements are not rewritten.
// This is an elapsed-time prerequisite, not evidence of actual attendance.
export function assertScheduledSessionEnded(start: Date | null, durationHours: number, now = Date.now()) {
  if (!start || !Number.isFinite(start.getTime()) || !Number.isFinite(now))
    throw new HttpError(409, "A valid schedule is required before confirming this session.");
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 8)
    throw new HttpError(409, "The agreed session duration needs review.");
  const end = start.getTime() + durationHours * 3600_000;
  if (!Number.isFinite(end) || now < end)
    throw new HttpError(409, "Confirm this session after its agreed scheduled end time.");
}
