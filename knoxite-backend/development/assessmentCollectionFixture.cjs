// Operator test fixture only: live approved banks are read, all synthetic users,
// sessions, offerings and grades exist ONLY inside a rolled-back transaction.
const { once } = require("node:events"), { randomBytes } = require("node:crypto");
const bcrypt = require("../node_modules/bcrypt");
const admin = require("./oauthLocalAdmin.cjs"), collection = require("./assessmentCollection.cjs");
function check(ok) { if (!ok) throw new Error("Owned collection fixture preservation check failed"); }
async function openFixture() {
  const f = await admin.open(); let server, release, failed;
  const marker = new Error("INTENTIONAL_COLLECTION_FIXTURE_ROLLBACK");
  try {
    const plan = collection.read("manifest.private.json", f), journal = collection.read("progress.private.json", f);
    collection.verifySources(plan, collection.loadSources());
    await collection.verifyTargets(plan, collection.loadSources(), f.db);
    collection.verifyApproval(collection.read("review-approved.private.json", f), plan, journal);
    const published = await collection.banks(f.db);
    for (const e of plan.levels) {
      const bank = published.find(b => b.skillId === e.skillId && b.level === e.level), v = bank?.versions.find(v => v.id === journal.versions[e.key+":"+e.level].versionId);
      check(v?.status === "PUBLISHED" && v.validatedAt && collection.fingerprint(collection.versionPayload(bank,v)) === e.payloadHash);
    }
    const bankHash = collection.hash(published);
    const gate = new Promise(r => { release = r; }); let resolveReady, rejectReady;
    const ready = new Promise((r,j) => { resolveReady=r; rejectReady=j; });
    const finished = f.db.$transaction(async tx => {
      let db; db = new Proxy(tx, { get(target,prop) { if (prop === "$transaction") return async fn => fn(db); const v=target[prop]; return typeof v === "function" ? v.bind(target) : v; } });
      resolveReady(db); await gate; throw marker;
    }, { isolationLevel: "Serializable", timeout: 180000 }).catch(e => { if(e!==marker) { failed=e; rejectReady(e); } });
    const db = await ready;
    try {
      const password = randomBytes(32).toString("base64url");
      const student = await db.user.create({ data: { name: "UNCOMMITTED COLLECTION TEST STUDENT", email: randomBytes(8).toString("hex")+"lag@collection.knoxite.test", emailVerifiedAt: new Date(), passwordHash: await bcrypt.hash(password,4) } });
      const config = { ...f.config, institutionDomains: ["collection.knoxite.test"], google: { ...f.config.google, enabled: false }, localOAuthPilot: { email: student.email } };
      const mailer = Object.assign(async () => { throw new Error("No fixture mail"); }, { isConfigured: () => false });
      server = require("../dist/app.js").createApp(db,config,mailer).listen(0,"127.0.0.1"); await once(server,"listening");
      const api = `http://127.0.0.1:${server.address().port}/api`; let token;
      const call = async (method,route,status=200,body) => {
        const r=await fetch(api+route,{method,headers:{...(token?{Authorization:"Bearer "+token}:{}),...(body===undefined?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
        if(r.status!==status) throw new Error(`Synthetic collection fixture HTTP ${r.status}; expected ${status}`);return r.json();
      };
      const session=await call("POST","/auth/login",200,{email:student.email,password});token=session.token;
      const offerings=[];
      for(const key of collection.KEYS) {
        const offer=await call("POST","/profile/skills/offer",201,{presetKey:key}); offerings.push({key,id:offer.offering.id,skillId:offer.skill.id});
      }
      async function correct(attemptId, n=100) {
        const items=await db.assessmentAttemptItem.findMany({where:{attemptId},include:{item:{include:{options:true}}},orderBy:{position:"asc"}});
        return items.map((q,i)=>({questionId:q.id,optionId:q.item.options.find(o=>o.isCorrect===(i<n)).id}));
      }
      return { db,api,call,token,studentId:student.id,offerings,correct,
        async close() {
          try { await new Promise((r,j)=>server.close(e=>e?j(e):r())); } finally { release();await finished; }
          try { check(!failed);check(await f.db.user.count({where:{id:student.id}})===0);check(await f.db.authSession.count({where:{userId:student.id}})===0);check(await f.db.userOfferedSkill.count({where:{userId:student.id}})===0);check(collection.hash(await collection.banks(f.db))===bankHash); }
          finally { await f.db.$disconnect(); }
        } };
    } catch(e) { if(server?.listening)await new Promise(r=>server.close(r));release();await finished;throw e; }
  } catch(e) { await f.db.$disconnect();throw e; }
}
module.exports={openFixture};
