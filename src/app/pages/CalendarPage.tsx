import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
export default function CalendarPage() {
  const [params] = useSearchParams();
  const [sessions, setSessions] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [form, setForm] = useState({
    swapId: params.get("swapId") || "",
    sessionNumber: 1,
    scheduledAt: "",
    meetingLink: "",
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const [s, exchanges] = await Promise.all([
      api<any[]>("/sessions"),
      api<any[]>("/swaps"),
    ]);
    setSessions(s);
    setSwaps(
      exchanges.filter((s) => s.status === "CONFIRMED" && s.integrityVerified),
    );
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/sessions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      });
      setNotice(
        "Session schedule saved. Coordinate changes with your partner.",
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-1 w-full rounded border p-2 dark:bg-slate-800";
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          className="text-blue-700 underline dark:text-blue-300"
          to="/dashboard"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Session calendar</h1>
        {error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900"
        >
          <label>
            Confirmed exchange
            <select
              required
              className={input}
              value={form.swapId}
              onChange={(e) =>
                setForm((f) => ({ ...f, swapId: e.target.value }))
              }
            >
              <option value="">Choose exchange</option>
              {swaps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.offeredSkill.name} ↔ {s.wantedSkill.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session number
            <input
              required
              min={1}
              max={swaps.find((s) => s.id === form.swapId)?.sessions || 30}
              type="number"
              className={input}
              value={form.sessionNumber}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sessionNumber: Number(e.target.value),
                }))
              }
            />
          </label>
          <label>
            Date and time (your local time)
            <input
              required
              type="datetime-local"
              className={input}
              value={form.scheduledAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, scheduledAt: e.target.value }))
              }
            />
          </label>
          <label>
            HTTPS meeting link (optional)
            <input
              type="url"
              className={input}
              value={form.meetingLink}
              onChange={(e) =>
                setForm((f) => ({ ...f, meetingLink: e.target.value }))
              }
            />
          </label>
          <Button disabled={busy || !swaps.length}>
            {busy ? "Saving..." : "Save Session Schedule"}
          </Button>
        </form>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Scheduled sessions</h2>
          {!sessions.length && <p>No sessions scheduled.</p>}
          {sessions.map((s) => (
            <article
              key={s.id}
              className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-semibold">
                Session {s.sessionNumber} with {s.partner.name}
              </h3>
              <p>{new Date(s.scheduledAt).toLocaleString()}</p>
              <p className="text-sm">
                Exchange: {s.exchangeStatus.replaceAll("_", " ")} · You:{" "}
                {s.confirmedByMe ? "acknowledged" : "not acknowledged"} ·
                Partner:{" "}
                {s.confirmedByPartner ? "acknowledged" : "not acknowledged"}
              </p>
              {s.meetingLink && (
                <a
                  className="block break-all text-blue-700 underline"
                  href={s.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open meeting
                </a>
              )}
              <Link
                className="text-blue-700 underline dark:text-blue-300"
                to={`/swap-details/${s.swapId}`}
              >
                Open exchange and confirm completed sessions
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
