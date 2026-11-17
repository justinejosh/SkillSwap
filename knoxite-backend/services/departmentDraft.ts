import { PrismaClient } from "@prisma/client";
import catalog from "../config/academic-catalog.json";
import draft from "../config/provisional-departments.json";
import { HttpError } from "../lib/http";
import { transaction } from "../lib/transaction";
import { existingDraftDepartment } from "./departmentNames";

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
  return transaction(db, async (tx) => {
    const programs = await tx.program.findMany({
      where: { code: { in: draft.departments.flatMap((d) => d.programCodes) } },
    });
    if (programs.length !== catalog.programs.length)
      throw new HttpError(
        409,
        "Initialize the configured programs before importing the draft.",
      );
    const departments = await tx.department.findMany();
    // Resolve all conflicts before making changes; a different legacy code is
    // safe to reuse only when the college name identifies one active record.
    const resolved = draft.departments.map((row) => ({
      row, existing: existingDraftDepartment(departments, row.code, row.name),
    }));
    let imported = 0;
    for (const { row, existing } of resolved) {
      const department = existing ?? await tx.department.create({
        data: { code: row.code, name: row.name },
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
