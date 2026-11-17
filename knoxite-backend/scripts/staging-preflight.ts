// Read-only, explicit-target Railway/remote staging preflight. No dotenv fallback.
import {PrismaClient} from "@prisma/client";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {isAbsolute} from "node:path";
import {inspectFreshReleaseTarget} from "./release-preflight";
export interface StagingTarget {
  host:string; port:number; database:string; serverUuid:string; currentUser:string;
  caSha256:string; role:"application"|"migration";
}
const requireCondition=(condition:unknown)=>{if(!condition)throw new Error("Staging identity/TLS/grant preflight refused.");};
export function validateStagingUrl(value:string,expected:StagingTarget){
  const u=new URL(value);
  requireCondition(u.protocol==="mysql:"&&u.hostname===expected.host&&Number(u.port||3306)===expected.port&&decodeURIComponent(u.pathname.slice(1))===expected.database);
  requireCondition(!["localhost","127.0.0.1","[::1]"].includes(u.hostname)&&!u.hostname.endsWith(".localhost")&&!u.hostname.endsWith(".railway.internal"));
  requireCondition(!!u.username&&!!u.password&&decodeURIComponent(u.username)!=="root"&&expected.currentUser.split("@")[0]===decodeURIComponent(u.username));
  requireCondition(/^[A-Za-z0-9_-]{1,64}$/.test(expected.database)&&/^[a-f0-9-]{36}$/i.test(expected.serverUuid)&&/^[a-f0-9]{64}$/i.test(expected.caSha256));
  requireCondition(["application","migration"].includes(expected.role)&&u.searchParams.getAll("sslaccept").length===1&&u.searchParams.get("sslaccept")==="strict"&&!u.hash);
  const ca=u.searchParams.get("sslcert");
  requireCondition(ca&&u.searchParams.getAll("sslcert").length===1&&isAbsolute(ca));
  requireCondition(createHash("sha256").update(readFileSync(ca!)).digest("hex")===expected.caSha256);
  return u;
}
export function validateStagingGrants(lines:string[],expected:StagingTarget){
  const allowed=new Set(expected.role==="application"?["SELECT","INSERT","UPDATE","DELETE"]:["SELECT","INSERT","UPDATE","DELETE","CREATE","ALTER","DROP","INDEX","REFERENCES"]);
  const observed=new Set<string>();
  requireCondition(lines.length>0);
  for(const line of lines){
    requireCondition(!/WITH GRANT OPTION|ALL PRIVILEGES/i.test(line));
    if(/^GRANT USAGE ON \*\.\* TO /i.test(line))continue;
    const m=/^GRANT (.+?) ON `([^`]+)`\.\* TO /i.exec(line);
    requireCondition(m&&m[2]===expected.database);
    for(const privilege of m![1].split(/,\s*/)){requireCondition(allowed.has(privilege));observed.add(privilege);}
  }
  for(const privilege of allowed)requireCondition(observed.has(privilege));
}
export async function inspectStaging(db:PrismaClient,expected:StagingTarget){
  const [identity]=await db.$queryRaw<Array<{schemaName:string;serverId:string;actor:string}>>`SELECT DATABASE() AS schemaName, @@server_uuid AS serverId, CURRENT_USER() AS actor`;
  requireCondition(identity?.schemaName===expected.database&&identity.serverId===expected.serverUuid&&identity.actor===expected.currentUser);
  const status=await db.$queryRawUnsafe<Array<{Variable_name:string;Value:string}>>("SHOW SESSION STATUS WHERE Variable_name IN ('Ssl_cipher','Ssl_version')");
  const cipher=status.find(r=>r.Variable_name==="Ssl_cipher")?.Value,version=status.find(r=>r.Variable_name==="Ssl_version")?.Value;
  requireCondition(cipher&&["TLSv1.2","TLSv1.3"].includes(version||""));
  const grants=await db.$queryRawUnsafe<Array<Record<string,string>>>("SHOW GRANTS");
  validateStagingGrants(grants.flatMap(row=>Object.values(row)),expected);
  const objects=await db.$queryRaw<Array<{objectCount:bigint}>>`SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE())+
    (SELECT COUNT(*) FROM information_schema.routines WHERE ROUTINE_SCHEMA=DATABASE())+
    (SELECT COUNT(*) FROM information_schema.triggers WHERE TRIGGER_SCHEMA=DATABASE())+
    (SELECT COUNT(*) FROM information_schema.events WHERE EVENT_SCHEMA=DATABASE()) AS objectCount`;
  requireCondition(Number(objects[0]?.objectCount)===0);
  requireCondition(await inspectFreshReleaseTarget(db)==="EMPTY");
  return {targetMatches:true,tls:version,empty:true,grantsScoped:true};
}
if(require.main===module){
  let db:PrismaClient|undefined;
  void (async()=>{
    requireCondition(process.env.KNOXITE_RELEASE_PREFLIGHT_APPROVED==="true"&&process.env.KNOXITE_STAGING_TARGET_FILE&&process.env.DATABASE_URL);
    const expected=JSON.parse(readFileSync(process.env.KNOXITE_STAGING_TARGET_FILE!,"utf8")) as StagingTarget;
    validateStagingUrl(process.env.DATABASE_URL!,expected);
    db=new PrismaClient();console.log(JSON.stringify(await inspectStaging(db,expected)));
  })().catch(()=>{console.error("Staging preflight refused. Verify private target identity, strict TLS, grants and emptiness. No writes attempted.");process.exitCode=1;}).finally(()=>db?.$disconnect());
}
