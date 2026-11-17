// MOCKED Google claims + actual owned MySQL. All synthetic identities, profiles,
// sessions and assessment work are uncommitted and rolled back. No real login.
const test=require("node:test"),assert=require("node:assert/strict");
const {randomUUID,randomBytes,createHash}=require("node:crypto"),{once}=require("node:events");
const bcrypt=require("../node_modules/bcrypt"),admin=require("./oauthLocalAdmin.cjs");
test("owned OAuth MySQL rollback: two approved mock Google students remain distinct and private",async t=>{
  const f=await admin.open(),marker=new Error("ROLLBACK_MULTI_STUDENT_FIXTURE"),ids=[];
  const bankBefore=await f.db.assessmentVersion.findMany({orderBy:{id:"asc"}});
  try{
    try{await f.db.$transaction(async tx=>{
      let db;db=new Proxy(tx,{get(target,prop){if(prop==="$transaction")return async fn=>fn(db);const value=target[prop];return typeof value==="function"?value.bind(target):value;}});
      const first=randomBytes(8).toString("hex")+"lag@multi-pilot.knoxite.test",second=randomBytes(8).toString("hex")+"lag@multi-pilot.knoxite.test";
      const password=randomBytes(32).toString("base64url");
      const adminUser=await db.user.create({data:{name:"UNCOMMITTED MULTI ADMIN",email:"admin-"+randomBytes(8).toString("hex")+"@admin.knoxite.test",role:"ADMIN",emailVerifiedAt:new Date(),passwordHash:await bcrypt.hash(password,4)}});ids.push(adminUser.id);
      const config={...f.config,jwtSecret:randomBytes(48).toString("base64url"),institutionDomains:["multi-pilot.knoxite.test"],
        google:{...f.config.google,enabled:true,clientId:"synthetic.apps.googleusercontent.com",hostedDomains:["workspace.multi-pilot.knoxite.test"]},
        localOAuthPilot:{email:first,additionalEmails:[second],passwordAdmin:{id:adminUser.id,email:adminUser.email}}};
      const credentials=new Map();
      const mailer=Object.assign(async()=>{throw new Error("No fixture delivery")},{isConfigured:()=>false});
      const verifier=async credential=>{assert.ok(credentials.has(credential),"Unknown mocked credential");return credentials.get(credential);};
      const server=require("../dist/app.js").createApp(db,config,mailer,undefined,verifier).listen(0,"127.0.0.1");await once(server,"listening");
      const api=`http://127.0.0.1:${server.address().port}/api`;
      const call=async(method,route,status,body,token)=>{
        const response=await fetch(api+route,{method,headers:{Origin:"http://localhost:5181",...(token?{Authorization:"Bearer "+token}:{}),...(body===undefined?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
        assert.equal(response.status,status,"Unexpected synthetic multi-student HTTP status");return response.json();
      };
      const start=async(email,subject,changes={})=>{
        const browserProof=randomBytes(32).toString("base64url");
        const challenge=await call("POST","/auth/google/challenge",200,{browserProofHash:createHash("sha256").update(browserProof).digest("hex")});
        const credential=randomUUID();credentials.set(credential,{iss:"https://accounts.google.com",aud:config.google.clientId,sub:subject,email,email_verified:true,hd:config.google.hostedDomains[0],iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,nonce:challenge.nonce,...changes});
        return{challengeId:challenge.challengeId,browserProof,credential};
      };
      const program=await db.program.findFirst({where:{code:"BSCS",isActive:true},include:{yearLevels:{where:{isActive:true},orderBy:{order:"asc"}}}});
      assert.ok(program?.yearLevels.length);let a,b,operator;
      const bodyFor=(pending,input)=>({onboardingId:pending.onboardingId,browserProof:input.browserProof,name:"UNCOMMITTED GOOGLE STUDENT",programId:program.id,yearLevelId:program.yearLevels[0].id,termsAccepted:true});
      try{
        await t.test("approved accounts must onboard with terms and academics as USER; unapproved identities cannot join",async()=>{
          const initial=await start(first,"fixture-subject-a-"+randomUUID()),pending=await call("POST","/auth/google/login",200,initial);
          await call("POST","/auth/google/onboard",422,{...bodyFor(pending,initial),termsAccepted:false});
          a=await call("POST","/auth/google/onboard",201,bodyFor(pending,initial));ids.push(a.user.id);
          await call("POST","/auth/google/onboard",422,bodyFor(pending,initial));
          const input=await start(second,"fixture-subject-b-"+randomUUID()),p=await call("POST","/auth/google/login",200,input);
          config.localOAuthPilot.additionalEmails=[];await call("POST","/auth/google/onboard",403,bodyFor(p,input));config.localOAuthPilot.additionalEmails=[second];
          await call("POST","/auth/google/onboard",422,{...bodyFor(p,input),role:"ADMIN"});
          await call("POST","/auth/google/onboard",422,{...bodyFor(p,input),programId:"SHS"});
          b=await call("POST","/auth/google/onboard",201,bodyFor(p,input));ids.push(b.user.id);
          assert.notEqual(a.user.id,b.user.id);assert.equal(a.user.role,"USER");assert.equal(b.user.role,"USER");
          assert.equal((await db.user.findUnique({where:{id:b.user.id}})).passwordHash,null);
          const denied=await start("outsiderlag@multi-pilot.knoxite.test","fixture-outsider");await call("POST","/auth/google/login",403,denied);
        });
        await t.test("provider subjects/email collisions cannot duplicate or merge users; wrong hosted domains rejected",async()=>{
          const ia=await db.externalIdentity.findFirst({where:{userId:a.user.id}}),ib=await db.externalIdentity.findFirst({where:{userId:b.user.id}});
          const again=await call("POST","/auth/google/login",200,await start(second,ib.subject));assert.equal(again.user.id,b.user.id);
          await call("POST","/auth/google/login",403,await start(second,ia.subject));
          await call("POST","/auth/google/login",409,await start(second,"fixture-different-subject"));
          await call("POST","/auth/google/login",403,await start(second,ib.subject,{hd:"wrong.workspace.knoxite.test"}));
          assert.equal(await db.user.count({where:{email:{in:[first,second]}}}),2);assert.equal(await db.externalIdentity.count({where:{userId:{in:[a.user.id,b.user.id]}}}),2);
        });
        await t.test("students cannot read private assessments, overwrite another profile or enter administrator features",async()=>{
          operator=await call("POST","/auth/login",200,{email:adminUser.email,password});
          await call("GET","/admin/assessments",200,undefined,operator.token);
          for(const user of[a,b])await call("GET","/admin/assessments",403,undefined,user.token);
          const offer=await call("POST","/profile/skills/offer",201,{presetKey:"python-programming-fundamentals"},a.token);
          await call("GET",`/assessments/offerings/${offer.offering.id}`,404,undefined,b.token);
          const attempt=await call("POST",`/assessments/offerings/${offer.offering.id}/attempts`,201,{level:"BASIC"},a.token);
          await call("GET",`/assessments/attempts/${attempt.id}`,404,undefined,b.token);
          await call("POST",`/assessments/attempts/${attempt.id}/submit`,404,{answers:[]},b.token);
          await call("GET",`/assessments/offerings/${offer.offering.id}`,403,undefined,operator.token);
          await call("PUT","/profile/update",422,{userId:a.user.id,name:"Not authorized"},b.token);
          const own=await call("GET","/profile",200,undefined,b.token);assert.equal(own.id,b.user.id);assert.equal(own.email,second);
          const publicProfile=await call("GET",`/users/${a.user.id}/profile`,200,undefined,b.token);
          for(const field of["email","passwordHash","token","externalIdentities","authSessions"])assert.equal(publicProfile[field],undefined);
        });
        await t.test("student/admin timeouts, allowlist removal, suspension and logout stay enforced",async()=>{
          for(const user of[a,b]){
            const timing=await call("GET","/auth/session-status",200,undefined,user.token);
            assert.ok(Math.abs(Date.parse(timing.idleExpiresAt)-Date.parse(timing.serverNow)-30*60_000)<10000);
            assert.ok(Math.abs(Date.parse(timing.absoluteExpiresAt)-Date.parse(timing.serverNow)-8*3600_000)<10000);
          }
          const timing=await call("GET","/auth/session-status",200,undefined,operator.token);
          assert.ok(Math.abs(Date.parse(timing.idleExpiresAt)-Date.parse(timing.serverNow)-15*60_000)<10000);
          assert.ok(Math.abs(Date.parse(timing.absoluteExpiresAt)-Date.parse(timing.serverNow)-4*3600_000)<10000);
          config.localOAuthPilot.additionalEmails=[];await call("GET","/auth/session-status",403,undefined,b.token);await call("GET","/auth/session-status",200,undefined,a.token);config.localOAuthPilot.additionalEmails=[second];
          await db.user.update({where:{id:b.user.id},data:{isSuspended:true}});await call("GET","/auth/session-status",403,undefined,b.token);await db.user.update({where:{id:b.user.id},data:{isSuspended:false}});
          await call("POST","/auth/logout",200,{},b.token);await call("GET","/auth/session-status",401,undefined,b.token);
          await call("GET","/auth/session-status",200,undefined,a.token);
        });
      }finally{await new Promise((r,j)=>server.close(e=>e?j(e):r()));}
      throw marker;
    },{isolationLevel:"Serializable",timeout:90000});}catch(e){if(e!==marker)throw e;}
    assert.equal(await f.db.user.count({where:{id:{in:ids}}}),0);
    assert.equal(await f.db.externalIdentity.count({where:{userId:{in:ids}}}),0);
    assert.equal(await f.db.authSession.count({where:{userId:{in:ids}}}),0);
    assert.deepEqual(await f.db.assessmentVersion.findMany({orderBy:{id:"asc"}}),bankBefore);
  }finally{await f.db.$disconnect();}
});
