const status=document.querySelector('#admin-status');
const repo='https://api.github.com/repos/phballer11/NBA_Today_Snapshot';
const read=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Unavailable');return r.json();};
const results=await Promise.allSettled([read('./data/collection-status.json?at='+Date.now()),read(repo+'/actions/workflows/watch-games.yml/runs?per_page=5')]);
const parts=[];
if(results[0].status==='fulfilled')parts.push('Last successful published collection: '+new Date(results[0].value.collectedAt).toLocaleString());else parts.push('Collection receipt unavailable.');
if(results[1].status==='fulfilled'){const runs=results[1].value.workflow_runs;const active=runs.find(r=>r.status==='in_progress');parts.push(active?'Watcher workflow running (may include startup/handoff).':runs[0]?'Latest watcher: '+runs[0].status+' · '+(runs[0].conclusion||'pending'):'No watcher runs yet.');}else parts.push('Watcher status unavailable; use GitHub controls.');
status.textContent=parts.join(' ');
