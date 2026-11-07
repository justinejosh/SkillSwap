import { AssessmentLevel, Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "../lib/http";
import { lockOffering, transaction } from "../lib/transaction";
import {
  allowance,
  grade,
  promotedTier,
  RETAKE_POLICY,
  shuffled,
} from "./assessmentRules";
const attemptInclude = {
  offering: { include: { skill: true } },
  version: { include: { bank: true } },
  items: {
    orderBy: { position: "asc" },
    include: { item: { include: { options: true } } },
  },
} satisfies Prisma.AssessmentAttemptInclude;
type Attempt = Prisma.AssessmentAttemptGetPayload<{
  include: typeof attemptInclude;
}>;
function privateAttempt(a: Attempt) {
  const expired = a.status === "IN_PROGRESS" && a.expiresAt <= new Date();
  const status = expired ? "EXPIRED" : a.status;
  return {
    id: a.id,
    offeringId: a.offeringId,
    skillName: a.offering.skill.name,
    level: a.level,
    attemptNumber: a.attemptNumber,
    assessmentVersion: a.version.version,
    learningOutcomes: a.version.learningOutcomes,
    status,
    passingPercent: a.passingPercent,
    startedAt: a.startedAt,
    expiresAt: a.expiresAt,
    submittedAt: a.submittedAt,
    gradedAt: a.gradedAt,
    earnedPoints: a.earnedPoints,
    possiblePoints: a.possiblePoints,
    advancedPromptDismissed: !!a.offering.advancedPromptDismissedAt,
    score: a.possiblePoints ? (a.earnedPoints! / a.possiblePoints) * 100 : null,
    tier: a.offering.tier,
    questions:
      status === "IN_PROGRESS"
        ? a.items.map((q) => {
            const order = q.optionOrder as string[];
            return {
              id: q.id,
              kind: q.item.kind,
              prompt: q.item.prompt,
              points: q.item.points,
              options: order.map((id) => {
                const option = q.item.options.find((o) => o.id === id)!;
                return { id: option.id, text: option.text };
              }),
            };
          })
        : [],
  };
}
export async function assessmentAvailability(
  db: PrismaClient,
  offeringId: string,
  userId: string,
) {
  const offering = await db.userOfferedSkill.findFirst({
    where: { id: offeringId, userId, isActive: true },
    include: { skill: true },
  });
  if (!offering) throw new HttpError(404, "Offering not found.");
  const history = await db.assessmentAttempt.findMany({
    where: { offeringId },
    orderBy: { startedAt: "desc" },
    include: {
      version: { select: { questionCount: true, learningOutcomes: true } },
    },
  });
  const versions = await db.assessmentVersion.findMany({
    where: {
      bank: { skillId: offering.skillId },
      status: "PUBLISHED",
      validatedAt: { not: null },
      validatedById: { not: null },
    },
    include: { bank: true },
  });
  const levels = (["BASIC", "ADVANCED"] as const).map((level) => {
    const attempts = history.filter((a) => a.level === level);
    const active = attempts.find(
      (a) => a.status === "IN_PROGRESS" && a.expiresAt > new Date(),
    );
    const version = versions.find((v) => v.bank.level === level);
    const earned =
      level === "BASIC"
        ? offering.tier !== "NOT_ASSESSED"
        : offering.tier === "VERIFIED";
    const prerequisite =
      level === "BASIC" ||
      history.some((a) => a.level === "BASIC" && a.status === "PASSED");
    const rule = allowance(attempts);
    return {
      level,
      supported: !!version || !!active,
      eligible:
        !earned && prerequisite && (!!version || !!active) && rule.allowed,
      reason: earned
        ? "This tier has already been earned."
        : !prerequisite
          ? "Earn Amateur for this skill first."
          : !version && !active
            ? "Assessment is unavailable for this skill and level."
            : rule.reason,
      activeAttemptId: active?.id ?? null,
      nextEligibleAt: rule.nextEligibleAt,
      attemptCount: attempts.length,
      passingPercent: active?.passingPercent ?? version?.passingPercent ?? null,
      questionCount:
        active?.version.questionCount ?? version?.questionCount ?? null,
      learningOutcomes:
        active?.version.learningOutcomes ?? version?.learningOutcomes ?? null,
    };
  });
  return {
    offeringId,
    skillName: offering.skill.name,
    tier: offering.tier,
    levels,
    policy: RETAKE_POLICY,
    attempts: history.map((a) => ({
      id: a.id,
      level: a.level,
      attemptNumber: a.attemptNumber,
      status:
        a.status === "IN_PROGRESS" && a.expiresAt <= new Date()
          ? "EXPIRED"
          : a.status,
      earnedPoints: a.earnedPoints,
      possiblePoints: a.possiblePoints,
      startedAt: a.startedAt,
      gradedAt: a.gradedAt,
    })),
  };
}
export async function startAssessment(
  db: PrismaClient,
  offeringId: string,
  userId: string,
  level: AssessmentLevel,
) {
  const id = await transaction(db, async (tx) => {
    await lockOffering(tx, offeringId);
    const offering = await tx.userOfferedSkill.findFirst({
      where: { id: offeringId, userId, isActive: true },
    });
    if (!offering) throw new HttpError(404, "Offering not found.");
    const history = await tx.assessmentAttempt.findMany({
      where: { offeringId, level },
      orderBy: { attemptNumber: "desc" },
    });
    const now = new Date();
    const active = history.find(
      (a) => a.status === "IN_PROGRESS" && a.expiresAt > now,
    );
    if (active) return active.id;
    if (
      (level === "BASIC" && offering.tier !== "NOT_ASSESSED") ||
      (level === "ADVANCED" && offering.tier === "VERIFIED")
    )
      throw new HttpError(409, "This assessment tier has already been earned.");
    if (
      level === "ADVANCED" &&
      (offering.tier === "NOT_ASSESSED" ||
        !(await tx.assessmentAttempt.count({
          where: { offeringId, level: "BASIC", status: "PASSED" },
        })))
    )
      throw new HttpError(
        403,
        "Earn Amateur for this skill before attempting Verified.",
      );
    const permitted = allowance(history, now);
    if (!permitted.allowed)
      throw new HttpError(429, permitted.reason, {
        nextEligibleAt: permitted.nextEligibleAt,
      });
    const version = await tx.assessmentVersion.findFirst({
      where: {
        bank: { skillId: offering.skillId, level },
        status: "PUBLISHED",
        validatedAt: { not: null },
        validatedById: { not: null },
      },
      include: { items: { include: { options: true } } },
      orderBy: { version: "desc" },
    });
    if (!version)
      throw new HttpError(
        404,
        "Assessment is unavailable for this skill and level.",
      );
    if (version.items.length < version.questionCount)
      throw new HttpError(
        409,
        "Published question bank is incomplete. Contact an administrator.",
      );
    await tx.assessmentAttempt.updateMany({
      where: {
        offeringId,
        level,
        status: "IN_PROGRESS",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });
    const items = shuffled(version.items).slice(0, version.questionCount);
    const attempt = await tx.assessmentAttempt.create({
      data: {
        offeringId,
        level,
        versionId: version.id,
        attemptNumber: (history[0]?.attemptNumber ?? 0) + 1,
        passingPercent: version.passingPercent,
        policy: { ...RETAKE_POLICY },
        startedAt: now,
        expiresAt: new Date(now.getTime() + version.durationMinutes * 60000),
        items: {
          create: items.map((item, position) => ({
            itemId: item.id,
            position,
            optionOrder: shuffled(item.options.map((o) => o.id)),
          })),
        },
      },
    });
    return attempt.id;
  });
  return viewAssessment(db, id, userId);
}
export async function viewAssessment(
  db: PrismaClient,
  id: string,
  userId: string,
) {
  const attempt = await db.assessmentAttempt.findFirst({
    where: { id, offering: { userId } },
    include: attemptInclude,
  });
  if (!attempt) throw new HttpError(404, "Attempt not found.");
  if (attempt.status === "IN_PROGRESS" && attempt.expiresAt <= new Date()) {
    await db.assessmentAttempt.updateMany({
      where: { id, status: "IN_PROGRESS", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
  }
  return privateAttempt(attempt);
}
export async function submitAssessment(
  db: PrismaClient,
  id: string,
  userId: string,
  answers: unknown,
) {
  await transaction(db, async (tx) => {
    const owned = await tx.assessmentAttempt.findFirst({
      where: { id, offering: { userId } },
      select: { offeringId: true },
    });
    if (!owned) throw new HttpError(404, "Attempt not found.");
    await lockOffering(tx, owned.offeringId);
    const a = await tx.assessmentAttempt.findUniqueOrThrow({
      where: { id },
      include: attemptInclude,
    });
    if (a.status !== "IN_PROGRESS") return;
    if (a.expiresAt <= new Date()) {
      await tx.assessmentAttempt.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return;
    }
    if (!a.offering.isActive)
      throw new HttpError(
        409,
        "Restore the offered skill before continuing this attempt.",
      );
    if (a.level === "ADVANCED" && a.offering.tier === "NOT_ASSESSED")
      throw new HttpError(403, "Amateur prerequisite is missing.");
    const result = grade(
      a.items.map((q) => ({
        id: q.id,
        points: q.item.points,
        options: q.item.options,
      })),
      answers,
      a.passingPercent,
    );
    for (const item of result.scored)
      await tx.assessmentAttemptItem.update({
        where: { id: item.id },
        data: {
          answerOptionId: item.answerOptionId,
          awardedPoints: item.awardedPoints,
        },
      });
    const now = new Date();
    await tx.assessmentAttempt.update({
      where: { id },
      data: {
        status: result.passed ? "PASSED" : "FAILED",
        submittedAt: now,
        gradedAt: now,
        earnedPoints: result.earnedPoints,
        possiblePoints: result.possiblePoints,
      },
    });
    const tier = promotedTier(a.offering.tier, a.level, result.passed);
    if (tier !== a.offering.tier)
      await tx.userOfferedSkill.update({
        where: { id: a.offeringId },
        data: { tier, tierAwardedAt: now, awardAttemptId: id },
      });
  });
  return viewAssessment(db, id, userId);
}
