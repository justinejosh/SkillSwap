import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { loadConfig, pilotAccountAllowed, pilotSessionAccountAllowed } from "../lib/config";
const local=require(resolve(process.cwd(),"development/oauthLocal.cjs"));
const editor=require(resolve(process.cwd(),"development/oauthPilotAccounts.cjs"));
const first="aafirst1234lag@student.fatima.edu.ph",second="bbsecond5678lag@student.fatima.edu.ph";
const env={JWT_SECRET:"synthetic-multi-pilot-key-".repeat(3),NODE_ENV:"development",HOST:"127.0.0.1",PORT:"5019",
  INSTITUTION_EMAIL_DOMAINS:"student.fatima.edu.ph",CAMPUS_EMAIL_SUFFIX:"lag",EMAIL_VERIFICATION_REQUIRED:"true",
  DATABASE_URL:"mysql://knoxite_oauth:synthetic-only@127.0.0.1:3319/knoxite_google_local_dev",PUBLIC_APP_URL:"http://localhost:5181",CORS_ORIGINS:"http://localhost:5181",
  KNOXITE_LOCAL_OAUTH_PILOT:"true",GOOGLE_LOCAL_PILOT_ACCOUNT_EMAIL:first};
test("legacy single-account configuration remains valid; private additional list normalizes and authorizes exact students",()=>{
  const legacy=loadConfig(local.pilotEnvironment(env,{email:first}));
  assert.equal(pilotAccountAllowed(first,legacy),true);assert.equal(pilotAccountAllowed(second,legacy),false);
  const config=loadConfig(local.pilotEnvironment(env,{email:first,additionalEmails:["  "+second.toUpperCase()+"  "]}));
  assert.equal(config.localOAuthPilot!.email,first);assert.deepEqual(config.localOAuthPilot!.additionalEmails,[second]);
  for(const email of [first,second.toUpperCase()])assert.equal(pilotAccountAllowed(email,config),true);
  assert.equal(pilotAccountAllowed("ccother0000lag@student.fatima.edu.ph",config),false);
});
test("malformed, duplicate, wildcard, non-institutional or wrong-campus private lists fail closed",()=>{
  for(const additionalEmails of [null,"x",[1],[{}],[""],[first],[second,second.toUpperCase()],["*"],["aabeta1234lag@gmail.com"],["aabeta1234qc@student.fatima.edu.ph"],["beta123lag@student.fatima.edu.ph"],["admin-0123456789abcdef@admin.knoxite.test"]])
    assert.throws(()=>loadConfig(local.pilotEnvironment(env,{email:first,additionalEmails})));
  for(const candidate of [{email:first,additionalEmails:[],role:"ADMIN"},{email:first,additionalEmails:[],approved:true},{additionalEmails:[second]}])assert.throws(()=>local.pilotEnvironment(env,candidate));
  for(const raw of ["not-json",'{}','"text"','[false]'])assert.throws(()=>loadConfig({...env,GOOGLE_LOCAL_PILOT_ADDITIONAL_EMAILS_JSON:raw}));
});
test("additional allowlist configuration is prohibited outside the dedicated 5181/5019/3319 environment",()=>{
  const configured=local.pilotEnvironment(env,{email:first,additionalEmails:[second]});
  for(const change of [{NODE_ENV:"production"},{KNOXITE_LOCAL_OAUTH_PILOT:"false"},{KNOXITE_SYNTHETIC_SANDBOX:"true"},{PORT:"5012"},{PUBLIC_APP_URL:"http://localhost:5180"},{HOST:"0.0.0.0"},{DATABASE_URL:env.DATABASE_URL.replace(":3319/knoxite_google_local_dev",":3306/knoxite")}])
    assert.throws(()=>loadConfig({...configured,...change}));
});
test("allowlisted identities can have student sessions only; password ADMIN still requires its separate exact identity",()=>{
  const id=randomUUID(),email="admin-0123456789abcdef@admin.knoxite.test";
  const config=loadConfig({...local.pilotEnvironment(env,{email:first,additionalEmails:[second]}),KNOXITE_LOCAL_PASSWORD_ADMIN_ID:id,KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL:email});
  for(const address of [first,second]){
    assert.equal(pilotSessionAccountAllowed({id:randomUUID(),email:address,role:"USER"},config),true);
    assert.equal(pilotSessionAccountAllowed({id:randomUUID(),email:address,role:"ADMIN"},config),false);
  }
  assert.equal(pilotSessionAccountAllowed({id,email,role:"ADMIN"},config),true);
  assert.equal(pilotSessionAccountAllowed({id:randomUUID(),email,role:"ADMIN"},config),false);
  assert.equal(pilotAccountAllowed(email,config),false);
});
test("terminal configuration candidate preserves primary/admin and never creates accounts or accepts duplicates",()=>{
  const config=loadConfig(env),f={env,config},account={email:first,additionalEmails:[]};
  const next=editor.addAccount(account,second,f);
  assert.equal(next.email,first);assert.deepEqual(next.additionalEmails,[second]);assert.deepEqual(account,{email:first,additionalEmails:[]});
  assert.throws(()=>editor.addAccount(next,second,f));assert.throws(()=>editor.addAccount(account,first,f));
});
