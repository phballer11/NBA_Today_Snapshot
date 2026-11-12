// Published only after a successful deployment; contains public game IDs, never credentials.
import {readFile,writeFile} from 'node:fs/promises';
import {dateInZone} from '../js/data.mjs';
const repo=process.env.GITHUB_REPOSITORY;
let batch={games:[]};try{batch=JSON.parse(process.env.WATCHER_BATCH||'{}');}catch{throw Error('Invalid watcher batch');}
if(!Array.isArray(batch.games||[]))throw Error('Invalid game list');
const games=(batch.games||[]).map(g=>{
 if(!/^\d+$/.test(g.id)||!/^\d{4}-\d{2}-\d{2}$/.test(g.date)||!Number.isFinite(Date.parse(g.finalAt))||![1,2].includes(g.pass))throw Error('Invalid game receipt');
 return {id:g.id,date:g.date,finalAt:g.finalAt,basis:g.basis,pass:g.pass};
});
for(const game of games){
 const slate=JSON.parse(await readFile(new URL(`../data/${game.date}.json`,import.meta.url)));
 const highlights=JSON.parse(await readFile(new URL(`../data/highlights/${game.date}.json`,import.meta.url)));
 if(!slate.games.some(g=>g.id===game.id&&g.state==='post')||Date.now()-Date.parse(slate.updatedAt)>15*60000||Date.now()-Date.parse(highlights.checkedAt)>15*60000)throw Error('Target game was not freshly collected');
}
let prior={events:[]};
try{const r=await fetch(`https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/data/collection-status.json?at=${Date.now()}`,{signal:AbortSignal.timeout(15000)});if(r.ok)prior=await r.json();}catch{try{prior=JSON.parse(await readFile(new URL('../data/collection-status.json',import.meta.url)));}catch{}}
const event={day:dateInZone(new Date(),'Pacific/Auckland'),collectedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,games};
const events=[...(prior.events||[]).filter(e=>e.runId!==event.runId),event].slice(-100);
await writeFile(new URL('../data/collection-status.json',import.meta.url),JSON.stringify({schema:1,...event,events}));
