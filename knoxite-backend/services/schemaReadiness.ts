import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../lib/config";

// Inspection only. Startup must never migrate, backfill, or approve notices.
export async function assertRuntimeSchema(db: PrismaClient, config: AppConfig) {
  const flexible = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND IS_NULLABLE='YES' AND ((TABLE_NAME='Swap' AND COLUMN_NAME='duration' AND DATA_TYPE='int') OR (TABLE_NAME='SwapSession' AND COLUMN_NAME='endsAt' AND DATA_TYPE='datetime'))`;
  if (Number(flexible[0]?.count) !== 2)
    throw new Error("Flexible-session schema is unavailable. Reviewed migration required; startup refused.");
  const completion = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='SessionConfirmation' AND COLUMN_NAME='actualCompletedAt' AND DATA_TYPE='datetime' AND IS_NULLABLE='YES'`;
  if (Number(completion[0]?.count) !== 1)
    throw new Error("Actual session completion schema is unavailable. Reviewed additive migration required; startup refused.");
  const moderation = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('AdminAudit','ReportEvidence') AND TABLE_TYPE='BASE TABLE'`;
  if (Number(moderation[0]?.count) !== 2) throw new Error("Moderation/evidence schema is unavailable. Reviewed additive migration required; startup refused.");
  if (config.sessionTimeouts) {
    const columns = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='AuthSession' AND COLUMN_NAME='lastInteractiveAt' AND DATA_TYPE='datetime' AND IS_NULLABLE='YES'`;
    if (Number(columns[0]?.count) !== 1) throw new Error("Session policy schema is unavailable; startup refused.");
  }
  if (config.registrationConsent?.enabled) {
    const columns = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='RegistrationConsent' AND COLUMN_NAME IN ('id','userId','noticeVersion','acceptedAt') AND IS_NULLABLE='NO'`;
    const unique = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM (SELECT INDEX_NAME FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='RegistrationConsent' AND NON_UNIQUE=0 GROUP BY INDEX_NAME HAVING GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX)='userId,noticeVersion') AS constraints_found`;
    const relations = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='RegistrationConsent' AND COLUMN_NAME='userId' AND REFERENCED_TABLE_NAME='User' AND REFERENCED_COLUMN_NAME='id'`;
    if (Number(columns[0]?.count) !== 4 || Number(unique[0]?.count) !== 1 || Number(relations[0]?.count) !== 1)
      throw new Error("Consent schema or constraints are unavailable; startup refused.");
  }
}
