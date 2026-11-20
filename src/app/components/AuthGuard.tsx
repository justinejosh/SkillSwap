import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Link, Navigate } from "react-router";
import { api } from "@/app/lib/api";
import { SessionGuardian } from "./SessionGuardian";
import { clearAssessmentDrafts } from "@/app/lib/assessmentDraft";
import { applyStoredTheme } from "@/app/lib/theme";

type User = { id: string; role: "USER" | "ADMIN"; name: string; email: string; avatarUrl: string | null };
const VerifiedIdentity = createContext<User | null>(null);
function Authorized({ user, role, children }: { user: User; role?: User["role"]; children: ReactNode }) {
  if (role && user.role !== role)
    return <Navigate to={user.role === "ADMIN" ? "/admin-dashboard" : "/dashboard"} replace />;
  return <>{children}</>;
}
export function AuthGuard({ children, role }: { children: ReactNode; role?: User["role"] }) {
  const verified = useContext(VerifiedIdentity);
  // Nested route guards never fetch or restart the guardian. Identity is only
  // provided after the persistent parent verifies this credential with the API.
  return verified ? <Authorized user={verified} role={role}>{children}</Authorized>
    : <AuthenticatedSession role={role}>{children}</AuthenticatedSession>;
}
function AuthenticatedSession({ children, role }: { children: ReactNode; role?: User["role"] }) {
  const [token, setToken] = useState(() => localStorage.getItem("knoxite_token"));
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ token?: string; user?: User; error?: string }>({});
  useEffect(() => {
    const ended = () => { setState({}); setToken(null); };
    const changed = () => { setState({}); setToken(localStorage.getItem("knoxite_token")); setRevision(n => n + 1); };
    const storage = (event: StorageEvent) => {
      if (event.key === "knoxite-manual-logout") clearAssessmentDrafts();
      if (event.key === "knoxite_token" || event.key === null) changed();
    };
    window.addEventListener("knoxite-session-ended", ended);
    window.addEventListener("knoxite-session-changed", changed);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener("knoxite-session-ended", ended);
      window.removeEventListener("knoxite-session-changed", changed);
      window.removeEventListener("storage", storage);
    };
  }, []);
  useEffect(() => {
    if (!token) return;
    let live = true;
    const controller = new AbortController();
    api<User>("/profile", { signal: controller.signal }).then(user => {
      if (!live || localStorage.getItem("knoxite_token") !== token) return;
      if (!user.id || !["USER", "ADMIN"].includes(user.role)) throw new Error("Unable to verify your account. Please sign in again.");
      const identity = { id: user.id, role: user.role, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
      localStorage.setItem("knoxite_user", JSON.stringify(identity));
      applyStoredTheme();
      setState({ token, user: identity });
    }).catch(error => {
      if (live && localStorage.getItem("knoxite_token") === token) setState({ token, error: error.message });
    });
    return () => { live = false; controller.abort(); };
  }, [token, revision]);
  if (!token) return <Navigate to="/login" replace />;
  if (state.token !== token || (!state.user && !state.error))
    return <p role="status" className="p-8">Checking your session...</p>;
  if (state.error) return <div className="p-8 space-y-4">
    <p role="alert">{state.error}</p>
    <button type="button" className="rounded-xl bg-blue-700 px-4 py-2 text-white" onClick={() => { setState({}); setRevision(n => n + 1); }}>Retry session check</button>
    <Link className="block text-blue-700 underline" to="/login">Return to sign in</Link>
  </div>;
  return <VerifiedIdentity.Provider value={state.user!}>
    <SessionGuardian key={token}>
      <Authorized user={state.user!} role={role}>{children}</Authorized>
    </SessionGuardian>
  </VerifiedIdentity.Provider>;
}
