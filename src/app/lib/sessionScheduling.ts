type Exchange = {
  status: string;
  integrityVerified: boolean;
  sessions: number;
  requesterSessions: number;
  receiverSessions: number;
};
type CalendarSession = { sessionNumber: number; confirmedByMe?: boolean; confirmedByPartner?: boolean };

// Confirmations are sequential for each participant. Either participant's
// recorded participation locks that session, even without a calendar entry.
export function sessionHasParticipation(swap: Exchange, number: number, rows: CalendarSession[] = []) {
  return number <= Math.max(swap.requesterSessions, swap.receiverSessions) ||
    rows.some(row => row.sessionNumber === number && (row.confirmedByMe || row.confirmedByPartner));
}

export function schedulableSessionNumbers(swap: Exchange, rows: CalendarSession[] = []) {
  if (swap.status !== "CONFIRMED" || !swap.integrityVerified) return [];
  return Array.from({ length: swap.sessions }, (_, i) => i + 1)
    .filter(number => !sessionHasParticipation(swap, number, rows));
}
