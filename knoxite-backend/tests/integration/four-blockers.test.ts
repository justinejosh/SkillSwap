// Explicit disposable-only suite. No protected settings, accounts or databases.
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { assertRuntimeSchema } from "../../services/schemaReadiness";
import { seedAcademicCatalog } from "../../services/academics";
import { ensureSkillCatalog } from "../../services/skillCatalog";
import { issueSession } from "../../services/authSessions";
import { inspectFreshReleaseTarget } from "../../scripts/release-preflight";
import { confirmationEligibility } from "../../services/sessionConfirmationEligibility";
const infrastructure=require("../../../development/fourBlockersEnvironment.cjs");
const manifest=process.env.KNOXITE_FOUR_BLOCKERS_MANIFEST;
let m:any,db:PrismaClient,server:any,api:string;
const secret=randomBytes(48).toString("base64url"),password=randomBytes(32).toString("base64url");
const deliveries=new Map<string,string>(),credentials=new Map<string,any>();
const env={NODE_ENV:"production",JWT_SECRET:secret,PUBLIC_APP_URL:"https://app.example.invalid",CORS_ORIGINS:"https://app.example.invalid",INSTITUTION_EMAIL_DOMAINS:"student.fatima.edu.ph",CAMPUS_EMAIL_RULE_CONFIRMED:"true",EMAIL_VERIFICATION_REQUIRED:"true",SESSION_TIMEOUTS_ENABLED:"true",REGISTRATION_CONSENT_ENABLED:"true",REGISTRATION_NOTICE_VERSION:"TEST_ONLY_NOTICE_v1",REGISTRATION_NOTICE_APPROVED:"true",GOOGLE_SIGN_IN_ENABLED:"true",GOOGLE_CLIENT_ID:"synthetic.apps.googleusercontent.com",GOOGLE_ALLOWED_HOSTED_DOMAINS:"student.fatima.edu.ph",GOOGLE_WORKSPACE_ACCESS_CONFIRMED:"true",GOOGLE_ELIGIBILITY_RULES_CONFIRMED:"true",GOOGLE_SECURITY_REVIEW_CONFIRMED:"true",GOOGLE_ELIGIBILITY_POLICY_VERSION:"synthetic-test-only-v1"};
const config=loadConfig(env);
const email=()=>"aasynthetic"+Array.from(randomBytes(8),v=>String.fromCharCode(97+v%26)).join("")+"1234lag@student.fatima.edu.ph";
async function call(method:string,path:string,status:number,token?:string,body?:unknown,base=api){
  if(path.endsWith("/log-session")&&body&&typeof body==="object"&&!Object.hasOwn(body,"completedAt"))body={...body,completedAt:new Date().toISOString()};
  const r=await fetch(base+path,{method,headers:{Origin:config.origins[0],...(token?{Authorization:`Bearer ${token}`}:{ }),...(body===undefined?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  assert.equal(r.status,status,`${method} ${path}: unexpected status`);return r.json() as Promise<any>;
}
async function register(){
  const options=await call("GET","/auth/academic-options",200);const p=options.programs.find((p:any)=>p.code==="BSCS");
  const e=email();const body={name:"SYNTHETIC DISPOSABLE STUDENT",email:e,password,programId:p.id,yearLevelId:p.yearLevels[0].id,termsAccepted:true,noticeVersion:config.registrationConsent!.version};
  await call("POST","/auth/register",201,undefined,body);
  const token=new URL(deliveries.get(e)!).hash.slice(7);
  await call("POST","/auth/verify-email",200,undefined,{token});
  return {...await call("POST","/auth/login",200,undefined,{email:e,password}),email:e,body};
}
before(async()=>{
  if(!manifest)return;
  m=infrastructure.open(manifest);await infrastructure.fresh(m);
  db=new PrismaClient({datasources:{db:{url:m.appUrl}}});
  await assertRuntimeSchema(db,config);await seedAcademicCatalog(db);await ensureSkillCatalog(db);
  const mailer=Object.assign(async(e:string,link:string)=>{deliveries.set(e,link);},{isConfigured:()=>true});
  server=createApp(db,config,mailer,undefined,async credential=>{if(!credentials.has(credential))throw new Error("Rejected synthetic credential");return credentials.get(credential);}).listen(0,"127.0.0.1");
  await once(server,"listening");api=`http://127.0.0.1:${server.address().port}/api`;
});
after(async()=>{if(server){server.close();await once(server,"close");}if(db)await db.$disconnect();});
const options={skip:!manifest};

test("disposable fresh migration reconstructs the release schema, constraints and academic options and repeats without changing history",options,async()=>{
  assert.equal(infrastructure.schemaDiff(m,"prisma/release/schema.prisma"),0);
  assert.equal(await inspectFreshReleaseTarget(db),"RELEASE_HISTORY");
  const history=await db.$queryRaw<any[]>`SELECT migration_name,checksum,finished_at FROM _prisma_migrations`;
  await infrastructure.fresh(m);
  const repeated=await db.$queryRaw<any[]>`SELECT migration_name,checksum,finished_at FROM _prisma_migrations`;
  assert.equal(JSON.stringify(repeated),JSON.stringify(history));
  assert.equal(await db.program.count(),13);
  for(const code of ["BSIT","BSIHM-CA","BSIHM-HACLO"]){const p=await db.program.findUniqueOrThrow({where:{code},include:{yearLevels:true}});assert.deepEqual(p.yearLevels.map(y=>y.code),["YEAR_1"]);}
  const keys=await db.$queryRaw<any[]>`SELECT CONSTRAINT_TYPE AS type FROM information_schema.table_constraints WHERE TABLE_SCHEMA=DATABASE()`;
  assert.ok(keys.filter(k=>k.type==="FOREIGN KEY").length>20);assert.ok(keys.filter(k=>k.type==="UNIQUE").length>10);
  await assert.rejects(()=>db.$executeRaw`INSERT INTO RegistrationConsent(id,userId,noticeVersion,acceptedAt) VALUES('invalid-fk','missing-user','test',NOW(3))`);
  const grants=await db.$queryRawUnsafe<any[]>("SHOW GRANTS");
  assert.equal(JSON.stringify(grants).includes("ALL PRIVILEGES"),false);
});

test("the actual backend starts with ready production-shaped schema and refuses a missing schema before listening",options,async()=>{
  for(const [url,ready] of [[m.appUrl,true],[m.legacyUrl,false]] as const){
    const probe=createServer();probe.listen(0,"127.0.0.1");await once(probe,"listening");const port=(probe.address() as any).port;await new Promise<void>(r=>probe.close(()=>r()));
    const child=spawn(process.execPath,[join(__dirname,"../../index.js")],{windowsHide:true,env:{SystemRoot:process.env.SystemRoot,PATH:process.env.PATH,...env,DATABASE_URL:url,HOST:"127.0.0.1",PORT:String(port),DOTENV_CONFIG_PATH:join(m.directory,"nonexistent-test.env")},stdio:["ignore","pipe","pipe"]});
    try{
      let output="";const outcome=await new Promise<string>((resolve,reject)=>{
        const timer=setTimeout(()=>reject(new Error("Disposable startup check timed out")),15000);
        child.stdout.on("data",chunk=>{output+=chunk.toString();if(output.includes("Knoxite API listening")){clearTimeout(timer);resolve("LISTENING");}});
        child.stderr.on("data",()=>{});child.once("exit",code=>{clearTimeout(timer);resolve(code===1?"REFUSED":"UNEXPECTED_EXIT");});child.once("error",()=>{clearTimeout(timer);reject(new Error("Disposable backend spawn failed"));});
      });
      assert.equal(outcome,ready?"LISTENING":"REFUSED");
      if(ready){const r=await fetch(`http://127.0.0.1:${port}/api/auth/academic-options`);assert.equal(r.status,200);assert.equal((await r.json() as any).programs.length,13);}
      else await assert.rejects(()=>fetch(`http://127.0.0.1:${port}/api/auth/academic-options`));
    }finally{if(child.exitCode===null){child.kill();await once(child,"exit");}}
  }
});

test("email registration enforces explicit/current consent atomically and rejects forged timestamps/versions",options,async()=>{
  const academic=await call("GET","/auth/academic-options",200),p=academic.programs.find((p:any)=>p.code==="BSCS");
  const input={name:"SYNTHETIC CONSENT TEST",email:email(),password,programId:p.id,yearLevelId:p.yearLevels[0].id};
  for(const accepted of [undefined,false])await call("POST","/auth/register",422,undefined,{...input,termsAccepted:accepted,noticeVersion:config.registrationConsent!.version});
  await call("POST","/auth/register",409,undefined,{...input,termsAccepted:true,noticeVersion:"forged-notice"});
  await call("POST","/auth/register",422,undefined,{...input,termsAccepted:true,noticeVersion:config.registrationConsent!.version,acceptedAt:"2000-01-01"});
  assert.equal(await db.user.count({where:{email:input.email}}),0);
  const a=await register();
  const rows=await db.$queryRaw<any[]>`SELECT noticeVersion,acceptedAt FROM RegistrationConsent WHERE userId=${a.user.id}`;
  assert.equal(rows.length,1);assert.equal(rows[0].noticeVersion,config.registrationConsent!.version);assert.ok(Math.abs(Date.now()-rows[0].acceptedAt.getTime())<10000);
  await call("POST","/auth/register",409,undefined,a.body);
  const count=await db.$queryRaw<any[]>`SELECT COUNT(*) AS n FROM RegistrationConsent WHERE userId=${a.user.id}`;assert.equal(Number(count[0].n),1);
  await assert.rejects(()=>db.$executeRaw`INSERT INTO RegistrationConsent(id,userId,noticeVersion,acceptedAt) VALUES('duplicate-consent',${a.user.id},${config.registrationConsent!.version},NOW(3))`);
});

test("mocked signed Google onboarding records the same authoritative consent and cannot self-assign ADMIN or replay",options,async()=>{
  const proof=randomBytes(32).toString("base64url");
  const challenge=await call("POST","/auth/google/challenge",200,undefined,{browserProofHash:createHash("sha256").update(proof).digest("hex")});
  const credential=randomBytes(32).toString("hex");credentials.set(credential,{iss:"https://accounts.google.com",aud:config.google.clientId,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,sub:"synthetic-disposable-google",email:email(),hd:"student.fatima.edu.ph",email_verified:true,nonce:challenge.nonce,role:"ADMIN"});
  const pending=await call("POST","/auth/google/login",200,undefined,{challengeId:challenge.challengeId,browserProof:proof,credential});
  const academic=await call("GET","/auth/academic-options",200),p=academic.programs.find((p:any)=>p.code==="BSCS");
  const body={onboardingId:pending.onboardingId,browserProof:proof,name:"SYNTHETIC GOOGLE FIXTURE",programId:p.id,yearLevelId:p.yearLevels[0].id,termsAccepted:true,noticeVersion:config.registrationConsent!.version};
  await call("POST","/auth/google/onboard",422,undefined,{...body,termsAccepted:false});
  await call("POST","/auth/google/onboard",409,undefined,{...body,noticeVersion:"forged"});
  await call("POST","/auth/google/onboard",422,undefined,{...body,role:"ADMIN"});
  const a=await call("POST","/auth/google/onboard",201,undefined,body);assert.equal(a.user.role,"USER");
  assert.equal((await db.user.findUniqueOrThrow({where:{id:a.user.id}})).passwordHash,null);
  assert.equal(Number((await db.$queryRaw<any[]>`SELECT COUNT(*) AS n FROM RegistrationConsent WHERE userId=${a.user.id}`)[0].n),1);
  await call("POST","/auth/google/onboard",422,undefined,body);
});

test("production-shaped STUDENT and ADMIN sessions enforce boundaries, revocation and explicit activity",options,async()=>{
  for(const role of ["USER","ADMIN"] as const){
    let user:any;
    if(role==="USER")user=await register();else{
      const e=email();await db.user.create({data:{name:"SYNTHETIC ADMIN",email:e,passwordHash:await bcrypt.hash(password,12),role:"ADMIN",emailVerifiedAt:new Date()}});
      user=await call("POST","/auth/login",200,undefined,{email:e,password});
    }
    const idle=role==="ADMIN"?15:30,absolute=role==="ADMIN"?4:8;
    const timing=await call("GET","/auth/session-status",200,user.token);
    assert.ok(Math.abs(Date.parse(timing.idleExpiresAt)-Date.parse(timing.serverNow)-idle*60000)<10000);
    assert.ok(Math.abs(Date.parse(timing.absoluteExpiresAt)-Date.parse(timing.serverNow)-absolute*3600000)<10000);
    const active=await call("POST","/auth/session-activity",200,user.token,{interaction:"stay"});
    assert.equal(active.absoluteExpiresAt,timing.absoluteExpiresAt);
    const session=await db.authSession.findFirstOrThrow({where:{userId:user.user.id,revokedAt:null},orderBy:{createdAt:"desc"}});
    const before=(await db.$queryRaw<any[]>`SELECT lastInteractiveAt AS at FROM AuthSession WHERE id=${session.id}`)[0].at;
    await call("GET","/auth/session-status",200,user.token);
    const after=(await db.$queryRaw<any[]>`SELECT lastInteractiveAt AS at FROM AuthSession WHERE id=${session.id}`)[0].at;assert.equal(after.getTime(),before.getTime());
    await db.authSession.update({where:{id:session.id},data:{createdAt:new Date(Date.now()-(idle+1)*60000)}});
    await db.$executeRaw`UPDATE AuthSession SET lastInteractiveAt=${new Date(Date.now()-idle*60000)} WHERE id=${session.id}`;
    await call("GET","/profile",401,user.token);
    const fresh=await call("POST","/auth/login",200,undefined,{email:user.user.email,password});
    const latest=await db.authSession.findUniqueOrThrow({where:{id:(jwt.decode(fresh.token) as any).jti}});
    await db.authSession.update({where:{id:latest.id},data:{createdAt:new Date(Date.now()-absolute*3600000-1000)}});
    await call("GET","/profile",401,fresh.token);
    const logout=await call("POST","/auth/login",200,undefined,{email:user.user.email,password});await call("POST","/auth/logout",200,logout.token,{});await call("GET","/profile",401,logout.token);
  }
});

test("actual completion dates reject future/forged requests; duplicates and bilateral completion remain intact",options,async(t)=>{
  const a=await register(),b=await register(),outsider=await register();
  const skills=await db.skill.findMany({where:{name:{in:["Python Programming Fundamentals","JavaScript Fundamentals"]}}});
  const py=skills.find(s=>s.name==="Python Programming Fundamentals")!,js=skills.find(s=>s.name==="JavaScript Fundamentals")!;
  for(const [who,offer,want] of [[a,py,js],[b,js,py]] as const){await call("POST","/profile/skills/offer",201,who.token,{skillId:offer.id});await call("POST","/profile/skills/want",201,who.token,{skillId:want.id});}
  const request=await call("POST","/swaps/request",201,a.token,{receiverId:b.user.id,offeredSkillId:py.id,wantedSkillId:js.id});
  const accepted=await call("PATCH",`/swap-requests/${request.id}/status`,200,b.token,{newStatus:"ACCEPTED"});const id=accepted.redirectId;
  let swap=await call("GET",`/swaps/${id}`,200,a.token);
  for(const who of [a,b])swap=(await call("POST",`/swaps/${id}/agreement`,200,who.token,{sessions:1,duration:1,agreementVersion:swap.agreementVersion,agreedToTerms:true})).swap;
  await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
  for(const number of [0,2])await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:number});
  await call("POST",`/swaps/${id}/log-session`,403,outsider.token,{sessionNumber:1});
  await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:1,participantId:b.user.id});
  const start=Date.now()+60000,end=start+3600000;
  await call("POST","/sessions",201,a.token,{swapId:id,sessionNumber:1,scheduledAt:new Date(start).toISOString()});
  await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
  t.mock.timers.enable({apis:["Date"],now:start});
  await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
  t.mock.timers.setTime(end-1);
  const ongoing=await call("POST","/auth/login",200,undefined,{email:a.email,password});
  await call("POST",`/swaps/${id}/log-session`,422,ongoing.token,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
  t.mock.timers.setTime(end);
  // Renewed fixture logins reflect elapsed fake time; no protected accounts exist here.
  const aa=await call("POST","/auth/login",200,undefined,{email:a.email,password}),bb=await call("POST","/auth/login",200,undefined,{email:b.email,password});
  const ready=await call("GET",`/swaps/${id}`,200,aa.token);assert.equal(ready.confirmationEligibility.eligible,true);
  const calendar=await call("GET","/sessions",200,aa.token);assert.equal(calendar.find((s:any)=>s.swapId===id).confirmationEligibility.eligible,true);
  await call("POST",`/swaps/${id}/log-session`,200,aa.token,{sessionNumber:1});await call("POST",`/swaps/${id}/log-session`,200,aa.token,{sessionNumber:1});
  assert.equal(await db.sessionConfirmation.count({where:{swapId:id}}),1);
  await call("POST","/reputation/submit",409,aa.token,{swapId:id,rating:4,comment:"Too early"});
  await call("POST",`/swaps/${id}/log-session`,200,bb.token,{sessionNumber:1});
  assert.equal((await call("GET",`/swaps/${id}`,200,aa.token)).status,"CONFIRMED");
  await call("POST","/reputation/submit",200,aa.token,{swapId:id,rating:4,comment:"Synthetic only"});
  assert.equal((await call("GET",`/swaps/${id}`,200,aa.token)).status,"CONFIRMED");
  await call("POST","/reputation/submit",200,bb.token,{swapId:id,rating:5,comment:"Synthetic only"});
  assert.equal((await call("GET",`/swaps/${id}`,200,aa.token)).status,"COMPLETED");
  const count=await db.sessionConfirmation.count({where:{swapId:id}});
  await call("POST",`/swaps/${id}/log-session`,200,aa.token,{sessionNumber:1});assert.equal(await db.sessionConfirmation.count({where:{swapId:id}}),count);
  await call("POST","/sessions",409,aa.token,{swapId:id,sessionNumber:1,scheduledAt:new Date(end+3600000).toISOString()});
  t.mock.timers.reset();
});

test("flexible agreements and distinct scheduled ranges complete through bilateral confirmations on disposable MySQL",options,async(t)=>{
  // Do not consume another case's per-process registration throttle window.
  // The normal limit remains active in this independently constructed app.
  const mailer=Object.assign(async(e:string,link:string)=>{deliveries.set(e,link);},{isConfigured:()=>true});
  const isolated=createApp(db,config,mailer).listen(0,"127.0.0.1");await once(isolated,"listening");
  const previousApi=api;api=`http://127.0.0.1:${(isolated.address() as any).port}/api`;
  try {
  const a=await register(),b=await register();
  const skills=await db.skill.findMany({where:{name:{in:["Python Programming Fundamentals","SQL Fundamentals"]}}});
  const py=skills.find(s=>s.name==="Python Programming Fundamentals")!,sql=skills.find(s=>s.name==="SQL Fundamentals")!;
  for(const [who,offer,want] of [[a,py,sql],[b,sql,py]] as const){await call("POST","/profile/skills/offer",201,who.token,{skillId:offer.id});await call("POST","/profile/skills/want",201,who.token,{skillId:want.id});}
  const request=await call("POST","/swaps/request",201,a.token,{receiverId:b.user.id,offeredSkillId:py.id,wantedSkillId:sql.id});
  const accepted=await call("PATCH",`/swap-requests/${request.id}/status`,200,b.token,{newStatus:"ACCEPTED"});const id=accepted.redirectId;
  let swap=await call("GET",`/swaps/${id}`,200,a.token);
  for(const who of [a,b])swap=(await call("POST",`/swaps/${id}/agreement`,200,who.token,{sessions:2,agreementVersion:swap.agreementVersion,agreedToTerms:true})).swap;
  assert.equal(swap.duration,null);assert.equal(swap.status,"CONFIRMED");
  const origin=Date.now(),ranges=[[1,6],[7,16]];
  for(let i=0;i<2;i++){
    const body={swapId:id,sessionNumber:i+1,scheduledAt:new Date(origin+ranges[i][0]*60000).toISOString()};
    await call("POST","/sessions",422,a.token,body);
    await call("POST","/sessions",201,a.token,{...body,endsAt:new Date(origin+ranges[i][1]*60000).toISOString()});
  }
  t.mock.timers.enable({apis:["Date"],now:origin});
  try {
    for(let i=0;i<2;i++){
      const end=origin+ranges[i][1]*60000;t.mock.timers.setTime(end-1);
      await call("POST",`/swaps/${id}/log-session`,422,a.token,{sessionNumber:i+1,completedAt:new Date(end+60000).toISOString()});
      t.mock.timers.setTime(end);
      for(const who of [a,b])await call("POST",`/swaps/${id}/log-session`,200,who.token,{sessionNumber:i+1});
    }
    assert.equal((await db.swap.findUniqueOrThrow({where:{id}})).status,"CONFIRMED");
    for(const who of [a,b])await call("POST","/reputation/submit",200,who.token,{swapId:id,rating:4,comment:"Synthetic disposable only"});
    const saved=await db.swap.findUniqueOrThrow({where:{id}});assert.equal(saved.status,"COMPLETED");assert.equal(saved.duration,null);
    assert.equal(await db.sessionConfirmation.count({where:{swapId:id}}),4);
    const rows=await db.swapSession.findMany({where:{swapId:id},orderBy:{sessionNumber:"asc"}});
    assert.deepEqual(rows.map(row=>(row.endsAt!.getTime()-row.scheduledAt.getTime())/60000),[5,9]);
  }finally{t.mock.timers.reset();}
  }finally{api=previousApi;isolated.close();await once(isolated,"close");}
});

test("exact flexible migration preserves historical agreements, schedules, acknowledgements, reviews and constraints",options,async()=>{
  infrastructure.verify(m);
  // Another synthetic schema inside this same independently owned tmpfs container.
  // No protected connection/profile is read; container removal cleans it up.
  const name=`knoxite_four_${randomBytes(6).toString("hex")}_legacy_test`;
  assert.match(name,/^knoxite_four_[a-f0-9]{12}_legacy_test$/);
  const url=new URL(m.url);url.pathname=`/${name}`;
  const target={...m,url:url.toString()};infrastructure.verify(target);
  const owner=new PrismaClient({datasources:{db:{url:m.url}}});
  try {await owner.$executeRawUnsafe(`CREATE DATABASE \`${name}\``);}finally{await owner.$disconnect();}
  infrastructure.cli(target,["db","execute","--file","prisma/release/migrations/20261117000000_current_release/migration.sql","--schema","prisma/release/schema.prisma"]);
  const old=new PrismaClient({datasources:{db:{url:target.url}}});
  try {
    const hash=await bcrypt.hash(password,12);
    await old.$executeRaw`INSERT INTO User(id,name,email,passwordHash,role) VALUES ('historical-a','SYNTHETIC A','aaold1234lag@student.fatima.edu.ph',${hash},'USER'),('historical-b','SYNTHETIC B','bbold1234lag@student.fatima.edu.ph',${hash},'USER')`;
    await old.$executeRaw`INSERT INTO Skill(id,name,category) VALUES ('historical-skill-a','Synthetic historical skill A','Technology'),('historical-skill-b','Synthetic historical skill B','Academic')`;
    await old.$executeRaw`INSERT INTO Swap(id,status,requesterId,receiverId,offeredSkillId,wantedSkillId,duration,sessions,requesterSessions,receiverSessions,integrityVerified,agreementVersion,requesterApprovedAt,receiverApprovedAt,completedAt,updatedAt) VALUES
      ('historical-active','CONFIRMED','historical-a','historical-b','historical-skill-a','historical-skill-b',2,5,1,1,true,3,'2026-01-01 00:00:00','2026-01-01 01:00:00',NULL,'2026-01-03 00:00:00'),
      ('historical-complete','COMPLETED','historical-a','historical-b','historical-skill-a','historical-skill-b',1,1,1,1,true,2,'2026-01-01 00:00:00','2026-01-01 01:00:00','2026-01-03 00:00:00','2026-01-03 00:00:00')`;
    await old.$executeRaw`INSERT INTO SwapSession(id,swapId,sessionNumber,scheduledAt,meetingLink,updatedAt) VALUES ('historical-session-a','historical-active',1,'2026-01-02 10:00:00','https://example.invalid/historical-a','2026-01-02 00:00:00'),('historical-session-b','historical-complete',1,'2026-01-02 10:00:00',NULL,'2026-01-02 00:00:00')`;
    await old.$executeRaw`INSERT INTO SessionConfirmation(id,swapId,participantId,sessionNumber) VALUES ('historical-log-a','historical-active','historical-a',1),('historical-log-b','historical-active','historical-b',1),('historical-log-c','historical-complete','historical-a',1),('historical-log-d','historical-complete','historical-b',1)`;
    await old.$executeRaw`INSERT INTO Review(id,swapId,reviewerId,revieweeId,rating,isValidated) VALUES ('historical-review-a','historical-complete','historical-a','historical-b',4,true),('historical-review-b','historical-complete','historical-b','historical-a',5,true)`;
    const tables=["User","Skill","Swap","SwapSession","SessionConfirmation","Review"];
    const snapshot=async()=>Object.fromEntries(await Promise.all(tables.map(async table=>[table,await old.$queryRawUnsafe<any[]>(`SELECT * FROM \`${table}\` ORDER BY id`)])));
    const columns=()=>old.$queryRaw<any[]>`SELECT TABLE_NAME AS tbl,COLUMN_NAME AS col,IS_NULLABLE AS nullable,COLUMN_DEFAULT AS def,DATA_TYPE AS kind,DATETIME_PRECISION AS precision_value FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`;
    const constraints=()=>old.$queryRaw<any[]>`SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,ORDINAL_POSITION,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION`;
    const indexes=()=>old.$queryRaw<any[]>`SELECT TABLE_NAME,INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX`;
    const before=await snapshot(),beforeColumns=await columns(),beforeConstraints=await constraints(),beforeIndexes=await indexes();
    assert.equal(beforeColumns.find(c=>c.tbl==="Swap"&&c.col==="duration").nullable,"NO");
    assert.equal(beforeColumns.some(c=>c.tbl==="SwapSession"&&c.col==="endsAt"),false);
    // A migration restarts application clients. Do not reuse SELECT * prepared
    // statement metadata from a pre-DDL connection for preservation snapshots.
    await old.$disconnect();
    infrastructure.cli(target,["db","execute","--file","prisma/release/migrations/20261121000000_flexible_session_ranges/migration.sql","--schema","prisma/release/schema.prisma"]);
    const after=await snapshot();
    assert.ok(after.SwapSession.every((row:any)=>row.endsAt===null),JSON.stringify(after.SwapSession.map((row:any)=>({hasEndsAt:Object.hasOwn(row,"endsAt"),type:typeof row.endsAt,isNull:row.endsAt===null}))));
    after.SwapSession=after.SwapSession.map(({endsAt,...row}:any)=>row);
    assert.deepEqual(after,before);
    assert.deepEqual(await constraints(),beforeConstraints);assert.deepEqual(await indexes(),beforeIndexes);
    const afterColumns=await columns();assert.equal(afterColumns.length,beforeColumns.length+1);
    assert.deepEqual(afterColumns.filter(c=>!(c.tbl==="SwapSession"&&c.col==="endsAt")),beforeColumns.map(c=>c.tbl==="Swap"&&c.col==="duration"?{...c,nullable:"YES",def:null}:c));
    const end=afterColumns.find(c=>c.tbl==="SwapSession"&&c.col==="endsAt");
    assert.equal(end.nullable,"YES");assert.equal(end.kind,"datetime");assert.equal(Number(end.precision_value),3);
    // This checkpoint predates actual-completion storage. Compare it with the
    // exact intermediate schema, then rehearse the later additive field too.
    const releaseSchema=readFileSync(join(__dirname,"../../../prisma/release/schema.prisma"),"utf8");
    const actualField=/^\s*actualCompletedAt\s+DateTime\?\r?\n/gm;
    assert.equal([...releaseSchema.matchAll(actualField)].length,1);
    const intermediate=join(m.directory,"pre-actual-release.prisma");
    writeFileSync(intermediate,releaseSchema.replace(actualField,""));
    assert.equal(infrastructure.schemaDiff(target,intermediate),0);
    await old.$disconnect();
    infrastructure.cli(target,["db","execute","--file","prisma/release/migrations/20261122000000_actual_session_completion/migration.sql","--schema","prisma/release/schema.prisma"]);
    const completed=await snapshot();
    assert.ok(completed.SessionConfirmation.every((row:any)=>row.actualCompletedAt===null));
    completed.SessionConfirmation=completed.SessionConfirmation.map(({actualCompletedAt,...row}:any)=>row);
    completed.SwapSession=completed.SwapSession.map(({endsAt,...row}:any)=>row);
    assert.deepEqual(completed,before);
    assert.deepEqual(await constraints(),beforeConstraints);assert.deepEqual(await indexes(),beforeIndexes);
    const completedColumns=await columns();assert.equal(completedColumns.length,afterColumns.length+1);
    assert.deepEqual(completedColumns.filter(c=>!(c.tbl==="SessionConfirmation"&&c.col==="actualCompletedAt")),afterColumns);
    const actual=completedColumns.find(c=>c.tbl==="SessionConfirmation"&&c.col==="actualCompletedAt");
    assert.equal(actual.nullable,"YES");assert.equal(actual.kind,"datetime");assert.equal(Number(actual.precision_value),3);
    assert.equal(infrastructure.schemaDiff(target,"prisma/release/schema.prisma"),0);
    const active=await old.swap.findUniqueOrThrow({where:{id:"historical-active"}});
    const schedule=await old.swapSession.findUniqueOrThrow({where:{id:"historical-session-a"}});
    const next={...schedule,sessionNumber:2}; // Pure timing check; no historical row is edited.
    assert.equal(confirmationEligibility(active,"historical-a",2,next,Date.parse("2026-01-02T12:00:00Z")).eligible,true);
    console.log("Historical preservation verified: 2 agreements, 2 schedules, 4 confirmations, 2 reviews; flexible ranges and the later nullable actual-completion field verified separately.");
  }finally{await old.$disconnect();}
});

test("known legacy copy upgrades additively, preserves all old rows and sessions, and cannot receive a fresh baseline",options,async()=>{
  const ddl=infrastructure.cli(m,["migrate","diff","--from-empty","--to-schema-datamodel","prisma/schema.prisma","--script"]);
  const file=join(m.directory,"legacy-schema.sql");writeFileSync(file,ddl);
  infrastructure.cli(m,["db","execute","--file",file,"--schema","prisma/schema.prisma"],m.legacyUrl);
  const old=new PrismaClient({datasources:{db:{url:m.legacyUrl}}});
  try {
    const user=await old.user.create({data:{name:"SYNTHETIC LEGACY USER",email:email(),role:"USER",passwordHash:await bcrypt.hash(password,12),emailVerifiedAt:new Date()}});
    const oldSession=await old.$transaction(tx=>issueSession(tx,{...config,sessionTimeouts:undefined},user,"Synthetic legacy session"));
    const original=await old.user.findUniqueOrThrow({where:{id:user.id}});
    const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
    const history=digest(original),oldSessions=await old.authSession.count();
    await assert.rejects(()=>assertRuntimeSchema(old,config));
    await assert.rejects(()=>infrastructure.fresh({...m,url:m.legacyUrl}));
    assert.equal(await infrastructure.upgradeShared(m),"UPGRADED");
    assert.equal(await infrastructure.upgradeShared(m),"ALREADY_CURRENT");
    await assertRuntimeSchema(old,config);
    assert.equal(digest(await old.user.findUniqueOrThrow({where:{id:user.id}})),history);assert.equal(await old.authSession.count(),oldSessions);
    assert.equal(Number((await old.$queryRaw<any[]>`SELECT COUNT(*) AS n FROM RegistrationConsent`)[0].n),0);
    assert.equal((await old.$queryRaw<any[]>`SELECT lastInteractiveAt AS at FROM AuthSession`)[0].at,null);
    const legacyServer=createApp(old,config).listen(0,"127.0.0.1");await once(legacyServer,"listening");
    const base=`http://127.0.0.1:${(legacyServer.address() as any).port}/api`;
    try {await call("GET","/profile",401,oldSession.token,undefined,base);await call("POST","/auth/login",200,undefined,{email:user.email,password},base);}finally{legacyServer.close();await once(legacyServer,"close");}
    await old.$executeRawUnsafe("CREATE TABLE SyntheticUnknownLayout (id INTEGER PRIMARY KEY)");
    const before=await old.user.count();await assert.rejects(()=>infrastructure.upgradeShared(m));assert.equal(await old.user.count(),before);
  } finally {await old.$disconnect();}
});
