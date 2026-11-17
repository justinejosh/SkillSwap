import { API_BASE_URL } from "@/config";
import { clearAssessmentDrafts } from "./assessmentDraft";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: { nextEligibleAt?: string },
  ) {
    super(message);
  }
}
// Shared response handling for legacy callers that still consume Response objects.
// Capture the credential used: an old request must not clear a newly signed-in account.
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const target = new URL(url);
  const base = new URL(API_BASE_URL);
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname + "/"))
    throw new Error("Authenticated requests must target the configured Knoxite API.");
  const token = localStorage.getItem("knoxite_token");
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && token && localStorage.getItem("knoxite_token") === token) {
    localStorage.removeItem("knoxite_token");
    localStorage.removeItem("knoxite_user");
    window.dispatchEvent(new Event("knoxite-session-ended"));
  }
  return response;
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("knoxite_token");
  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Unexpected server response." }));
  if (!response.ok) {
    throw new ApiError(
      data.error || "Request failed.",
      response.status,
      data.details,
    );
  }
  return data as T;
}

export async function logoutSession() {
  const token = localStorage.getItem("knoxite_token");
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (error) {
    // A 401 confirms the server no longer accepts this credential. A network/5xx
    // failure cannot confirm revocation; retain the session so the user can retry.
    if (!(error instanceof ApiError && error.status === 401))
      throw new Error("Sign out was not confirmed by the server. You are still signed in on this browser. Check your connection and retry.");
  }
  if (localStorage.getItem("knoxite_token") && localStorage.getItem("knoxite_token") !== token)
    throw new Error("The signed-in account changed while signing out. Please retry for the current account.");
  clearAssessmentDrafts();
  localStorage.setItem("knoxite-manual-logout", crypto.randomUUID());
  localStorage.removeItem("knoxite_token");
  localStorage.removeItem("knoxite_user");
  window.dispatchEvent(new Event("knoxite-session-ended"));
}
