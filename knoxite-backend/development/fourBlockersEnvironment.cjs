// Explicit disposable test infrastructure. Never imported by application startup.
const fs = require("node:fs"), os = require("node:os"), path = require("node:path"), crypto = require("node:crypto");
const { execFileSync, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."), label = "knoxite.four-blockers";
const { PrismaClient } = require("../node_modules/@prisma/client");
const check = (ok, message) => { if (!ok) throw new Error(message); };
const docker = args => execFileSync("docker", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
function assertTestCheckout(env=process.env,branch=execFileSync("git",["branch","--show-current"],{cwd:root,encoding:"utf8"}).trim()) {
  if(branch==="dev-justine")return;
  // Actions checkout commonly uses a detached merge SHA. This exception is for
  // GitHub-hosted validation only; database ownership/topology checks still apply.
  check(env.GITHUB_ACTIONS==="true"&&env.RUNNER_ENVIRONMENT==="github-hosted"&&
    env.GITHUB_REPOSITORY==="justinejosh/SkillSwap"&&/^\d+$/.test(env.GITHUB_RUN_ID||"")&&
    env.GITHUB_WORKSPACE&&path.resolve(env.GITHUB_WORKSPACE)===path.resolve(root,".."),"Disposable work requires dev-justine or the verified hosted CI checkout");
}
function verify(m) {
  assertTestCheckout();
  const c = JSON.parse(docker(["inspect", m.container]))[0], ports = c.NetworkSettings.Ports["3306/tcp"] || [];
  check(c.Id === m.containerId && c.Config.Labels[label] === m.owner && c.Config.Image === "mysql:8.4" &&
    c.Name === "/" + m.container && ports.length === 1 && ports[0].HostIp === "127.0.0.1" && ports[0].HostPort === m.port &&
    c.Mounts.some(x => x.Type === "tmpfs" && x.Destination === "/var/lib/mysql") &&
    !["3306", "3309", "3311", "3319"].includes(m.port), "Disposable database ownership/topology mismatch");
  for (const value of [m.url, m.legacyUrl, m.appUrl]) {
    const u = new URL(value);
    check(u.hostname === "127.0.0.1" && u.port === m.port && /^\/knoxite_four_[a-f0-9]+_(test|legacy_test)$/.test(u.pathname), "Unsafe database target");
  }
}
function cli(m, args, url = m.url) {
  verify(m);
  check([m.url,m.legacyUrl,m.appUrl].includes(url),"Unverified disposable target refused");
  const r = spawnSync(process.execPath, [path.join(root, "node_modules/prisma/build/index.js"), ...args], {
    cwd: root, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", windowsHide: true, maxBuffer: 8e6,
  });
  if (r.status !== 0) {
    const safe = String(r.stdout) + String(r.stderr);
    fs.writeFileSync(path.join(m.directory, "prisma-error.private.log"), safe.replaceAll(m.password, "[REDACTED]").replaceAll(m.appPassword, "[REDACTED]"));
    throw new Error("Disposable Prisma operation failed; private sanitized diagnostic retained");
  }
  return r.stdout;
}
async function create() {
  assertTestCheckout();
  const owner = crypto.randomUUID(), suffix = crypto.randomBytes(6).toString("hex");
  const m = { owner, container: "knoxite-four-" + suffix, directory: fs.mkdtempSync(path.join(os.tmpdir(), "knoxite-four-db-")),
    password: crypto.randomBytes(36).toString("base64url"), appPassword: crypto.randomBytes(36).toString("base64url") };
  const envFile = path.join(m.directory, "mysql.private.env");
  fs.writeFileSync(envFile, `MYSQL_ROOT_PASSWORD=${m.password}\nMYSQL_ROOT_HOST=%\n`, { mode: 0o600 });
  docker(["image", "inspect", "mysql:8.4"]); // Reuse installed image; no implicit pull.
  m.containerId = docker(["run", "--detach", "--name", m.container, "--label", label + "=" + owner, "--mount", "type=tmpfs,destination=/var/lib/mysql", "--publish", "127.0.0.1::3306", "--env-file", envFile, "mysql:8.4"]).trim();
  const c = JSON.parse(docker(["inspect", m.container]))[0];m.port = c.NetworkSettings.Ports["3306/tcp"][0].HostPort;
  const base = `mysql://root:${m.password}@127.0.0.1:${m.port}/`;
  m.url = base + `knoxite_four_${suffix}_test`;m.legacyUrl = base + `knoxite_four_${suffix}_legacy_test`;
  m.appUrl = m.url.replace(`root:${m.password}`, `knoxite_app:${m.appPassword}`);
  const file = path.join(m.directory, "manifest.private.json");fs.writeFileSync(file, JSON.stringify(m), { mode: 0o600 });
  verify(m);
  let ready = false;
  for (let attempt = 0; attempt < 45; attempt++) {
    const db = new PrismaClient({datasources:{db:{url:base+"mysql"}}});
    try { await db.$queryRaw`SELECT 1`;ready = true;break; } catch { await new Promise(r=>setTimeout(r,1000)); } finally { await db.$disconnect(); }
  }
  check(ready, "Disposable MySQL did not become ready; retained for diagnosis");
  const db = new PrismaClient({datasources:{db:{url:base+"mysql"}}});
  try {
    for(const url of [m.url,m.legacyUrl])await db.$executeRawUnsafe("CREATE DATABASE `"+new URL(url).pathname.slice(1)+"`");
    await db.$executeRawUnsafe(`CREATE USER 'knoxite_app'@'%' IDENTIFIED BY '${m.appPassword}'`);
    await db.$executeRawUnsafe("GRANT SELECT, INSERT, UPDATE, DELETE ON `"+new URL(m.url).pathname.slice(1)+"`.* TO 'knoxite_app'@'%'");
  } finally { await db.$disconnect(); }
  return file;
}
function open(file) { const m=JSON.parse(fs.readFileSync(file,"utf8"));verify(m);return m; }
async function fresh(m) {
  verify(m);const db=new PrismaClient({datasources:{db:{url:m.url}}});
  try {
    const tables=await db.$queryRaw`SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE()`;
    if(tables.length) {
      check(tables.some(t=>t.name==="_prisma_migrations"),"Refusing fresh baseline over a nonempty legacy database");
      const migrations=await db.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations`;
      const expected=crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"prisma/release/migrations/20261117000000_current_release/migration.sql"))).digest("hex");
      check(migrations.length===1&&migrations[0].migration_name==="20261117000000_current_release"&&migrations[0].checksum===expected&&migrations[0].finished_at&&!migrations[0].rolled_back_at,"Unknown migration history; no baseline applied");
    }
  } finally {await db.$disconnect();}
  cli(m,["migrate","deploy","--schema","prisma/release/schema.prisma"]);
}
function remove(m) { verify(m);docker(["rm","--force",m.containerId]); }
function schemaDiff(m, schema, url=m.url) {
  verify(m);
  check([m.url,m.legacyUrl,m.appUrl].includes(url),"Unverified disposable inspection target refused");
  const r=spawnSync(process.execPath,[path.join(root,"node_modules/prisma/build/index.js"),"migrate","diff","--from-schema-datasource","prisma/schema.prisma","--to-schema-datamodel",schema,"--exit-code"],{cwd:root,env:{...process.env,DATABASE_URL:url},encoding:"utf8",windowsHide:true});
  check(r.status===0||r.status===2,"Schema inspection failed");return r.status;
}
async function upgradeShared(m) {
  verify(m);
  if(schemaDiff(m,"prisma/release/schema.prisma",m.legacyUrl)===0)return "ALREADY_CURRENT";
  check(schemaDiff(m,"prisma/schema.prisma",m.legacyUrl)===0,"Unknown legacy schema; additive upgrade refused");
  cli(m,["db","execute","--file","prisma/release/upgrade-from-shared.sql","--schema","prisma/schema.prisma"],m.legacyUrl);
  check(schemaDiff(m,"prisma/release/schema.prisma",m.legacyUrl)===0,"Additive schema verification failed");return "UPGRADED";
}
module.exports={create,open,verify,cli,fresh,remove,schemaDiff,upgradeShared,assertTestCheckout};
if(require.main===module)create().then(file=>console.log("Disposable manifest: "+file)).catch(()=>{console.error("Disposable setup failed safely; inspect only newly owned resources.");process.exitCode=1;});
