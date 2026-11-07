import { ErrorRequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function text(
  value: unknown,
  label: string,
  max = 191,
  allowEmpty = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  ) {
    throw new HttpError(
      422,
      `${label} must be ${allowEmpty ? "a string" : "a nonempty string"} of at most ${max} characters.`,
    );
  }
  return value.trim();
}
export function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new HttpError(
      422,
      `${label} must be an integer from ${min} to ${max}.`,
    );
  }
  return value;
}
export function onlyKeys(body: unknown, keys: string[]) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !keys.includes(k))
  ) {
    throw new HttpError(422, "Request contains unsupported fields.");
  }
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request is too large." });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON." });
    return;
  }
  if (err?.code === "P2002") {
    res
      .status(409)
      .json({ error: "This record already exists. Refresh before retrying." });
    return;
  }
  if (err?.code === "P2034") {
    res
      .status(409)
      .json({
        error: "Another operation changed this record. Retry the request.",
      });
    return;
  }
  if (err?.code === "P2025") {
    res.status(404).json({ error: "Record not found." });
    return;
  }
  // Do not return Prisma errors, SQL, request bodies, or tokens to the client.
  console.error(
    "Request failed",
    err instanceof Error ? err.name : "UnknownError",
  );
  res.status(500).json({ error: "Unable to complete the request." });
};
