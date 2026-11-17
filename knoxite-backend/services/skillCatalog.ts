import { Prisma, PrismaClient } from "@prisma/client";
import catalog from "../config/skill-catalog.json";
import { HttpError, text } from "../lib/http";
import { transaction } from "../lib/transaction";

export const SKILL_CATEGORIES = ["technology", "creative", "music", "language", "lifestyle", "business", "academic", "other"] as const;
export const presetSkills = catalog.skills;
type SkillRecord = { id: string; name: string; category: string };
export const skillNameKey = (name: string) => name.trim().toLowerCase();

export function presetForName(name: string) {
  return presetSkills.find((p) => skillNameKey(p.name) === skillNameKey(name));
}
export function existingPresetSkill(rows: SkillRecord[], preset: typeof presetSkills[number]) {
  const matches = rows.filter((s) => skillNameKey(s.name) === skillNameKey(preset.name));
  if (matches.length > 1 || matches.some((s) => s.category.toLowerCase() !== preset.category))
    throw new HttpError(409, `The existing skill "${preset.name}" needs category/identity review. Its history was not changed.`);
  return matches[0];
}
export async function listSkillCatalog(db: PrismaClient) {
  const rows = await db.skill.findMany({ select: { id: true, name: true, category: true } });
  return {
    version: catalog.version,
    presets: presetSkills.map((p) => {
      try { return { key: p.key, name: p.name, category: p.category, skillId: existingPresetSkill(rows, p)?.id ?? null, conflict: false }; }
      catch (e) { if (!(e instanceof HttpError)) throw e; return { key: p.key, name: p.name, category: p.category, skillId: null, conflict: true }; }
    }),
  };
}
export async function ensureSkillCatalog(db: PrismaClient) {
  return transaction(db, async (tx) => {
    const rows = await tx.skill.findMany({ select: { id: true, name: true, category: true } });
    const resolved = presetSkills.map((p) => ({ preset: p, existing: existingPresetSkill(rows, p) }));
    let created = 0;
    for (const { preset, existing } of resolved) {
      if (!existing) { await tx.skill.create({ data: { name: preset.name, category: preset.category } }); created++; }
    }
    return { total: presetSkills.length, created, reused: presetSkills.length - created };
  });
}
export async function resolveStudentPreset(tx: Prisma.TransactionClient, input: { presetKey?: unknown; skillId?: unknown }) {
  if ((input.presetKey === undefined) === (input.skillId === undefined))
    throw new HttpError(422, "Choose one preset skill using its preset key or canonical Skill ID.");
  const rows = await tx.skill.findMany({ select: { id: true, name: true, category: true } });
  if (input.skillId !== undefined) {
    const id = text(input.skillId, "Canonical Skill ID", 100);
    const row = rows.find((s) => s.id === id);
    const preset = row && presetForName(row.name);
    if (!row || !preset || existingPresetSkill(rows, preset)?.id !== id)
      throw new HttpError(422, "Choose an existing canonical preset skill. Custom or unknown Skill IDs cannot be added.");
    return row;
  }
  const key = text(input.presetKey, "Preset key", 100);
  const preset = presetSkills.find((p) => p.key === key);
  if (!preset) throw new HttpError(422, "Choose one of the 80 predefined skills.");
  return existingPresetSkill(rows, preset) ?? tx.skill.create({ data: { name: preset.name, category: preset.category } });
}
// Administrator/legacy creation only; student routes use resolveStudentPreset.
// Both the selected-preset path and exact-name free text resolve the same ID.
// Other custom names keep the existing lowercase/upsert behavior; no aliases or
// fuzzy merges are invented, and no old name/category/association is overwritten.
export async function resolveSkill(tx: Prisma.TransactionClient, input: { presetKey?: unknown; name?: unknown; category?: unknown }) {
  let preset;
  let name = "";
  if (input.presetKey !== undefined) {
    if (input.name !== undefined || input.category !== undefined)
      throw new HttpError(422, "Select a preset or enter a custom skill, not both.");
    const key = text(input.presetKey, "Preset key", 100);
    preset = presetSkills.find((p) => p.key === key);
    if (!preset) throw new HttpError(422, "Choose a supported skill preset.");
  } else {
    name = text(input.name, "Skill name", 100).toLowerCase();
    preset = presetForName(name);
  }
  if (preset) {
    const rows = await tx.skill.findMany({ select: { id: true, name: true, category: true } });
    return existingPresetSkill(rows, preset) ?? tx.skill.create({ data: { name: preset.name, category: preset.category } });
  }
  const category = text(input.category ?? "other", "Category", 30).toLowerCase();
  // general remains accepted solely for backwards compatibility with old clients.
  if (![...SKILL_CATEGORIES, "general"].includes(category))
    throw new HttpError(422, "Choose a supported category.");
  return tx.skill.upsert({ where: { name }, create: { name, category }, update: {} });
}
