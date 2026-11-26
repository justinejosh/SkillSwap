import { AppConfig } from "../lib/config";
import { overviewReviewWhere } from "../services/reviewReporting";
import { previewStudentSuspension, suspendStudent, reconcileDueSuspensions, reconcileSuspensionById } from "../services/studentSuspensions";
import { ReportEvidenceService } from "../services/reportEvidence";
import express from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { actor, requireAdmin } from "../middleware/authMiddleware";
import { HttpError, integer, onlyKeys, text } from "../lib/http";
import { transaction } from "../lib/transaction";
import { departmentNameKey } from "../services/departmentNames";
import { ensureSkillCatalog } from "../services/skillCatalog";
import { validateBankInput } from "../services/bankValidation";
import { seedAcademicCatalog } from "../services/academics";
import {
  importDepartmentDraft,
  reviewedDepartmentDraft,
} from "../services/departmentDraft";
import { integrityRouter } from "./integrity";
import { INTEGRITY_REVIEW_REASON } from "../services/exchangeIntegrity";
export function adminRouter(db: PrismaClient, evidence?: ReportEvidenceService, config?: AppConfig) {
  const router = express.Router();
  router.use(requireAdmin);
  router.get("/peer-evaluations", async (req, res) => {
    const page = integer(Number(req.query.page ?? 1), "Page", 1, 100000);
    const pageSize = integer(Number(req.query.pageSize ?? 20), "Page size", 1, 50);
    const search = text(req.query.search ?? "", "Student name", 100, true);
    const validation = req.query.validation ?? "COUNTED", sort = req.query.sort ?? "newest";
    if (!["COUNTED", "VALIDATED", "UNVALIDATED", "ALL"].includes(String(validation)) || typeof validation !== "string") throw new HttpError(422, "Choose a supported validation view.");
    if (!["newest", "oldest"].includes(String(sort)) || typeof sort !== "string") throw new HttpError(422, "Choose newest or oldest order.");
    const rating = req.query.rating === undefined ? undefined : integer(Number(req.query.rating), "Rating", 1, 5);
    const where: Prisma.ReviewWhereInput = {
      ...(validation === "COUNTED" ? overviewReviewWhere : validation === "VALIDATED" ? { isValidated: true } : validation === "UNVALIDATED" ? { isValidated: false } : {}),
      ...(rating === undefined ? {} : { rating }),
      ...(search ? { OR: [{ reviewer: { name: { contains: search } } }, { reviewee: { name: { contains: search } } }] } : {}),
    };
    const direction = sort === "oldest" ? "asc" : "desc";
    const [total, reviews] = await Promise.all([
      db.review.count({ where }),
      db.review.findMany({ where, orderBy: [{ createdAt: direction }, { id: direction }], skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, rating: true, comment: true, createdAt: true, isValidated: true,
          reviewer: { select: { name: true } }, reviewee: { select: { name: true } },
          swap: { select: { id: true, status: true, integrityVerified: true, offeredSkill: { select: { name: true } }, wantedSkill: { select: { name: true } } } },
        },
      }),
    ]);
    res.json({ page, pageSize, total, validation, reviews: reviews.map(review => ({ ...review, countedInOverview: review.isValidated && review.swap.integrityVerified && review.swap.status === "COMPLETED" })) });
  });
  router.get("/users", async (req, res) => {
    await reconcileDueSuspensions(db);
    const page = integer(Number(req.query.page ?? 1), "Page", 1, 100000);
    const pageSize = integer(Number(req.query.pageSize ?? 20), "Page size", 1, 50);
    const search = text(req.query.search ?? "", "Search", 100, true);
    const role = req.query.role, status = req.query.status;
    if (role && role !== "USER" && role !== "ADMIN") throw new HttpError(422, "Unsupported account role.");
    if (status && status !== "ACTIVE" && status !== "SUSPENDED") throw new HttpError(422, "Unsupported account status.");
    const where = { ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
      ...(role ? { role: role as "USER" | "ADMIN" } : {}), ...(status ? { isSuspended: status === "SUSPENDED" } : {}) };
    const [total, users] = await Promise.all([db.user.count({ where }), db.user.findMany({ where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: { id: true, name: true, email: true, role: true, isSuspended: true, createdAt: true, activeSuspensionId: true, activeSuspension: { select: { expiresAt: true } } } })]);
    res.json({ users, total, page, pageSize, suspensionCreationEnabled: config?.suspensionCreationEnabled === true });
  });
  const suspensionConfig = () => { if (!config) throw new HttpError(503, "Suspension configuration is unavailable."); return config; };
  const authority = (req: express.Request) => ({ id: actor(req), tokenVersion: req.sessionTokenVersion!, sessionId: req.sessionId! });
  router.post("/users/:id/suspensions/preview", async (req, res) => { res.json(await previewStudentSuspension(db, suspensionConfig(), authority(req), String(req.params.id), req.body)); });
  const suspend: express.RequestHandler = async (req, res) => { res.status(201).json(await suspendStudent(db, suspensionConfig(), authority(req), String(req.params.id), req.body)); };
  router.post("/users/:id/suspensions", suspend);
  // Preserve the old route's authorization, but never its reason-free bypass.
  router.delete("/users/:id", suspend);
  router.get("/users/:id/suspensions", async (req, res) => {
    const user = await reconcileSuspensionById(db, String(req.params.id));
    if (!user) throw new HttpError(404, "Account not found.");
    if (user.role !== "USER") throw new HttpError(422, "Suspension history is for student accounts.");
    const page = integer(Number(req.query.page ?? 1), "Page", 1, 100000), pageSize = 10;
    const where = { userId: user.id };
    const [total, suspensions] = await Promise.all([db.studentSuspension.count({ where }), db.studentSuspension.findMany({ where, take: pageSize, skip: (page - 1) * pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: {
      id: true, reason: true, reasonExplanation: true, studentExplanation: true, privateNotes: true, durationDays: true, startsAt: true, expiresAt: true, status: true, expiredAt: true, reactivatedAt: true, createdAt: true,
      administrator: { select: { name: true } }, events: { orderBy: { createdAt: "asc" }, select: { action: true, createdAt: true, actorAdministrator: { select: { name: true } } } },
    } })]);
    res.json({ student: { name: user.name, isSuspended: user.isSuspended, legacyRestriction: user.isSuspended && !user.activeSuspensionId }, page, pageSize, total, suspensions });
  });
  router.post("/skill-catalog/initialize", async (req, res) => {
    onlyKeys(req.body, []);
    res.json(await ensureSkillCatalog(db));
  });
  router.use("/integrity", integrityRouter(db));
  router.post("/academic-programs/provisional-mapping", async (req, res) => {
    onlyKeys(req.body, []);
    res.json(await importDepartmentDraft(db));
  });
  router.patch("/academic-programs/:id/department-draft", async (req, res) => {
    onlyKeys(req.body, ["departmentId", "proposalNotes", "mappingVersion"]);
    const departmentId = text(req.body.departmentId, "Department");
    if (
      !(await db.department.findFirst({
        where: { id: departmentId, isActive: true },
      }))
    )
      throw new HttpError(422, "Choose a configured department.");
    const result = await db.program.updateMany({
      where: {
        id: String(req.params.id),
        mappingValidatedAt: null,
        mappingVersion: integer(
          req.body.mappingVersion,
          "Mapping version",
          0,
          1000000,
        ),
      },
      data: {
        departmentId,
        mappingNotes: text(req.body.proposalNotes, "Proposal notes", 5000),
        mappingValidatedById: null,
        mappingVersion: { increment: 1 },
      },
    });
    if (!result.count)
      throw new HttpError(
        409,
        "Mapping changed or is already validated. Reload and use the evidence-backed workflow for validated mappings.",
      );
    res.json({
      message: "Provisional mapping saved. It does not contribute to WRMR.",
    });
  });
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
    res.json({
      programs,
      departments,
      yearLevels,
      provisionalDraft: reviewedDepartmentDraft(),
    });
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
    res.status(201).json(
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
    await reconcileDueSuspensions(db);
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
  router.post("/academic-options", async (req, res) => {
    onlyKeys(req.body, ["type", "code", "name", "order"]);
    const code = text(req.body.code, "Code", 40).toUpperCase();
    const name = text(req.body.name, "Name", 150);
    if (!/^[A-Z0-9_-]+$/.test(code))
      throw new HttpError(422, "Use a stable institutional code.");
    if (req.body.type === "department") {
      const saved = await transaction(db, async (tx) => {
        const departments = await tx.department.findMany();
        if (departments.some((d) => departmentNameKey(d.name) === departmentNameKey(name)))
          throw new HttpError(409, "A college with this name already exists. Select the existing department instead of adding another copy.");
        return tx.department.create({ data: { code, name } });
      });
      res.status(201).json(saved);
    }
    else if (req.body.type === "yearLevel")
      res.status(201).json(
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
  router.get("/moderation-audit", async (req, res) => {
    const page = integer(Number(req.query.page ?? 1), "Page", 1, 100000);
    const threadId = text(req.query.threadId ?? "", "Thread", 191, true);
    const where = { action: "DELETE_REPLY", ...(threadId ? { threadId } : {}) };
    const [total, records] = await Promise.all([db.adminAudit.count({ where }), db.adminAudit.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page-1)*20, take: 20 })]);
    res.json({ total, page, pageSize: 20, records });
  });
  router.get("/reports/:id/evidence", async (req, res) => {
    if (!evidence) throw new HttpError(503, "Private evidence storage is not enabled.");
    const bytes = await evidence.preview(String(req.params.id), actor(req));
    res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline; filename=report-evidence.webp" });
    res.send(bytes);
  });
  router.post("/report-evidence/retention", async (req, res) => {
    onlyKeys(req.body, ["confirm"]);
    if (req.body.confirm !== undefined && typeof req.body.confirm !== "boolean") throw new HttpError(422, "Confirm must be a boolean.");
    if (!evidence) throw new HttpError(503, "Private evidence storage is not enabled.");
    res.json(await evidence.purgeExpired(actor(req), req.body.confirm === true));
  });
  router.post("/report-evidence/cleanup", async (req, res) => {
    onlyKeys(req.body, []);
    if (!evidence) throw new HttpError(503, "Private evidence storage is not enabled.");
    await db.adminAudit.create({ data: { administratorId: actor(req), action: "CLEANUP_EVIDENCE_ORPHANS" } });
    res.json(await evidence.cleanupOrphans());
  });
  router.get("/reports", async (_req, res) => {
    const rows = await db.userReport.findMany({
        where: { reason: { not: INTEGRITY_REVIEW_REASON } },
        include: {
          reporter: { select: { id: true, name: true } },
          target: { select: { id: true, name: true } },
          evidence: { select: { id: true, state: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    res.json(rows.map(({evidence: attachment, ...report}) => ({...report, hasEvidence: attachment?.state === "ATTACHED"})));
  });
  router.patch("/reports/:id", async (req, res) => {
    onlyKeys(req.body, ["status", "resolution"]);
    if (!["RESOLVED", "DISMISSED"].includes(req.body.status))
      throw new HttpError(422, "Choose RESOLVED or DISMISSED.");
    const result = await db.userReport.updateMany({
      where: {
        id: String(req.params.id),
        status: "PENDING",
        reason: { not: INTEGRITY_REVIEW_REASON },
      },
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
