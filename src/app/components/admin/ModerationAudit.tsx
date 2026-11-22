import { useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { Button } from "../ui/button";
import { DateTimeText } from "../DateTimeText";
import { AdminPager } from "./AdminUI";

export function ModerationAudit({ threadId, refreshKey = 0 }: { threadId?: string; refreshKey?: number }) {
  const [open, setOpen] = useState(false), [page, setPage] = useState(1), [data, setData] = useState<any>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => { setPage(1); }, [threadId]);
  useEffect(() => {
    if (!open) return; let live = true; setLoading(true); setError(""); setData(null);
    void api(`/admin/moderation-audit?${new URLSearchParams({ page: String(page), ...(threadId ? { threadId } : {}) })}`).then(value => { if (live) setData(value); }).catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [open, page, threadId, refreshKey]);
  return <section className="space-y-3" aria-label="Moderation audit history"><Button variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? "Hide moderation history" : "View moderation history"}</Button>
    {open && <><h3 className="font-semibold">Administrator reply moderation</h3><p className="text-sm text-slate-600 dark:text-slate-300">{threadId ? "Selected thread" : "All threads"}. Audit entries retain record IDs and reasons, not deleted comment text. Student self-deletions are not administrator moderation.</p>{loading && <p role="status">Loading moderation history...</p>}{error && <p role="alert" className="admin-error">{error}</p>}{data && <>{!data.records.length && <p>No administrator reply deletions recorded.</p>}{data.records.map((row: any) => <article key={row.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><p className="font-semibold">Reply removed · {row.reason.replaceAll("_", " ").toLowerCase()}</p><p><DateTimeText value={row.createdAt} /></p>{row.explanation && <p className="whitespace-pre-wrap break-words">{row.explanation}</p>}<details><summary className="cursor-pointer">Affected records</summary><dl className="mt-2 space-y-1 break-all">{[["Administrator", row.administratorId], ["Thread", row.threadId], ["Reply", row.commentId], ["Reply author", row.commentAuthorId]].map(([label, value]) => <div key={label}><dt className="font-medium">{label}</dt><dd>{value}</dd></div>)}</dl></details></article>)}<AdminPager page={page} total={data.total} pageSize={20} onPage={setPage} /></>}</>}
  </section>;
}
