import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../../app";
import { loadConfig } from "../../lib/config";
import { issueSession } from "../../services/authSessions";
import { reconcileSuspensionById, reconcileStudentSuspension, previewStudentSuspension, suspendStudent } from "../../services/studentSuspensions";
import { assertRuntimeSchema } from "../../services/schemaReadiness";
import { seedAcademicCatalog } from "../../services/academics";
import { googleTestEnvironment } from "../googleFixture";
import { HttpError } from "../../lib/http";
import { requireOwnedFixtureDatabase } from "./fixtureDatabase";
const infrastructure = require("../../../development/fourBlockersEnvironment.cjs");
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v, (_k, value) => typeof value === "bigint" ? value.toString() : value)).digest("hex");

test("temporary suspensions: authoritative authentication, concurrency, expiry and preservation on disposable MySQL", async t => {
  const db = new PrismaClient({ datasources: { db: { url: requireOwnedFixtureDatabase() } } });
  const config = loadConfig({ ...googleTestEnvironment(), SUSPENSION_CREATION_ENABLED: "true", SESSION_TIMEOUTS_ENABLED: "true" });
  const password = "synthetic-suspension-password", hash = await bcrypt.hash(password, 4);
  await assertRuntimeSchema(db, config); await seedAcademicCatalog(db);
  const program = await db.program.findUniqueOrThrow({ where: { code: "BSCS" }, include: { yearLevels: true } });
  const users = await Promise.all(["Student", "Partner", "Admin", "OtherStudent"].map((name, i) => db.user.create({ data: { name: `Synthetic ${name}`, email: `synthetic-${randomUUID()}lag@fixture.example`, role: i === 2 ? "ADMIN" : "USER", passwordHash: hash, emailVerifiedAt: new Date(), ...(i !== 2 ? { programId: program.id, yearLevelId: program.yearLevels[0].id } : {}) } })));
  const sessions = await Promise.all(users.map(user => db.$transaction(tx => issueSession(tx, config, user, "Synthetic suspension session"))));
  const tokens = new Map<string, any>();
  const server = createApp(db, config, async () => {}, undefined, async credential => { const claims = tokens.get(credential); if (!claims) throw new HttpError(401, "Google identity could not be verified."); return claims; }).listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`, id = users[0].id, admin = sessions[2].token;
  const endpoint = `/admin/users/${id}/suspensions`, input = { reason: "OTHER", reasonExplanation: "Synthetic reviewed concern", durationDays: 7, studentExplanation: "Synthetic student-facing explanation.", privateNotes: "PRIVATE SYNTHETIC NOTES NEVER DISCLOSED" };
  async function call(path: string, status: number, method = "GET", token?: string, body?: unknown) { const r = await fetch(base + path, { method, headers: { Origin: config.origins[0], ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const data: any = await r.json(); assert.equal(r.status, status, `${method} ${path}: ${data.error || ""}`); return data; }
  const snapshot = async () => {
    const target = await db.user.findUniqueOrThrow({ where: { id }, include: { offeredSkills: true, wantedSkills: true } });
    const { tokenVersion, isSuspended, activeSuspensionId, ...preserved } = target;
    const result: any = { account: preserved };
    for (const table of ["Swap", "SwapRequest", "SwapSession", "SessionConfirmation", "Message", "Review", "UserOfferedSkill", "AssessmentAttempt", "RegistrationConsent"]) result[table] = await db.$queryRawUnsafe(`SELECT * FROM \`${table}\` ORDER BY id`);
    return digest(result);
  };
  // Representative account history, including confirmed sessions and bilateral reviews.
  const skills = await Promise.all(["One", "Two"].map(name => db.skill.create({ data: { name: `Synthetic Suspension Skill ${name}`, category: "technology" } })));
  const request = await db.swapRequest.create({ data: { requesterId: id, receiverId: users[1].id, offeredSkillId: skills[0].id, wantedSkillId: skills[1].id, status: "ACCEPTED" } });
  const swap = await db.swap.create({ data: { requesterId: id, receiverId: users[1].id, offeredSkillId: skills[0].id, wantedSkillId: skills[1].id, requestId: request.id, sessions: 1, duration: null, status: "COMPLETED", integrityVerified: true, requesterSessions: 1, receiverSessions: 1, requesterApprovedAt: new Date("2026-01-01"), receiverApprovedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-02") } });
  await db.swapSession.create({ data: { swapId: swap.id, sessionNumber: 1, scheduledAt: new Date("2026-01-02T00:00Z"), endsAt: new Date("2026-01-02T01:00Z") } });
  for (const [reviewer, reviewee] of [[users[0], users[1]], [users[1], users[0]]]) { await db.sessionConfirmation.create({ data: { swapId: swap.id, participantId: reviewer.id, sessionNumber: 1 } }); await db.review.create({ data: { swapId: swap.id, reviewerId: reviewer.id, revieweeId: reviewee.id, rating: 4, isValidated: true, comment: "Synthetic historical feedback" } }); }
  await db.message.create({ data: { swapId: swap.id, senderId: id, receiverId: users[1].id, content: "Synthetic preserved message" } });
  await db.$executeRaw`INSERT INTO RegistrationConsent(id,userId,noticeVersion,acceptedAt) VALUES(${randomUUID()},${id},${config.registrationConsent!.version},NOW(3))`;
  const offering = await db.userOfferedSkill.create({ data: { userId: id, skillId: skills[0].id } });
  const bank = await db.assessmentBank.create({ data: { skillId: skills[0].id, level: "BASIC", title: "Synthetic only" } });
  const version = await db.assessmentVersion.create({ data: { bankId: bank.id, version: 1, learningOutcomes: "Synthetic fixture only", createdById: users[2].id } });
  await db.assessmentAttempt.create({ data: { offeringId: offering.id, versionId: version.id, level: "BASIC", attemptNumber: 1, passingPercent: 80, policy: {}, expiresAt: new Date("2099-01-01"), status: "FAILED" } });
  const before = await snapshot(); let preview: any, recordId = "";
  try {
    await t.test("ADMIN-only endpoints reject forged actors, missing reasons/durations and the old reason-free DELETE", async () => {
      await call(endpoint, 401); await call(endpoint, 403, "GET", sessions[1].token); await call(endpoint + "/preview", 403, "POST", sessions[1].token, input);
      await call(`/admin/users/${id}`, 422, "DELETE", admin, {});
      for (const patch of [{ reason: undefined }, { durationDays: undefined }, { durationDays: 2 }, { reason: "BOGUS" }, { reasonExplanation: "" }, { studentExplanation: "" }, { administratorId: users[1].id }, { expiresAt: "2099-01-01" }]) await call(endpoint + "/preview", 422, "POST", admin, { ...input, ...patch });
      await call(`/admin/users/${users[2].id}/suspensions/preview`, 403, "POST", admin, input);
      assert.equal(await db.studentSuspension.count(), 0); preview = await call(endpoint + "/preview", 200, "POST", admin, input);
      assert.equal(preview.startsAt, undefined); assert.equal(preview.expiresAt, undefined); assert.ok(Number.isFinite(Date.parse(preview.reviewedAt)));
      await call(endpoint, 409, "POST", admin, { ...input, confirmationToken: preview.confirmationToken, privateNotes: "Changed after review" });
    });
    await t.test("concurrent confirmations create one restriction/audit, bump once and revoke only the target sessions", async () => {
      const confirmedAt=Date.parse(preview.reviewedAt)+60_000;
      t.mock.timers.enable({apis:["Date"],now:confirmedAt});
      try {
      const responses = await Promise.all([1, 2].map(() => fetch(base + endpoint, { method: "POST", headers: { Authorization: `Bearer ${admin}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...input, confirmationToken: preview.confirmationToken }) })));
      assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]); await Promise.all(responses.map(r => r.json()));
      assert.equal(await db.studentSuspension.count({ where: { userId: id } }), 1); assert.equal(await db.suspensionAudit.count(), 1);
      const user = await db.user.findUniqueOrThrow({ where: { id } }); recordId = user.activeSuspensionId!; assert.equal(user.tokenVersion, 1); assert.equal(user.isSuspended, true);
      assert.equal(await db.authSession.count({ where: { userId: id, revokedAt: null } }), 0); await call("/profile", 401, "GET", sessions[0].token); await call("/profile", 200, "GET", sessions[1].token);
      await assert.rejects(() => db.suspensionAudit.create({ data: { suspensionId: recordId, action: "SUSPENDED", actorAdministratorId: users[2].id } }));
      const stored=await db.studentSuspension.findUniqueOrThrow({where:{id:recordId}});
      assert.equal(+stored.startsAt,confirmedAt);assert.equal(+stored.expiresAt,confirmedAt+input.durationDays*86400_000);
      assert.equal(+stored.createdAt,confirmedAt);assert.equal(+stored.updatedAt,confirmedAt);
      assert.equal(+(await db.suspensionAudit.findFirstOrThrow({where:{suspensionId:recordId}})).createdAt,confirmedAt);
      for(const session of await db.authSession.findMany({where:{userId:id}}))assert.equal(+session.revokedAt!,confirmedAt);
      } finally {t.mock.timers.reset();}
    });
    await t.test("only correct password proof reveals a minimal notice and never a normal session", async () => {
      for (const email of [users[0].email, `absent-${randomUUID()}lag@fixture.example`]) { const r = await call("/auth/login", 401, "POST", undefined, { email, password: "wrong-synthetic-password" }); assert.deepEqual(r, { error: "Invalid email or password." }); }
      const notice = await call("/auth/login", 403, "POST", undefined, { email: users[0].email, password }); assert.equal(notice.details.code, "ACCOUNT_SUSPENDED"); assert.equal(notice.details.suspension.explanation, input.studentExplanation); assert.equal(notice.details.suspension.expiresAt, (await db.studentSuspension.findUniqueOrThrow({where:{id:recordId}})).expiresAt.toISOString());
      assert.ok(!JSON.stringify(notice).includes(input.privateNotes)); assert.ok(!JSON.stringify(notice).includes(id)); assert.equal(notice.token, undefined); assert.equal(await db.authSession.count({ where: { userId: id, revokedAt: null } }), 0);
      const history = await call(endpoint, 200, "GET", admin); assert.equal(history.suspensions[0].privateNotes, input.privateNotes); assert.equal(history.suspensions[0].administrator.name, users[2].name); assert.equal(history.suspensions[0].events[0].actorAdministrator.name, users[2].name);
      for (const method of ["PATCH", "DELETE"]) await call(endpoint, 404, method, admin, {});
      assert.equal(await snapshot(), before);
    });
    await t.test("signed linked Google identity cannot bypass suspension; invalid identity cannot obtain details", async () => {
      const subject = randomUUID(); await db.externalIdentity.create({ data: { provider: "GOOGLE", subject, userId: id, verifiedEmail: users[0].email, hostedDomain: config.google.hostedDomains[0], policyVersion: config.google.policyVersion } });
      async function google(valid: boolean) { const proof = randomBytes(32).toString("base64url"); const q = await call("/auth/google/challenge", 200, "POST", undefined, { browserProofHash: createHash("sha256").update(proof).digest("hex") }); const credential = randomUUID(); if (valid) tokens.set(credential, { iss: "https://accounts.google.com", aud: config.google.clientId, sub: subject, email: users[0].email, hd: config.google.hostedDomains[0], email_verified: true, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+300, nonce: q.nonce }); return call("/auth/google/login", valid ? 403 : 401, "POST", undefined, { challengeId: q.challengeId, browserProof: proof, credential }); }
      assert.equal((await google(false)).details, undefined); assert.equal((await google(true)).details.code, "ACCOUNT_SUSPENDED");
      assert.equal(await db.authSession.count({ where: { userId: id, revokedAt: null } }), 0);
    });
    await t.test("expiry boundary and concurrent reconciliation retain history and require a fresh login", async () => {
      const record = await db.studentSuspension.findUniqueOrThrow({ where: { id: recordId } });
      await db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM User WHERE id=${id} FOR UPDATE`; const u=await tx.user.findUniqueOrThrow({where:{id}}); await reconcileStudentSuspension(tx,u,new Date(+record.expiresAt-1)); });
      assert.equal((await db.user.findUniqueOrThrow({where:{id}})).isSuspended,true);
      await db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM User WHERE id=${id} FOR UPDATE`; const u=await tx.user.findUniqueOrThrow({where:{id}}); await reconcileStudentSuspension(tx,u,record.expiresAt); });
      await Promise.all([1,2,3].map(()=>reconcileSuspensionById(db,id)));
      assert.equal(await db.suspensionAudit.count({where:{suspensionId:recordId,action:"EXPIRED"}}),1); await call("/profile",401,"GET",sessions[0].token);
      const login=await call("/auth/login",200,"POST",undefined,{email:users[0].email,password}); await call("/profile",200,"GET",login.token);
      const link=await db.externalIdentity.findFirstOrThrow({where:{userId:id}}),proof=randomBytes(32).toString("base64url");
      const challenge=await call("/auth/google/challenge",200,"POST",undefined,{browserProofHash:createHash("sha256").update(proof).digest("hex")}),credential=randomUUID();
      tokens.set(credential,{iss:"https://accounts.google.com",aud:config.google.clientId,sub:link.subject,email:users[0].email,hd:config.google.hostedDomains[0],email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,nonce:challenge.nonce});
      const google=await call("/auth/google/login",200,"POST",undefined,{challengeId:challenge.challengeId,browserProof:proof,credential});
      const timing=await call("/auth/session-status",200,"GET",google.token);assert.equal(timing.warningSeconds,300);assert.ok(Date.parse(timing.absoluteExpiresAt)-Date.now()<=8*3600000);
      assert.equal((await db.user.findUniqueOrThrow({where:{id}})).tokenVersion,1); assert.equal(await snapshot(),before);
    });
    await t.test("real transaction rolls back all effects if the audit write fails", async () => {
      const target=users[3],authority={id:users[2].id,tokenVersion:0,sessionId:(await db.authSession.findFirstOrThrow({where:{userId:users[2].id}})).id};
      const q=await previewStudentSuspension(db,config,authority,target.id,input);
      const failing:any={$transaction:(work:any,opts:any)=>db.$transaction(tx=>work(new Proxy(tx,{get(obj,key){if(key==="suspensionAudit")return{create:async()=>{throw new Error("Synthetic audit failure");}};return Reflect.get(obj,key);}})),opts)};
      await assert.rejects(()=>suspendStudent(failing,config,authority,target.id,{...input,confirmationToken:q.confirmationToken}),/audit failure/);
      const saved=await db.user.findUniqueOrThrow({where:{id:target.id}}); assert.equal(saved.isSuspended,false); assert.equal(saved.tokenVersion,0); assert.equal(saved.activeSuspensionId,null); assert.equal(await db.studentSuspension.count({where:{userId:target.id}}),0); await call("/profile",200,"GET",sessions[3].token);
    });
    await t.test("expiration racing a new suspension cannot release the replacement restriction",async()=>{
      const target=users[3],authority={id:users[2].id,tokenVersion:0,sessionId:(await db.authSession.findFirstOrThrow({where:{userId:users[2].id}})).id};
      const q=await previewStudentSuspension(db,config,authority,target.id,input),first=await suspendStudent(db,config,authority,target.id,{...input,confirmationToken:q.confirmationToken});
      await db.studentSuspension.update({where:{id:first.suspension.id},data:{expiresAt:new Date(Date.now()-1)}});
      const [,next]=await Promise.all([reconcileSuspensionById(db,target.id),previewStudentSuspension(db,config,authority,target.id,input)]);
      const [replacement]=await Promise.all([suspendStudent(db,config,authority,target.id,{...input,confirmationToken:next.confirmationToken}),reconcileSuspensionById(db,target.id)]);
      const saved=await db.user.findUniqueOrThrow({where:{id:target.id}});assert.equal(saved.isSuspended,true);assert.equal(saved.activeSuspensionId,replacement.suspension.id);
      assert.equal(await db.suspensionAudit.count({where:{suspensionId:first.suspension.id,action:"EXPIRED"}}),1);
      await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM User WHERE id=${target.id} FOR UPDATE`;await reconcileStudentSuspension(tx,await tx.user.findUniqueOrThrow({where:{id:target.id}}),replacement.suspension.expiresAt);});
    });
    await t.test("passive directory/password reconciliation preserves legacy or separate restrictions", async () => {
      const authority={id:users[2].id,tokenVersion:0,sessionId:(await db.authSession.findFirstOrThrow({where:{userId:users[2].id}})).id};
      const q=await previewStudentSuspension(db,config,authority,users[3].id,input); const r=await suspendStudent(db,config,authority,users[3].id,{...input,confirmationToken:q.confirmationToken});
      await db.studentSuspension.update({where:{id:r.suspension.id},data:{expiresAt:new Date(Date.now()-1)}}); // Synthetic elapsed-time fixture only.
      await call("/admin/users?status=ACTIVE",200,"GET",admin); assert.equal((await db.user.findUniqueOrThrow({where:{id:users[3].id}})).isSuspended,false);
      const q2=await previewStudentSuspension(db,config,authority,users[3].id,input); const r2=await suspendStudent(db,config,authority,users[3].id,{...input,confirmationToken:q2.confirmationToken}); await db.studentSuspension.update({where:{id:r2.suspension.id},data:{expiresAt:new Date(Date.now()-1)}});
      const fresh=await call("/auth/login",200,"POST",undefined,{email:users[3].email,password});assert.ok(fresh.token);
      const q3=await previewStudentSuspension(db,config,authority,users[3].id,input); const r3=await suspendStudent(db,config,authority,users[3].id,{...input,confirmationToken:q3.confirmationToken}); await db.user.update({where:{id:users[3].id},data:{tokenVersion:{increment:1}}}); await db.studentSuspension.update({where:{id:r3.suspension.id},data:{expiresAt:new Date(Date.now()-1)}});
      const retained=await call("/auth/login",403,"POST",undefined,{email:users[3].email,password});assert.equal(retained.details.suspension.legacy,true); assert.equal((await db.user.findUniqueOrThrow({where:{id:users[3].id}})).isSuspended,true);
      await db.user.update({where:{id:users[1].id},data:{isSuspended:true}});const legacy=await call("/auth/login",403,"POST",undefined,{email:users[1].email,password});assert.equal(legacy.details.suspension.expiresAt,null);assert.equal(legacy.details.suspension.reason,null);assert.equal(await db.studentSuspension.count({where:{userId:users[1].id}}),0);
      assert.equal(await snapshot(),before); assert.equal(config.reportEvidence,undefined);
    });
  } finally { server.close(); await once(server,"close"); await db.$disconnect(); }
});

test("additive suspension migration preserves every previous table/column and legacy flag, with repeatable release history",async()=>{
  requireOwnedFixtureDatabase(); const m=infrastructure.open(process.env.KNOXITE_CI_FIXTURE_MANIFEST);infrastructure.verify(m);
  const prior=["20261117000000_current_release","20261121000000_flexible_session_ranges","20261122000000_actual_session_completion","20261123000000_moderation_and_report_evidence"];
  const directory=join(m.directory,"before-suspensions");mkdirSync(join(directory,"migrations"),{recursive:true});
  let schema=readFileSync("prisma/release/schema.prisma","utf8");for(const name of ["StudentSuspension","SuspensionAudit","SuspensionReason","SuspensionStatus","SuspensionAuditAction"])schema=schema.replace(new RegExp(`^(?:model|enum) ${name} \\{[\\s\\S]*?^\\}\\r?$`,"m"),"");
  schema=schema.replace(/^\s*(?:activeSuspensionId|activeSuspension|suspensionHistory|suspensionsIssued|suspensionAuditActions)\s.*\r?$/gm,"");
  writeFileSync(join(directory,"schema.prisma"),schema);copyFileSync("prisma/release/migrations/migration_lock.toml",join(directory,"migrations/migration_lock.toml"));
  for(const name of prior){mkdirSync(join(directory,"migrations",name));copyFileSync(`prisma/release/migrations/${name}/migration.sql`,join(directory,"migrations",name,"migration.sql"));}
  infrastructure.cli(m,["migrate","deploy","--schema",join(directory,"schema.prisma")],m.legacyUrl);
  let old=new PrismaClient({datasources:{db:{url:m.legacyUrl}}});
  try{
    await old.$executeRaw`INSERT INTO User(id,name,email,passwordHash,role,isSuspended) VALUES('prior-a','Synthetic legacy restriction','prioralag@fixture.example','synthetic-hash','USER',true),('prior-b','Synthetic partner','priorblag@fixture.example',NULL,'USER',false)`;
    await old.$executeRaw`INSERT INTO Skill(id,name,category) VALUES('prior-s1','Synthetic preserved skill 1','technology'),('prior-s2','Synthetic preserved skill 2','academic')`;
    await old.$executeRaw`INSERT INTO Swap(id,status,requesterId,receiverId,offeredSkillId,wantedSkillId,sessions,duration,updatedAt) VALUES('prior-swap','COMPLETED','prior-a','prior-b','prior-s1','prior-s2',1,2,NOW(3))`;
    await old.$executeRaw`INSERT INTO SwapSession(id,swapId,sessionNumber,scheduledAt,endsAt,updatedAt) VALUES('prior-session','prior-swap',1,'2026-01-01 01:00:00','2026-01-01 03:00:00',NOW(3))`;
    await old.$executeRaw`INSERT INTO SessionConfirmation(id,swapId,participantId,sessionNumber) VALUES('prior-confirmation','prior-swap','prior-a',1)`;
    await old.$executeRaw`INSERT INTO Review(id,swapId,reviewerId,revieweeId,rating,isValidated) VALUES('prior-review','prior-swap','prior-a','prior-b',4,true)`;
    await old.$executeRaw`INSERT INTO Message(id,swapId,senderId,receiverId,content) VALUES('prior-message','prior-swap','prior-a','prior-b','Synthetic historical message')`;
    await old.$executeRaw`INSERT INTO RegistrationConsent(id,userId,noticeVersion,acceptedAt) VALUES('prior-consent','prior-a','SYNTHETIC_NOTICE',NOW(3))`;
    const columns=await old.$queryRaw<Array<{t:string;c:string}>>`SELECT TABLE_NAME AS t,COLUMN_NAME AS c FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION`;
    const tables=[...new Set(columns.map(c=>c.t))].filter(t=>t!=="_prisma_migrations");
    async function fingerprints(){const result:any={};for(const table of tables){const names=columns.filter(c=>c.t===table).map(c=>c.c);assert.ok([table,...names].every(n=>/^[A-Za-z0-9_]+$/.test(n)));const rows:any[]=await old.$queryRawUnsafe(`SELECT ${names.map(n=>`\`${n}\``).join(",")} FROM \`${table}\``);result[table]={count:rows.length,sha256:digest(rows.map(r=>JSON.stringify(r)).sort())};}return result;}
    const before=await fingerprints(),history=await old.$queryRaw<any[]>`SELECT migration_name,checksum,finished_at FROM _prisma_migrations ORDER BY migration_name`;
    await old.$disconnect(); infrastructure.cli(m,["migrate","deploy","--schema","prisma/release/schema.prisma"],m.legacyUrl);old=new PrismaClient({datasources:{db:{url:m.legacyUrl}}});
    assert.deepEqual(await fingerprints(),before);const after=await old.$queryRaw<any[]>`SELECT migration_name,checksum,finished_at FROM _prisma_migrations ORDER BY migration_name`;assert.deepEqual(after.slice(0,4),history);assert.equal(after.length,5);
    assert.equal(after[4].checksum,createHash("sha256").update(readFileSync("prisma/release/migrations/20261126000000_temporary_student_suspensions/migration.sql")).digest("hex"));
    assert.equal((await old.user.findUniqueOrThrow({where:{id:"prior-a"}})).isSuspended,true);assert.equal((await old.user.findUniqueOrThrow({where:{id:"prior-a"}})).activeSuspensionId,null);assert.equal(await old.studentSuspension.count(),0);assert.equal(await old.suspensionAudit.count(),0);
    assert.equal(infrastructure.schemaDiff(m,"prisma/release/schema.prisma",m.legacyUrl),0);
    const indexes=await old.$queryRaw<any[]>`SELECT INDEX_NAME FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='SuspensionAudit' AND NON_UNIQUE=0 GROUP BY INDEX_NAME`;assert.equal(indexes.length,2);
    const fks=await old.$queryRaw<any[]>`SELECT CONSTRAINT_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME IN ('StudentSuspension','SuspensionAudit')`;assert.equal(fks.length,4);
    await assertRuntimeSchema(old,loadConfig({...googleTestEnvironment(),SESSION_TIMEOUTS_ENABLED:"true"}));
    infrastructure.cli(m,["migrate","deploy","--schema","prisma/release/schema.prisma"],m.legacyUrl);assert.deepEqual(await fingerprints(),before);assert.equal((await old.$queryRaw<any[]>`SELECT * FROM _prisma_migrations`).length,5);
  }finally{await old.$disconnect();}
});
