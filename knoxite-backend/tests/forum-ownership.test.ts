import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { forumRouter } from "../routes/forum";
import { errorHandler } from "../lib/http";

test("forum deletion authorizes the authenticated owner or ADMIN and preserves other posts", async () => {
  const posts = new Map([["owned", { id: "owned", authorId: "owner" }], ["other", { id: "other", authorId: "peer" }]]);
  let deletes = 0;
  const db: any = { post: { findUnique: async ({ where }: any) => posts.get(where.id) || null, delete: async ({ where }: any) => { deletes++; posts.delete(where.id); } } };
  const app = express(); app.use(express.json());
  // Synthetic identity fixture; the production app still verifies JWT/session/role.
  app.use((req, _res, next) => { const token = req.header("Authorization"); if (token === "Bearer owner") { req.userId = "owner"; req.userRole = "USER"; } else if (token === "Bearer admin") { req.userId = "moderator"; req.userRole = "ADMIN"; } next(); });
  app.use("/forum", forumRouter(db)); app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as any).port}/forum/posts/`;
  const remove = (id: string, token?: string, body?: unknown) => fetch(url + id, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal((await remove("owned")).status, 401);
    assert.equal((await remove("other", "owner")).status, 403);
    assert.equal((await remove("other", "owner", { authorId: "peer", role: "ADMIN" })).status, 422);
    assert.equal(deletes, 0);
    assert.equal((await remove("owned", "owner")).status, 200);
    assert.equal(posts.has("other"), true);
    assert.equal((await remove("owned", "owner")).status, 404);
    assert.equal((await remove("other", "admin")).status, 200);
    assert.equal(deletes, 2);
  } finally { server.close(); await once(server, "close"); }
});


test("reply removal checks exact ownership, thread membership, ADMIN role and concurrent/repeated requests",async()=>{
  let userId:string|undefined="owner",role="USER";
  const posts=new Map([["one",{id:"one"}],["two",{id:"two"}]]);
  const comments=new Map([['owned',{id:'owned',postId:'one',authorId:'owner'}],['peer',{id:'peer',postId:'one',authorId:'peer'}],['other',{id:'other',postId:'two',authorId:'peer'}]]);
  const audits:any[]=[];
  const db:any={adminAudit:{create:async({data}:any)=>{audits.push(data);return data;}},$transaction:async(fn:any)=>fn(db),$queryRaw:async()=>[],post:{findUnique:async({where}:any)=>posts.get(where.id)||null},comment:{findFirst:async({where}:any)=>{const row=comments.get(where.id);return row?.postId===where.postId?row:null;},deleteMany:async({where}:any)=>{const row=comments.get(where.id);if(!row||row.postId!==where.postId||(where.authorId&&row.authorId!==where.authorId))return{count:0};comments.delete(row.id);return{count:1};}}};
  const app=express();app.use(express.json());app.use((req,_res,next)=>{req.userId=userId;req.userRole=role as any;next();});app.use(forumRouter(db));app.use(errorHandler);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");const url=`http://127.0.0.1:${(server.address() as any).port}/posts/`;
  const remove=(post:string,id:string,body?:unknown)=>fetch(`${url}${post}/comments/${id}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)});
  try{
    userId=undefined;assert.equal((await remove('one','owned')).status,401);userId='owner';
    assert.equal((await remove('two','owned')).status,404);assert.equal((await remove('missing','owned')).status,404);
    assert.equal((await remove('one','peer')).status,403);assert.equal((await remove('one','peer',{authorId:'peer',role:'ADMIN'})).status,422);
    assert.equal(comments.size,3);
    const results=await Promise.all([remove('one','owned'),remove('one','owned')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,404]);
    assert.equal((await remove('one','owned')).status,404);assert.equal(comments.has('peer'),true);assert.equal(comments.has('other'),true);assert.equal(posts.size,2);
    userId='moderator';role='ADMIN';assert.equal((await remove('one','peer',{reason:'SPAM'})).status,200);assert.equal(comments.size,1);assert.equal(posts.size,2);assert.equal(audits.length,1);assert.equal(audits[0].administratorId,"moderator");assert.equal(audits[0].commentAuthorId,"peer");
  }finally{server.close();await once(server,'close');}
});
