import { API_BASE_URL } from "@/config";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: { nextEligibleAt?: string },
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("knoxite_token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    if (response.status === 401) {
      localStorage.removeItem("knoxite_token");
      localStorage.removeItem("knoxite_user");
      window.dispatchEvent(new Event("knoxite-session-ended"));
    }
    throw new ApiError(
      data.error || "Request failed.",
      response.status,
      data.details,
    );
  }
  return data as T;
}
