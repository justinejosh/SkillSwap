import { useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
export default function VerifyEmailPage() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function verify() {
    setBusy(true);
    try {
      const result = await api("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setMessage(result.message);
      setDone(true);
      window.history.replaceState(null, "", "/verify-email");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 p-6">
      <h1 className="text-2xl font-bold">Verify your institutional email</h1>
      <p>Confirm ownership to activate your Knoxite account.</p>
      {message && <p role="status">{message}</p>}
      {!done && (
        <Button disabled={!token || busy} onClick={() => void verify()}>
          {busy ? "Verifying..." : "Verify Email"}
        </Button>
      )}
      <Link className="block text-blue-700 underline" to="/login">
        Return to sign in or request a new link
      </Link>
    </main>
  );
}
