import { validateAcademicSelection } from "../services/academics";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { actor } from "../middleware/authMiddleware";
import { HttpError, onlyKeys, text } from "../lib/http";
import { portfolioSelect, publicPortfolio } from "../services/portfolios";
import { loadUserMetrics } from "../services/userMetrics";
import { transaction } from "../lib/transaction";
import { listSkillCatalog, resolveSkill, resolveStudentPreset } from "../services/skillCatalog";

export function profileRouter(db: PrismaClient) {
  const router = express.Router();
  router.get("/skill-catalog", async (_req, res) => { res.json(await listSkillCatalog(db)); });
  router.get("/", async (req, res) => {
    const user = await db.user.findUnique({
      where: { id: actor(req) },
      select: {
        ...portfolioSelect,
        email: true,
        gender: true,
        role: true,
        emailVerifiedAt: true,
        offeringLinks: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          include: { skill: true },
        },
      },
    });
    if (!user) throw new HttpError(404, "User not found.");
    const banks = await db.assessmentBank.findMany({
      where: {
        skillId: { in: user.offeringLinks.map((o) => o.skillId) },
        versions: {
          some: {
            status: "PUBLISHED",
            validatedAt: { not: null },
            validatedById: { not: null },
          },
        },
      },
      select: { skillId: true, level: true },
    });
    // Retirement closes new starts, not an already-issued attempt on its pinned version.
    const activeAttempts = await db.assessmentAttempt.findMany({
      where: { offeringId: { in: user.offeringLinks.map((o) => o.id) }, status: "IN_PROGRESS", expiresAt: { gt: new Date() } },
      orderBy: { startedAt: "desc" },
      select: { id: true, offeringId: true, level: true },
    });
    const offeredSkills = user.offeringLinks.map((o) => ({
      id: o.skill.id,
      name: o.skill.name,
      category: o.skill.category,
      offeringId: o.id,
      tier: o.tier,
      activeBasicAttemptId: activeAttempts.find((a) => a.offeringId === o.id && a.level === "BASIC")?.id ?? null,
      activeAdvancedAttemptId: activeAttempts.find((a) => a.offeringId === o.id && a.level === "ADVANCED")?.id ?? null,
      basicAvailable: banks.some(
        (b) => b.skillId === o.skillId && b.level === "BASIC",
      ),
      advancedAvailable: banks.some(
        (b) => b.skillId === o.skillId && b.level === "ADVANCED",
      ),
      basicPromptDismissed: !!o.basicPromptDismissedAt,
      advancedPromptDismissed: !!o.advancedPromptDismissedAt,
    }));
    const metrics = (await loadUserMetrics(db, [user.id])).get(user.id)!;
    res.json({
      ...publicPortfolio(user),
      offeredSkills,
      email: user.email,
      gender: user.gender,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      programId: user.program?.id ?? null,
      yearLevelId: user.yearLevelId,
      metrics,
      rating: metrics.averageRating,
      swapsCount: metrics.completedSwaps,
    });
  });
  router.put("/update", async (req, res) => {
    onlyKeys(req.body, [
      "name",
      "bio",
      "gender",
      "avatarUrl",
      "programId",
      "yearLevelId",
    ]);
    const data: Record<string, string | null> = {};
    if (req.body.name !== undefined)
      data.name = text(req.body.name, "Display name", 100);
    if (req.body.bio !== undefined)
      data.bio = text(req.body.bio, "Biography", 2000, true);
    if (req.body.gender !== undefined) {
      if (!["Male", "Female", "Prefer not to say"].includes(req.body.gender))
        throw new HttpError(422, "Unsupported gender value.");
      data.gender = req.body.gender;
    }
    if (req.body.avatarUrl !== undefined) {
      const avatar = text(req.body.avatarUrl, "Avatar", 500000, true);
      if (
        avatar &&
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)
      ) {
        let url: URL;
        try {
          url = new URL(avatar);
        } catch {
          throw new HttpError(422, "Invalid avatar image.");
        }
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          avatar.length > 2000
        )
          throw new HttpError(
            422,
            "Avatar must be a bounded image or HTTPS URL.",
          );
      }
      data.avatarUrl = avatar || null;
    }
    if (
      req.body.programId !== undefined ||
      req.body.yearLevelId !== undefined
    ) {
      const programId = text(req.body.programId, "College program");
      const yearLevelId = text(req.body.yearLevelId, "Year level");
      await validateAcademicSelection(db, programId, yearLevelId);
      data.programId = programId;
      data.yearLevelId = yearLevelId;
    }
    await db.user.update({ where: { id: actor(req) }, data });
    res.json({ message: "Profile updated." });
  });
  for (const type of ["offer", "want"] as const) {
    router.post(`/skills/${type}`, async (req, res) => {
      const student = req.userRole !== "ADMIN";
      if (student && (req.body?.name !== undefined || req.body?.category !== undefined))
        throw new HttpError(422, "Choose a predefined skill using its preset key or canonical Skill ID. Free-text skill submission is disabled.");
      onlyKeys(req.body, student ? ["presetKey", "skillId"] : ["name", "category", "presetKey", "skillId"]);
      const result = await transaction(db, async (tx) => {
        const skill = student || req.body.skillId !== undefined
          ? await resolveStudentPreset(tx, req.body)
          : await resolveSkill(tx, req.body);
        await tx.user.update({
          where: { id: actor(req) },
          data: {
            [type === "offer" ? "offeredSkills" : "wantedSkills"]: {
              connect: { id: skill.id },
            },
          },
        });
        if (type === "want") return { skill };
        const old = await tx.userOfferedSkill.findUnique({
          where: { userId_skillId: { userId: actor(req), skillId: skill.id } },
        });
        const offering = await tx.userOfferedSkill.upsert({
          where: { userId_skillId: { userId: actor(req), skillId: skill.id } },
          create: { userId: actor(req), skillId: skill.id },
          update: { isActive: true },
        });
        const basicAvailable = !!(await tx.assessmentBank.findFirst({
          where: {
            skillId: skill.id,
            level: "BASIC",
            versions: {
              some: {
                status: "PUBLISHED",
                validatedAt: { not: null },
                validatedById: { not: null },
              },
            },
          },
        }));
        return {
          skill,
          offering: {
            id: offering.id,
            tier: offering.tier,
            basicAvailable,
            basicPromptDismissed: !!offering.basicPromptDismissedAt,
          },
          created: !old,
        };
      });
      res.status(201).json({ message: "Skill saved.", ...result });
    });
  }
  router.patch("/skills/offer/:offeringId/prompts", async (req, res) => {
    onlyKeys(req.body, ["level"]);
    const level = req.body.level;
    if (level !== "BASIC" && level !== "ADVANCED")
      throw new HttpError(422, "Invalid assessment level.");
    const result = await db.userOfferedSkill.updateMany({
      where: {
        id: String(req.params.offeringId),
        userId: actor(req),
        isActive: true,
      },
      data:
        level === "BASIC"
          ? { basicPromptDismissedAt: new Date() }
          : { advancedPromptDismissedAt: new Date() },
    });
    if (result.count !== 1) throw new HttpError(404, "Offering not found.");
    res.json({ message: "Assessment reminder dismissed." });
  });
  router.delete("/skills/:type/:skillId", async (req, res) => {
    const type = String(req.params.type);
    const skillId = String(req.params.skillId);
    if (type !== "offer" && type !== "want")
      throw new HttpError(422, "Invalid skill relationship.");
    await transaction(db, async (tx) => {
      if (type === "offer")
        await tx.userOfferedSkill.updateMany({
          where: { userId: actor(req), skillId },
          data: { isActive: false },
        });
      await tx.user.update({
        where: { id: actor(req) },
        data: {
          [type === "offer" ? "offeredSkills" : "wantedSkills"]: {
            disconnect: { id: skillId },
          },
        },
      });
    });
    res.json({
      message: "Skill removed. Earned tiers and attempt history are retained.",
    });
  });
  return router;
}
