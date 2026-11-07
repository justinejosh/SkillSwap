import { randomInt } from "node:crypto";
import { HttpError } from "../lib/http";
export const RETAKE_POLICY = Object.freeze({
  maxStarts: 3,
  windowHours: 168,
  cooldownHours: 24,
});
export const tierRank = { NOT_ASSESSED: 0, AMATEUR: 1, VERIFIED: 2 } as const;
export type Tier = keyof typeof tierRank;
export function promotedTier(
  current: Tier,
  level: "BASIC" | "ADVANCED",
  passed: boolean,
): Tier {
  if (passed && level === "ADVANCED" && current === "NOT_ASSESSED")
    throw new HttpError(403, "Amateur prerequisite is required.");
  const earned = passed
    ? level === "BASIC"
      ? "AMATEUR"
      : "VERIFIED"
    : "NOT_ASSESSED";
  return tierRank[earned] > tierRank[current] ? earned : current;
}
export function shuffled<T>(input: readonly T[], choose = randomInt): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = choose(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export type GradingItem = {
  id: string;
  points: number;
  options: { id: string; isCorrect: boolean }[];
};
export function grade(
  items: GradingItem[],
  answers: unknown,
  passingPercent: number,
) {
  if (!Array.isArray(answers) || answers.length > items.length)
    throw new HttpError(422, "Invalid answer collection.");
  const seen = new Set<string>();
  const selected = new Map<string, string>();
  for (const a of answers) {
    if (
      !a ||
      typeof a !== "object" ||
      Object.keys(a).some((k) => !["questionId", "optionId"].includes(k)) ||
      typeof a.questionId !== "string" ||
      typeof a.optionId !== "string" ||
      seen.has(a.questionId)
    )
      throw new HttpError(422, "Duplicate or invalid answer.");
    const item = items.find((i) => i.id === a.questionId);
    if (!item || !item.options.some((o) => o.id === a.optionId))
      throw new HttpError(422, "Answer does not belong to this attempt.");
    seen.add(a.questionId);
    selected.set(a.questionId, a.optionId);
  }
  if (
    !items.length ||
    !Number.isInteger(passingPercent) ||
    passingPercent < 1 ||
    passingPercent > 100
  )
    throw new Error("Invalid published assessment");
  let earnedPoints = 0;
  let possiblePoints = 0;
  const scored = items.map((item) => {
    if (
      !Number.isInteger(item.points) ||
      item.points < 1 ||
      item.options.filter((o) => o.isCorrect).length !== 1
    )
      throw new Error("Invalid published grading item");
    const answerOptionId = selected.get(item.id) || null;
    const awardedPoints = item.options.some(
      (o) => o.id === answerOptionId && o.isCorrect,
    )
      ? item.points
      : 0;
    earnedPoints += awardedPoints;
    possiblePoints += item.points;
    return { id: item.id, answerOptionId, awardedPoints };
  });
  return {
    earnedPoints,
    possiblePoints,
    passed: earnedPoints * 100 >= possiblePoints * passingPercent,
    scored,
  };
}
export function allowance(
  history: {
    status: string;
    startedAt: Date;
    expiresAt: Date;
    gradedAt: Date | null;
  }[],
  now = new Date(),
) {
  const active = history.find(
    (a) => a.status === "IN_PROGRESS" && a.expiresAt > now,
  );
  if (active)
    return {
      allowed: true,
      reason: "Resume your current attempt.",
      nextEligibleAt: null,
    };
  const windowStart = now.getTime() - RETAKE_POLICY.windowHours * 3600000;
  const recent = history.filter((a) => a.startedAt.getTime() > windowStart);
  let next = 0;
  if (recent.length >= RETAKE_POLICY.maxStarts)
    next =
      recent.map((a) => a.startedAt.getTime()).sort((a, b) => a - b)[
        recent.length - RETAKE_POLICY.maxStarts
      ] +
      RETAKE_POLICY.windowHours * 3600000;
  for (const a of history) {
    const ended =
      a.status === "FAILED"
        ? a.gradedAt
        : a.status === "EXPIRED" ||
            (a.status === "IN_PROGRESS" && a.expiresAt <= now)
          ? a.expiresAt
          : null;
    if (ended)
      next = Math.max(
        next,
        ended.getTime() + RETAKE_POLICY.cooldownHours * 3600000,
      );
  }
  return {
    allowed: next <= now.getTime(),
    reason:
      next > now.getTime()
        ? "Retake limit or cooldown applies."
        : "Assessment available.",
    nextEligibleAt: next > now.getTime() ? new Date(next) : null,
  };
}
