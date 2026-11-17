import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { currentAccountId } from "@/app/lib/theme";
export default function ReportUserPage() {
  const [params] = useSearchParams();
  const [targetId, setTargetId] = useState(params.get("userId") || "");
  const [reason, setReason] = useState("NO_SHOW");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isSelf = targetId.trim().toLowerCase() === currentAccountId()?.toLowerCase();
  const load = () => api<any[]>("/reports").then(setReports);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isSelf) { setError("You cannot report yourself. Choose another student's profile."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/reports", {
        method: "POST",
        body: JSON.stringify({ targetId, reason, description }),
      });
      setNotice("Report saved for administrator review.");
      setDescription("");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Report a concern</h1>
        {error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {isSelf && <p role="status">You cannot report your own account. Your earlier reports remain available below.</p>}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="block">
            Student ID
            <input
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
            />
          </label>
          <p className="text-xs">
            Open a student's public profile and select Report a concern to fill
            this automatically.
          </p>
          <label className="block">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
            >
              <option value="NO_SHOW">No-show</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="MISREPRESENTATION">Misrepresentation</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block">
            Description
            <textarea
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-32 w-full rounded border p-2 dark:bg-slate-800"
            />
          </label>
          <Button disabled={busy || isSelf}>
            {busy ? "Saving..." : "Submit Report"}
          </Button>
        </form>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Your reports</h2>
          {!reports.length && <p>No reports filed.</p>}
          {reports.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border p-4 dark:border-slate-700"
            >
              <p>
                {r.target.name} · {r.reason.replaceAll("_", " ")} · {r.status}
              </p>
              <p className="whitespace-pre-wrap text-sm">{r.description}</p>
              {r.resolution && (
                <p className="mt-2 text-sm">Resolution: {r.resolution}</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
