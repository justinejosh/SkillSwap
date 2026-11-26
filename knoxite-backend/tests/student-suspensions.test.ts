import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { loadConfig } from "../lib/config";
import { suspensionInput, suspensionReasons, previewStudentSuspension, suspendStudent, reconcileStudentSuspension, studentSuspensionNotice } from "../services/studentSuspensions";
import { assertRuntimeSchema } from "../services/schemaReadiness";

const config = loadConfig({ SUSPENSION_CREATION_ENABLED: "true", JWT_SECRET: "synthetic-suspension-test-key-".repeat(3) });
const input = { reason: "SPAM_MISUSE", durationDays: 7, studentExplanation: "Synthetic explanation for a test account.", privateNotes: "Synthetic private notes" };
function fixture() {
  let state: any = { users: [{ id: "admin", role: "ADMIN", isSuspended: false, activeSuspensionId: null, tokenVersion: 0 }, { id: "student", name: "Synthetic Student", email: "syntheticlag@fixture.invalid", role: "USER", isSuspended: false, activeSuspensionId: null, tokenVersion: 0 }], records: [], audits: [], sessions: [{ id: "admin-session", userId: "admin", revokedAt: null }, { id: "student-session", userId: "student", revokedAt: null }] };
  let failAudit = false;
  const tx: any = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }: any) => state.users.find((u: any) => u.id === where.id), update: async ({ where, data }: any) => { const u = state.users.find((u: any) => u.id === where.id); Object.assign(u, { ...data, ...(data.tokenVersion ? { tokenVersion: u.tokenVersion + data.tokenVersion.increment } : {}) }); return u; } },
    authSession: { findFirst: async ({ where }: any) => state.sessions.find((s: any) => s.id === where.id && s.userId === where.userId && !s.revokedAt), updateMany: async ({ where, data }: any) => { for (const s of state.sessions) if (s.userId === where.userId && !s.revokedAt) Object.assign(s, data); } },
    studentSuspension: { findUnique: async ({ where }: any) => state.records.find((r: any) => r.id === where.id), create: async ({ data }: any) => { const r = { id: `record-${state.records.length}`, status: "ACTIVE", ...data }; state.records.push(r); return r; }, update: async ({ where, data }: any) => { const r = state.records.find((r: any) => r.id === where.id); Object.assign(r, data); return r; } },
    suspensionAudit: { create: async ({ data }: any) => { if (failAudit) throw new Error("Synthetic audit failure"); state.audits.push(data); return data; } },
  };
  const db: any = { $transaction: async (work: any) => { const before = structuredClone(state); try { return await work(tx); } catch (e) { state = before; throw e; } } };
  const authority = { id: "admin", tokenVersion: 0, sessionId: "admin-session" };
  return { db, tx, authority, state: () => state, fail: () => { failAudit = true; }, async create() { const q = await previewStudentSuspension(db, config, authority, "student", input); return suspendStudent(db, config, authority, "student", { ...input, confirmationToken: q.confirmationToken }); } };
}

