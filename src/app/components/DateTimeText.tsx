export function DateTimeText({ value, fallback = "Not scheduled yet" }: { value?: string | null; fallback?: string }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <span>{fallback}</span>;
  return <time dateTime={value}>{new Date(value).toLocaleString()}</time>;
}
