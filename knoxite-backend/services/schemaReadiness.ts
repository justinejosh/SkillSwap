import { PrismaClient } from "@prisma/client";
import { AppConfig } from "../lib/config";

// Inspection only. Startup must never migrate, backfill, or approve notices.
export async function assertRuntimeSchema(db: PrismaClient, config: AppConfig) {
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
