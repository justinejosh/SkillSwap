import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { parseScheduledAt, assertScheduleTime } from "../lib/scheduling";
import { errorHandler, HttpError } from "../lib/http";
import { sessionsRouter } from "../routes/sessions";

test("scheduling parses equivalent signed timezone offsets into the same instant", () => {
  assert.equal(parseScheduledAt("2030-01-02T10:30:00+08:00").toISOString(), "2030-01-02T02:30:00.000Z");
  assert.equal(parseScheduledAt("2030-01-01T21:30:00-05:00").toISOString(), "2030-01-02T02:30:00.000Z");
  assert.equal(parseScheduledAt("2028-02-29T12:00Z").getUTCDate(), 29);
});
for (const raw of ["garbage", "2030-01-02", "2030-01-02T10:30", "2030-02-30T10:30Z", "2027-02-29T10:30Z", "2030-13-01T10:30Z", "2030-01-02T24:00Z", "2030-01-02T10:61Z", "2030-01-02T10:00+25:00"]) {
  test(`scheduling rejects malformed or ambiguous timestamp ${raw}`, () => {
    assert.throws(() => parseScheduledAt(raw), (e: unknown) => e instanceof HttpError && e.status === 422);
  });
}
test("future, final-approval and one-year boundaries are strictly enforced without changing acknowledgement policy", () => {
  const now=Date.parse("2030-01-01T00:00Z"), first=new Date(now-1000), final=new Date(now+60000);
  for(const time of [now-1,now,final.getTime()-1,final.getTime(),now+367*86400_000])
    assert.throws(()=>assertScheduleTime(new Date(time),first,final,now));
  assert.doesNotThrow(()=>assertScheduleTime(new Date(final.getTime()+1),first,final,now));
  assert.throws(()=>assertScheduleTime(new Date(now+60000),null,first,now), (e:unknown)=>e instanceof HttpError&&e.status===409);
});

test("scheduling API rejects direct bypasses, closed exchanges and locked sessions; preserves historical reads", async () => {
  let caller="a", writes=0, locked=0;
  const now=Date.now(), future=new Date(now+3600_000).toISOString();
  const swap:any={id:"swap",requesterId:"a",receiverId:"b",status:"CONFIRMED",integrityVerified:true,sessions:2,requesterApprovedAt:new Date(now-60000),receiverApprovedAt:new Date(now-30000)};
  const historical={id:"old",swapId:"swap",sessionNumber:1,scheduledAt:new Date("2020-01-01T00:00Z"),meetingLink:null,swap:{...swap,requester:{id:"a",name:"Synthetic A"},receiver:{id:"b",name:"Synthetic B"},sessionLogs:[]}};
  const db:any={$transaction:async(fn:any)=>fn(db),$queryRaw:async()=>[],swap:{findUnique:async()=>swap},sessionConfirmation:{count:async()=>locked},swapSession:{upsert:async(args:any)=>{writes++;return args.create;},findMany:async()=>[historical]}};
  const app=express();app.use(express.json());
  app.use((req,_res,next)=>{req.userId=caller;req.userRole="USER";next();}); // Test fixture only.
  app.use(sessionsRouter(db as PrismaClient));app.use(errorHandler);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/`;
  const call=async(body:any,status:number)=>{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({swapId:"swap",sessionNumber:1,scheduledAt:future,...body})});assert.equal(r.status,status);return r.json();};
  try {
    const before=JSON.stringify(swap);
    for(const date of [new Date(now-3600_000).toISOString(),new Date(now).toISOString(),"invalid","2030-02-30T10:00Z","2030-01-01T10:00"])
      await call({scheduledAt:date},422);
    caller="outsider";await call({},403);caller="a";
    for(const status of ["COMPLETED","CANCELLED","PENDING_AGREEMENT"]){swap.status=status;await call({},409);}swap.status="CONFIRMED";
    locked=1;await call({},409);locked=0;
    await call({sessionNumber:0},422);await call({sessionNumber:3},409);
    const original=swap.receiverApprovedAt;swap.receiverApprovedAt=new Date(now+7200_000);await call({},422);swap.receiverApprovedAt=null;await call({},409);swap.receiverApprovedAt=original;
    assert.equal(writes,0);assert.equal(JSON.stringify(swap),before);
    await call({},201);assert.equal(writes,1);assert.equal(JSON.stringify(swap),before);
    const read=await fetch(url);assert.equal(read.status,200);const rows:any=await read.json();assert.equal(rows[0].scheduledAt,"2020-01-01T00:00:00.000Z");
  } finally {server.close();await once(server,"close");}
});
