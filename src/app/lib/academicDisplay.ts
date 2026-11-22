// Display order only; never mutate the eligible-year set or backend ordering.
export function descendingAcademicYears<T extends { name: string; order?: number }>(years: T[]): T[] {
  const rank = (year: T) => Number(year.name.match(/\d+/)?.[0] ?? year.order ?? 0);
  return [...years].sort((a, b) => rank(b) - rank(a));
}
