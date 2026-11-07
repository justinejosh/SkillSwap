import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function AccountRecoveryPage() {
  const location = useLocation();
  const [email, setEmail] = useState<string>(location.state?.email || "");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function checkDelivery() {
    setError("");
    try {
      const result = await api<{ emailDeliveryAvailable: boolean }>("/auth/recovery-options");
      setAvailable(result.emailDeliveryAvailable);
    } catch (err: any) { setError(err.message); }
  }
  useEffect(() => { void checkDelivery(); }, []);
  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<{ message: string }>("/auth/request-password-reset", {
        method: "POST", body: JSON.stringify({ email }),
      });
      setMessage(result.message);
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <section className="w-full max-w-md space-y-5 rounded-xl border border-blue-100 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-blue-900">Recover your account</h1>
        <p className="text-sm text-slate-600">Request a password reset link using your institutional email. Your existing password cannot be viewed.</p>
        {available === false && <div role="status" className="space-y-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <p>Email delivery is unavailable. A reset link cannot be sent right now. Ask your Knoxite administrator to restore email delivery and assist with account recovery.</p>
          <button type="button" className="underline" onClick={() => void checkDelivery()}>Check email availability again</button>
        </div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
        <form className="space-y-4" onSubmit={requestReset}>
          <div className="space-y-2">
            <Label htmlFor="recovery-email">Institutional email</Label>
            <Input id="recovery-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <Button className="w-full" disabled={busy || available === false} type="submit">{busy ? "Requesting reset..." : "Send password reset link"}</Button>
        </form>
        <p className="text-sm text-slate-600">Resetting a password does not verify your institutional email. Unverified accounts must also complete email verification before signing in.</p>
        <Link className="block text-sm text-blue-700 underline" to="/login">Back to sign in and email verification</Link>
      </section>
    </main>
  );
}
