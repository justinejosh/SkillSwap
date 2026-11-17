import { RequestHandler } from "express";
import { HttpError } from "./http";

export const LOGIN_FAILURE_LIMIT = 10;
export const LOGIN_WINDOW_MS = 15 * 60_000;

// Preserve the existing connection-wide failure budget. Successful sign-ins
// release their reservation; they cannot clear failures for other accounts.
// Single-process protection: distributed deployments still need edge limiting.
export function loginThrottle(now: () => number = Date.now): RequestHandler {
  const windows = new Map<string, { failures: number; pending: number; until: number }>();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of windows)
      if (value.until <= time && value.pending === 0) windows.delete(key);
    const key = req.ip || "unknown";
    const bucket = windows.get(key) || { failures: 0, pending: 0, until: time + LOGIN_WINDOW_MS };
    if (bucket.until <= time) {
      bucket.failures = 0;
      bucket.until = time + LOGIN_WINDOW_MS;
    }
    windows.set(key, bucket);
    if (bucket.failures + bucket.pending >= LOGIN_FAILURE_LIMIT) {
      const retryAfterSeconds = bucket.failures >= LOGIN_FAILURE_LIMIT
        ? Math.max(1, Math.ceil((bucket.until - time) / 1000)) : 1;
      res.setHeader("Retry-After", retryAfterSeconds);
      throw new HttpError(429, "Too many unsuccessful sign-in attempts. Wait before trying again.", { retryAfterSeconds });
    }
    bucket.pending++;
    let settled = false;
    const settle = (failed: boolean) => {
      if (settled) return;
      settled = true;
      bucket.pending--;
      if (failed) bucket.failures++;
      if (!bucket.pending && !bucket.failures && windows.get(key) === bucket) windows.delete(key);
    };
    res.once("finish", () => settle(res.statusCode >= 400 && res.statusCode < 500));
    // Aborting a request must not provide a way to avoid the failure budget.
    res.once("close", () => { if (!res.writableFinished) settle(true); });
    next();
  };
}
