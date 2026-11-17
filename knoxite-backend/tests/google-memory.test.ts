// HTTP-route regressions with an in-memory Prisma double and MOCKED Google
// claims. These do not contact Google or any database and do not model DB races.
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { createApp } from "../app";
import { HttpError } from "../lib/http";
import { loadConfig } from "../lib/config";
import { googleTestEnvironment } from "./googleFixture";

async function fixture(extra: NodeJS.ProcessEnv = {}) {
  const config = loadConfig({ ...googleTestEnvironment(), INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph", ...(extra.NODE_ENV==="production"?{SESSION_TIMEOUTS_ENABLED:"true",REGISTRATION_NOTICE_APPROVED:"true",REGISTRATION_NOTICE_VERSION:"TEST_NOTICE_v1"}:{}), ...extra });
  const state: Record<string, any[]> = { user: [], externalIdentity: [], googleAuthChallenge: [], authSession: [], registrationConsent: [] };
  function matches(row: any, where: any): boolean {
    return Object.entries(where || {}).every(([key, value]: [string, any]) => {
      if (key === "OR") return value.some((v: any) => matches(row, v));
      if (key === "provider_subject" || key === "userId_provider") return matches(row, value);
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("lt" in value) return row[key] < value.lt;
        if ("gt" in value) return row[key] > value.gt;
      }
      return row[key] === value;
    });
  }
  const db: any = {
    $queryRaw: async (sql: TemplateStringsArray, ...values: any[]) => sql.join("").includes("SELECT lastInteractiveAt")
      ? state.authSession.filter((s) => s.id === values[0]).map((s) => ({ lastInteractiveAt: s.lastInteractiveAt })) : [],
    $executeRaw: async (sql: TemplateStringsArray, ...values: any[]) => {
      if(sql.join("").includes("INSERT INTO RegistrationConsent"))state.registrationConsent.push({id:values[0],userId:values[1],noticeVersion:values[2],acceptedAt:values[3]});
      if (sql.join("").includes("UPDATE AuthSession SET lastInteractiveAt")) {
        const session = state.authSession.find((s) => s.id === values[1]);
        if (session) session.lastInteractiveAt = values[0];
      }
      return 1;
    },
  };
  for (const model of Object.keys(state)) {
    const select = (row: any) => row && structuredClone(model === "authSession" ? { ...row, user: state.user.find((u) => u.id === row.userId) } : row);
    const update = (row: any, data: any) => { for (const [key, value] of Object.entries(data) as any) row[key] = value?.increment === undefined ? value : row[key] + value.increment; };
    db[model] = {
      findUnique: async ({ where }: any) => select(state[model].find((r) => matches(r, where))) || null,
      findUniqueOrThrow: async ({ where }: any) => { const row = state[model].find((r) => matches(r, where)); if (!row) throw new Error("Missing synthetic row"); return select(row); },
      findFirst: async ({ where }: any) => select(state[model].find((r) => matches(r, where))) || null,
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), usedAt: null, revokedAt: null, role: "USER", isSuspended: false, tokenVersion: 0, ...structuredClone(data) };
        state[model].push(row); return select(row);
      },
      update: async ({ where, data }: any) => { const row = state[model].find((r) => matches(r, where)); update(row, data); return select(row); },
      updateMany: async ({ where, data }: any) => { const rows = state[model].filter((r) => matches(r, where)); rows.forEach((r) => update(r, data)); return { count: rows.length }; },
      deleteMany: async ({ where }: any) => { state[model] = state[model].filter((r) => !matches(r, where)); return { count: 0 }; },
    };
  }
  db.program = { findFirst: async ({ where }: any) => ["BSCS", "BSIT"].includes(where.id) && (where.yearLevels.some.id === "YEAR_1" || (where.id === "BSCS" && where.yearLevels.some.id === "YEAR_2")) ? { id: where.id } : null };
  db.$transaction = async (fn: any) => {
    const before = structuredClone(state);
    try { return await fn(db); } catch (e) { for (const key of Object.keys(state)) state[key] = before[key]; throw e; }
  };
  const credentials = new Map<string, any>();
  const mailer = Object.assign(async () => { throw new Error("No real mail"); }, { isConfigured: () => false });
  const server = createApp(db, config, mailer, undefined, async (token) => {
    if (!credentials.has(token)) throw new HttpError(401, "Invalid synthetic Google credential");
    return credentials.get(token);
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  const email = "aasample1234lag@student.fatima.edu.ph", password = "synthetic-memory-password";
  async function call(path: string, body?: any, token?: string, method = "POST", origin = config.origins[0]) {
    const r = await fetch(base + path, { method, headers: { Origin: origin, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json() as any };
  }
  async function start(linkToken?: string, changes: any = {}, suppliedPassword = password) {
    const browserProof = randomBytes(32).toString("base64url");
    const started = await call(linkToken ? "/auth/google/link/challenge" : "/auth/google/challenge", { browserProofHash: createHash("sha256").update(browserProof).digest("hex"), ...(linkToken ? { currentPassword: suppliedPassword } : {}) }, linkToken);
    if (started.status !== 200) return { failed: started };
    const credential = randomUUID();
    credentials.set(credential, { sub: "synthetic-workspace-subject", iss: "https://accounts.google.com", aud: config.google.clientId, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, email, email_verified: true, hd: config.google.hostedDomains[0], nonce: started.data.nonce, ...changes });
    return { body: { challengeId: started.data.challengeId, browserProof, credential } };
  }
  async function local(changes = {}) {
    return db.user.create({ data: { name: "Preserved synthetic name", bio: "Preserved bio", email, passwordHash: await bcrypt.hash(password, 4), emailVerifiedAt: new Date(), ...changes } });
  }
  return { config, db, state, email, password, call, start, local,
    async close() { server.close(); await once(server, "close"); },
  };
}

test("MOCKED production-shaped Google registration accepts eligible identities without pilot preloading and never grants ADMIN", async () => {
  const f = await fixture({ NODE_ENV: "production", PUBLIC_APP_URL: "https://app.example.invalid", CORS_ORIGINS: "https://app.example.invalid" });
  try {
    assert.equal(f.config.localOAuthPilot, undefined);
    for (const [index, email] of ["aasample1234lag@student.fatima.edu.ph", "bbsample5678lag@student.fatima.edu.ph"].entries()) {
      const input = await f.start(undefined, { email, sub: `synthetic-production-sub-${index}`, role: "ADMIN" });
      const pending = await f.call("/auth/google/login", input.body); assert.equal(pending.status, 200);
      const body = { onboardingId: pending.data.onboardingId, browserProof: input.body!.browserProof, name: "Synthetic institutional student", programId: "BSCS", yearLevelId: "YEAR_1", termsAccepted: true, noticeVersion: f.config.registrationConsent!.version };
      assert.equal((await f.call("/auth/google/onboard", { ...body, role: "ADMIN" })).status, 422);
      const created = await f.call("/auth/google/onboard", body); assert.equal(created.status, 201);
      assert.equal(created.data.user.role, "USER");
    }
    assert.equal(f.state.user.length, 2);
  } finally { await f.close(); }
});

test("consent storage failure rolls back password and mocked Google registration without inventing historical consent",async()=>{
  const f=await fixture();try{
    const execute=f.db.$executeRaw;
    f.db.$executeRaw=async(sql:TemplateStringsArray,...values:any[])=>{
      if(sql.join("").includes("INSERT INTO RegistrationConsent"))throw {code:"P2010",meta:{code:"1146"}};
      return execute(sql,...values);
    };
    const input={name:"Synthetic consent failure",email:f.email,password:f.password,programId:"BSCS",yearLevelId:"YEAR_1",termsAccepted:true,noticeVersion:f.config.registrationConsent!.version};
    assert.equal((await f.call("/auth/register",input)).status,503);assert.equal(f.state.user.length,0);assert.equal(f.state.registrationConsent.length,0);
    const start=await f.start(),pending=await f.call("/auth/google/login",start.body);
    const body={onboardingId:pending.data.onboardingId,browserProof:start.body!.browserProof,name:input.name,programId:input.programId,yearLevelId:input.yearLevelId,termsAccepted:true,noticeVersion:input.noticeVersion};
    assert.equal((await f.call("/auth/google/onboard",body)).status,503);assert.equal(f.state.user.length,0);assert.equal(f.state.externalIdentity.length,0);assert.equal(f.state.registrationConsent.length,0);
    f.db.$executeRaw=execute;
    const historical=await f.local();const signed=await f.call("/auth/login",{email:f.email,password:f.password});assert.equal(signed.status,200);assert.equal(f.state.registrationConsent.length,0);assert.equal(f.state.user[0].id,historical.id);
  }finally{await f.close();}
});

test("mocked Google routes require academic onboarding and terms, create no password and reject ticket replay", async () => {
  const f = await fixture(); try {
    const input = await f.start();
    const pending = await f.call("/auth/google/login", input.body); assert.equal(pending.status, 200); assert.equal(f.state.user.length, 0);
    const body = { onboardingId: pending.data.onboardingId, browserProof: input.body!.browserProof, name: "Synthetic Google Student", programId: "BSIT", yearLevelId: "YEAR_1", termsAccepted: true, noticeVersion: f.config.registrationConsent!.version };
    assert.equal((await f.call("/auth/google/onboard", { ...body, termsAccepted: false })).status, 422);
    assert.equal((await f.call("/auth/google/onboard", { ...body, programId: "SHS" })).status, 422);
    assert.equal((await f.call("/auth/google/onboard", { ...body, yearLevelId: "YEAR_2" })).status, 422);
    const joined = await f.call("/auth/google/onboard", body); assert.equal(joined.status, 201);
    assert.ok(Math.abs(f.state.authSession[0].expiresAt.getTime() - Date.now() - 7 * 86400_000) < 5000,
      "The existing absolute lifetime must stay unchanged until migration/activation approval");
    assert.equal(f.state.user.length, 1); assert.equal(f.state.user[0].passwordHash, null); assert.ok(f.state.user[0].emailVerifiedAt);
    assert.equal(f.state.externalIdentity[0].userId, joined.data.user.id);
    assert.equal((await f.call("/auth/google/onboard", body)).status, 422);
    assert.equal((await f.call("/auth/methods", undefined, joined.data.token, "GET")).data.hasPassword, false);
  } finally { await f.close(); }
});
test("mocked linking requires existing password/session and never links through email matching", async () => {
  const f = await fixture(); try {
    const original = await f.local(); const before = structuredClone(f.state.user);
    const collision = await f.start(); assert.equal((await f.call("/auth/google/login", collision.body)).status, 409);
    assert.deepEqual(f.state.user, before); assert.equal(f.state.externalIdentity.length, 0);
    const session = await f.call("/auth/login", { email: f.email, password: f.password }); assert.equal(session.status, 200);
    assert.equal((await f.start(session.data.token, {}, "wrong-password")).failed?.status, 403);
    const link = await f.start(session.data.token);
    assert.equal((await f.call("/auth/google/link", { ...link.body, email: f.email }, session.data.token)).status, 422);
    assert.equal((await f.call("/auth/google/link", { ...link.body, browserProof: "x".repeat(43) }, session.data.token)).status, 422);
    assert.equal((await f.call("/auth/google/link", link.body, session.data.token)).status, 200);
    assert.equal((await f.call("/auth/google/link", link.body, session.data.token)).status, 422);
    const next = await f.start(); const login = await f.call("/auth/google/login", next.body); assert.equal(login.status, 200); assert.equal(login.data.user.id, original.id);
    assert.deepEqual(f.state.user, before); assert.equal(f.state.externalIdentity.length, 1);
  } finally { await f.close(); }
});
test("mocked Google identity rejects unauthorized claims, forged credentials and origins", async () => {
  const f = await fixture(); try {
    for (const claims of [{ email: "aasample123lag@student.fatima.edu.ph" }, { email: "aasample1234qc@student.fatima.edu.ph" }, { email: "aasample1234lag@gmail.com" }, { email_verified: false }, { hd: "unapproved.example" }, { aud: "other.apps.googleusercontent.com" }, { iss: "https://attacker.example" }, { exp: 1 }]) {
      const input = await f.start(undefined, claims); assert.equal((await f.call("/auth/google/login", input.body)).status, 403);
    }
    const input = await f.start();
    assert.equal((await f.call("/auth/google/login", { ...input.body, credential: "forged" })).status, 401);
    assert.equal((await f.call("/auth/google/login", input.body, undefined, "POST", "https://attacker.example")).status, 403);
    assert.equal(f.state.user.length, 0); assert.equal(f.state.authSession.length, 0);
  } finally { await f.close(); }
});
test("mocked linked identities retain suspension, revocation and token-version checks", async () => {
  const f = await fixture(); try {
    const user = await f.local(); await f.db.externalIdentity.create({ data: { provider: "GOOGLE", subject: "synthetic-workspace-subject", userId: user.id } });
    const input = await f.start(); const login = await f.call("/auth/google/login", input.body); assert.equal(login.status, 200);
    const methods = () => f.call("/auth/methods", undefined, login.data.token, "GET");
    f.state.user[0].isSuspended = true; assert.equal((await methods()).status, 403);
    const rejected = await f.start(); assert.equal((await f.call("/auth/google/login", rejected.body)).status, 403);
    f.state.user[0].isSuspended = false; f.state.user[0].tokenVersion++; assert.equal((await methods()).status, 401);
    f.state.user[0].tokenVersion--; assert.equal((await f.call("/auth/logout", undefined, login.data.token)).status, 200); assert.equal((await methods()).status, 401);
  } finally { await f.close(); }
});
test("mocked email authentication preserves passwords/verification and reports absent delivery honestly", async () => {
  const f = await fixture(); try {
    await f.local(); assert.equal((await f.call("/auth/login", { email: f.email, password: f.password })).status, 200);
    assert.equal((await f.call("/auth/login", { email: f.email, password: "incorrect" })).status, 401);
    f.state.user[0].emailVerifiedAt = null; assert.equal((await f.call("/auth/login", { email: f.email, password: f.password })).status, 403);
    f.state.user[0].emailVerifiedAt = new Date(); f.state.user[0].isSuspended = true; assert.equal((await f.call("/auth/login", { email: f.email, password: f.password })).status, 403);
    assert.equal((await f.call("/auth/request-verification", { email: f.email })).status, 503);
    assert.equal((await f.call("/auth/request-password-reset", { email: f.email })).status, 503);
    const invalid = await f.call("/auth/register", { name: "Synthetic name", email: "aasample123lag@student.fatima.edu.ph", password: f.password, termsAccepted:true, noticeVersion:f.config.registrationConsent!.version, programId: "BSCS", yearLevelId: "YEAR_1" });
    assert.equal(invalid.status, 422); assert.match(invalid.data.error, /four-digit Laguna format/); assert.match(invalid.data.error, /eligibility review/);
  } finally { await f.close(); }
});

const pilotEnv = {
  NODE_ENV: "development", HOST: "127.0.0.1", PORT: "5019",
  DATABASE_URL: "mysql://knoxite_oauth:synthetic-only@127.0.0.1:3319/knoxite_google_local_dev",
  PUBLIC_APP_URL: "http://localhost:5181", CORS_ORIGINS: "http://localhost:5181",
  KNOXITE_LOCAL_OAUTH_PILOT: "true",
  GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL: "aasample1234lag@student.fatima.edu.ph",
};

test("local password ADMIN stays separate from Google student, with role authorization, session expiry and logout", async () => {
  const adminId = randomUUID(), adminEmail = "admin-0123456789abcdef@admin.knoxite.test";
  const f = await fixture({ ...pilotEnv, SESSION_TIMEOUTS_ENABLED: "true", KNOXITE_LOCAL_PASSWORD_ADMIN_ID: adminId, KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: adminEmail });
  try {
    const student = await f.local();
    const studentLogin = await f.call("/auth/login", { email: f.email, password: f.password }); assert.equal(studentLogin.status, 200);
    const preserved = JSON.stringify({ student: f.state.user.find(u => u.id === student.id), sessions: f.state.authSession.filter(s => s.userId === student.id) });
    await f.local({ id: adminId, email: adminEmail, role: "ADMIN" });
    assert.equal((await f.call("/auth/login", { email: adminEmail, password: "wrong-synthetic-password" })).status, 401);
    const login = await f.call("/auth/login", { email: adminEmail, password: f.password }); assert.equal(login.status, 200);
    assert.equal(login.data.user.id, adminId); assert.equal(login.data.user.role, "ADMIN"); assert.notEqual(login.data.user.id, student.id);
    assert.equal(login.data.user.passwordHash, undefined);
    f.db.assessmentBank = { findMany: async () => [] };
    assert.equal((await f.call("/admin/assessments", undefined, login.data.token, "GET")).status, 200);
    assert.equal((await f.call("/admin/assessments", undefined, studentLogin.data.token, "GET")).status, 403);
    assert.equal((await f.call("/assessments/offerings/student-private", undefined, login.data.token, "GET")).status, 403);
    assert.equal((await f.call("/auth/google/link/challenge", {}, login.data.token)).status, 403);
    const timing = await f.call("/auth/session-status", undefined, login.data.token, "GET"); assert.equal(timing.status, 200);
    assert.ok(Math.abs(Date.parse(timing.data.idleExpiresAt) - Date.parse(timing.data.serverNow) - 15*60_000) < 3000);
    assert.ok(Math.abs(Date.parse(timing.data.absoluteExpiresAt) - Date.parse(timing.data.serverNow) - 4*3600_000) < 3000);
    const googleAdmin = await f.start(undefined, { email: adminEmail });
    assert.equal((await f.call("/auth/google/login", googleAdmin.body)).status, 403);
    assert.equal((await f.call("/auth/logout", undefined, login.data.token)).status, 200);
    assert.equal((await f.call("/admin/assessments", undefined, login.data.token, "GET")).status, 401);
    assert.equal(JSON.stringify({ student: f.state.user.find(u => u.id === student.id), sessions: f.state.authSession.filter(s => s.userId === student.id) }), preserved);
  } finally { await f.close(); }
});

test("password ADMIN exception does not admit a forged ID, student role or suspended account", async () => {
  const adminId = randomUUID(), adminEmail = "admin-0123456789abcdef@admin.knoxite.test";
  const f = await fixture({ ...pilotEnv, KNOXITE_LOCAL_PASSWORD_ADMIN_ID: adminId, KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL: adminEmail });
  try {
    const row = await f.local({ email: adminEmail, role: "ADMIN" });
    assert.equal((await f.call("/auth/login", { email: adminEmail, password: f.password })).status, 403);
    const saved = f.state.user.find(u => u.id === row.id)!;
    saved.id = adminId; saved.role = "USER";
    assert.equal((await f.call("/auth/login", { email: adminEmail, password: f.password })).status, 403);
    saved.role = "ADMIN"; saved.isSuspended = true;
    assert.equal((await f.call("/auth/login", { email: adminEmail, password: f.password })).status, 403);
  } finally { await f.close(); }
});
test("local pilot restricts signed identity and rechecks pending onboarding and active sessions", async () => {
  const f = await fixture(pilotEnv); try {
    const otherEmail = "bbsample1234lag@student.fatima.edu.ph";
    const denied = await f.start(undefined, { email: otherEmail });
    assert.equal((await f.call("/auth/google/login", denied.body)).status, 403);
    assert.equal((await f.call("/auth/google/login", { ...denied.body, email: f.email })).status, 422);
    assert.equal(f.state.user.length, 0);
    const input = await f.start(); const pending = await f.call("/auth/google/login", input.body); assert.equal(pending.status, 200);
    const body = { onboardingId: pending.data.onboardingId, browserProof: input.body!.browserProof, name: "Synthetic Pilot", programId: "BSCS", yearLevelId: "YEAR_1", termsAccepted: true, noticeVersion: f.config.registrationConsent!.version };
    f.config.localOAuthPilot!.email = otherEmail;
    assert.equal((await f.call("/auth/google/onboard", body)).status, 403); assert.equal(f.state.user.length, 0);
    f.config.localOAuthPilot!.email = f.email;
    const joined = await f.call("/auth/google/onboard", body); assert.equal(joined.status, 201);
    assert.equal((await f.call("/auth/google/onboard", body)).status, 422);
    assert.equal((await f.call("/auth/methods", undefined, joined.data.token, "GET")).status, 200);
    f.config.localOAuthPilot!.email = otherEmail;
    assert.equal((await f.call("/auth/methods", undefined, joined.data.token, "GET")).status, 403);
  } finally { await f.close(); }
});
test("local pilot preserves explicit linking and rejects password/registration bypasses", async () => {
  const f = await fixture(pilotEnv); try {
    await f.local();
    const login = await f.call("/auth/login", { email: f.email, password: f.password }); assert.equal(login.status, 200);
    const collision = await f.start(); assert.equal((await f.call("/auth/google/login", collision.body)).status, 409);
    const otherEmail = "bbsample1234lag@student.fatima.edu.ph";
    const other = await f.start(login.data.token, { email: otherEmail });
    assert.equal((await f.call("/auth/google/link", other.body, login.data.token)).status, 403); assert.equal(f.state.externalIdentity.length, 0);
    const link = await f.start(login.data.token); assert.equal((await f.call("/auth/google/link", link.body, login.data.token)).status, 200);
    const again = await f.start(); assert.equal((await f.call("/auth/google/login", again.body)).status, 200);
    await f.local({ email: otherEmail });
    assert.equal((await f.call("/auth/login", { email: otherEmail, password: f.password })).status, 403);
    assert.equal((await f.call("/auth/register", { name: "Unapproved synthetic", email: "ccsample1234lag@student.fatima.edu.ph", password: f.password, termsAccepted:true, noticeVersion:f.config.registrationConsent!.version, programId: "BSCS", yearLevelId: "YEAR_1" })).status, 403);
    assert.equal(f.state.user.length, 2);
    assert.equal((await f.call("/auth/logout", undefined, login.data.token)).status, 200);
    assert.equal((await f.call("/auth/methods", undefined, login.data.token, "GET")).status, 401);
  } finally { await f.close(); }
});

test("MOCKED Google unlink retains full revocation under the new session policy", async () => {
  // Synthetic in-memory verifier only; no real Google flag/config is enabled.
  const f = await fixture({ ...pilotEnv, SESSION_TIMEOUTS_ENABLED: "true" });
  try {
    await f.local();
    const login = await f.call("/auth/login", { email: f.email, password: f.password }); assert.equal(login.status, 200);
    const link = await f.start(login.data.token);
    assert.equal((await f.call("/auth/google/link", link.body, login.data.token)).status, 200);
    assert.equal((await f.call("/auth/google/link", { currentPassword: f.password }, login.data.token, "DELETE")).status, 200);
    assert.equal(f.state.externalIdentity.length, 0);
    assert.ok(f.state.authSession.every((s) => s.revokedAt));
    assert.equal((await f.call("/auth/methods", undefined, login.data.token, "GET")).status, 401);
  } finally { await f.close(); }
});

test("MOCKED multi-student Google onboarding retains terms/academics, USER role, unique identities and private authorization", async () => {
  const second="bbsecond5678lag@student.fatima.edu.ph";
  const f=await fixture({...pilotEnv,SESSION_TIMEOUTS_ENABLED:"true",GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON:JSON.stringify([second])});
  try{
    async function join(email:string,sub:string){
      const started=await f.start(undefined,{email,sub,role:"ADMIN"});
      const pending=await f.call("/auth/google/login",started.body);assert.equal(pending.status,200);
      const body={onboardingId:pending.data.onboardingId,browserProof:started.body!.browserProof,name:"Synthetic additional student",programId:"BSCS",yearLevelId:"YEAR_1",termsAccepted:true,noticeVersion:f.config.registrationConsent!.version};
      assert.equal((await f.call("/auth/google/onboard",{...body,termsAccepted:false})).status,422);
      assert.equal((await f.call("/auth/google/onboard",{...body,role:"ADMIN"})).status,422);
      assert.equal((await f.call("/auth/google/onboard",{...body,programId:"SHS"})).status,422);
      const result=await f.call("/auth/google/onboard",body);assert.equal(result.status,201);assert.equal(result.data.user.role,"USER");
      assert.equal((await f.call("/auth/google/onboard",body)).status,422);return result.data;
    }
    const first=await join(f.email,"synthetic-multi-first"),other=await join(second,"synthetic-multi-second");
    assert.notEqual(first.user.id,other.user.id);assert.equal(f.state.user.length,2);assert.equal(f.state.externalIdentity.length,2);
    for(const session of [first,other]){
      assert.equal((await f.call("/admin/assessments",undefined,session.token,"GET")).status,403);
      const timing=await f.call("/auth/session-status",undefined,session.token,"GET");assert.equal(timing.status,200);
      assert.ok(Math.abs(Date.parse(timing.data.idleExpiresAt)-Date.parse(timing.data.serverNow)-30*60_000)<3000);
      assert.ok(Math.abs(Date.parse(timing.data.absoluteExpiresAt)-Date.parse(timing.data.serverNow)-8*3600_000)<3000);
    }
    const duplicate=await f.start(undefined,{email:second,sub:"synthetic-multi-second"});
    const repeated=await f.call("/auth/google/login",duplicate.body);assert.equal(repeated.status,200);assert.equal(repeated.data.user.id,other.user.id);assert.equal(f.state.user.length,2);
    const cross=await f.start(undefined,{email:second,sub:"synthetic-multi-first"});assert.equal((await f.call("/auth/google/login",cross.body)).status,403);
    const collision=await f.start(undefined,{email:second,sub:"synthetic-multi-new-subject"});assert.equal((await f.call("/auth/google/login",collision.body)).status,409);
    f.db.userOfferedSkill={findFirst:async({where}:any)=>{assert.equal(where.userId,other.user.id);return null;}};
    assert.equal((await f.call("/assessments/offerings/private-first-student",undefined,other.token,"GET")).status,404);
    f.config.localOAuthPilot!.additionalEmails=[];
    assert.equal((await f.call("/auth/session-status",undefined,other.token,"GET")).status,403);
    assert.equal((await f.call("/auth/session-status",undefined,first.token,"GET")).status,200);
  }finally{await f.close();}
});

test("MOCKED additional Google identities still require signed-claim checks and allowlist membership at onboarding",async()=>{
  const second="bbsecond5678lag@student.fatima.edu.ph";
  const f=await fixture({...pilotEnv,GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON:JSON.stringify([second])});
  try{
    for(const change of [{email:"ccother0000lag@student.fatima.edu.ph"},{email:second,hd:"wrong.fixture.example"},{email:second,email_verified:false},{email:second,iss:"https://attacker.example"},{email:second,aud:"wrong-client"},{email:second,exp:1}]){
      const c=await f.start(undefined,change);assert.equal((await f.call("/auth/google/login",c.body)).status,403);
    }
    const input=await f.start(undefined,{email:second,sub:"synthetic-pending-second"});
    const pending=await f.call("/auth/google/login",input.body);assert.equal(pending.status,200);
    f.config.localOAuthPilot!.additionalEmails=[];
    assert.equal((await f.call("/auth/google/onboard",{onboardingId:pending.data.onboardingId,browserProof:input.body!.browserProof,name:"Synthetic pending",programId:"BSCS",yearLevelId:"YEAR_1",termsAccepted:true,noticeVersion:f.config.registrationConsent!.version})).status,403);
    assert.equal(f.state.user.length,0);
  }finally{await f.close();}
});
