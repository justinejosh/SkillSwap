export function requireLocalDatabase(
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (env.KNOXITE_LOCAL_DATABASE_ACK !== "local-synthetic-or-sanitized")
    throw new Error(
      "Set KNOXITE_LOCAL_DATABASE_ACK=local-synthetic-or-sanitized for an isolated fixture database.",
    );
  const value = env.DATABASE_URL;
  if (!value) throw new Error("An explicit local DATABASE_URL is required.");
  const url = new URL(value);
  if (
    url.protocol !== "mysql:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !/^\/[A-Za-z0-9_]+_(test|dev|clone)$/.test(url.pathname)
  ) {
    throw new Error(
      "Refusing database access: use a loopback MySQL database ending in _test, _dev, or _clone.",
    );
  }
  return value;
}
