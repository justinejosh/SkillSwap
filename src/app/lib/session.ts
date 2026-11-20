import { applyStoredTheme } from "./theme";
export function saveSession(result: {
  token: string;
  user: { id: string; role: string };
}) {
  localStorage.setItem("knoxite_token", result.token);
  localStorage.setItem("knoxite_user", JSON.stringify(result.user));
  applyStoredTheme();
  window.dispatchEvent(new Event("knoxite-session-changed"));
  return result.user.role === "ADMIN" ? "/admin-dashboard" : "/dashboard";
}
