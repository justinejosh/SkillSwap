import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function inspectFreshReleaseTarget(db: PrismaClient) {
  const tables = await db.$queryRaw<Array<{name:string}>>`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE'`;
  if (!tables.length) return "EMPTY";
  if (!tables.some(t=>t.name==="_prisma_migrations")) throw new Error("Nonempty legacy target: fresh baseline is forbidden.");
  const rows=await db.$queryRaw<Array<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}>>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations`;
  const sql=readFileSync(resolve(__dirname,"../../prisma/release/migrations/20261117000000_current_release/migration.sql"));
  if(rows.length!==1||rows[0].migration_name!=="20261117000000_current_release"||!rows[0].finished_at||rows[0].rolled_back_at||rows[0].checksum!==createHash("sha256").update(sql).digest("hex"))
    throw new Error("Unknown, failed or changed migration history: stop for reviewed reconciliation.");
  return "RELEASE_HISTORY";
}
if(require.main===module) {
  if(process.env.KNOXITE_RELEASE_PREFLIGHT_APPROVED!=="true"||!process.env.DATABASE_URL) throw new Error("Explicit target and read-only inspection approval required; no dotenv fallback.");
  const db=new PrismaClient();
  inspectFreshReleaseTarget(db).then(status=>console.log(status)).catch(()=>{console.error("Release preflight refused. No migration executed.");process.exitCode=1;}).finally(()=>db.$disconnect());
}
