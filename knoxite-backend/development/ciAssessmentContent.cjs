// Private QA input handoff only. Never imports/publishes assessments or reads DB settings.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto"),zlib=require("node:zlib");
const root=path.resolve(__dirname,".."),directory=path.join(root,"content/drafts");
const names=JSON.parse(fs.readFileSync(path.join(root,"config/skill-catalog.json"),"utf8")).skills.filter(s=>s.priority||s.category==="technology").map(s=>s.key+".json").sort();
const check=ok=>{if(!ok)throw new Error("Private assessment QA input refused; no approval/publication implied.");};
const digest=buffer=>crypto.createHash("sha256").update(buffer).digest("hex");
function decode(first,second,expected){
  check(typeof first==="string"&&first.length>0&&first.length<=32768&&typeof second==="string"&&second.length<=32768&&/^[a-f0-9]{64}$/.test(expected||""));
  const encoded=first+(second==="-"?"":second);check(/^[A-Za-z0-9+/]+={0,2}$/.test(encoded));
  const compressed=Buffer.from(encoded,"base64");check(digest(compressed)===expected);
  const files=JSON.parse(zlib.gunzipSync(compressed,{maxOutputLength:1048576}).toString("utf8"));
  check(files&&typeof files==="object"&&!Array.isArray(files)&&names.length===15&&JSON.stringify(Object.keys(files).sort())===JSON.stringify(names));
  for(const name of names)check(typeof files[name]==="string"&&Buffer.byteLength(files[name])<=200000);
  return files;
}
function hosted(){
  check(process.env.GITHUB_ACTIONS==="true"&&process.env.RUNNER_ENVIRONMENT==="github-hosted"&&process.env.GITHUB_REPOSITORY==="justinejosh/SkillSwap"&&/^\d+$/.test(process.env.GITHUB_RUN_ID||"")&&path.resolve(process.env.GITHUB_WORKSPACE||"")===path.resolve(root,".."));
}
function pack(){
  const files=Object.fromEntries(names.map(name=>[name,fs.readFileSync(path.join(directory,name),"utf8")]));
  const compressed=zlib.gzipSync(JSON.stringify(files)),encoded=compressed.toString("base64"),hash=digest(compressed);
  check(encoded.length<=65536);decode(encoded.slice(0,32768),encoded.slice(32768)||"-",hash);
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),"knoxite-assessment-qa-"));
  for(const [name,value] of [["part1.secret.txt",encoded.slice(0,32768)],["part2.secret.txt",encoded.slice(32768)||"-"],["sha256.txt",hash]])fs.writeFileSync(path.join(folder,name),value,{mode:0o600,flag:"wx"});
  console.log("Private QA handoff prepared outside Git: "+folder+". Contents are sensitive; upload only to approved Actions secrets, never chat/artifacts.");
}
function restore(){
  hosted();
  const files=decode(process.env.KNOXITE_QA_PART1,process.env.KNOXITE_QA_PART2,process.env.KNOXITE_QA_SHA256);
  for(const folder of [root,path.dirname(directory)])if(fs.existsSync(folder))check(!fs.lstatSync(folder).isSymbolicLink());
  check(!fs.existsSync(directory)||(!fs.lstatSync(directory).isSymbolicLink()&&fs.readdirSync(directory).length===0));
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(directory,"qa-owner.private.json"),JSON.stringify({run:process.env.GITHUB_RUN_ID,names}),{flag:"wx",mode:0o600});
  for(const name of names)fs.writeFileSync(path.join(directory,name),files[name],{flag:"wx",mode:0o600});
  console.log("Private QA inputs restored for unchanged offline tests; no database access or publication.");
}
function cleanup(){
  hosted();const owner=path.join(directory,"qa-owner.private.json");if(!fs.existsSync(owner))return;
  for(const folder of [root,path.dirname(directory),directory])check(!fs.lstatSync(folder).isSymbolicLink());const record=JSON.parse(fs.readFileSync(owner,"utf8"));
  check(record.run===process.env.GITHUB_RUN_ID&&JSON.stringify(record.names)===JSON.stringify(names)&&fs.readdirSync(directory).every(n=>names.includes(n)||n==="qa-owner.private.json"));
  for(const name of names)if(fs.existsSync(path.join(directory,name)))fs.unlinkSync(path.join(directory,name));
  fs.unlinkSync(owner);fs.rmdirSync(directory);console.log("Owned private QA inputs removed.");
}
module.exports={decode,names};
if(require.main===module){try{const command=process.argv[2];if(command==="pack")pack();else if(command==="restore")restore();else if(command==="cleanup")cleanup();else throw new Error("Unknown command");}catch{console.error("Private QA handoff failed safely. Verify approved secret inputs/hash and runner ownership; no content logged.");process.exitCode=1;}}
