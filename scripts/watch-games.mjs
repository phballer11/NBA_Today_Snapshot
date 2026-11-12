// GitHub-only controller. Never invoked from the public browser.
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {dateInZone,shiftDate,API} from '../js/data.mjs';
const zone='Pacific/Auckland',repo=process.env.GITHUB_REPOSITORY;
const statePath=process.env.WATCH_STATE||'/tmp/nba-watcher-state.json';
export function localMinute(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 return +parts.find(p=>p.type==='hour').value*60 + +parts.find(p=>p.type==='minute').value;
}
export function duePass(game,now=Date.now()){
 const age=now-Date.parse(game.finalAt);
 return age>=120*60000?2:age>=90*60000?1:0;
}
const mode=process.argv[2];
if(mode==='gate'){
 const minute=localMinute(),enabled=process.env.GITHUB_EVENT_NAME==='workflow_dispatch'||process.env.WATCH_ENABLED==='true';
 await appendFile(process.env.GITHUB_OUTPUT,`start=${enabled&&minute>=697&&minute<1320}\n`);
}else if(mode==='run'){
 if(!repo||!process.env.GH_TOKEN)throw Error('GitHub runner credentials required');
 const deadline=Number(process.env.WATCH_UNTIL)||1320,stopAt=Date.now()+Number(process.env.WATCH_MAX_MINUTES||325)*60000;
 const today=dateInZone(new Date(),zone);
 const publicRoot=`https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/`;
 let state;try{state=JSON.parse(await readFile(statePath,'utf8'));}catch{state={};}
 if(state.day!==today)state={day:today,games:{},attempts:{}};
 const save=()=>writeFile(statePath,JSON.stringify(state));
 async function request(url,options={}){
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  return r.status===204?null:r.json();
 }
 const github=(path,method='GET',body)=>request(`https://api.github.com/repos/${repo}${path}`,{method,headers:{Authorization:`Bearer ${process.env.GH_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{})});
 while(dateInZone(new Date(),zone)===today&&localMinute()<deadline&&Date.now()<stopAt){
  try{
   if(localMinute()<720){await new Promise(r=>setTimeout(r,60000));continue;}
   let receipt={events:[]};try{receipt=await request(publicRoot+'data/collection-status.json?at='+Date.now());}catch{}
   for(const event of receipt.events||[])for(const g of event.games||[]){
    state.games[g.id]={...state.games[g.id],...g,completedPass:Math.max(state.games[g.id]?.completedPass||0,g.pass||0)};
   }
   const completed=(receipt.events||[]).filter(e=>e.day===today&&e.games?.length).length;
   if(completed>=5){console.log('Daily target of five successful automatic collections reached.');break;}
   const eastern=dateInZone(new Date(),'America/New_York');
   for(const date of [shiftDate(eastern,-1),eastern]){
    const board=await request(`${API}/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replaceAll('-','')}&limit=100`);
    for(const event of board.events||[]){
     if(!event.status?.type?.completed||!/^\d+$/.test(event.id)||state.games[event.id])continue;
     let finalAt=new Date().toISOString(),basis='first-observed-final';
     try{
      const summary=await request(`${API}/apis/site/v2/sports/basketball/nba/summary?event=${event.id}`);
      const end=(summary.plays||[]).filter(p=>/end of.*(?:quarter|period|game)|game end/i.test(p.text||'')&&p.wallclock&&p.period?.number>=(event.status.period||4)).at(-1);
      if(end&&Date.parse(end.wallclock)>=Date.parse(event.date)&&Date.parse(end.wallclock)<=Date.now()){finalAt=end.wallclock;basis='play-by-play-period-end';}
     }catch{}
     state.games[event.id]={id:event.id,date,finalAt,basis,completedPass:0};
    }
   }
   const batch=[];
   for(const g of Object.values(state.games)){
    const pass=duePass(g);if(g.completedPass>=pass||Date.now()-Date.parse(g.finalAt)>=36*3600000||(state.attempts[g.id+':'+pass]||0)>=3)continue;
    if(g.completedPass===1){
     try{const doc=await request(publicRoot+`data/highlights/${g.date}.json?at=${Date.now()}`);const links=doc.games?.[g.id]||[];if(links.some(v=>v.type==='game')&&links.some(v=>v.type==='player')){g.completedPass=2;continue;}}catch{}
    }
    batch.push({...g,pass});
   }
   const runs=await github('/actions/workflows/pages.yml/runs?per_page=20');
   const busy=runs.workflow_runs.some(r=>['queued','in_progress','waiting','pending','requested'].includes(r.status));
   if(batch.length&&!busy){
    await github('/actions/workflows/pages.yml/dispatches','POST',{ref:'main',inputs:{watcher_batch:JSON.stringify({day:today,games:batch})}});
    for(const g of batch)state.attempts[g.id+':'+g.pass]=(state.attempts[g.id+':'+g.pass]||0)+1;
    console.log(`Requested collection for ${batch.length} eligible games.`);
   }
   await save();
   console.log(`Watcher checked ${Object.keys(state.games).length} final games; ${completed}/5 successful automatic collections.`);
  }catch(error){console.warn(`Watcher check failed: ${error.message}; will retry.`);await save();}
  await new Promise(r=>setTimeout(r,Math.min(15*60000,Math.max(1000,(deadline-localMinute())*60000))));
 }
 await save();
}
