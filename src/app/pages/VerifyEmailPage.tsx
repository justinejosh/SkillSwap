import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
export default function VerifyEmailPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.hash.slice(1)).get("token") || "";
  const request = useRef<AbortController | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    request.current?.abort();
    setMessage(""); setDone(false); setFailed(false); setBusy(false);
    return () => request.current?.abort();
  }, [token]);
  async function verify() {
    if (busy || done || !token) return;
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    setBusy(true);
    try {
      const result = await api("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setMessage(result.message);
      setDone(true);
      window.history.replaceState(window.history.state, "", "/verify-email");
    } catch (e: any) {
      if (controller.signal.aborted) return;
      setFailed(true);
      setMessage(e.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <main className="min-h-dvh knoxite-surface flex items-center justify-center p-4 text-slate-900 dark:text-slate-100">
      <Card className="w-full max-w-md rounded-3xl"><CardHeader><CardTitle>Verify your institutional email</CardTitle></CardHeader><CardContent className="space-y-5">
      <p className="text-sm leading-relaxed">Confirm ownership to activate your Knoxite account.</p>
      {!token&&!done&&<p role="status" className="text-sm text-slate-600 dark:text-slate-300">Open the verification link from your institutional mailbox. If you do not have a valid link, return to sign in to request one.</p>}
      {message && <p role={failed?"alert":"status"} className="text-sm leading-relaxed">{message}</p>}
      {!done && (
        <Button className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700" disabled={!token || busy} onClick={() => void verify()}>
          {busy ? "Verifying..." : "Verify Email"}
        </Button>
      )}
      <Link className="block text-sm text-blue-700 underline dark:text-blue-300" to="/login">
        Return to sign in or request a new link
      </Link>
      </CardContent></Card>
    </main>
  );
}
