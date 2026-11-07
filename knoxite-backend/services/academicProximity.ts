export type AcademicInfo = {
  departmentId: string | null;
  yearLevelId: string | null;
};
export function academicProximity(a: AcademicInfo, b: AcademicInfo) {
  if (!a.departmentId || !b.departmentId || !a.yearLevelId || !b.yearLevelId) {
    return {
      value: null,
      sameDepartment: null,
      sameYearLevel: null,
      reason: "Academic information is incomplete.",
    };
  }
  const sameDepartment = a.departmentId === b.departmentId;
  const sameYearLevel = a.yearLevelId === b.yearLevelId;
  const value = sameDepartment
    ? sameYearLevel
      ? 1
      : 0.8
    : sameYearLevel
      ? 0.6
      : 0.4;
  return {
    value,
    sameDepartment,
    sameYearLevel,
    reason: `${sameDepartment ? "Same" : "Different"} department, ${sameYearLevel ? "same" : "different"} year level.`,
  };
}
