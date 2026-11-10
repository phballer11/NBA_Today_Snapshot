import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {isHighlightedStat,makeNotes} from '../js/data.mjs';
import {playerTable,time,shortDate,zoneLabel} from '../js/view.mjs';
test('highlight thresholds are inclusive and category specific; TO is not rewarded',()=>{
  for(const [key,threshold] of [['pts',20],['reb',10],['ast',10],['stl',4],['blk',4]]){
    assert.equal(isHighlightedStat(key,threshold-1),false);
    assert.equal(isHighlightedStat(key,threshold),true);
    assert.equal(isHighlightedStat(key,threshold+1),true);
    assert.equal(isHighlightedStat(key,null),false);
  }
  assert.equal(isHighlightedStat('to',20),false);
});
test('game notes use the same new thresholds, including defense and non-scoring performances',()=>{
  const game={state:'post',away:{code:'A'},home:{code:'B'}};
  for(const [key,value,label]of [['pts',20,'PTS'],['reb',10,'REB'],['ast',10,'AST'],['stl',4,'STL'],['blk',4,'BLK']]){
    const p={name:'Example Player',pts:0,reb:0,ast:0,stl:0,blk:0,rating:20,[key]:value};
    assert.match(makeNotes(game,[p])[0],new RegExp(`${value} ${label}`));
  }
  assert.deepEqual(makeNotes(game,[{name:'Below thresholds',pts:19,reb:9,ast:9,stl:3,blk:3,rating:10}]),[]);
});
test('player table includes turnovers, escapes names, and highlights only qualifying values',()=>{
  const html=playerTable({code:'LAL',name:'Los Angeles Lakers',ranking:'Game Score',players:[{name:'Name <script>',jersey:'77',rating:30,pts:20,reb:9,ast:10,stl:4,blk:3,to:6,fgm:8,fga:20,tpm:2,tpa:7,ftm:2,fta:2}]});
  assert.match(html,/>TO<\/th>/);assert.match(html,/>6<\/td>/);
  assert.equal((html.match(/class="stat-highlight"/g)||[]).length,3);
  assert.match(html,/Name &lt;script&gt;/);assert.doesNotMatch(html,/TOP FIVE|<script>/);
});
test('device timezone is selected at runtime, including local date changes across midnight',()=>{
  const url=new URL('../js/data.mjs',import.meta.url).href;
  const run=TZ=>JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`import {deviceZone,dateInZone} from ${JSON.stringify(url)}; console.log(JSON.stringify({zone:deviceZone(),date:dateInZone(new Date('2026-11-10T02:00Z'))}));`],{env:{...process.env,TZ},encoding:'utf8'}));
  assert.deepEqual(run('America/Los_Angeles'),{zone:'America/Los_Angeles',date:'2026-11-09'});
  assert.deepEqual(run('Asia/Tokyo'),{zone:'Asia/Tokyo',date:'2026-11-10'});
  assert.notEqual(time('2026-11-10T02:00Z','America/Los_Angeles'),time('2026-11-10T02:00Z','Asia/Tokyo'));
  assert.notEqual(shortDate('2026-11-10T02:00Z','America/Los_Angeles'),shortDate('2026-11-10T02:00Z','Asia/Tokyo'));
  assert.ok(zoneLabel('2026-11-10T02:00Z','America/Los_Angeles'));
});
