import { Link } from "react-router";
import { createContext, ReactNode, useEffect, useRef, useState } from "react";
import { api } from "@/app/lib/api";

interface Timing {
  enabled: boolean; serverNow: string; idleExpiresAt: string;
  absoluteExpiresAt: string; warningSeconds: number;
}
export const SessionTimeoutContext = createContext(false);
export function SessionGuardian({ children }: { children: ReactNode }) {
  const [timing, setTiming] = useState<Timing | null>(null);
  const [remaining, setRemaining] = useState(Infinity);
  const [error, setError] = useState("");
  const state = useRef<{ timing: Timing; received: number } | null>(null);
  const interact = useRef<(kind: string) => void>(() => {});
  useEffect(() => {
    let live = true, enabled = false, busy = false, checking = false, checkedExpiry = "", lastSent = -Infinity;
    const token = localStorage.getItem("knoxite_token");
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("knoxite-session-policy") : null;
    function accept(value: Timing) {
      if (!live || localStorage.getItem("knoxite_token") !== token) return;
      enabled = value.enabled === true;
      if (!enabled) return;
      if (!state.current || Date.parse(value.serverNow) >= Date.parse(state.current.timing.serverNow)) {
        state.current = { timing: value, received: performance.now() };
        setTiming(value); setError("");
      }
    }
    async function status() {
      if (checking) return;
      checking = true;
      try { accept(await api<Timing>("/auth/session-status")); }
      catch { if (live && enabled) setError("Unable to confirm your session. Check your connection."); }
      finally { checking = false; }
    }
    async function activity(kind: string) {
      if (!enabled || busy || document.visibilityState !== "visible" ||
          (kind !== "stay" && performance.now() - lastSent < 30_000)) return;
      busy = true; lastSent = performance.now();
      try {
        accept(await api<Timing>("/auth/session-activity", { method: "POST", body: JSON.stringify({ interaction: kind }) }));
        channel?.postMessage("resync"); // No credential/deadline is trusted from another tab.
      } catch { if (live) setError("Your session could not be extended. Check your connection or sign in again."); }
      finally { busy = false; }
    }
    interact.current = (kind) => { void activity(kind); };
    const onPointer = (e: Event) => { if (e.isTrusted) void activity("pointer"); };
    const onKey = (e: Event) => { if (e.isTrusted) void activity("key"); };
    const onScroll = (e: Event) => { if (e.isTrusted) void activity("scroll"); };
    const onVisible = () => { if (document.visibilityState === "visible") void status(); };
    document.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisible);
    if (channel) channel.onmessage = (e) => { if (e.data === "resync") void status(); };
    void status();
    const poll = window.setInterval(() => { if (enabled) void status(); }, 15_000);
    const clock = window.setInterval(() => {
      const current = state.current; if (!current) return;
      const now = Date.parse(current.timing.serverNow) + performance.now() - current.received;
      const end = Math.min(Date.parse(current.timing.idleExpiresAt), Date.parse(current.timing.absoluteExpiresAt));
      setRemaining(Math.max(0, Math.ceil((end - now) / 1000)));
      // Confirm expiry server-side. Local clocks never authorize or revoke a session.
      if (now >= end && checkedExpiry !== String(end)) { checkedExpiry = String(end); void status(); }
    }, 1000);
    return () => {
      live = false; state.current = null; channel?.close();
      clearInterval(poll); clearInterval(clock);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const absoluteFirst = timing && Date.parse(timing.absoluteExpiresAt) <= Date.parse(timing.idleExpiresAt);
  return <SessionTimeoutContext.Provider value={timing?.enabled === true}>
    <div style={{ display: timing && remaining === 0 ? "none" : "contents" }}>{children}</div>
    {timing && remaining <= timing.warningSeconds && (
    <section role="alertdialog" aria-labelledby="session-warning-title" aria-describedby="session-warning-description"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-lg rounded-xl border border-amber-400 bg-white p-4 shadow-xl dark:bg-slate-900">
      <h2 id="session-warning-title" className="font-bold">Your session is ending</h2>
      <p id="session-warning-description">{remaining > 0
        ? `${absoluteFirst ? "Your maximum session lifetime" : "Your inactive session"} ends in ${Math.ceil(remaining / 60)} minute(s).`
        : "Checking session expiry. Sign in again if your session has ended."}</p>
      {error && <p role="alert">{error}</p>}
      {!absoluteFirst && remaining > 0 && <button type="button" onClick={() => interact.current("stay")}
        className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-white">Stay signed in</button>}
      {absoluteFirst && <p>Sign in again when it expires; activity cannot extend this limit.</p>}
      {remaining === 0 && <Link className="mt-3 inline-block text-blue-700 underline" to="/login">Return to sign in</Link>}
    </section>
  )}</SessionTimeoutContext.Provider>;
}
