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
  async function load() {
    const [signals, cases] = await Promise.all([
      api("/admin/integrity/signals"),
      api<any[]>("/admin/integrity/reviews"),
    ]);
    setData(signals);
    setReviews(cases);
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
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/admin/assessments"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to trust administration
        </Link>
        <h1 className="text-2xl font-bold">Repeated-partner evidence review</h1>
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
        <section className="space-y-4" aria-label="Observed partner patterns">
          <h2 className="text-xl font-semibold">Observed partner patterns</h2>
          {!data.signals.length && (
            <p>No repeated-partner signals are available.</p>
          )}
          {data.signals.map((signal: any) => {
            const key = JSON.stringify(signal.userIds);
            return (
              <article
                key={key}
                className="space-y-3 rounded-xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="font-semibold">{names(signal.userIds)}</h3>
                <p className="text-sm">
                  {signal.completedExchanges} completed exchanges;{" "}
                  {signal.reciprocalFiveStarExchanges} with reciprocal five-star
                  reviews.
                </p>
                <p className="text-sm">
                  Shortest interval between completions:{" "}
                  {(signal.fastestGapMs / 60000).toFixed(2)} minutes. Median
                  interval: {(signal.medianGapMs / 60000).toFixed(2)} minutes.
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
          {reviews.map((review) => (
            <article
              key={review.id}
              className="space-y-3 rounded-xl border bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-semibold">
                {review.details
                  ? names(review.details.userIds)
                  : "Review record"}{" "}
                · {review.status}
              </h3>
              {review.details?.events.map((event: any, index: number) => (
                <p key={index} className="break-words text-sm">
                  {event.at} · {event.action}: {event.notes}
                </p>
              ))}
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
    </main>
  );
}
