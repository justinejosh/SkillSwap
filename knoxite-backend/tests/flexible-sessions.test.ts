import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { swapRouters } from "../routes/swaps";
import { sessionsRouter } from "../routes/sessions";
import { errorHandler } from "../lib/http";
import { loadConfig } from "../lib/config";
import { scheduledSessionEnd, assertScheduledSessionEnded } from "../lib/scheduling";
import { confirmationEligibility } from "../services/sessionConfirmationEligibility";
import { assertRuntimeSchema } from "../services/schemaReadiness";
import { inspectFreshReleaseTarget } from "../scripts/release-preflight";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const start = new Date("2030-01-01T01:00:00Z");
for (const minutes of [15, 35, 90]) test(`flexible ${minutes}-minute session uses its exact scheduled end`, () => {
  const end = new Date(start.getTime()+minutes*60000);
  assert.throws(()=>assertScheduledSessionEnded(start,null,end.getTime()-1,end));
  assert.doesNotThrow(()=>assertScheduledSessionEnded(start,null,end.getTime(),end));
  assert.equal(scheduledSessionEnd(start,null,end),end);
});
test("missing/invalid end fails closed; preserved historical duration remains authoritative", () => {
  assert.throws(()=>scheduledSessionEnd(start,null));
  for(const end of [new Date(NaN),start,new Date(start.getTime()-1)])assert.throws(()=>scheduledSessionEnd(start,null,end));
  assert.equal(scheduledSessionEnd(start,2).getTime(),start.getTime()+7200000);
  assert.throws(()=>scheduledSessionEnd(start,2,new Date(start.getTime()+1800000)));
});

