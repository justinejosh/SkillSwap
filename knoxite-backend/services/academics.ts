import { Prisma, PrismaClient } from "@prisma/client";
import catalog from "../config/academic-catalog.json";
import { HttpError } from "../lib/http";
import { AppConfig } from "../lib/config";
import { proposedDepartment } from "./departmentDraft";
export function eligibleStudentWhere(config: AppConfig): Prisma.UserWhereInput {
  return {
    role: "USER",
    isSuspended: false,
    ...(config.verificationRequired ? { emailVerifiedAt: { not: null } } : {}),
    OR: config.institutionDomains.map((domain) => ({
      email: {
        endsWith: `${config.campusEmailSuffix}@${domain}`,
        not: `${config.campusEmailSuffix}@${domain}`,
      },
    })),
  };
}
export const academicSelect = {
  program: {
    select: {
      id: true,
      code: true,
      label: true,
      isActive: true,
      departmentId: true,
      mappingValidatedAt: true,
      mappingVersion: true,
      department: { select: { id: true, name: true, isActive: true } },
    },
  },
  yearLevelId: true,
  yearLevel: { select: { id: true, name: true, isActive: true } },
} satisfies Prisma.UserSelect;
type AcademicRecord = {
  program: {
    isActive: boolean;
    departmentId: string | null;
    mappingValidatedAt: Date | null;
    department: { isActive: boolean } | null;
  } | null;
  yearLevelId: string | null;
  yearLevel: { isActive: boolean } | null;
};
export function academicInfo(student: AcademicRecord) {
  const program = student.program;
  return {
    departmentId:
      program?.isActive &&
      program.mappingValidatedAt &&
      program.department?.isActive
        ? program.departmentId
        : null,
    yearLevelId: student.yearLevel?.isActive ? student.yearLevelId : null,
  };
}
export async function academicOptions(db: PrismaClient) {
  const programs = await db.program.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      label: true,
      mappingValidatedAt: true,
      department: { select: { id: true, name: true, isActive: true } },
      yearLevels: {
        where: { isActive: true },
        select: { id: true, code: true, name: true, order: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { label: "asc" },
  });
  const yearLevels = await db.yearLevel.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, order: true },
    orderBy: { order: "asc" },
  });
  return {
    scope: catalog.scope,
    programs: programs.map(
      ({ department, mappingValidatedAt, ...program }) => ({
        ...program,
        department:
          mappingValidatedAt && department?.isActive
            ? { id: department.id, name: department.name }
            : null,
        proposedDepartment: !mappingValidatedAt
          ? department?.isActive
            ? { id: department.id, name: department.name }
            : !department
              ? proposedDepartment(program.code)
              : null
          : null,
      }),
    ),
    yearLevels,
  };
}
export async function validateAcademicSelection(
  db: PrismaClient | Prisma.TransactionClient,
  programId: string,
  yearLevelId: string,
) {
  const program = await db.program.findFirst({
    where: {
      id: programId,
      isActive: true,
      yearLevels: { some: { id: yearLevelId, isActive: true } },
    },
    select: { id: true },
  });
  if (!program)
    throw new HttpError(
      422,
      "Choose a supported college program and one of its approved year levels.",
    );
}
export async function seedAcademicCatalog(db: PrismaClient) {
  await db.$transaction(async (tx) => {
    const years = [];
    for (const year of catalog.yearLevels)
      years.push(
        await tx.yearLevel.upsert({
          where: { code: year.code },
          create: year,
          update: {},
        }),
      );
    for (const program of catalog.programs)
      await tx.program.upsert({
        where: { code: program.code },
        create: {
          ...program,
          yearLevels: { connect: years.map((y) => ({ id: y.id })) },
        },
        update: {},
      });
    // No department rows or mappings are guessed or inferred from program labels.
  });
}
