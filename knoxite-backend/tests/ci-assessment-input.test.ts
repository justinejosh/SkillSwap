import {test} from "node:test";
import assert from "node:assert/strict";
import {gzipSync} from "node:zlib";
import {createHash} from "node:crypto";
const qa=require("../../development/ciAssessmentContent.cjs");
function bundle(files:unknown){const b=gzipSync(JSON.stringify(files));return [b.toString("base64"),"-",createHash("sha256").update(b).digest("hex")] as const;}
test("private QA handoff accepts the exact canonical input set without asserting content approval",()=>{
  const files=Object.fromEntries(qa.names.map((name:string)=>[name,"SYNTHETIC INPUT STRUCTURE ONLY"]));
  assert.deepEqual(qa.decode(...bundle(files)),files);
});
test("missing, altered, unknown-path, extra and non-text QA inputs fail closed",()=>{
  const files=Object.fromEntries(qa.names.map((name:string)=>[name,"synthetic"])),valid=bundle(files);
  assert.throws(()=>qa.decode(undefined,undefined,undefined));
  assert.throws(()=>qa.decode(valid[0],valid[1],"0".repeat(64)));
  for(const changed of [{...files,"../escaped.json":"x"},{}, {...files,[qa.names[0]]:false}])assert.throws(()=>qa.decode(...bundle(changed)));
  const removed={...files};delete removed[qa.names[0]];assert.throws(()=>qa.decode(...bundle(removed)));
});
