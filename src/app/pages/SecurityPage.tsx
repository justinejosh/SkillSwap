import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
export default function SecurityPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  useEffect(() => {
    api<any[]>("/auth/sessions")
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, []);
  async function change(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (passwords.newPassword !== passwords.confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      localStorage.removeItem("knoxite_token");
      localStorage.removeItem("knoxite_user");
      navigate("/login");
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
          to="/profile"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Profile
        </Link>
        <h1 className="text-2xl font-bold">Account security</h1>
        {error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <form
          onSubmit={change}
          className="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold">Change password</h2>
          {(["currentPassword", "newPassword", "confirm"] as const).map(
            (field) => (
              <label key={field} className="block">
                {field === "currentPassword"
                  ? "Current password"
                  : field === "newPassword"
                    ? "New password"
                    : "Confirm new password"}
                <input
                  required
                  minLength={field === "currentPassword" ? undefined : 12}
                  type="password"
                  autoComplete={
                    field === "currentPassword"
                      ? "current-password"
                      : "new-password"
                  }
                  className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
                  value={passwords[field]}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, [field]: e.target.value }))
                  }
                />
              </label>
            ),
          )}
          <p className="text-sm">
            Use at least 12 characters and at most 72 UTF-8 bytes. Changing your
            password revokes all active sessions.
          </p>
          <Button disabled={busy}>
            {busy ? "Updating..." : "Update Password"}
          </Button>
        </form>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Active sessions</h2>
          {sessions.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border p-4 dark:border-slate-700"
            >
              <p className="break-words">
                {s.userAgent}
                {s.current ? " (this session)" : ""}
              </p>
              <p className="text-sm">
                Signed in {new Date(s.createdAt).toLocaleString()} · Expires{" "}
                {new Date(s.expiresAt).toLocaleString()}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
