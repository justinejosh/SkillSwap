import {test} from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {requireOwnedFixtureDatabase} from "./integration/fixtureDatabase";
const fixture=require("../../development/fourBlockersEnvironment.cjs");
test("detached CI checkout requires exact hosted repository/workspace context",()=>{
  const env={GITHUB_ACTIONS:"true",RUNNER_ENVIRONMENT:"github-hosted",GITHUB_REPOSITORY:"justinejosh/SkillSwap",GITHUB_RUN_ID:"123",GITHUB_WORKSPACE:resolve(__dirname,"../../..")};
  assert.doesNotThrow(()=>fixture.assertTestCheckout(env,""));
  for(const change of [{GITHUB_ACTIONS:"false"},{RUNNER_ENVIRONMENT:"self-hosted"},{GITHUB_REPOSITORY:"other/repo"},{GITHUB_RUN_ID:"invalid"},{GITHUB_WORKSPACE:resolve(env.GITHUB_WORKSPACE,"elsewhere")}])assert.throws(()=>fixture.assertTestCheckout({...env,...change},"main"));
  assert.throws(()=>fixture.assertTestCheckout({},"main"));
});
test("integration fixtures refuse a missing ownership manifest before connecting",()=>{
  const previous=process.env.KNOXITE_CI_FIXTURE_MANIFEST;
  delete process.env.KNOXITE_CI_FIXTURE_MANIFEST;
  try{assert.throws(()=>requireOwnedFixtureDatabase(),/owned disposable fixture/);}finally{if(previous!==undefined)process.env.KNOXITE_CI_FIXTURE_MANIFEST=previous;}
});
