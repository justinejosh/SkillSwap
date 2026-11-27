import { useEffect, useId, useState } from "react";
import { Star } from "lucide-react";
import { api } from "@/app/lib/api";
import { LoadingContent } from "../PageSkeleton";
import { DateTimeText } from "../DateTimeText";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { AdminPager, AdminStatus } from "./AdminUI";

interface Evaluation {
  id: string; rating: number; comment: string | null; createdAt: string; isValidated: boolean; countedInOverview: boolean;
  reviewer: { name: string }; reviewee: { name: string };
  swap: { id: string; status: string; offeredSkill: { name: string }; wantedSkill: { name: string } };
}
interface Results { total: number; page: number; pageSize: number; validation: string; reviews: Evaluation[] }

export function PeerEvaluations({ refreshKey }: { refreshKey: number }) {
  const [filters, setFilters] = useState({ search: "", rating: "", validation: "COUNTED", sort: "newest" });
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), [data, setData] = useState<Results | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const id = useId();
  function filter(key: keyof typeof filters, value: string) { setFilters(old => ({ ...old, [key]: value })); setPage(1); }
  useEffect(() => {
    let live = true; setLoading(true); setError(""); setData(null);
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ page: String(page), pageSize: "20", validation: filters.validation, sort: filters.sort });
      if (filters.search.trim()) query.set("search", filters.search.trim()); if (filters.rating) query.set("rating", filters.rating);
      void api<Results>(`/admin/peer-evaluations?${query}`).then(result => { if (live) setData(result); }).catch(e => { if (live) setError(e instanceof Error ? e.message : "Unable to load peer evaluations."); }).finally(() => { if (live) setLoading(false); });
    }, 200); // Debounce typing/filter changes, not an artificial content delay.
    return () => { live = false; window.clearTimeout(timer); };
  }, [filters, page, retry, refreshKey]);
  const control = "grid min-w-0 flex-1 basis-36 gap-2";
  return <section className="admin-panel space-y-4" aria-label="Peer evaluation directory">
    <h2 className="text-lg font-semibold">Student feedback</h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">The Overview count includes validated evaluations on completed, integrity-verified exchanges. These are review submissions, not unique students. Evaluations are read-only.</p>
    <div className="admin-filters">
      <div className={control}><label htmlFor={`${id}-search`}>Search student names</label><input id={`${id}-search`} type="search" maxLength={100} value={filters.search} onChange={e => filter("search", e.target.value)} /></div>
      <div className={control}><label htmlFor={`${id}-rating`}>Rating</label><select id={`${id}-rating`} value={filters.rating} onChange={e => filter("rating", e.target.value)}><option value="">All ratings</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>)}</select></div>
      <div className={control}><label htmlFor={`${id}-validation`}>Validation status</label><select id={`${id}-validation`} value={filters.validation} onChange={e => filter("validation", e.target.value)}><option value="COUNTED">Included in Overview</option><option value="VALIDATED">Validated — all exchanges</option><option value="UNVALIDATED">Not validated</option><option value="ALL">All evaluations</option></select></div>
      <div className={control}><label htmlFor={`${id}-sort`}>Order evaluations</label><select id={`${id}-sort`} value={filters.sort} onChange={e => filter("sort", e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
    </div>
    {filters.validation !== "COUNTED" && <p className="text-sm text-slate-600 dark:text-slate-300">This view may include evaluations outside the Overview count. Each record shows its stored validation status.</p>}
    {loading ? <LoadingContent layout="table" label="Loading peer evaluations..." /> : error ? <div className="space-y-3"><p role="alert" className="admin-error">{error}</p><Button variant="outline" size="sm" onClick={() => setRetry(n => n + 1)}>Retry evaluations</Button></div> : data && <>
      <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Showing {data.reviews.length} of {data.total} matching evaluations.</p>
      {!data.reviews.length ? <p>No peer evaluations match this view.</p> : <div className="admin-scroll" tabIndex={0} aria-label="Scrollable peer evaluations"><table className="admin-table"><caption className="sr-only">Peer evaluations</caption><thead><tr><th>Reviewer</th><th>Reviewed student</th><th>Rating</th><th>Feedback</th><th>Skill exchange</th><th>Submitted</th><th>Validation</th></tr></thead><tbody>{data.reviews.map(review => <tr key={review.id}>
        <td className="min-w-32"><span className="break-words font-medium">{review.reviewer.name}</span></td><td className="min-w-32"><span className="break-words font-medium">{review.reviewee.name}</span></td>
        <td className="admin-evaluation-cell">{Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5 ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap" aria-label={`${review.rating} out of 5 stars`}><Star className="size-4 fill-amber-500 text-amber-700 dark:text-amber-300" aria-hidden="true" />{review.rating} / 5</span> : <span>Stored rating {review.rating} (outside 1–5)</span>}</td>
        <td><p className="min-w-44 max-w-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{review.comment?.trim() ? review.comment : "No written feedback."}</p></td>
        <td className="admin-evaluation-cell min-w-44"><p className="break-words">{review.swap.offeredSkill.name} ⇄ {review.swap.wantedSkill.name}</p><Popover><PopoverTrigger asChild><button type="button" className="admin-minimal-action mt-1 text-left text-xs text-slate-600 underline-offset-2 hover:underline dark:text-slate-300" aria-label={`View full exchange ID ${review.swap.id.slice(0, 8)}`}>Exchange {review.swap.id.slice(0, 8)}</button></PopoverTrigger><PopoverContent aria-label="Full exchange ID" className="admin-id-popover w-72 max-w-[calc(100vw-2rem)] text-sm data-[state=open]:animate-none data-[state=closed]:animate-none"><p className="font-medium">Full exchange ID</p><p className="mt-1 select-text break-all font-mono text-xs">{review.swap.id}</p></PopoverContent></Popover><p className="mt-1 text-xs capitalize text-slate-600 dark:text-slate-300">{review.swap.status.replaceAll("_", " ").toLowerCase()}</p></td>
        <td><DateTimeText value={review.createdAt} /></td><td className="admin-evaluation-cell"><AdminStatus plain indicator={review.isValidated ? "check" : "dot"} status={review.isValidated ? "Validated" : "Not validated"} />{!review.countedInOverview && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">Excluded from Overview</p>}</td>
      </tr>)}</tbody></table></div>}
      <AdminPager page={page} total={data.total} pageSize={20} onPage={setPage} />
    </>}
  </section>;
}
