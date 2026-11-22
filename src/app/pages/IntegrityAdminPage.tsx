import { LoadingContent } from "@/app/components/PageSkeleton";
import { AdminStatus } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";

export default function IntegrityAdminPage() {
  const [data, setData] = useState<any>({ signals: [], users: [] });
  const [reviews, setReviews] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading,setLoading]=useState(true),[search,setSearch]=useState(""),[status,setStatus]=useState("");
  async function load() {
    setLoading(true);
    try {const [signals,cases]=await Promise.all([api("/admin/integrity/signals"),api<any[]>("/admin/integrity/reviews")]);setData(signals);setReviews(cases);setError("");}
    finally {setLoading(false);}
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await load();
      setNotice(
        "Review saved. No account, exchange history, scoring validation flag, or assessment tier was changed.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const names = (ids: string[]) =>
    ids
      .map((id) => data.users.find((u: any) => u.id === id)?.name ?? id)
      .join(" and ");
  return (
    <AdminShell title="Integrity Review">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Repeated-partner evidence review</h2><Button variant="outline" disabled={loading||busy} onClick={()=>void load().catch(e=>setError(e.message))}>Refresh evidence</Button></div>
        <p className="text-sm">
          Repeated exchanges and mutual five-star reviews can be legitimate.
          These signals support human review and are not findings of misconduct.
          Timing values are observations; no speed threshold or automatic
          penalty is applied. Only eligible validated outcomes contribute to
          these summaries.
        </p>
        {error && (
          <p role="alert" className="rounded border border-red-400 p-3">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded border p-3">
            {notice}
          </p>
        )}
        <div className="admin-filters"><label>Search student pairs<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Review case status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>PENDING</option><option>RESOLVED</option><option>DISMISSED</option></select></label></div>
        {loading&&<LoadingContent layout="table" label="Loading integrity evidence..." />}
        <section className="space-y-4" aria-label="Observed partner patterns">
          <h2 className="text-xl font-semibold">Observed partner patterns</h2>
          {!loading && !error && !data.signals.length && (
            <p>No repeated-partner signals are available.</p>
          )}
          {data.signals.filter((signal:any)=>names(signal.userIds).toLowerCase().includes(search.toLowerCase())).map((signal: any) => {
            const key = JSON.stringify(signal.userIds);
            return (
              <article
                key={key}
                className="admin-panel space-y-3"
              >
                <h3 className="font-semibold">{names(signal.userIds)}</h3>
                <p className="text-sm">
                  {signal.completedExchanges} completed exchanges;{" "}
                  {signal.reciprocalFiveStarExchanges} with reciprocal five-star
                  reviews.
                </p>
                <p className="text-sm">
                  Shortest interval between completions:{" "}
                  {(typeof signal.fastestGapMs === "number" ? (signal.fastestGapMs / 60000).toFixed(2) : "Not available")} minutes. Median
                  interval: {(typeof signal.medianGapMs === "number" ? (signal.medianGapMs / 60000).toFixed(2) : "Not available")} minutes.
                </p>
                <p className="text-xs">
                  {signal.firstCompletedAt} to {signal.lastCompletedAt}
                </p>
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(() =>
                      api("/admin/integrity/reviews", {
                        method: "POST",
                        body: JSON.stringify({
                          userIds: signal.userIds,
                          notes: notes[key] ?? "",
                        }),
                      }),
                    );
                  }}
                >
                  <label className="block text-sm">
                    Review context and evidence needed
                    <textarea
                      required
                      maxLength={3000}
                      value={notes[key] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [key]: e.target.value }))
                      }
                      className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
                    />
                  </label>
                  <Button disabled={busy}>Open Private Review</Button>
                </form>
              </article>
            );
          })}
        </section>
        <section className="space-y-4" aria-label="Private review history">
          <h2 className="text-xl font-semibold">Private review history</h2>
          {!loading&&!error&&!reviews.length&&<p>No private review cases.</p>}
          {reviews.filter(review=>(!status||review.status===status)&&(!review.details||names(review.details.userIds).toLowerCase().includes(search.toLowerCase()))).map((review) => (
            <article
              key={review.id}
              className="admin-panel space-y-3"
            >
              <h3 className="font-semibold">
                {review.details
                  ? names(review.details.userIds)
                  : "Review record"}{" "}
                · <AdminStatus status={review.status}/>
              </h3>
              {review.details?.events.map((event: any, index: number) => (
                <p key={index} className="break-words text-sm">
                  {event.at} · {event.action} · Administrator {event.administratorId}: {event.notes}
                </p>
              ))}
              {review.details?.evidence&&<details><summary className="cursor-pointer text-sm font-semibold">Recorded case evidence</summary><pre className="mt-3 rounded-xl bg-slate-100 p-3 text-xs dark:bg-slate-800">{JSON.stringify(review.details.evidence,null,2)}</pre></details>}
              {review.status === "PENDING" && review.details && (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    void act(() =>
                      api(`/admin/integrity/reviews/${review.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          revision: review.details.revision,
                          disposition: form.get("disposition"),
                          notes: form.get("notes"),
                        }),
                      }),
                    );
                  }}
                >
                  <label className="block text-sm">
                    Disposition
                    <select
                    aria-label="Disposition"
                      name="disposition"
                      className="ml-2 rounded border p-2 dark:bg-slate-800"
                    >
                      <option value="FOLLOW_UP">Keep open for follow-up</option>
                      <option value="NO_ACTION">Close with no action</option>
                      <option value="REVIEWED">Close after review</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    Evidence and disposition notes
                    <textarea
                      required
                      name="notes"
                      maxLength={3000}
                      className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
                    />
                  </label>
                  <Button disabled={busy}>Record Disposition</Button>
                </form>
              )}
            </article>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
