import { HttpError, integer, onlyKeys, text } from "../lib/http";
export function validateBankInput(body: any) {
  onlyKeys(body, [
    "skillId",
    "level",
    "title",
    "learningOutcomes",
    "questionCount",
    "passingPercent",
    "durationMinutes",
    "items",
  ]);
  const skillId = text(body.skillId, "Skill");
  const title = text(body.title, "Title", 150);
  const learningOutcomes = text(
    body.learningOutcomes,
    "Learning outcomes",
    5000,
  );
  const level = body.level;
  if (level !== "BASIC" && level !== "ADVANCED")
    throw new HttpError(422, "Invalid assessment level.");
  const questionCount = integer(
    body.questionCount ?? (level === "BASIC" ? 10 : 5),
    "Question count",
    level === "BASIC" ? 10 : 5,
    10,
  );
  const passingPercent = integer(
    body.passingPercent ?? 80,
    "Passing threshold",
    1,
    100,
  );
  const durationMinutes = integer(
    body.durationMinutes ?? (level === "BASIC" ? 20 : 45),
    "Duration",
    5,
    120,
  );
  if (
    !Array.isArray(body.items) ||
    body.items.length < questionCount ||
    body.items.length > 200
  )
    throw new HttpError(
      422,
      "Provide a complete curated pool of at most 200 questions.",
    );
  const prompts = new Set<string>();
  const items = body.items.map((item: any) => {
    onlyKeys(item, [
      "kind",
      "prompt",
      "competency",
      "rubric",
      "points",
      "options",
    ]);
    const kind = level === "BASIC" ? "MULTIPLE_CHOICE" : "APPLIED_CHOICE";
    if (item.kind !== kind)
      throw new HttpError(
        422,
        `${level} assessments require ${kind} items. Other formats are unavailable.`,
      );
    const prompt = text(item.prompt, "Question prompt", 8000);
    if (prompts.has(prompt.toLowerCase()))
      throw new HttpError(422, "Question prompts must be distinct.");
    prompts.add(prompt.toLowerCase());
    const competency = text(item.competency, "Competency", 191);
    const rubric = text(item.rubric, "Rubric", 5000);
    const points = integer(
      item.points ?? 1,
      "Points",
      1,
      level === "BASIC" ? 1 : 20,
    );
    if (
      !Array.isArray(item.options) ||
      item.options.length < 2 ||
      item.options.length > 6
    )
      throw new HttpError(422, "Each item needs two to six choices.");
    const options = item.options.map((o: any) => {
      onlyKeys(o, ["text", "isCorrect"]);
      if (typeof o.isCorrect !== "boolean")
        throw new HttpError(
          422,
          "Each option needs an explicit correctness flag.",
        );
      return { text: text(o.text, "Option", 4000), isCorrect: o.isCorrect };
    });
    if (
      options.filter((o: { isCorrect: boolean }) => o.isCorrect).length !== 1 ||
      new Set(options.map((o: { text: string }) => o.text.toLowerCase()))
        .size !== options.length
    )
      throw new HttpError(
        422,
        "Each question needs distinct options and exactly one correct answer.",
      );
    return { kind, prompt, competency, rubric, points, options };
  });
  return {
    skillId,
    title,
    level: level as "BASIC" | "ADVANCED",
    learningOutcomes,
    questionCount,
    passingPercent,
    durationMinutes,
    items,
  };
}
