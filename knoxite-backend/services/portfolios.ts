import { academicSelect, eligibleStudentWhere } from "./academics";
import { AppConfig, studentEmailAllowed } from "../lib/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { loadUserMetrics } from "./userMetrics";
import { proposedDepartment } from "./departmentDraft";
export const skillSelect = {
  id: true,
  name: true,
  category: true,
} satisfies Prisma.SkillSelect;
export const portfolioSelect = {
  ...academicSelect,
  id: true,
  name: true,
  avatarUrl: true,
  bio: true,
  offeringLinks: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, tier: true, skill: { select: skillSelect } },
  },
  wantedSkills: { select: skillSelect, orderBy: { name: "asc" } },
} satisfies Prisma.UserSelect;
export type PortfolioRecord = Prisma.UserGetPayload<{
  select: typeof portfolioSelect;
}>;
export function publicPortfolio(user: PortfolioRecord) {
  // Explicit DTO: extending the database query cannot accidentally expose new private fields.
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    program: user.program
      ? {
          id: user.program.id,
          code: user.program.code,
          label: user.program.label,
        }
      : null,
    yearLevel: user.yearLevel
      ? { id: user.yearLevel.id, name: user.yearLevel.name }
      : null,
    department:
      user.program?.isActive &&
      user.program.mappingValidatedAt &&
      user.program.department?.isActive
        ? { id: user.program.department.id, name: user.program.department.name }
        : null,
    proposedDepartment:
      user.program?.isActive && !user.program.mappingValidatedAt
        ? user.program.department?.isActive
          ? {
              id: user.program.department.id,
              name: user.program.department.name,
            }
          : !user.program.department
            ? proposedDepartment(user.program.code)
            : null
        : null,
    offeredSkills: user.offeringLinks.map((o) => ({
      id: o.skill.id,
      name: o.skill.name,
      category: o.skill.category,
      offeringId: o.id,
      tier: o.tier,
    })),
    wantedSkills: user.wantedSkills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    })),
  };
}
export async function portfolio(
  db: PrismaClient,
  id: string,
  config: AppConfig,
) {
  const user = await db.user.findFirst({
    where: { id, ...eligibleStudentWhere(config) },
    select: { ...portfolioSelect, email: true },
  });
  if (!user || !studentEmailAllowed(user.email, config)) return null;
  const metrics = (await loadUserMetrics(db, [id])).get(id)!;
  return { ...publicPortfolio(user), metrics };
}