test("real route lifecycle: total-only bilateral agreement, varied schedules, independent confirmations and reviews", async t => {
  // In-memory ORM fixture only. Real routers/permissions/validators; no database or accounts.
  const now=Date.now();let caller="a",role:"USER"|"ADMIN"="USER";
  const swap:any={id:"synthetic-flex",requesterId:"a",receiverId:"b",status:"PENDING_AGREEMENT",integrityVerified:true,agreementVersion:1,sessions:4,duration:null,requesterSessions:0,receiverSessions:0,requesterApprovedAt:null,receiverApprovedAt:null,requester:{id:"a"},receiver:{id:"b"}};
  const schedules=new Map<number,any>(),logs:any[]=[],reviews:any[]=[];
  const db:any={
    $queryRaw:async()=>[], $transaction:async(fn:any)=>fn(db),
    swap:{findUnique:async()=>swap,update:async({data}:any)=>{for(const [k,v] of Object.entries(data))swap[k]=typeof v==="object"&&v!==null&&"increment" in v?swap[k]+(v as any).increment:v;return swap;}},
    swapSession:{findUnique:async({where}:any)=>schedules.get(where.swapId_sessionNumber.sessionNumber)||null,upsert:async({create,update}:any)=>{const prior=schedules.get(create.sessionNumber);const row=prior?{...prior,...update}:{id:`schedule-${create.sessionNumber}`,...create};schedules.set(create.sessionNumber,row);return row;}},
    sessionConfirmation:{findMany:async()=>logs,count:async({where}:any)=>logs.filter(l=>l.swapId===where.swapId&&l.sessionNumber===where.sessionNumber).length,findUnique:async({where}:any)=>logs.find(l=>Object.entries(where.swapId_participantId_sessionNumber).every(([k,v])=>l[k]===v))||null,create:async({data}:any)=>{const row={...data,confirmedAt:new Date()};logs.push(row);return row;}},
    review:{findMany:async()=>reviews,findUnique:async({where}:any)=>reviews.find(r=>r.reviewerId===where.swapId_reviewerId.reviewerId)||null,create:async({data}:any)=>{const row={id:`review-${reviews.length}`,...data};reviews.push(row);return row;}},
  };
  const app=express();app.use(express.json());app.use((req,_res,next)=>{req.userId=caller;req.userRole=role;next();});
  const routers=swapRouters(db,loadConfig({JWT_SECRET:"synthetic-flexible-test-key-".repeat(3)}));
  app.use("/swaps",routers.swaps);app.use("/sessions",sessionsRouter(db));app.use("/reviews",routers.reputation);app.use(errorHandler);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  async function call(path:string,status:number,body?:any){if(path.endsWith("/log-session")&&body&&!Object.hasOwn(body,"completedAt"))body={...body,completedAt:new Date().toISOString()};const response=await fetch(base+path,{method:body===undefined?"GET":"POST",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});assert.equal(response.status,status,`${path} ${await response.clone().text()}`);return response.json() as Promise<any>;}
  const approve=(sessions=5,version=swap.agreementVersion)=>call(`/swaps/${swap.id}/agreement`,200,{sessions,agreementVersion:version,agreedToTerms:true});
  try {
    await call(`/swaps/${swap.id}/agreement`,422,{sessions:0,agreementVersion:1,agreedToTerms:true});
    await approve();assert.equal(swap.duration,null);assert.ok(swap.requesterApprovedAt);
    caller="b";await approve(6);assert.equal(swap.requesterApprovedAt,null);
    await call(`/swaps/${swap.id}/agreement`,409,{sessions:5,agreementVersion:1,agreedToTerms:true});
    caller="a";await approve();assert.equal(swap.receiverApprovedAt,null);
    caller="b";await approve();assert.equal(swap.status,"CONFIRMED");
    await call(`/swaps/${swap.id}/agreement`,409,{sessions:6,agreementVersion:swap.agreementVersion,agreedToTerms:true});
    caller="outsider";await call(`/swaps/${swap.id}/log-session`,403,{sessionNumber:1});caller="a";
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:1,completedAt:undefined});
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:1,completedAt:"2000-01-01T00:00:00.000Z"});
    role="ADMIN";await call(`/swaps/${swap.id}/log-session`,403,{sessionNumber:1});role="USER";
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
    const starts=Array.from({length:5},(_,i)=>new Date(now+(i+1)*3600000));
    for(let i=1;i<5;i++){
      const body={swapId:swap.id,sessionNumber:i+1,scheduledAt:starts[i].toISOString()};
      await call("/sessions",422,body);
      await call("/sessions",422,{...body,endsAt:body.scheduledAt});
      await call("/sessions",201,{...body,endsAt:new Date(starts[i].getTime()+[15,35,60,25,45][i]*60000).toISOString()});
    }
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:0});
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:2});
    await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:1,completedAt:new Date(Date.now()+60000).toISOString()});
    t.mock.timers.enable({apis:["Date"],now});
    for(let n=1;n<=5;n++){
      const end=now+60000+n*1000;
      t.mock.timers.setTime(end-1);caller="a";await call(`/swaps/${swap.id}/log-session`,422,{sessionNumber:n,completedAt:new Date(end+60000).toISOString()});
      t.mock.timers.setTime(end);assert.equal(logs.length,(n-1)*2); // elapsed time never creates confirmations
      await call(`/swaps/${swap.id}/log-session`,200,{sessionNumber:n});await call(`/swaps/${swap.id}/log-session`,200,{sessionNumber:n});
      assert.equal(logs.length,(n-1)*2+1);
      await call("/sessions",409,{swapId:swap.id,sessionNumber:n,scheduledAt:new Date(end+60000).toISOString(),endsAt:new Date(end+120000).toISOString()});
      if(n===5)await call("/reviews/submit",409,{swapId:swap.id,rating:4});
      caller="b";await call(`/swaps/${swap.id}/log-session`,200,{sessionNumber:n});
      if(n===3){assert.equal(swap.requesterSessions/5*100,60);assert.equal(swap.receiverSessions/5*100,60);}
      assert.equal(swap.status,"CONFIRMED");
    }
    caller="a";await call("/reviews/submit",200,{swapId:swap.id,rating:4});assert.equal(swap.status,"CONFIRMED");
    await call("/reviews/submit",200,{swapId:swap.id,rating:4});assert.equal(reviews.length,1);
    caller="b";await call("/reviews/submit",200,{swapId:swap.id,rating:5});assert.equal(swap.status,"COMPLETED");
    await call(`/swaps/${swap.id}/agreement`,409,{sessions:5,agreementVersion:swap.agreementVersion,agreedToTerms:true});
    await call(`/swaps/${swap.id}/log-session`,409,{sessionNumber:6});
    assert.equal(logs.length,10);assert.ok(logs.every(l=>l.actualCompletedAt instanceof Date));assert.equal(schedules.has(1),false);assert.equal(reviews.length,2);assert.equal(swap.duration,null);
    assert.equal((await call(`/swaps/${swap.id}`,200)).status,"COMPLETED");
    const historical={...swap,status:"CONFIRMED",duration:2,requesterSessions:0,receiverSessions:0};
    const old={swapId:swap.id,sessionNumber:1,scheduledAt:starts[0],endsAt:null};
    assert.equal(confirmationEligibility(historical,"a",1,old,starts[0].getTime()+7200000).eligible,true);
  } finally {t.mock.timers.reset();server.close();await once(server,"close");}
});

test("startup fails closed without the reviewed flexible-session columns",async()=>{
  const config=loadConfig({JWT_SECRET:"synthetic-schema-test-key-".repeat(3)});
  await assert.rejects(()=>assertRuntimeSchema({$queryRaw:async()=>[{count:1n}]} as any,config),/Reviewed migration/);
  await assert.doesNotReject(()=>assertRuntimeSchema({$queryRaw:async(parts:any)=>[{count:String(parts).includes("actualCompletedAt")?1n:2n}]} as any,config));
});

