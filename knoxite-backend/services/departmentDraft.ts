import { PrismaClient } from "@prisma/client";
import catalog from "../config/academic-catalog.json";
import draft from "../config/provisional-departments.json";
import { HttpError } from "../lib/http";

export function reviewedDepartmentDraft() {
  const programs = draft.departments.flatMap((d) => d.programCodes);
  if (
    new Set(programs).size !== programs.length ||
    [...programs].sort().join("|") !==
      catalog.programs
        .map((p) => p.code)
        .sort()
        .join("|")
  )
    throw new Error(
      "The provisional department draft must cover every configured program exactly once.",
    );
  return draft;
}
export function proposedDepartment(programCode: string) {
  const department = reviewedDepartmentDraft().departments.find((d) =>
    d.programCodes.includes(programCode),
  );
  return department ? { code: department.code, name: department.name } : null;
}
export async function importDepartmentDraft(db: PrismaClient) {
  const draft = reviewedDepartmentDraft();
  return db.$transaction(async (tx) => {
    const programs = await tx.program.findMany({
      where: { code: { in: draft.departments.flatMap((d) => d.programCodes) } },
    });
    if (programs.length !== catalog.programs.length)
      throw new HttpError(
        409,
        "Initialize the configured programs before importing the draft.",
      );
    for (const row of draft.departments) {
      const existing = await tx.department.findUnique({
        where: { code: row.code },
      });
      if (existing && (existing.name !== row.name || !existing.isActive))
        throw new HttpError(
          409,
          "An existing department conflicts with the draft. Review it manually.",
        );
    }
    let imported = 0;
    for (const row of draft.departments) {
      const department = await tx.department.upsert({
        where: { code: row.code },
        create: { code: row.code, name: row.name },
        update: {},
      });
      const result = await tx.program.updateMany({
        where: {
          code: { in: row.programCodes },
          departmentId: null,
          mappingValidatedAt: null,
        },
        data: {
          departmentId: department.id,
          mappingNotes: draft.source,
          mappingValidatedAt: null,
          mappingValidatedById: null,
          mappingVersion: { increment: 1 },
        },
      });
      imported += result.count;
    }
    return {
      imported,
      skipped: programs.length - imported,
      status: "PROVISIONAL",
      message:
        "Draft saved only for unassigned programs. Existing assignments are retained. Draft departments do not contribute to WRMR until officially validated.",
    };
  });
}
