import {test} from "node:test";
import assert from "node:assert/strict";
import {actualCompletionTime, confirmationEligibility} from "../services/sessionConfirmationEligibility";
const start=new Date("2030-01-01T01:00:00Z"),end=start.getTime()+3600000;
const swap={id:"synthetic-swap",status:"CONFIRMED",integrityVerified:true,agreementVersion:2,requesterId:"a",receiverId:"b",requesterSessions:0,receiverSessions:0,requesterApprovedAt:new Date("2030-01-01T00:00:00Z"),receiverApprovedAt:new Date("2030-01-01T00:30:00Z"),sessions:2,duration:1};
const schedule={swapId:swap.id,sessionNumber:1,scheduledAt:start};
test("actual participation can be confirmed before planned times; schedules remain reference only",()=>{
  for(const time of [start.getTime()-1,start.getTime(),end-1])assert.equal(confirmationEligibility(swap,"a",1,schedule,time).eligible,true);
  assert.equal(confirmationEligibility(swap,"a",1,schedule,end).eligible,true);
  assert.equal(confirmationEligibility(swap,"b",1,schedule,end).eligible,true);
  assert.equal(confirmationEligibility(swap,"a",1,schedule,end).scheduledEndAt,new Date(end).toISOString());
});
test("optional planning records cannot fabricate participation or block actual logging",()=>{
  for(const row of [null,{...schedule,swapId:"other"},{...schedule,sessionNumber:2},{...schedule,scheduledAt:new Date("invalid")},{...schedule,scheduledAt:swap.receiverApprovedAt}])assert.equal(confirmationEligibility(swap,"a",1,row,end).eligible,true);
  assert.equal(confirmationEligibility(swap,"a",1,null,end).scheduledEndAt,null);
});
test("closed or unapproved exchanges, outsiders and sequential bypasses are ineligible",()=>{
  for(const status of ["PENDING_AGREEMENT","COMPLETED","CANCELLED","REJECTED","WITHDRAWN"])assert.equal(confirmationEligibility({...swap,status},"a",1,schedule,end).eligible,false);
  for(const change of [{integrityVerified:false},{agreementVersion:0},{requesterApprovedAt:null}])assert.equal(confirmationEligibility({...swap,...change},"a",1,schedule,end).eligible,false);
  assert.equal(confirmationEligibility(swap,"outsider",1,schedule,end).eligible,false);
  for(const number of [0,2,3,1.5])assert.equal(confirmationEligibility(swap,"a",number,schedule,end).eligible,false);
  assert.equal(confirmationEligibility({...swap,requesterSessions:1},"a",1,schedule,end).eligible,false);
});

test("actual completion rejects missing, invalid and future dates; accepts the exact present",()=>{
  for(const value of [undefined,null,42,"not a date","2026-02-30T00:00:00Z","2026-11-20T00:00",new Date(end+1).toISOString()])assert.throws(()=>actualCompletionTime(value,end));
  assert.equal(actualCompletionTime(new Date(end).toISOString(),end).getTime(),end);
});
