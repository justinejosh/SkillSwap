import { useEffect, useRef, useState } from "react";
import { api } from "@/app/lib/api";
import { suspensionDate } from "@/app/lib/suspensionNotice";
import { Button } from "../ui/button";
import { LoadingContent } from "../PageSkeleton";
import { AdminPager, AdminStatus } from "./AdminUI";
import { suspensionReasons } from "./SuspendStudentDialog";

export function SuspensionHistory({ student, onClose, refreshKey }: { student: { id: string; name: string }; onClose: () => void; refreshKey: number }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, [student.id]);
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), [data, setData] = useState<any>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  useEffect(() => { setPage(1); }, [student.id]);
  useEffect(() => {
    let live = true; setLoading(true); setData(null); setError("");
    void api(`/admin/users/${student.id}/suspensions?page=${page}`).then(result => { if (live) setData(result); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [student.id, page, retry, refreshKey]);
  return <section ref={panel} id="student-suspension-history" tabIndex={-1} aria-label="Student suspension history" className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">Suspension history — {student.name}</h3><Button variant="ghost" size="sm" onClick={onClose}>Close history</Button></div>
    {loading ? <LoadingContent layout="list" label="Loading suspension history..." /> : error ? <><p role="alert" className="admin-error">{error}</p><Button size="sm" variant="outline" onClick={() => { panel.current?.focus(); setRetry(n => n + 1); }}>Retry history</Button></> : data && <>
      <p>Current status: <AdminStatus status={data.student.legacyRestriction ? "Legacy suspension — review required" : data.student.isSuspended ? "Active temporary suspension" : "Active account"} /></p>
      {data.student.legacyRestriction && <p className="text-sm">This legacy or separate restriction has no automatic restoration date. No historical reason has been invented.</p>}
      {!data.suspensions.length && <p>No temporary suspension records.</p>}
      {data.suspensions.map((s: any) => <article key={s.id} className="space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-3"><h4 className="font-semibold">{suspensionReasons.find(([value]) => value === s.reason)?.[1] || s.reason}</h4><AdminStatus status={s.status === "ACTIVE" ? "Active temporary suspension" : "Expired temporary suspension"} /></div>
        {s.reasonExplanation && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s.reasonExplanation}</p>}
        <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="font-semibold">Administrator</dt><dd className="break-words">{s.administrator.name}</dd></div><div><dt className="font-semibold">Duration</dt><dd>{s.durationDays === 1 ? "24 hours" : `${s.durationDays} days`}</dd></div><div><dt className="font-semibold">Start</dt><dd>{suspensionDate(s.startsAt)}</dd></div><div><dt className="font-semibold">Expiration</dt><dd>{suspensionDate(s.expiresAt)}</dd></div></dl>
        <div><h5 className="font-semibold">Student-facing explanation</h5><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s.studentExplanation}</p></div>
        <div><h5 className="font-semibold">Private administrator notes</h5><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s.privateNotes || "No private notes."}</p></div>
        {s.expiredAt && <p>Expiry recorded {suspensionDate(s.expiredAt)}. {s.reactivatedAt ? "Login eligibility restored; previous sessions remain revoked." : "Another restriction remains; automatic reactivation was withheld."}</p>}
        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">{s.events.map((event: any) => <li key={event.action}>{event.action === "SUSPENDED" ? `Suspended by ${event.actorAdministrator?.name || s.administrator.name}` : "Automatic expiry recorded by the system"} · {suspensionDate(event.createdAt)}</li>)}</ul>
      </article>)}
      <AdminPager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} />
    </>}
  </section>;
}
