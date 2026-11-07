import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function ResetPasswordPage() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { window.history.replaceState(null, "", "/reset-password"); }, []);
  async function reset(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords must match."); return; }
    if (new TextEncoder().encode(password).length > 72) { setError("Password must not exceed 72 UTF-8 bytes."); return; }
    setBusy(true);
    try {
      const result = await api<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword: password }) });
      setPassword(""); setConfirm(""); setMessage(result.message);
      localStorage.removeItem("knoxite_token"); localStorage.removeItem("knoxite_user");
      window.dispatchEvent(new Event("knoxite-session-ended"));
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
    <section className="w-full max-w-md space-y-5 rounded-xl border border-blue-100 bg-white p-6 shadow-lg">
      <h1 className="text-2xl font-bold text-blue-900">Set a new password</h1>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message ? <p role="status" className="text-blue-900">{message}</p> : !token ?
        <p role="alert">Open the full link from your reset email, or request a new link.</p> :
        <form className="space-y-4" onSubmit={reset}>
          <p className="text-sm text-slate-600">Use at least 12 characters and at most 72 UTF-8 bytes. Your previous sign-ins will be revoked.</p>
          <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></div>
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "Resetting..." : "Reset password"}</Button>
        </form>}
      <Link className="block text-sm text-blue-700 underline" to={message ? "/login" : "/recover-account"}>{message ? "Sign in" : "Request a new reset link"}</Link>
    </section>
  </main>;
}
