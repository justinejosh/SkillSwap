import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";
import { presetSkills } from "../services/skillCatalog";

async function fixture() {
  const config=loadConfig({NODE_ENV:"development",JWT_SECRET:randomBytes(48).toString("hex"),INSTITUTION_EMAIL_DOMAINS:"fixture.test",CAMPUS_EMAIL_SUFFIX:"lag",GOOGLE_SIGN_IN_ENABLED:"false"});
  const now=new Date(),prior=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,10));
  const outcome=(status:string,date:Date,valid=true)=>({requesterId:"a",receiverId:"b",status,integrityVerified:valid,sessions:1,requesterSessions:1,receiverSessions:1,requesterApprovedAt:now,receiverApprovedAt:now,completedAt:status==="COMPLETED"?date:null,cancelledAt:status==="CANCELLED"?date:null,reviews:status==="COMPLETED"?[{reviewerId:"a",revieweeId:"b",rating:5,isValidated:true},{reviewerId:"b",revieweeId:"a",rating:4,isValidated:true}]:[]});
  const state:any={role:"USER",skillCalls:0,userSelect:null,userWhere:null,writes:0,skills:presetSkills.map((p,i)=>({id:`skill-${i}`,name:p.name,category:p.category,_count:{offeringLinks:i===0?0:2,wantedBy:i===0?3:0}})),outcomes:[outcome("COMPLETED",now),outcome("CANCELLED",now),outcome("COMPLETED",now,false),outcome("CANCELLED",prior)]};
  const db:any={
    authSession:{findFirst:async()=>({id:"s",user:{id:"a",email:"syntheticlag@fixture.test",role:state.role,isSuspended:false,emailVerifiedAt:now,tokenVersion:0}})},
    studentSuspension:{findMany:async()=>[]},
    user:{count:async()=>3,findMany:async(args:any)=>{state.userSelect=args.select;state.userWhere=args.where;return args.select.createdAt&&Object.keys(args.select).length===2?[{id:"a",createdAt:now},{id:"b",createdAt:now}]:[{id:"a",name:"Synthetic",email:"syntheticlag@fixture.test",role:"USER",isSuspended:false,createdAt:now}];}},
    swap:{findMany:async()=>state.outcomes},skill:{findMany:async()=>{state.skillCalls++;return state.skills;}},review:{count:async()=>2},
    assessmentBank:{findMany:async()=>[{id:"bank",skill:{name:"Synthetic skill"},versions:[{id:"v",items:[{options:[{text:"Private answer",isCorrect:true}]}]}]}]},
    assessmentVersion:{findUnique:async()=>({id:"draft",status:"DRAFT",validatedAt:null,validatedById:null}),updateMany:async()=>({count:0})},
    $queryRaw:async()=>[], $transaction:async(fn:any)=>fn(db),
  };
  const server=createApp(db,config).listen(0,"127.0.0.1");await once(server,"listening");const base=`http://127.0.0.1:${(server.address() as any).port}/api`;
  const token=jwt.sign({tokenVersion:0},config.jwtSecret,{subject:"a",jwtid:"s",issuer:"knoxite-api",audience:"knoxite",expiresIn:"5m"});
  return {state,async call(path:string,status:number,method="GET",body?:any){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});assert.equal(r.status,status,`${method} ${path}`);return r.json() as Promise<any>;},async close(){server.close();await once(server,"close");}};
}

test("administrator analytics and directory reject students before fetching private data",async()=>{
  const f=await fixture();try{for(const path of ["/analytics","/admin/users","/admin/assessments","/admin/academic-programs","/admin/reports","/admin/integrity/signals"])await f.call(path,403);assert.equal(f.state.skillCalls,0);assert.equal(f.state.userSelect,null);f.state.role="ADMIN";const banks=await f.call("/admin/assessments",200);assert.equal(banks[0].versions[0].items[0].options[0].isCorrect,true);}finally{await f.close();}
});
test("full preset analytics preserve zero, missing identity and existing association-count semantics",async()=>{
  const f=await fixture();try{f.state.role="ADMIN";let r=await f.call("/analytics",200);assert.equal(r.skillTrends.catalog.length,80);assert.equal(r.skillTrends.catalog[0].supply,0);assert.equal(r.skillTrends.catalog[0].demand,3);assert.equal(r.skillTrends.catalog[0].key,presetSkills[0].key);assert.match(r.reporting.supplyDemandUnit,/all account roles/);f.state.skills.shift();r=await f.call("/analytics",200);assert.equal(r.skillTrends.catalog[0].supply,null);assert.equal(r.skillTrends.catalog[0].availability,"NOT_INITIALIZED");assert.equal(r.skillTrends.topWanted.length,5);}finally{await f.close();}
});
test("monthly completion retains its formula while exposing denominators, exclusions and true zero",async()=>{
  const f=await fixture();try{f.state.role="ADMIN";const r=await f.call("/analytics",200),current=r.monthlyCompletion.at(-1),previous=r.monthlyCompletion.at(-2);assert.equal(current.completed,1);assert.equal(current.eligibleConcluded,2);assert.equal(current.eligibleCancelled,1);assert.equal(current.excludedConcluded,1);assert.equal(current.rate,50);assert.equal(previous.rate,0);assert.equal(previous.eligibleConcluded,1);assert.equal(r.monthlyCompletion[0].rate,null);assert.equal(r.monthlyCompletion[0].eligibleConcluded,0);assert.equal(r.systemHealth.totalUsers,2);}finally{await f.close();}
});
test("bounded directory query excludes credentials and preserves role/status/search filters",async()=>{
  const f=await fixture();try{f.state.role="ADMIN";const r=await f.call("/admin/users?page=1&pageSize=20&role=USER&status=ACTIVE&search=Synthetic",200);assert.equal(r.pageSize,20);assert.equal(f.state.userWhere.role,"USER");assert.equal(f.state.userWhere.isSuspended,false);assert.equal(f.state.userSelect.passwordHash,undefined);assert.equal(f.state.userSelect.tokenVersion,undefined);assert.ok(!JSON.stringify(r).includes("passwordHash"));for(const path of ["/admin/users?pageSize=51","/admin/users?page=0","/admin/users?role=SUPERUSER","/admin/users?status=DELETED","/admin/users?search=x&search=y"])await f.call(path,422);}finally{await f.close();}
});
test("unreviewed publication and retirement of a non-published version remain rejected",async()=>{
  const f=await fixture();try{f.state.role="USER";await f.call("/admin/assessments/versions/draft/publish",403,"POST",{});await f.call("/admin/assessments/versions/draft/retire",403,"POST",{});f.state.role="ADMIN";await f.call("/admin/assessments/versions/draft/publish",409,"POST",{});await f.call("/admin/assessments/versions/draft/retire",409,"POST",{});}finally{await f.close();}
});
