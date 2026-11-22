import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import { reportsRouter } from "../routes/reports";
import { errorHandler } from "../lib/http";

test("reports remain authenticated and reject unconfigured image payloads, public URLs and self reports",async()=>{
  let userId:string|undefined="reporter";const saved:any[]=[];
  const db:any={user:{findFirst:async({where}:any)=>({id:where.id.toLowerCase()})},userReport:{create:async({data}:any)=>{saved.push(data);return{id:"report",status:"PENDING"};},findMany:async({where}:any)=>saved.filter(r=>r.reporterId===where.reporterId)}};
  const app=express();app.use(express.json());app.use((req,_res,next)=>{req.userId=userId;req.userRole="USER";next();});app.use(reportsRouter(db));app.use(errorHandler);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");const url=`http://127.0.0.1:${(server.address() as any).port}/`;
  const post=(extra:any={})=>fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({targetId:"peer",reason:"OTHER",description:"Synthetic private report",...extra})});
  try{
    userId=undefined;assert.equal((await post()).status,401);userId="reporter";
    for(const extra of [{evidenceUrl:"https://public.invalid/image.png"},{evidenceKey:"other-report-key"},{image:"data:image/png;base64,forged"},{evidenceMimeType:"image/png"}])assert.equal((await post(extra)).status,422);
    assert.equal((await post({targetId:"REPORTER"})).status,422);assert.equal(saved.length,0);
    assert.equal((await post()).status,201);assert.equal(saved.length,1);assert.equal(saved[0].reporterId,"reporter");assert.equal(Object.hasOwn(saved[0],"image"),false);
    userId="other";assert.deepEqual(await(await fetch(url)).json(),[]);
  }finally{server.close();await once(server,"close");}
});
