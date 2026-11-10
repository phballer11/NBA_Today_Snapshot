import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gameScore,parsePlayers,parseStandings,statusText,normalizeScoreboard,scoringRun,applySummary,nbaDate,dateInZone,shiftDate,loadSlate,mapLimit} from '../js/data.mjs';
const fixture=async name=>JSON.parse(await readFile(new URL(`fixtures/${name}.json`,import.meta.url),'utf8'));
test('observed ESPN schema: all shooting splits, jersey, DNP exclusion, top-five Game Score order',async()=>{
 const summary=await fixture('summary'),raw=await fixture('scoreboard');
 const game=normalizeScoreboard(raw,'2026-11-09').games[0],result=applySummary(game,summary);
 assert.equal(result.away.code,'LAL');assert.equal(result.away.players.length,5);assert.equal(result.home.players.length,5);
 const luka=result.away.players.find(p=>p.jersey==='77');assert.equal(luka.name,'Luka Doncic');assert.equal(luka.pts,32);assert.equal(luka.fgm,11);assert.equal(luka.fga,22);assert.equal(luka.tpm,3);assert.equal(luka.fta,7);assert.ok(Math.abs(luka.rating-30.0)<.0001);
 assert.ok(result.away.players.every((p,i,a)=>!i||a[i-1].rating>=p.rating));assert.ok(result.away.players.some(p=>p.pts<21));
 assert.equal(result.away.players.some(p=>p.name==='Kevon Looney'),false);
});
test('Game Score rewards defense/efficiency and penalizes missed shots, turnovers and fouls',()=>{
 const p={pts:20,fgm:8,fga:15,ftm:4,fta:4,oreb:2,dreb:6,stl:2,ast:5,blk:1,pf:2,to:2};
 assert.equal(gameScore({...p,stl:3})-gameScore(p),1);
 assert.ok(gameScore({...p,fga:25,to:6})<gameScore(p));
});
test('missing stats stay missing and force explicit points fallback',async()=>{
 const summary=await fixture('summary');summary.boxscore.players[0].statistics[0].labels[10]='OTHER';
 const result=parsePlayers(summary.boxscore,'13');assert.match(result.ranking,/incomplete/);assert.equal(result.players[0].oreb,null);assert.equal(result.players[0].rating,null);
});
test('live, tenths, overtime, halftime, delayed and final clocks',()=>{
 const live={type:{state:'in'},period:2,displayClock:'7:12'};
 assert.equal(statusText(live),'Q2 7:12');assert.equal(statusText({...live,period:5,displayClock:'0:45.2'}),'OT1 0:45.2');
 assert.equal(statusText({type:{state:'in',name:'STATUS_HALFTIME',shortDetail:'Halftime'}}),'Halftime');
 assert.equal(statusText({type:{completed:true},period:6}),'Final / OT2');
 assert.equal(statusText({type:{state:'pre',description:'Postponed'}}),'Postponed');
});
test('Auckland calendar and Eastern slate rollover respect DST',()=>{
 assert.equal(dateInZone(new Date('2026-11-09T12:00Z'),'Pacific/Auckland'),'2026-11-10');
 assert.equal(nbaDate(new Date('2026-11-10T08:00Z')),'2026-11-09');
 assert.equal(nbaDate(new Date('2026-11-10T11:00Z')),'2026-11-10');
 assert.equal(nbaDate(new Date('2026-07-10T09:59Z')),'2026-07-09');
 assert.equal(nbaDate(new Date('2026-07-10T10:00Z')),'2026-07-10');
 assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
});
test('standings never silently use projected seeds or fabricate tie-breaks',()=>{
 const e=(id,pct,seed)=>({team:{id},stats:[{name:'winPercent',value:pct},{name:'playoffSeed',value:seed,description:'Projected seed according to BPI'}]});
 const result=parseStandings({children:[{isConference:true,abbreviation:'West',standings:{entries:[e('a',.9,9),e('b',.8,1),e('c',.8,2)]}}]});
 assert.equal(result.a.rank,1);assert.equal(result.b.rank,2);assert.equal(result.c.rank,2);assert.equal(result.b.tied,true);assert.equal(result.a.derived,true);
});
test('run detection orders plays, rejects corrections, and never calls an old run current',()=>{
 const g={state:'in',away:{code:'LAL'},home:{code:'ATL'}};
 const play=(n,a,h)=>({sequenceNumber:String(n),awayScore:a,homeScore:h,period:{number:2},clock:{displayValue:'7:12'}});
 const plays=[play(0,0,0),play(1,3,0),play(2,6,0),play(3,8,0),play(4,10,0)];
 assert.match(scoringRun([...plays].reverse(),g),/on a 10–0 run/);
 assert.match(scoringRun([...plays,play(5,10,2)],g),/had a 10–0 run/);
 assert.equal(scoringRun([play(0,20,20),play(1,19,20),play(2,22,20)],g),null);
 assert.match(scoringRun(plays,{...g,state:'post'}),/had a/);
});
test('a scoreboard failure retries; per-game box failure still delivers all games',async()=>{
 const raw=await fixture('scoreboard');let count=0,updates=0;
 const result=await loadSlate('2026-11-09',{fetchJSON:async url=>{if(url.includes('scoreboard')){if(++count===1)throw Error('temporary');return raw;}throw Error('unavailable');},onProgress:()=>updates++});
 assert.equal(count,2);assert.equal(result.games.length,1);assert.equal(result.games[0].detailsError,true);assert.ok(updates>0);
});
test('malformed feed is rejected but an actual empty day is accepted',()=>{
 assert.throws(()=>normalizeScoreboard({},'2026-11-09'));
 assert.equal(normalizeScoreboard({events:[]},'2026-11-09').games.length,0);
});
test('bounded fetching never exceeds three concurrent detail requests',async()=>{
 let active=0,max=0;await mapLimit([1,2,3,4,5,6],3,async()=>{active++;max=Math.max(active,max);await new Promise(r=>setTimeout(r,5));active--;});assert.equal(max,3);
});
