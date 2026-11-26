import { FormEvent, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { api } from "@/app/lib/api";
import { suspensionDate } from "@/app/lib/suspensionNotice";
import { Button } from "../ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "../ui/alert-dialog";

export const suspensionReasons = [
  ["HARASSMENT", "Harassment or inappropriate behavior"], ["REPEATED_VIOLATIONS", "Repeated platform violations"],
  ["FRAUDULENT_EXCHANGE", "Fraudulent exchange activity"], ["SPAM_MISUSE", "Spam or misuse"], ["ELIGIBILITY_VIOLATION", "Verified eligibility violation"], ["OTHER", "Other"],
] as const;
export function SuspendStudentDialog({ student, label = "Suspend account", disabled = false, onSuspended }: {
  student: { id: string; name: string; email?: string }; label?: string; disabled?: boolean; onSuspended?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [form, setForm] = useState({ reason: "", durationDays: "", reasonExplanation: "", studentExplanation: "", privateNotes: "" });
  const [quote, setQuote] = useState<{ student: { name: string; email: string }; reviewedAt: string; confirmationToken: string } | null>(null);
  const lock = useRef(false);
  const valid = !!form.reason && !!form.durationDays && !!form.studentExplanation.trim() && (form.reason !== "OTHER" || !!form.reasonExplanation.trim());
  const payload = () => ({ ...form, durationDays: Number(form.durationDays) });
  async function review(e: FormEvent) {
    e.preventDefault(); if (!valid || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { setQuote(await api(`/admin/users/${student.id}/suspensions/preview`, { method: "POST", body: JSON.stringify(payload()) })); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to prepare the suspension. Please try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function confirm() {
    if (!quote || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await api(`/admin/users/${student.id}/suspensions`, { method: "POST", body: JSON.stringify({ ...payload(), confirmationToken: quote.confirmationToken }) });
      setOpen(false); setQuote(null); onSuspended?.(`${result.message} Started: ${suspensionDate(result.suspension.startsAt)}. Expires: ${suspensionDate(result.suspension.expiresAt)}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Suspension failed. No success was confirmed."); }
    finally { lock.current = false; setBusy(false); }
  }
  const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  return <AlertDialog open={open} onOpenChange={value => { if (!lock.current) { setOpen(value); if (!value) { setQuote(null); setError(""); } } }}>
    <AlertDialogTrigger asChild><Button variant="outline" size="sm" disabled={disabled}><ShieldAlert className="size-4" aria-hidden="true" />{label}</Button></AlertDialogTrigger>
    <AlertDialogContent className="admin-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <AlertDialogHeader className="min-w-0"><AlertDialogTitle className="[overflow-wrap:anywhere]">Suspend {student.name}?</AlertDialogTitle><AlertDialogDescription>Temporarily restrict access and revoke existing sessions. Skills, exchanges, assessments and account history are retained.</AlertDialogDescription></AlertDialogHeader>
      <p className="break-all text-sm font-medium">{quote?.student.email || student.email || student.name}</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {!quote ? <form onSubmit={review} className="min-w-0 space-y-3">
        <label className="block text-sm font-medium">Suspension reason<select required className={input} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value, reasonExplanation: "" }))}><option value="">Select a reason</option>{suspensionReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.reason === "OTHER" && <label className="block text-sm font-medium">Explain Other<input required maxLength={500} className={input} value={form.reasonExplanation} onChange={e => setForm(f => ({ ...f, reasonExplanation: e.target.value }))} /></label>}
        <label className="block text-sm font-medium">Suspension duration<select required className={input} value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))}><option value="">Select duration</option>{[1, 3, 7, 14, 30].map(n => <option key={n} value={n}>{n === 1 ? "24 hours" : `${n} days`}</option>)}</select></label>
        <label className="block text-sm font-medium">Student-facing explanation<textarea required maxLength={2000} rows={3} className={input} value={form.studentExplanation} onChange={e => setForm(f => ({ ...f, studentExplanation: e.target.value }))} /></label>
        <label className="block text-sm font-medium">Private administrator notes (optional)<textarea maxLength={2000} rows={2} className={input} value={form.privateNotes} onChange={e => setForm(f => ({ ...f, privateNotes: e.target.value }))} /></label>
        <p className="text-xs text-slate-600 dark:text-slate-300">The reason, Other explanation and student-facing explanation are visible to the student. Do not name reporters or include private evidence. Private notes are administrator-only. The suspension starts only when Confirm Suspension succeeds. The server returns the exact dates afterward.</p>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button type="submit" disabled={!valid || busy}>{busy ? "Preparing..." : "Review Suspension"}</Button></AlertDialogFooter>
      </form> : <div className="space-y-4">
        <dl className="space-y-3 text-sm"><div><dt className="font-semibold">Student</dt><dd className="break-words">{quote.student.name}</dd></div><div><dt className="font-semibold">Reason</dt><dd>{suspensionReasons.find(([value]) => value === form.reason)?.[1]}</dd>{form.reasonExplanation && <dd className="whitespace-pre-wrap break-words">{form.reasonExplanation}</dd>}</div><div><dt className="font-semibold">Duration</dt><dd>{form.durationDays === "1" ? "24 hours" : `${form.durationDays} days`}</dd></div><div><dt className="font-semibold">Explanation visible to the student</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{form.studentExplanation}</dd></div>{form.privateNotes && <div><dt className="font-semibold">Private notes — administrator only</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{form.privateNotes}</dd></div>}</dl>
        <p className="text-sm text-amber-800 dark:text-amber-200">The suspension begins when Confirm Suspension succeeds. The server then calculates its full duration and exact expiration, and immediately revokes this student's sessions. Confirm within two minutes of review or review again.</p>
        <AlertDialogFooter className="flex-wrap"><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button variant="outline" disabled={busy} onClick={() => { setQuote(null); setError(""); }}>Edit details</Button><Button disabled={busy} onClick={() => void confirm()}>{busy ? "Suspending..." : "Confirm Suspension"}</Button></AlertDialogFooter>
      </div>}
    </AlertDialogContent>
  </AlertDialog>;
}