test("startup fails closed if actual-completion storage is missing even with flexible schedules",async()=>{
  const config=loadConfig({JWT_SECRET:"synthetic-schema-test-key-".repeat(3)});
  await assert.rejects(()=>assertRuntimeSchema({$queryRaw:async(parts:any)=>[{count:String(parts).includes("actualCompletedAt")?0n:2n}]} as any,config),/Actual session completion schema/);
});

test("actual completion migration adds only a nullable field without rewriting audit history",()=>{
  const sql=readFileSync(resolve(__dirname,"../../prisma/release/migrations/20261122000000_actual_session_completion/migration.sql"),"utf8").replace(/^--.*$/gm,"").trim();
  assert.equal(sql,"ALTER TABLE `SessionConfirmation` ADD COLUMN `actualCompletedAt` DATETIME(3) NULL;");
  assert.doesNotMatch(sql,/UPDATE|DELETE|DROP|TRUNCATE/);
});

test("release preflight accepts only checksum-verified known migration prefixes",async()=>{
  const names=["20261117000000_current_release","20261121000000_flexible_session_ranges","20261122000000_actual_session_completion"];
  const rows=names.map(migration_name=>({migration_name,checksum:createHash("sha256").update(readFileSync(resolve(__dirname,`../../prisma/release/migrations/${migration_name}/migration.sql`))).digest("hex"),finished_at:new Date(),rolled_back_at:null}));
  let history:any[]=rows;
  const db:any={$queryRaw:async(parts:TemplateStringsArray)=>String(parts).includes("information_schema.tables")?[{name:"_prisma_migrations"}]:history};
  assert.equal(await inspectFreshReleaseTarget(db),"RELEASE_HISTORY");
  history=rows.slice(0,1);assert.equal(await inspectFreshReleaseTarget(db),"RELEASE_HISTORY");
  for(const bad of [[rows[1]],[{...rows[0],checksum:"forged"}],[{...rows[0],rolled_back_at:new Date()}],[...rows,rows[1]]]){history=bad;await assert.rejects(()=>inspectFreshReleaseTarget(db));}
});

test("CI disposable preflight accepts the complete release history and rejects tampering before running a command",async()=>{
  const names=["20261117000000_current_release","20261121000000_flexible_session_ranges","20261122000000_actual_session_completion"];
  const rows=names.map(migration_name=>({migration_name,checksum:createHash("sha256").update(readFileSync(resolve(__dirname,`../../prisma/release/migrations/${migration_name}/migration.sql`))).digest("hex"),finished_at:new Date(),rolled_back_at:null}));
  let history=rows, commands=0;
  const m={container:"synthetic-ci",containerId:"synthetic-id",owner:"synthetic-owner",port:"39999",url:"mysql://synthetic:unused@127.0.0.1:39999/knoxite_four_abcdef_test",legacyUrl:"mysql://synthetic:unused@127.0.0.1:39999/knoxite_four_abcdef_legacy_test",appUrl:"mysql://synthetic:unused@127.0.0.1:39999/knoxite_four_abcdef_test"};
  const module={exports:{} as any};
  runInNewContext(readFileSync(resolve(__dirname,"../../development/fourBlockersEnvironment.cjs"),"utf8"),{
    module,URL,__dirname:resolve(__dirname,"../../development"),process:{env:{},execPath:process.execPath},
    require:(name:string)=>{
      if(name==="../node_modules/@prisma/client")return {PrismaClient:class{
        async $queryRaw(parts:TemplateStringsArray){return String(parts).includes("information_schema.tables")?[{name:"_prisma_migrations"}]:history;}
        async $disconnect(){}
      }};
      if(name==="node:child_process")return {
        execFileSync:(command:string,args:string[])=>{
          if(command==="git"&&args.join(" ")==="branch --show-current")return "dev-justine";
          assert.equal(command,"docker");assert.deepEqual(Array.from(args),["inspect",m.container]);
          return JSON.stringify([{Id:m.containerId,Name:`/${m.container}`,Config:{Image:"mysql:8.4",Labels:{"knoxite.four-blockers":m.owner}},NetworkSettings:{Ports:{"3306/tcp":[{HostIp:"127.0.0.1",HostPort:m.port}]}},Mounts:[{Type:"tmpfs",Destination:"/var/lib/mysql"}]}]);
        },
        spawnSync:(_command:string,args:string[])=>{assert.equal(args[1],"migrate");assert.equal(args[2],"deploy");commands++;return {status:0,stdout:""};},
      };
      return require(name);
    },
  });
  await module.exports.fresh(m);assert.equal(commands,1);
  history=rows.slice(0,1);await module.exports.fresh(m);assert.equal(commands,2);
  history=[...rows.slice(0,2),{...rows[2],checksum:"tampered"}];
  await assert.rejects(()=>module.exports.fresh(m),/Unknown migration history/);assert.equal(commands,2);
});
