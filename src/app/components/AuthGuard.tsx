import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router";
import { api } from "@/app/lib/api";
import { SessionGuardian } from "./SessionGuardian";
import { clearAssessmentDrafts } from "@/app/lib/assessmentDraft";
import { applyStoredTheme } from "@/app/lib/theme";
export function AuthGuard({
  children,
  role,
}: {
  children: ReactNode;
  role?: "USER" | "ADMIN";
}) {
  const [state, setState] = useState<{
    loading: boolean;
    role?: string;
    error?: string;
  }>({ loading: true });
  const [token, setToken] = useState(() =>
    localStorage.getItem("knoxite_token"),
  );
  useEffect(() => {
    const ended = () => setToken(null);
    window.addEventListener("knoxite-session-ended", ended);
    const changed = (event: StorageEvent) => {
      if (event.key === "knoxite-manual-logout") clearAssessmentDrafts();
      if (event.key === "knoxite_token" || event.key === null) {
        setState({ loading: true });
        setToken(localStorage.getItem("knoxite_token"));
      }
    };
    window.addEventListener("storage", changed);
    let live = true;
    if (token)
      api<{
        id: string;
        role: string;
        name: string;
        email: string;
        avatarUrl: string | null;
      }>("/profile")
        .then((user) => {
          if (live) {
            localStorage.setItem(
              "knoxite_user",
              JSON.stringify({
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
              }),
            );
            applyStoredTheme();
            setState({ loading: false, role: user.role });
          }
        })
        .catch((e) => {
          if (live) setState({ loading: false, error: e.message });
        });
    return () => {
      live = false;
      window.removeEventListener("knoxite-session-ended", ended);
      window.removeEventListener("storage", changed);
    };
  }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  if (state.loading)
    return (
      <p role="status" className="p-8">
        Checking your session...
      </p>
    );
  if (state.error)
    return (
      <div className="p-8 space-y-4">
        <p role="alert">{state.error}</p>
        <a className="text-blue-700 underline" href="/login">
          Return to sign in
        </a>
      </div>
    );
  if (role && state.role !== role)
    return (
      <Navigate
        to={state.role === "ADMIN" ? "/admin-dashboard" : "/dashboard"}
        replace
      />
    );
  return <SessionGuardian key={token}>{children}</SessionGuardian>;
}