test("suspension reasons, durations and bounded explanations are validated without client authority fields", () => {
  for (const reason of Object.keys(suspensionReasons)) for (const durationDays of [1, 3, 7, 14, 30]) assert.equal(suspensionInput({ ...input, reason, durationDays, ...(reason === "OTHER" ? { reasonExplanation: "Synthetic other reason" } : {}) }).durationDays, durationDays);
  for (const patch of [{ reason: undefined }, { reason: "PERMANENT_BAN" }, { reason: "__proto__" }, { durationDays: undefined }, { durationDays: 0 }, { durationDays: 2 }, { durationDays: "7" }, { durationDays: 365 }, { reason: "OTHER" }, { reason: "OTHER", reasonExplanation: " " }, { studentExplanation: " " }, { studentExplanation: "x".repeat(2001) }, { privateNotes: "x".repeat(2001) }, { administratorId: "forged" }, { startsAt: "2000-01-01" }, { expiresAt: "2099-01-01" }]) assert.throws(() => suspensionInput({ ...input, ...patch }), /./);
});
test("server confirmation binds the account, administrator session and explanations without fixing suspension dates", async () => {
  const f = fixture(), q = await previewStudentSuspension(f.db, config, f.authority, "student", input);
  assert.equal((q as any).startsAt, undefined); assert.equal((q as any).expiresAt, undefined); assert.ok(Math.abs(+q.reviewedAt - Date.now()) < 1000); assert.equal(f.state().records.length, 0);
  assert.throws(() => jwt.verify(q.confirmationToken, config.jwtSecret, { issuer: "knoxite-api", audience: "knoxite" }));
  for (const patch of [{ studentExplanation: "Changed" }, { durationDays: 3 }, { privateNotes: "Changed" }, { confirmationToken: "forged" }]) await assert.rejects(() => suspendStudent(f.db, config, f.authority, "student", { ...input, confirmationToken: q.confirmationToken, ...patch }));
  await assert.rejects(() => suspendStudent(f.db, config, f.authority, "another-student", { ...input, confirmationToken: q.confirmationToken }));
  const r = await suspendStudent(f.db, config, f.authority, "student", { ...input, confirmationToken: q.confirmationToken }); assert.equal(+r.suspension.expiresAt - +r.suspension.startsAt, 7 * 86400_000); assert.ok(+r.suspension.startsAt >= +q.reviewedAt);
  const s = f.state(); assert.equal(s.users[1].tokenVersion, 1); assert.ok(s.users[1].isSuspended); assert.ok(s.sessions[1].revokedAt); assert.equal(s.sessions[0].revokedAt, null); assert.equal(s.audits[0].actorAdministratorId, "admin");
  await assert.rejects(() => suspendStudent(f.db, config, f.authority, "student", { ...input, confirmationToken: q.confirmationToken }), /already restricted/); assert.equal(s.records.length, 1);
});
test("waiting during review never shortens the selected duration; confirmation shares one authoritative timestamp", async t => {
  const start=Date.parse("2026-11-26T07:45:00Z");t.mock.timers.enable({apis:["Date"],now:start});
  try {
    const f=fixture(),q=await previewStudentSuspension(f.db,config,f.authority,"student",input);
    assert.equal(f.state().users[1].isSuspended,false);assert.equal(f.state().audits.length,0);assert.equal(f.state().sessions[1].revokedAt,null);
    const claims=jwt.decode(q.confirmationToken) as jwt.JwtPayload;assert.equal(claims.startsAt,undefined);assert.equal(claims.expiresAt,undefined);assert.equal(claims.exp!-claims.iat!,120);
    t.mock.timers.setTime(start+90_000);
    const result=await suspendStudent(f.db,config,f.authority,"student",{...input,confirmationToken:q.confirmationToken});
    assert.equal(+result.suspension.startsAt,start+90_000);assert.equal(+result.suspension.expiresAt,start+90_000+7*86400_000);
    assert.equal(+result.suspension.createdAt,+result.suspension.startsAt);assert.equal(+result.suspension.updatedAt,+result.suspension.startsAt);
    assert.equal(+f.state().audits[0].createdAt,+result.suspension.startsAt);assert.equal(+f.state().sessions[1].revokedAt,+result.suspension.startsAt);
  }finally{t.mock.timers.reset();}
});
test("proof expiry is rechecked after lock waits and pre-correction proof versions require fresh review",async t=>{
  const start=Date.parse("2026-11-26T07:45:00Z");t.mock.timers.enable({apis:["Date"],now:start});
  try {
    const f=fixture(),q=await previewStudentSuspension(f.db,config,f.authority,"student",input);
    const old=jwt.decode(q.confirmationToken) as jwt.JwtPayload;old.proofVersion=1;
    const legacy=jwt.sign(old,config.jwtSecret,{algorithm:"HS256"});
    await assert.rejects(()=>suspendStudent(f.db,config,f.authority,"student",{...input,confirmationToken:legacy}),/changed or expired/);
    t.mock.timers.setTime(start+119_000);f.tx.$queryRaw=async()=>{t.mock.timers.setTime(start+120_000);return[];};
    await assert.rejects(()=>suspendStudent(f.db,config,f.authority,"student",{...input,confirmationToken:q.confirmationToken}),/expired/);
    assert.equal(f.state().records.length,0);assert.equal(f.state().users[1].tokenVersion,0);assert.equal(f.state().sessions[1].revokedAt,null);
  }finally{t.mock.timers.reset();}
});
test("suspension creation defaults off, malformed controls fail closed and disabled recovery performs no creation queries",async()=>{
  const disabled=loadConfig({JWT_SECRET:config.jwtSecret});assert.equal(disabled.suspensionCreationEnabled,false);
  for(const value of ["", "TRUE", "1", "yes"])assert.throws(()=>loadConfig({JWT_SECRET:config.jwtSecret,SUSPENSION_CREATION_ENABLED:value}),/must be true or false/);
  const f=fixture(),q=await previewStudentSuspension(f.db,config,f.authority,"student",input);const before=structuredClone(f.state());
  for(const c of [disabled,{...config,suspensionCreationEnabled:false},{...config,suspensionCreationEnabled:undefined}]){
    await assert.rejects(()=>previewStudentSuspension(f.db,c,f.authority,"student",input),/disabled/);
    await assert.rejects(()=>suspendStudent(f.db,c,f.authority,"student",{...input,confirmationToken:q.confirmationToken}),/disabled/);
  }
  assert.deepEqual(f.state(),before);
});
test("recovery launcher forces creation off before startup and refuses missing or incompatible compiled artifacts",()=>{
  const source=readFileSync(resolve("scripts/start-suspension-recovery.cjs"),"utf8");
  for(const protocol of [undefined,1,2]){
    const processStub:any={env:{SUSPENSION_CREATION_ENABLED:"true"}},calls:string[]=[];
    runInNewContext(source,{process:processStub,console:{error:()=>{}},require:(name:string)=>{calls.push(name);if(name==="dotenv/config"){processStub.env.SUSPENSION_CREATION_ENABLED="true";return{};}assert.equal(processStub.env.SUSPENSION_CREATION_ENABLED,"false");return name.endsWith("studentSuspensions.js")?{SUSPENSION_PROTOCOL_VERSION:protocol}:{};}});
    assert.equal(calls.includes("../dist/index.js"),protocol===2);assert.equal(processStub.exitCode,protocol===2?undefined:1);
  }
});
test("confirmation expires at two minutes and changed/revoked administrator authority cannot act", async t => {
  const f = fixture(), q = await previewStudentSuspension(f.db, config, f.authority, "student", input);
  t.mock.timers.enable({ apis: ["Date"], now: +q.reviewedAt + 120_000 });
  try { await assert.rejects(() => suspendStudent(f.db, config, f.authority, "student", { ...input, confirmationToken: q.confirmationToken }), /expired/); } finally { t.mock.timers.reset(); }
  f.state().sessions[0].revokedAt = new Date(); await assert.rejects(() => previewStudentSuspension(f.db, config, f.authority, "student", input), /administrator/);
  f.state().sessions[0].revokedAt = null; f.state().users[0].role = "USER"; await assert.rejects(() => previewStudentSuspension(f.db, config, f.authority, "student", input), /administrator/);
  f.state().users[0].role = "ADMIN"; await assert.rejects(() => previewStudentSuspension(f.db, config, f.authority, "admin", input), /Administrator accounts/);
});
test("failed audit rolls back restriction, version bump, history and session revocation", async () => {
  const f = fixture(), before = structuredClone(f.state()); f.fail(); await assert.rejects(() => f.create(), /audit failure/); assert.deepEqual(f.state(), before);
});
test("exact expiry reconciles once, audits system action and never resurrects old sessions", async () => {
  const f = fixture(), { suspension } = await f.create();
  let user = f.state().users[1]; await reconcileStudentSuspension(f.tx, user, new Date(+suspension.expiresAt - 1)); assert.ok(user.isSuspended); assert.equal(f.state().audits.length, 1);
  const revokedAt = f.state().sessions[1].revokedAt;
  await reconcileStudentSuspension(f.tx, user, suspension.expiresAt); user = f.state().users[1]; assert.equal(user.isSuspended, false); assert.equal(user.activeSuspensionId, null); assert.equal(user.tokenVersion, 1);
  assert.equal(f.state().records[0].status, "EXPIRED"); assert.equal(+f.state().records[0].reactivatedAt, +suspension.expiresAt); assert.equal(f.state().audits[1].action, "EXPIRED"); assert.equal(f.state().audits[1].actorAdministratorId, undefined);
  await reconcileStudentSuspension(f.tx, user, new Date(+suspension.expiresAt + 1)); assert.equal(f.state().audits.length, 2); assert.equal(f.state().sessions[1].revokedAt, revokedAt);
});
test("legacy and separately restricted accounts never receive automatic restoration or fabricated reasons", async () => {
  const f = fixture(); f.state().users[1].isSuspended = true;
  await reconcileStudentSuspension(f.tx, f.state().users[1], new Date("2099-01-01")); assert.ok(f.state().users[1].isSuspended); assert.equal(f.state().records.length, 0);
  const legacy = await studentSuspensionNotice(f.tx, f.state().users[1]); assert.equal(legacy.legacy, true); assert.equal(legacy.reason, null); assert.equal(legacy.expiresAt, null);
  f.state().users[1].isSuspended = false; const { suspension } = await f.create(); f.state().users[1].tokenVersion++;
  await reconcileStudentSuspension(f.tx, f.state().users[1], suspension.expiresAt); assert.ok(f.state().users[1].isSuspended); assert.equal(f.state().records[0].reactivatedAt, null); assert.equal(f.state().audits[1].action, "EXPIRED_RESTRICTION_RETAINED");
});
test("student notice is an allowlisted view that omits private notes, actors and account identifiers", async () => {
  const f = fixture(); await f.create(); const notice = await studentSuspensionNotice(f.tx, f.state().users[1]);
  assert.deepEqual(Object.keys(notice).sort(), ["legacy", "reason", "reasonExplanation", "explanation", "startsAt", "expiresAt"].sort()); assert.equal(notice.reason, suspensionReasons.SPAM_MISUSE); assert.equal(notice.explanation, input.studentExplanation); assert.ok(!JSON.stringify(notice).includes(input.privateNotes));
});
test("startup refuses missing suspension storage or ownership columns without attempting a migration", async () => {
  for (const missing of ["StudentSuspension", "activeSuspensionId"]) {
    const db:any={$queryRaw:async(parts:TemplateStringsArray)=>{const sql=String(parts);return[{count:sql.includes(missing)?0n:/actualCompletedAt|activeSuspensionId/.test(sql)?1n:2n}];}};
    await assert.rejects(()=>assertRuntimeSchema(db,config),/Temporary suspension schema/);
  }
});
