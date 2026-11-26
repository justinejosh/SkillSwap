import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { join } from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { loadConfig } from "../../lib/config";
import { issueSession } from "../../services/authSessions";
import { seedAcademicCatalog } from "../../services/academics";
import { previewStudentSuspension, suspendStudent } from "../../services/studentSuspensions";
import { assertAccountAllowed as legacyGuard } from "../fixtures/legacy-suspension-guard";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
const fixture = require("../../../development/fourBlockersEnvironment.cjs");

test("real recovery startup preserves expiry and security, disables both suspension endpoints and refuses incompatible schema/configuration", async t => {
  const url=requireOwnedFixtureDatabase(),m=fixture.open(process.env.KNOXITE_CI_FIXTURE_MANIFEST);fixture.verify(m);
  const db=new PrismaClient({datasources:{db:{url}}});t.after(()=>db.$disconnect());
  const env={NODE_ENV:"production",JWT_SECRET:randomBytes(48).toString("base64url"),PUBLIC_APP_URL:"https://recovery.fixture.invalid",CORS_ORIGINS:"https://recovery.fixture.invalid",INSTITUTION_EMAIL_DOMAINS:"fixture.example",CAMPUS_EMAIL_SUFFIX:"lag",CAMPUS_EMAIL_RULE_CONFIRMED:"true",EMAIL_VERIFICATION_REQUIRED:"true",SESSION_TIMEOUTS_ENABLED:"true",REGISTRATION_CONSENT_ENABLED:"true",REGISTRATION_NOTICE_VERSION:"SYNTHETIC_RECOVERY_NOTICE_v1",REGISTRATION_NOTICE_APPROVED:"true",GOOGLE_SIGN_IN_ENABLED:"false",SUSPENSION_CREATION_ENABLED:"true"};
  const config=loadConfig(env),password="synthetic-recovery-password",hash=await bcrypt.hash(password,4);
  await seedAcademicCatalog(db);const program=await db.program.findUniqueOrThrow({where:{code:"BSCS"},include:{yearLevels:true}});
  const users=await Promise.all(["Admin","Active","Expired","Legacy","Independent","Observer"].map((name,i)=>db.user.create({data:{name:`Synthetic ${name}`,email:`recovery-${randomUUID()}lag@fixture.example`,passwordHash:hash,role:i===0?"ADMIN":"USER",emailVerifiedAt:new Date(),...(i?{programId:program.id,yearLevelId:program.yearLevels[0].id}:{})}})));
  const sessions=await Promise.all(users.map(u=>db.$transaction(tx=>issueSession(tx,config,u,"Synthetic recovery test session"))));
  const authority={id:users[0].id,tokenVersion:0,sessionId:(await db.authSession.findFirstOrThrow({where:{userId:users[0].id}})).id};
  const input={reason:"SPAM_MISUSE",durationDays:7,studentExplanation:"Synthetic recovery restriction explanation.",privateNotes:"PRIVATE SYNTHETIC RECOVERY NOTES"};
  await t.test("migrated zero-history state supports the compatible recovery build without creating restrictions",async()=>{
    assert.equal(await db.studentSuspension.count(),0);const emptyRuntime=await boot();
    try{assert.equal(emptyRuntime.ready,true);const response=await fetch(emptyRuntime.base+"/admin/users",{headers:{Authorization:`Bearer ${sessions[0].token}`}});assert.equal(response.status,200);assert.equal((await response.json() as any).suspensionCreationEnabled,false);assert.equal(await db.suspensionAudit.count(),0);}finally{await emptyRuntime.close();}
  });
  const records=new Map<number,any>();
  for(const i of [1,2,4]){const q=await previewStudentSuspension(db,config,authority,users[i].id,input);records.set(i,(await suspendStudent(db,config,authority,users[i].id,{...input,confirmationToken:q.confirmationToken})).suspension);}
  await db.user.update({where:{id:users[3].id},data:{isSuspended:true}});
  for(const i of [2,4])await db.studentSuspension.update({where:{id:records.get(i).id},data:{expiresAt:new Date(Date.now()-1)}}); // Synthetic elapsed-deadline fixtures only.
  await db.user.update({where:{id:users[4].id},data:{tokenVersion:{increment:1}}});
  const migrationBefore=await db.$queryRaw`SELECT migration_name,checksum,finished_at FROM _prisma_migrations ORDER BY migration_name`;
  const historyRows=()=>db.studentSuspension.findMany({orderBy:{id:"asc"},select:{id:true,userId:true,administratorId:true,reason:true,studentExplanation:true,privateNotes:true,startsAt:true,expiresAt:true,createdAt:true}});
  const historyBefore=await historyRows(),legacyExpiredUser=await db.user.findUniqueOrThrow({where:{id:users[2].id}});let advancedExpiry:Date;
  async function boot(database=url,overrides:Record<string,string>={}){
    fixture.verify(m);assert.ok([url,m.legacyUrl].includes(database));
    const probe=createServer();probe.listen(0,"127.0.0.1");await once(probe,"listening");const port=(probe.address() as any).port;await new Promise<void>(r=>probe.close(()=>r()));
    assert.ok(![3306,3309,3311,3319,5019].includes(port));
    const child=spawn(process.execPath,[join(__dirname,"../../../scripts/start-suspension-recovery.cjs")],{cwd:join(__dirname,"../../.."),windowsHide:true,env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,...env,...overrides,DATABASE_URL:database,HOST:"127.0.0.1",PORT:String(port),DOTENV_CONFIG_PATH:join(m.directory,"no-dotenv")},stdio:["ignore","pipe","pipe"]});
    const close=async()=>{if(child.exitCode===null){child.kill();await once(child,"exit");}};
    try{
      const ready=await new Promise<boolean>((resolve,reject)=>{let output="";const timer=setTimeout(()=>reject(new Error("Owned recovery startup timed out")),15000);child.stdout.on("data",c=>{output+=c.toString();if(output.includes("Knoxite API listening")){clearTimeout(timer);resolve(true);}});child.stderr.on("data",()=>{});child.once("exit",()=>{clearTimeout(timer);resolve(false);});child.once("error",()=>{clearTimeout(timer);reject(new Error("Owned recovery process could not start"));});});
      return {child,ready,base:`http://127.0.0.1:${port}/api`,close};
    }catch(e){await close();throw e;}
  }
  let runtime=await boot();
  async function call(path:string,status:number,method="GET",token?:string,body?:unknown){const response=await fetch(runtime.base+path,{method,headers:{Origin:config.origins[0],...(token?{Authorization:`Bearer ${token}`} :{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});const data:any=await response.json();assert.equal(response.status,status,`${method} ${path}: ${data.error||""}`);return data;}
  try{
    assert.equal(runtime.ready,true);
    await t.test("recovery forces creation off despite true environment and retains ADMIN-only history",async()=>{
      const endpoint=`/admin/users/${users[5].id}/suspensions`;
      await call(endpoint,401);await call(endpoint,403,"GET",sessions[5].token);
      const directory=await call("/admin/users",200,"GET",sessions[0].token);assert.equal(directory.suspensionCreationEnabled,false);
      const counts=[await db.studentSuspension.count(),await db.suspensionAudit.count()];
      for(const [path,method] of [[endpoint+"/preview","POST"],[endpoint,"POST"],[`/admin/users/${users[5].id}`,"DELETE"]])await call(path,503,method,sessions[0].token,input);
      assert.deepEqual([await db.studentSuspension.count(),await db.suspensionAudit.count()],counts);
      const history=await call(`/admin/users/${users[1].id}/suspensions`,200,"GET",sessions[0].token);assert.equal(history.suspensions[0].privateNotes,input.privateNotes);
    });
    await t.test("active restrictions require identity proof and old revoked JWTs remain unusable",async()=>{
      const wrong=await call("/auth/login",401,"POST",undefined,{email:users[1].email,password:"wrong-synthetic-password"});assert.equal(wrong.details,undefined);
      const blocked=await call("/auth/login",403,"POST",undefined,{email:users[1].email,password});assert.equal(blocked.details.code,"ACCOUNT_SUSPENDED");assert.equal(blocked.token,undefined);assert.ok(!JSON.stringify(blocked).includes(input.privateNotes));
      await call("/profile",401,"GET",sessions[1].token);assert.equal(await db.authSession.count({where:{userId:users[1].id,revokedAt:null}}),0);
    });
    await t.test("a failed instance can hand over to another compatible recovery process without losing restriction or audit state",async()=>{
      const before=await historyRows();await runtime.close();runtime=await boot();assert.equal(runtime.ready,true);
      await call("/auth/login",403,"POST",undefined,{email:users[1].email,password});assert.deepEqual(await historyRows(),before);
      await call(`/admin/users/${users[5].id}`,503,"DELETE",sessions[0].token,{});
    });
    await t.test("expiry while the real recovery process runs restores fresh-login eligibility, never sessions",async()=>{
      advancedExpiry=new Date(Date.now()-1);await db.studentSuspension.update({where:{id:records.get(1).id},data:{expiresAt:advancedExpiry}}); // Advance only the synthetic fixture deadline, not the machine clock.
      const login=await call("/auth/login",200,"POST",undefined,{email:users[1].email,password});await call("/profile",200,"GET",login.token);await call("/profile",401,"GET",sessions[1].token);
      const timing=await call("/auth/session-status",200,"GET",login.token);assert.equal(timing.warningSeconds,300);assert.ok(Date.parse(timing.absoluteExpiresAt)-Date.now()<=8*3600_000);
      assert.equal(await db.suspensionAudit.count({where:{suspensionId:records.get(1).id,action:"EXPIRED"}}),1);
      await call("/auth/login",200,"POST",undefined,{email:users[1].email,password});assert.equal(await db.suspensionAudit.count({where:{suspensionId:records.get(1).id,action:"EXPIRED"}}),1);
    });
    await t.test("legacy and independent restrictions stay blocked; older authentication code is not rollback-safe",async()=>{
      for(const i of [3,4]){const response=await call("/auth/login",403,"POST",undefined,{email:users[i].email,password});assert.equal(response.details.suspension.legacy,true);assert.equal(response.details.suspension.expiresAt,null);assert.equal((await db.user.findUniqueOrThrow({where:{id:users[i].id}})).isSuspended,true);}
      assert.equal(await db.suspensionAudit.count({where:{suspensionId:records.get(4).id,action:"EXPIRED_RESTRICTION_RETAINED"}}),1);
      assert.equal(await db.studentSuspension.count({where:{userId:users[3].id}}),0);
      // Real committed legacy predicate ignores managed expiry even after its
      // deadline. It would retain the boolean restriction indefinitely.
      assert.equal(legacyExpiredUser.isSuspended,true);assert.throws(()=>legacyGuard(legacyExpiredUser,config),/suspended/);
      const login=await call("/auth/login",200,"POST",undefined,{email:users[2].email,password});assert.ok(login.token);await call("/profile",401,"GET",sessions[2].token);
    });
    await t.test("recovery does not rewrite schema/history and incomplete migration or insecure configuration refuses startup",async()=>{
      // The active fixture's deadline was deliberately advanced above; all
      // other immutable fields and the previously seeded expired record remain.
      assert.equal(await db.studentSuspension.count(),3);assert.equal((await db.studentSuspension.findUniqueOrThrow({where:{id:records.get(2).id}})).studentExplanation,input.studentExplanation);
      assert.deepEqual(await db.$queryRaw`SELECT migration_name,checksum,finished_at FROM _prisma_migrations ORDER BY migration_name`,migrationBefore);
      const incomplete=await boot(m.legacyUrl);try{assert.equal(incomplete.ready,false);}finally{await incomplete.close();}
      const invalidConfigurations:Array<Record<string,string>>=[{SESSION_TIMEOUTS_ENABLED:"false"},{EMAIL_VERIFICATION_REQUIRED:"false"},{JWT_SECRET:"unsafe"}];
      for(const override of invalidConfigurations){const invalid=await boot(url,override);try{assert.equal(invalid.ready,false);}finally{await invalid.close();}}
      const expectedHistory=historyBefore.map(row=>row.id===records.get(1).id?{...row,expiresAt:advancedExpiry}:row);
      assert.deepEqual(await historyRows(),expectedHistory);
      const admin=await db.user.findUniqueOrThrow({where:{id:users[0].id}});assert.equal(admin.tokenVersion,0);assert.equal(admin.isSuspended,false);
    });
  }finally{await runtime.close();await db.$disconnect();}
});
