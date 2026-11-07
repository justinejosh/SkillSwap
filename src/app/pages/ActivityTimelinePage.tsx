import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
export default function ActivityTimelinePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/analytics/me")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  const events = data
    ? data.exchanges
        .flatMap((s: any) => [
          {
            id: `${s.id}-created`,
            date: s.createdAt,
            label: "Exchange agreement created",
            swapId: s.id,
          },
          ...(s.completedAt
            ? [
                {
                  id: `${s.id}-completed`,
                  date: s.completedAt,
                  label: "Exchange completed",
                  swapId: s.id,
                },
              ]
            : []),
        ])
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
    : [];
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          to="/dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Your exchange activity</h1>
        {error && <p role="alert">{error}</p>}
        {!data && !error && <p role="status">Loading activity...</p>}
        {data && !events.length && <p>No exchange activity yet.</p>}
        <ol className="space-y-3">
          {events.map((e: any) => (
            <li
              key={e.id}
              className="rounded-xl border p-4 dark:border-slate-700"
            >
              <p>{e.label}</p>
              <time dateTime={e.date} className="text-sm">
                {new Date(e.date).toLocaleString()}
              </time>
              <Link
                className="ml-3 text-blue-700 underline dark:text-blue-300"
                to={`/swap-details/${e.swapId}`}
              >
                View exchange
              </Link>
            </li>
          ))}
        </ol>
        <p className="text-xs">
          Only stored event dates are shown. Missing historical completion dates
          are not inferred.
        </p>
      </div>
    </main>
  );
}
