import { HttpError } from "../lib/http";

export function departmentNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

// Codes can differ for the same college. Never silently choose between two
// active IDs: doing so could split department-based proximity calculations.
export function existingDraftDepartment<T extends { code: string; name: string; isActive: boolean }>(
  rows: T[], code: string, name: string,
): T | undefined {
  const key = departmentNameKey(name);
  const coded = rows.find((d) => d.code === code);
  if (coded && departmentNameKey(coded.name) !== key)
    throw new HttpError(409, "An existing department code conflicts with the draft. Review it manually.");
  const named = rows.filter((d) => departmentNameKey(d.name) === key);
  const active = named.filter((d) => d.isActive);
  if (active.length > 1)
    throw new HttpError(409, "Duplicate active college names need administrator review before importing the draft.");
  if (active.length === 1) return active[0];
  if (named.length)
    throw new HttpError(409, "This college is archived. Review its existing record rather than creating another copy.");
  return undefined;
}
