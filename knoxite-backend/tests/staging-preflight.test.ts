import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {StagingTarget,validateStagingUrl,validateStagingGrants,inspectStaging} from "../scripts/staging-preflight";
const target:StagingTarget={host:"db.fixture.invalid",port:30333,database:"staging_fixture",serverUuid:"11111111-2222-3333-4444-555555555555",currentUser:"knoxite_staging_app@%",caSha256:"a".repeat(64),role:"application"};
const privileges="SELECT, INSERT, UPDATE, DELETE";
const grants=["GRANT USAGE ON *.* TO `knoxite_staging_app`@`%`",`GRANT ${privileges} ON \`staging_fixture\`.* TO \`knoxite_staging_app\`@\`%\``];
test("remote staging URL requires exact identity, non-root credentials, pinned CA and strict TLS",()=>{
  const directory=mkdtempSync(join(tmpdir(),"knoxite-ca-test-"));
  try{
    const ca=join(directory,"test-ca.pem");writeFileSync(ca,"SYNTHETIC CERTIFICATE INPUT, NOT REAL TLS EVIDENCE");
    const expected={...target,caSha256:createHash("sha256").update("SYNTHETIC CERTIFICATE INPUT, NOT REAL TLS EVIDENCE").digest("hex")};
    const u=new URL("mysql://knoxite_staging_app:synthetic@db.fixture.invalid:30333/staging_fixture");u.searchParams.set("sslcert",ca);u.searchParams.set("sslaccept","strict");
    assert.doesNotThrow(()=>validateStagingUrl(u.toString(),expected));
    for(const change of [(v:URL)=>v.hostname="localhost",(v:URL)=>v.port="3319",(v:URL)=>v.pathname="/railway",(v:URL)=>v.username="root",(v:URL)=>v.searchParams.set("sslaccept","accept_invalid_certs"),(v:URL)=>v.searchParams.delete("sslcert"),(v:URL)=>v.searchParams.append("sslaccept","strict")]){const altered=new URL(u);change(altered);assert.throws(()=>validateStagingUrl(altered.toString(),expected));}
    assert.throws(()=>validateStagingUrl(u.toString(),{...expected,caSha256:"0".repeat(64)}));
  }finally{unlinkSync(join(directory,"test-ca.pem"));rmdirSync(directory);}
});
test("application grants forbid DDL/global/foreign-schema/role/grant-option escalation",()=>{
  assert.doesNotThrow(()=>validateStagingGrants(grants,target));
  for(const extra of ["GRANT CREATE ON *.* TO `x`@`%`","GRANT ALL PRIVILEGES ON `staging_fixture`.* TO `x`@`%`","GRANT ALTER ON `staging_fixture`.* TO `x`@`%`","GRANT SELECT ON `other`.* TO `x`@`%`","GRANT `role` TO `x`@`%`",grants[1]+" WITH GRANT OPTION"])assert.throws(()=>validateStagingGrants([...grants,extra],target));
  assert.throws(()=>validateStagingGrants([grants[0]],target));
});
test("migration grants are schema-scoped and distinct from application privileges",()=>{
  const migration=`GRANT ${privileges}, CREATE, ALTER, DROP, INDEX, REFERENCES ON \`staging_fixture\`.* TO \`knoxite_staging_migrator\`@\`%\``;
  assert.doesNotThrow(()=>validateStagingGrants([migration],{...target,role:"migration"}));
  assert.throws(()=>validateStagingGrants([migration],target));
});
function dbFixture(change:{identity?:unknown;cipher?:string;version?:string;tables?:unknown[];grants?:string[]}={}){
  return {$queryRaw:async(sql:TemplateStringsArray)=>sql.join("").includes("schemaName")?[change.identity||{schemaName:target.database,serverId:target.serverUuid,actor:target.currentUser}]:sql.join("").includes("objectCount")?[{objectCount:BigInt(change.tables?.length||0)}]:change.tables||[],$queryRawUnsafe:async(sql:string)=>sql.startsWith("SHOW SESSION")?[{Variable_name:"Ssl_cipher",Value:change.cipher??"SYNTHETIC_CIPHER"},{Variable_name:"Ssl_version",Value:change.version??"TLSv1.3"}]:(change.grants||grants).map(g=>({grant:g})),$executeRaw:()=>{throw new Error("Preflight must never write");}} as any;
}
test("read-only empty-schema preflight succeeds only with matching identity, encrypted session and scoped grants",async()=>{
  assert.deepEqual(await inspectStaging(dbFixture(),target),{targetMatches:true,tls:"TLSv1.3",empty:true,grantsScoped:true});
  for(const change of [{identity:{schemaName:"other"}},{cipher:""},{version:"TLSv1"},{tables:[{name:"User"}]}])await assert.rejects(()=>inspectStaging(dbFixture(change),target));
});
