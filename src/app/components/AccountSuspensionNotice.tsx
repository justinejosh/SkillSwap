import { useEffect, useRef } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { SuspensionNotice, suspensionDate } from "../lib/suspensionNotice";

export function AccountSuspensionNotice({ notice, onBack }: { notice: SuspensionNotice; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  // Limit exposure of private account details on an unattended login screen.
  useEffect(() => { const timer = window.setTimeout(onBack, 5 * 60_000); return () => clearTimeout(timer); }, [onBack]);
  return <main className="knoxite-surface flex min-h-screen items-center justify-center p-4 text-slate-900 dark:text-slate-100">
    <section aria-labelledby="suspension-heading" className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <ShieldAlert className="size-8 text-amber-700 dark:text-amber-300" aria-hidden="true" />
      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Knoxite account access</p>
      <h1 id="suspension-heading" ref={heading} tabIndex={-1} className="rounded text-2xl font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300">Your Account Has Been Suspended</h1>
      {notice.reason && <h2 className="font-semibold">{notice.reason}</h2>}
      {notice.reasonExplanation && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{notice.reasonExplanation}</p>}
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{notice.explanation}</p>
      {!notice.legacy && <><dl className="space-y-3 text-sm"><div><dt className="font-semibold">Suspension start</dt><dd>{suspensionDate(notice.startsAt!)}</dd></div><div><dt className="font-semibold">Suspension expires</dt><dd>{suspensionDate(notice.expiresAt!)}</dd></div></dl><p className="text-sm text-slate-600 dark:text-slate-300">Your account becomes eligible to sign in automatically after this restriction expires. Sign in again then. Previous sessions remain signed out; your account history is retained.</p></>}
      <Button variant="outline" onClick={onBack}><ArrowLeft className="size-4" aria-hidden="true" />Back to sign in</Button>
    </section>
  </main>;
}
