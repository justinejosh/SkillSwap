import { applyStoredTheme } from "./theme";
export function saveSession(result: {
  token: string;
  user: { id: string; role: string };
}) {
  localStorage.setItem("knoxite_token", result.token);
  localStorage.setItem("knoxite_user", JSON.stringify(result.user));
  applyStoredTheme();
  return result.user.role === "ADMIN" ? "/admin-dashboard" : "/dashboard";
}
