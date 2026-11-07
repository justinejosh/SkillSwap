export function saveSession(result: {
  token: string;
  user: { id: string; role: string };
}) {
  localStorage.setItem("knoxite_token", result.token);
  localStorage.setItem("knoxite_user", JSON.stringify(result.user));
  document.documentElement.classList.toggle(
    "dark",
    localStorage.getItem(`theme_${result.user.id}`) === "dark",
  );
  return result.user.role === "ADMIN" ? "/admin-dashboard" : "/dashboard";
}
