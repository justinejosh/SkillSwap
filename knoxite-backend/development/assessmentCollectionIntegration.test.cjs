const test=require("node:test"),assert=require("node:assert/strict");
const {openFixture}=require("./assessmentCollectionFixture.cjs");
test("all 15 approved skill banks progress from Not Assessed to Amateur to Verified in rollback-only MySQL fixtures",async t=>{
  const f=await openFixture();
  try{
    for(const offer of f.offerings)await t.test(offer.key,async()=>{
      let info=await f.call("GET",`/assessments/offerings/${offer.id}`);
      assert.equal(info.tier,"NOT_ASSESSED");assert.equal(info.levels.find(l=>l.level==="BASIC").eligible,true);
      assert.equal(info.levels.find(l=>l.level==="ADVANCED").eligible,false);
      await f.call("POST",`/assessments/offerings/${offer.id}/attempts`,403,{level:"ADVANCED"});
      const basic=await f.call("POST",`/assessments/offerings/${offer.id}/attempts`,201,{level:"BASIC"});
      assert.equal(basic.questions.length,10);assert.equal(basic.questions.some(q=>q.options.some(o=>"isCorrect" in o)),false);
      const resumed=await f.call("POST",`/assessments/offerings/${offer.id}/attempts`,201,{level:"BASIC"});
      assert.equal(resumed.id,basic.id);assert.deepEqual(resumed.questions,basic.questions);
      const b=await f.call("POST",`/assessments/attempts/${basic.id}/submit`,200,{answers:await f.correct(basic.id,8)});
      assert.equal(b.status,"PASSED");assert.equal(b.tier,"AMATEUR");assert.equal(b.score,80);
      info=await f.call("GET",`/assessments/offerings/${offer.id}`);assert.equal(info.levels.find(l=>l.level==="ADVANCED").eligible,true);
      const advanced=await f.call("POST",`/assessments/offerings/${offer.id}/attempts`,201,{level:"ADVANCED"});
      assert.equal(advanced.questions.length,6);
      const a=await f.call("POST",`/assessments/attempts/${advanced.id}/submit`,200,{answers:await f.correct(advanced.id,5)});
      assert.equal(a.status,"PASSED");assert.equal(a.tier,"VERIFIED");assert.ok(Math.abs(a.score-100*5/6)<1e-9);
      info=await f.call("GET",`/assessments/offerings/${offer.id}`);assert.equal(info.attempts.length,2);
      assert.equal((await f.call("POST",`/assessments/attempts/${advanced.id}/submit`,200,{answers:[]})).tier,"VERIFIED");
    });
    const profile=await f.call("GET","/profile");assert.equal(profile.offeredSkills.filter(s=>s.tier==="VERIFIED").length,15);assert.equal(profile.metrics.averageRating,null);assert.equal(profile.metrics.completedSwaps,0);
    // Native MySQL checks of SQL-draft numerical/null/join examples. Derived
    // tables only: no DDL, schema changes or persistent table creation.
    const queries=[
      ["SELECT SUM(score) AS n FROM (SELECT 60 score UNION ALL SELECT 80 UNION ALL SELECT 90) results WHERE score>=80",170],
      ["SELECT COUNT(x) AS n FROM (SELECT 10 x UNION ALL SELECT NULL UNION ALL SELECT 20) data",2],
      ["SELECT COUNT(child.id) AS n FROM (SELECT 1 id) parent LEFT JOIN (SELECT 2 id,2 parentId) child ON child.parentId=parent.id",0],
      ["SELECT COUNT(*) AS n FROM (SELECT NULL completed_at) data WHERE completed_at IS NULL",1],
      ["SELECT COUNT(*) AS n FROM (SELECT 1 id UNION ALL SELECT 2) d LEFT JOIN (SELECT 3 id,1 dept,0 active) s ON d.id=s.dept AND s.active=1",2],
    ];
    for(const [query,expected]of queries)assert.equal(Number((await f.db.$queryRawUnsafe(query))[0].n),expected);
  }finally{await f.close()}
});
