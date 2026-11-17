// Disposable CI/test runner. Never reads dotenv, sandbox or OAuth settings.
const fs=require("node:fs"),path=require("node:path"),{spawn}=require("node:child_process");
const fixture=require("./fourBlockersEnvironment.cjs");
const root=path.resolve(__dirname,"..");
async function run(file,m,manifest){
  fixture.verify(m);
  const ddl=["migration.test.js","google-migration.test.js"].includes(file);
  const env={...process.env,DATABASE_URL:ddl?m.url:m.appUrl,KNOXITE_LOCAL_DATABASE_ACK:"local-synthetic-or-sanitized",KNOXITE_CI_FIXTURE_MANIFEST:manifest,KNOXITE_FOUR_BLOCKERS_MANIFEST:manifest,DOTENV_CONFIG_PATH:path.join(m.directory,"no-dotenv")};
  const child=spawn(process.execPath,["--test","--test-concurrency=1",path.join(root,"dist/tests/integration",file)],{cwd:root,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
  // Buffer complete lines so even split output chunks cannot disclose credentials.
  const redact=s=>s.replaceAll(m.password,"[REDACTED]").replaceAll(m.appPassword,"[REDACTED]").replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,"[REDACTED_TOKEN]");
  for(const stream of [child.stdout,child.stderr]){let pending="";stream.on("data",chunk=>{pending+=chunk.toString();let i;while((i=pending.indexOf("\n"))>=0){process.stdout.write(redact(pending.slice(0,i+1)));pending=pending.slice(i+1);}});stream.on("end",()=>{if(pending)process.stdout.write(redact(pending));});}
  await new Promise((resolve,reject)=>{child.once("error",()=>reject(new Error("Disposable test process failed to start")));child.once("exit",code=>code===0?resolve():reject(new Error("Disposable integration test failed")));});
}
async function main(){
  const available=fs.readdirSync(path.join(root,"dist/tests/integration")).filter(f=>f.endsWith(".test.js")).sort();
  const selected=process.argv.slice(2);
  if(selected.some(f=>!available.includes(f)))throw new Error("Unknown integration test selection");
  const files=selected.length?selected:available;
  if(!files.length)throw new Error("Build integration tests first");
  for(const file of files){
    const manifest=await fixture.create(),m=fixture.open(manifest);
    try{await fixture.fresh(m);console.log("Running independently disposable integration: "+file);await run(file,m,manifest);}
    finally{fixture.remove(m);}
  }
}
main().catch(()=>{console.error("CI integration failed safely; no protected target was selected.");process.exitCode=1;});
