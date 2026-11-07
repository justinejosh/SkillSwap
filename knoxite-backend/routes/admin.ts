import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor, requireAdmin } from "../middleware/authMiddleware";
import { HttpError, integer, onlyKeys, text } from "../lib/http";
import { transaction } from "../lib/transaction";
import { validateBankInput } from "../services/bankValidation";
import { seedAcademicCatalog } from "../services/academics";
export function adminRouter(db: PrismaClient) {
  const router = express.Router();
  router.use(requireAdmin);
  router.post("/academic-options/initialize", async (req, res) => {
    onlyKeys(req.body, []);
    await seedAcademicCatalog(db);
    res.json({
      message:
        "Team-approved college programmes and year levels initialized. Department mapping remains pending.",
    });
  });
  router.get("/academic-programs", async (_req, res) => {
    const [programs, departments, yearLevels] = await Promise.all([
      db.program.findMany({
        include: { department: true, yearLevels: true },
        orderBy: { label: "asc" },
      }),
      db.department.findMany({ orderBy: { name: "asc" } }),
      db.yearLevel.findMany({ orderBy: { order: "asc" } }),
    ]);
    res.json({ programs, departments, yearLevels });
  });
  router.post("/academic-programs", async (req, res) => {
    onlyKeys(req.body, ["code", "label", "yearLevelIds"]);
    const code = text(req.body.code, "Program code", 40);
    const label = text(req.body.label, "Program label", 100);
    const ids = req.body.yearLevelIds;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => typeof id !== "string") ||
      new Set(ids).size !== ids.length ||
      (await db.yearLevel.count({
        where: { id: { in: ids }, isActive: true },
      })) !== ids.length
    )
      throw new HttpError(422, "Choose supported year levels.");
    res
      .status(201)
      .json(
        await db.program.create({
          data: {
            code,
            label,
            yearLevels: { connect: ids.map((id) => ({ id })) },
          },
        }),
      );
  });
  router.patch("/academic-programs/:id/year-levels", async (req, res) => {
    onlyKeys(req.body, ["yearLevelIds"]);
    const ids = req.body.yearLevelIds;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      ids.some((id) => typeof id !== "string") ||
      new Set(ids).size !== ids.length ||
      (await db.yearLevel.count({
        where: { id: { in: ids }, isActive: true },
      })) !== ids.length
    )
      throw new HttpError(422, "Choose supported year levels.");
    await db.program.update({
      where: { id: String(req.params.id) },
      data: { yearLevels: { set: ids.map((id) => ({ id })) } },
    });
    res.json({
      message:
        "Program year-level options updated. Existing student records are retained.",
    });
  });
  router.post("/academic-programs/:id/department", async (req, res) => {
    onlyKeys(req.body, [
      "departmentId",
      "validationNotes",
      "officiallyConfirmed",
    ]);
    if (req.body.officiallyConfirmed !== true)
      throw new HttpError(
        422,
        "Record official mapping confirmation before assigning a department.",
      );
    const departmentId = text(req.body.departmentId, "Department");
    if (
      !(await db.department.findFirst({
        where: { id: departmentId, isActive: true },
      }))
    )
      throw new HttpError(422, "Choose a configured department.");
    await db.program.update({
      where: { id: String(req.params.id) },
      data: {
        departmentId,
        mappingNotes: text(
          req.body.validationNotes,
          "Official mapping evidence",
          5000,
        ),
        mappingValidatedAt: new Date(),
        mappingValidatedById: actor(req),
        mappingVersion: { increment: 1 },
      },
    });
    res.json({
      message:
        "Official program-to-department mapping recorded. Students derive their department from this mapping.",
    });
  });
  router.get("/dashboard-data", async (_req, res) => {
    const [
      totalUsers,
      activeSwaps,
      completedSwaps,
      reportedIssues,
      recentUsers,
    ] = await Promise.all([
      db.user.count(),
      db.swap.count({
        where: { status: { in: ["PENDING_AGREEMENT", "CONFIRMED"] } },
      }),
      db.swap.count({
        where: { status: "COMPLETED", integrityVerified: true },
      }),
      db.userReport.count({ where: { status: "PENDING" } }),
      db.user.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          isSuspended: true,
        },
      }),
    ]);
    res.json({
      stats: { totalUsers, activeSwaps, completedSwaps, reportedIssues },
      recentUsers,
    });
  });
  router.delete("/users/:id", async (req, res) => {
    const id = String(req.params.id);
    const user = await db.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) throw new HttpError(404, "User not found.");
    if (user.role === "ADMIN")
      throw new HttpError(
        403,
        "Administrator accounts cannot be suspended here.",
      );
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isSuspended: true, tokenVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    res.json({
      message: "Account suspended. All historical records are retained.",
    });
  });
  router.post("/academic-options", async (req, res) => {
    onlyKeys(req.body, ["type", "code", "name", "order"]);
    const code = text(req.body.code, "Code", 40).toUpperCase();
    const name = text(req.body.name, "Name", 150);
    if (!/^[A-Z0-9_-]+$/.test(code))
      throw new HttpError(422, "Use a stable institutional code.");
    if (req.body.type === "department")
      res
        .status(201)
        .json(await db.department.create({ data: { code, name } }));
    else if (req.body.type === "yearLevel")
      res
        .status(201)
        .json(
          await db.yearLevel.create({
            data: {
              code,
              name,
              order: integer(req.body.order, "Order", 1, 100),
            },
          }),
        );
    else throw new HttpError(422, "Choose department or yearLevel.");
  });
  router.get("/assessment-catalog", async (_req, res) => {
    res.json(
      await db.skill.findMany({
        select: { id: true, name: true, category: true },
        orderBy: { name: "asc" },
      }),
    );
  });
  router.get("/assessments", async (_req, res) => {
    res.json(
      await db.assessmentBank.findMany({
        include: {
          skill: true,
          versions: {
            orderBy: { version: "desc" },
            include: {
              items: { include: { options: true } },
              _count: { select: { attempts: true } },
            },
          },
        },
        orderBy: { title: "asc" },
      }),
    );
  });
  router.post("/assessments/versions", async (req, res) => {
    const input = validateBankInput(req.body);
    const saved = await transaction(db, async (tx) => {
      if (!(await tx.skill.findUnique({ where: { id: input.skillId } })))
        throw new HttpError(404, "Skill not found.");
      const bank = await tx.assessmentBank.upsert({
        where: {
          skillId_level: { skillId: input.skillId, level: input.level },
        },
        create: {
          skillId: input.skillId,
          level: input.level,
          title: input.title,
        },
        update: {},
      });
      await tx.$queryRaw`SELECT id FROM AssessmentBank WHERE id = ${bank.id} FOR UPDATE`;
      const latest = await tx.assessmentVersion.findFirst({
        where: { bankId: bank.id },
        orderBy: { version: "desc" },
      });
      return tx.assessmentVersion.create({
        data: {
          bankId: bank.id,
          version: (latest?.version ?? 0) + 1,
          createdById: actor(req),
          questionCount: input.questionCount,
          passingPercent: input.passingPercent,
          durationMinutes: input.durationMinutes,
          learningOutcomes: input.learningOutcomes,
          items: {
            create: input.items.map((item: any) => ({
              ...item,
              options: { create: item.options },
            })),
          },
        },
        select: { id: true, version: true, status: true },
      });
    });
    res.status(201).json(saved);
  });
  router.post("/assessments/versions/:id/validate", async (req, res) => {
    onlyKeys(req.body, ["validationNotes"]);
    const notes = text(req.body.validationNotes, "Validation notes", 5000);
    const result = await db.assessmentVersion.updateMany({
      where: { id: String(req.params.id), status: "DRAFT" },
      data: {
        validatedById: actor(req),
        validatedAt: new Date(),
        validationNotes: notes,
      },
    });
    if (!result.count)
      throw new HttpError(409, "Only a draft version can be validated.");
    res.json({
      message:
        "Human validation recorded. Publish only after reviewing competency coverage and grading.",
    });
  });
  router.post("/assessments/versions/:id/publish", async (req, res) => {
    onlyKeys(req.body, []);
    await transaction(db, async (tx) => {
      const id = String(req.params.id);
      const version = await tx.assessmentVersion.findUnique({
        where: { id },
        include: { bank: true, items: { include: { options: true } } },
      });
      if (
        !version ||
        version.status !== "DRAFT" ||
        !version.validatedById ||
        !version.validatedAt ||
        !version.validationNotes
      )
        throw new HttpError(409, "A validated draft is required.");
      validateBankInput({
        skillId: version.bank.skillId,
        level: version.bank.level,
        title: version.bank.title,
        learningOutcomes: version.learningOutcomes,
        questionCount: version.questionCount,
        passingPercent: version.passingPercent,
        durationMinutes: version.durationMinutes,
        items: version.items.map((i) => ({
          kind: i.kind,
          prompt: i.prompt,
          competency: i.competency,
          rubric: i.rubric,
          points: i.points,
          options: i.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        })),
      });
      await tx.$queryRaw`SELECT id FROM AssessmentBank WHERE id = ${version.bankId} FOR UPDATE`;
      await tx.assessmentVersion.updateMany({
        where: { bankId: version.bankId, status: "PUBLISHED" },
        data: { status: "RETIRED" },
      });
      await tx.assessmentVersion.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
    });
    res.json({
      message:
        "Assessment version published. Existing attempts keep their original version.",
    });
  });
  router.post("/assessments/versions/:id/retire", async (req, res) => {
    onlyKeys(req.body, []);
    const result = await db.assessmentVersion.updateMany({
      where: { id: String(req.params.id), status: "PUBLISHED" },
      data: { status: "RETIRED" },
    });
    if (!result.count) throw new HttpError(409, "Published version not found.");
    res.json({
      message:
        "Retired for new attempts. Existing attempts and earned tiers are retained.",
    });
  });
  router.get("/reports", async (_req, res) => {
    res.json(
      await db.userReport.findMany({
        include: {
          reporter: { select: { id: true, name: true } },
          target: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
  router.patch("/reports/:id", async (req, res) => {
    onlyKeys(req.body, ["status", "resolution"]);
    if (!["RESOLVED", "DISMISSED"].includes(req.body.status))
      throw new HttpError(422, "Choose RESOLVED or DISMISSED.");
    const result = await db.userReport.updateMany({
      where: { id: String(req.params.id), status: "PENDING" },
      data: {
        status: req.body.status,
        resolution: text(req.body.resolution, "Resolution", 2000),
        resolvedById: actor(req),
        resolvedAt: new Date(),
      },
    });
    if (!result.count) throw new HttpError(409, "Pending report not found.");
    res.json({ message: "Report disposition saved." });
  });
  return router;
}
