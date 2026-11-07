import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { requireLocalDatabase } from "./safeDatabase";
export async function backfillOfferings(db: PrismaClient) {
  requireLocalDatabase();
  await db.$transaction(async (tx) => {
    // A = Skill and B = User, verified by preflight. Never overwrite earned tiers/history.
    await tx.$executeRaw`INSERT INTO UserOfferedSkill (id, userId, skillId, isActive, tier, createdAt, updatedAt)
      SELECT UUID(), B, A, true, 'NOT_ASSESSED', NOW(3), NOW(3) FROM _OfferedSkills
      ON DUPLICATE KEY UPDATE isActive = true`;
    const missing = await tx.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM _OfferedSkills old LEFT JOIN UserOfferedSkill offering ON offering.userId = old.B AND offering.skillId = old.A AND offering.isActive = true WHERE offering.id IS NULL`;
    if (Number(missing[0].count))
      throw new Error("Offered-skill backfill verification failed.");
    const extra = await tx.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) count FROM UserOfferedSkill offering LEFT JOIN _OfferedSkills old ON old.B = offering.userId AND old.A = offering.skillId WHERE offering.isActive = true AND old.A IS NULL`;
    if (Number(extra[0].count))
      throw new Error("Active offering sets differ. Rollout blocked.");
  });
}
if (require.main === module) {
  requireLocalDatabase();
  const db = new PrismaClient();
  backfillOfferings(db)
    .then(() =>
      console.log(
        "Offering backfill verified; IDs, tiers, attempts, and wanted relationships retained.",
      ),
    )
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
