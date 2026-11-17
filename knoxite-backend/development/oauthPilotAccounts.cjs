// Local operator configuration only. Never an HTTP endpoint or account creator.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {createInterface}=require("node:readline/promises");
const local=require("./oauthLocal.cjs"),admin=require("./oauthLocalAdmin.cjs");
const folder=path.join(process.env.LOCALAPPDATA||"","Knoxite/google-local");
const target=path.join(folder,"pilot-account.json");
function check(ok,message){if(!ok)throw Object.assign(new Error(message),{safeMessage:message});}
const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
const proof=(env,value)=>crypto.createHmac("sha256",env.JWT_SECRET).update(JSON.stringify(value)).digest("hex");
function candidateConfig(f,account){
  const passwordAdmin=f.config.localOAuthPilot?.passwordAdmin;
  return local.verifyEnvironment({...local.pilotEnvironment(f.env,account),
    KNOXITE_LOCAL_PASSWORD_ADMIN_ID:passwordAdmin?.id||"",KNOXITE_LOCAL_PASSWORD_ADMIN_EMAIL:passwordAdmin?.email||"",
    SESSION_TIMEOUTS_ENABLED:f.config.sessionTimeouts?"true":"false"});
}
function addAccount(account,email,f){
  const next={email:account.email,additionalEmails:[...(account.additionalEmails||[]),email.trim().toLowerCase()]};
  candidateConfig(f,next);return next;
}
function save(account,f,before){
  const config=candidateConfig(f,account);
  check(config.localOAuthPilot.email===f.config.localOAuthPilot.email,"The original authorized student must be retained.");
  const lockPath=path.join(folder,"pilot-account.edit.lock"),lock=fs.openSync(lockPath,"wx",0o600);
  const tag=Date.now()+"-"+crypto.randomBytes(4).toString("hex"),pending=path.join(folder,"pilot-account.pending-"+tag+".json");
  try{
    check(fs.readFileSync(target,"utf8")===before,"Private pilot configuration changed concurrently; no overwrite attempted.");
    fs.writeFileSync(path.join(folder,"pilot-account.before-allowlist-"+tag+".private.json"),before,{flag:"wx",mode:0o600});
    const text=JSON.stringify(account,null,2)+"\n";
    fs.writeFileSync(pending,text,{flag:"wx",mode:0o600});
    check(fs.readFileSync(target,"utf8")===before,"Private pilot configuration changed concurrently; retained pending candidate for review.");
    fs.renameSync(pending,target);
    const value={instanceId:f.owner.instanceId,recordedAt:new Date().toISOString(),policy:"local-exact-student-allowlist-v2",
      authorization:"Project owner explicitly authorized a configurable multi-student local allowlist in this chat on 2026-11-15. This is not additional university/IT approval.",
      beforeHash:hash(before),afterHash:hash(text),studentCount:1+(account.additionalEmails||[]).length,originalStudentPreserved:true,adminPolicyUnchanged:true};
    fs.writeFileSync(path.join(folder,"pilot-allowlist-change-"+tag+".private.json"),JSON.stringify({value,proof:proof(f.env,value)},null,2)+"\n",{flag:"wx",mode:0o600});
  }finally{fs.closeSync(lock);fs.unlinkSync(lockPath);}
}
async function runningStatus(f){
  const challenge=crypto.randomBytes(32).toString("hex");
  const r=await fetch("http://127.0.0.1:5019/__oauth-local/pilot-status?challenge="+challenge,{redirect:"error",signal:AbortSignal.timeout(5000)});
  check(r.ok,"Restart only the dedicated OAuth backend in its original terminal to load the student allowlist policy.");
  const s=await r.json(),value={instanceId:s.instanceId,challenge:s.challenge,policy:s.policy,studentCount:s.studentCount,allowlistFingerprint:s.allowlistFingerprint};
  const pilot=f.config.localOAuthPilot,emails=[pilot.email,...(pilot.additionalEmails||[])].sort();
  const expected=proof(f.env,value);
  check(s.instanceId===f.owner.instanceId&&s.challenge===challenge&&s.policy==="local-exact-student-allowlist-v2"&&s.studentCount===emails.length&&
    s.allowlistFingerprint===proof(f.env,{purpose:"local-student-list",emails})&&typeof s.proof==="string"&&s.proof.length===expected.length&&
    crypto.timingSafeEqual(Buffer.from(s.proof),Buffer.from(expected)),"Running API does not match the private student allowlist. Restart only its verified dedicated backend.");
  return {studentCount:emails.length,originalStudentRetained:true,passwordAdminConfigured:!!pilot.passwordAdmin,loadedPolicyMatchesPrivateConfig:true};
}
async function run(command){
  check(["upgrade","add","status"].includes(command),"Use upgrade, add or status. Additional emails are entered privately at the terminal, not as command arguments.");
  check(process.argv.length<=3,"Do not place personal student emails in command arguments; use the terminal prompt.");
  const f=await admin.open();
  try{
    const before=fs.readFileSync(target,"utf8"),account=JSON.parse(before);
    candidateConfig(f,account);
    if(command==="status"){console.log(JSON.stringify(await runningStatus(f)));return;}
    if(command==="upgrade"){
      if(account.additionalEmails===undefined)save({...account,additionalEmails:[]},f,before);
      console.log("Private student allowlist prepared; original student and separate ADMIN retained. No additional address or account created.");return;
    }
    check(process.stdin.isTTY,"Run the add command in your own interactive PowerShell terminal; no personal address accepted from automation or arguments.");
    const rl=createInterface({input:process.stdin,output:process.stdout});let email;
    try{email=await rl.question("Additional authorized OLFU Laguna student email (private terminal only): ");}finally{rl.close();}
    const next=addAccount(account,email,f);save(next,f,before);
    console.log(`Authorized student count: ${1+next.additionalEmails.length}. No User/profile created. Restart only the dedicated OAuth backend, then run oauth:students:status.`);
  }finally{await f.db.$disconnect();}
}
module.exports={candidateConfig,addAccount,runningStatus,run};
if(require.main===module)run(process.argv[2]).catch(e=>{console.error(e.safeMessage||"Local student configuration stopped safely. Existing accounts and credentials were retained; no values printed.");process.exitCode=1;});
