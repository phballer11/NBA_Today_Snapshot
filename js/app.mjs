import {deviceZone,nbaDate,dateInZone,shiftDate,loadSlate,getJSON} from './data.mjs';
import {esc,time,shortDate,zoneLabel,playerTable,quarterTable} from './view.mjs';
import {highlightSection,validHighlights} from './highlights.mjs';
const $=s=>document.querySelector(s);
const store={get(k){try{return JSON.parse(localStorage.getItem(k));}catch{return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{/* Private mode/quota: network path remains usable. */}}};
const prefix='nba-today-snapshot-v2:';
let followingLatest=true;
let selected=nbaDate(),slate=null,source='',generation=0,timer=null,refreshing=false,problem='';
const highlightDocs=new Map(),highlightFetchTimes=new Map();
let highlightLoading=false,highlightRequest=0;
async function loadHighlights(date,force=false){
  if(!force && Date.now()-(highlightFetchTimes.get(date)||0)<300000){highlightRequest++;highlightLoading=false;return;}
  const request=++highlightRequest;highlightLoading=true;
  const stored=store.get(prefix+'highlights:'+date);
  if(stored&&!highlightDocs.has(date)){const valid=validHighlights(stored,date);if(valid)highlightDocs.set(date,valid);}
  if(slate?.date===date)render();
  try{
    const raw=await getJSON(new URL(`../data/highlights/${date}.json`,import.meta.url),{timeout:6000});
    const valid=validHighlights(raw,date);if(!valid)throw new Error('Invalid highlights');
    highlightDocs.set(date,valid);store.set(prefix+'highlights:'+date,valid);
    const prior=store.get(prefix+'highlight-dates')||[],dates=[date,...prior.filter(d=>d!==date)].slice(0,10);store.set(prefix+'highlight-dates',dates);
    try{for(const old of prior.filter(d=>!dates.includes(d)))localStorage.removeItem(prefix+'highlights:'+old);}catch{}
  }catch{/* A missing artifact or network outage must not erase saved links. */}
  finally{
    highlightFetchTimes.set(date,Date.now());
    if(request===highlightRequest){highlightLoading=false;if(selected===date&&slate)render();}
  }
}
function age(d){const min=Math.max(0,Math.floor((Date.now()-Date.parse(d))/60000));return min<1?'just now':min<60?`${min}m ago`:min<1440?`${Math.floor(min/60)}h ${min%60}m ago`:`${Math.floor(min/1440)}d ago`;}
function save(data){store.set(prefix+data.date,data);const keys=store.get(prefix+'dates')||[];const dates=[data.date,...keys.filter(d=>d!==data.date)].slice(0,5);store.set(prefix+'dates',dates);try{for(const d of keys.filter(d=>!dates.includes(d)))localStorage.removeItem(prefix+d);}catch{}}
function cached(date){const d=store.get(prefix+date);return d?.schema===1 && d.date===date && Array.isArray(d.games) && Date.now()-Date.parse(d.updatedAt)<7*86400000?d:null;}
function rank(t){return `${t.rank ? `${t.conference?esc(t.conference)+' ':''}#${esc(t.rank)}${t.tied?'=':''} · `:''}${esc(t.record||'Record unavailable')}`;}
const stat=v=>v===null||v===undefined?'—':esc(v);
function team(t,side){return `<div class="team-score ${side}"><span class="team-code">${esc(t.code)}</span><span class="team-name">${esc(t.name)}</span><span class="team-record" title="${t.rankDerived?'Conference position by win percentage; = marks ties; no tie-break assumptions':'Latest available conference position and season record'}">${rank(t)}</span></div>`;}
function gameCard(g){const live=g.state==='in',observed=source!=='ESPN'||Date.now()-Date.parse(slate.updatedAt)>180000,started=g.state!=='pre',final=g.state==='post';const aWin=final && g.away.score>g.home.score,hWin=final && g.home.score>g.away.score;return `<article id="game-${esc(g.id)}" tabindex="-1" class="game ${live?'is-live':''}" aria-label="${esc(g.away.name)} at ${esc(g.home.name)}, ${esc(g.status)}"><div class="game-top"><span class="status ${final?'final':''}">${live?`<i class="live-dot" aria-hidden="true"></i> ${observed?'LAST SEEN':'LIVE'} · `:''}${esc(g.status)}</span><span class="tip">${g.start?`${esc(shortDate(g.start))} · ${esc(time(g.start))} ${esc(zoneLabel(g.start))}`:''}</span></div><div class="scoreboard">${team(g.away,'away')}<div><div class="score-pair"><span class="${final&&!aWin?'dim':''}">${started?stat(g.away.score):'—'}</span><span class="dash">:</span><span class="${final&&!hWin?'dim':''}">${started?stat(g.home.score):'—'}</span></div><span class="at">AWAY / HOME</span></div>${team(g.home,'home')}</div>${quarterTable(g)}${g.notes?.length?`<div class="notes"><p class="note-label">GAME NOTES${g.detailsError?' · SAVED':''}</p>${g.notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:''}${started?`<div class="team-boxes">${playerTable(g.away)}${playerTable(g.home)}</div>`:`<div class="pending">${esc(g.venue)}${g.venue?' · ':''}Tip-off in your local time above.<br>Top performers appear when the game begins.</div>`}${g.detailsError?`<div class="pending">${g.detailsUpdatedAt?`Player stats saved ${esc(age(g.detailsUpdatedAt))}.`: 'Player stats temporarily unavailable.'} Scores and player stats may update separately.</div>`:''}<div class="card-foot"><span>${started?`Box ${g.detailsUpdatedAt?esc(age(g.detailsUpdatedAt)):'pending'}`:'SCHEDULED'} · ${esc(g.away.code)} AT ${esc(g.home.code)}</span><a href="https://www.espn.com/nba/game/_/gameId/${encodeURIComponent(g.id)}" target="_blank" rel="noopener noreferrer" aria-label="Full ${esc(g.away.code)} at ${esc(g.home.code)} game on ESPN">Game ↗</a></div>${highlightSection(g,highlightDocs.get(selected),highlightLoading)}</article>`;}
function updateHeader(){
  const now=new Date(),zone=deviceZone();
  $('#title').innerHTML=`NBA <span>${esc(new Intl.DateTimeFormat(undefined,{timeZone:zone,day:'numeric',month:'short',year:'numeric'}).format(now))}</span>`;
  document.title=`NBA ${dateInZone(now)} · Today Snapshot`;
  $('#date').value=selected;
  $('#local-date').textContent=new Intl.DateTimeFormat(undefined,{timeZone:zone,weekday:'short',hour:'numeric',minute:'2-digit'}).format(now);
  $('#timezone').textContent=zone.replaceAll('_',' ');
  $('#date-note').textContent=`NBA game date: ${selected} (US Eastern) · Tip-offs in your local time`;
  if(slate) $('#updated').textContent=`${source}${Date.now()-Date.parse(slate.updatedAt)>180000?' · STALE':''} · Updated ${time(slate.updatedAt)} ${zoneLabel(slate.updatedAt)} · ${age(slate.updatedAt)}`;
}
function render(){
  updateHeader();if(!slate)return;
  const priority={in:0,post:1,pre:2};
  const list=[...slate.games].sort((a,b)=>(priority[a.state]??3)-(priority[b.state]??3)||Date.parse(a.start)-Date.parse(b.start));
  const active=document.activeElement,activeTable=active?.classList?.contains('table-wrap')?active.getAttribute('aria-label'):null;
  const activeJump=active?.closest?.('[data-game-link]')?.getAttribute('href'),activeVideo=active?.closest?.('[data-video-id]')?.dataset.videoId;
  const scrolls=[...document.querySelectorAll('.table-wrap')].map(el=>[el.getAttribute('aria-label'),el.scrollLeft]);
  $('#game-count').textContent=`${list.length} ${list.length===1?'game':'games'}`;
  $('#game-nav').innerHTML=list.map(g=>`<a data-game-link href="#game-${esc(g.id)}" class="game-jump ${g.state==='in'?'jump-live':''}" aria-label="Jump to ${esc(g.away.name)} at ${esc(g.home.name)}">${g.state==='in'?'<i class="live-dot" aria-hidden="true"></i>':''}<span>${esc(g.away.code)} <span class="jump-at">at</span> ${esc(g.home.code)}</span></a>`).join('');
  $('#games').innerHTML=list.length?list.map(gameCard).join(''):'<div class="empty"><h2>A quiet day on the court.</h2><p>No games on this NBA date. Try the arrows for another slate.</p></div>';
  for(const [label,left]of scrolls){const el=[...document.querySelectorAll('.table-wrap')].find(e=>e.getAttribute('aria-label')===label);if(el)el.scrollLeft=left;}
  if(activeTable)[...document.querySelectorAll('.table-wrap')].find(e=>e.getAttribute('aria-label')===activeTable)?.focus({preventScroll:true});
  if(activeJump)[...document.querySelectorAll('[data-game-link]')].find(e=>e.getAttribute('href')===activeJump)?.focus({preventScroll:true});
  if(activeVideo)[...document.querySelectorAll('[data-video-id]')].find(e=>e.dataset.videoId===activeVideo)?.focus({preventScroll:true});
  $('#games').setAttribute('aria-busy','false');$('#notice').hidden=!problem;$('#notice').textContent=problem;
}
function hasLiveGames(){return slate?.date===selected&&slate.games.some(g=>g.state==='in');}
function stopPolling(){clearTimeout(timer);timer=null;}
function schedule(){stopPolling();if(document.hidden||!hasLiveGames())return;timer=setTimeout(()=>refresh(false),30000);}
async function refresh(manual=false){if(refreshing)return;refreshing=true;const token=++generation,date=selected;$('#refresh').disabled=true;$('#refresh').setAttribute('aria-label','Refreshing scores');let gotNetwork=false;loadHighlights(date,manual);
try{const result=await loadSlate(date,{previous:slate,onProgress:data=>{if(token!==generation)return;gotNetwork=true;slate=data;source='ESPN';problem='';render();}});if(token!==generation)return;slate=result;source='ESPN';problem=result.games.some(g=>g.detailsError)?'Some player stats are delayed. Scores are available; saved stats are marked.':result.standingsUnavailable?'Conference positions are temporarily unavailable.':'';save(result);render();$('#announcement').textContent=manual?'Scores refreshed.':'';}
catch{if(token!==generation)return;if(!gotNetwork){let snapshot=null;try{const raw=await getJSON(new URL(`../data/${date}.json`,import.meta.url),{timeout:6000});if(raw.schema===1&&raw.date===date&&Array.isArray(raw.games)&&Number.isFinite(Date.parse(raw.updatedAt)))snapshot=raw;}catch{/* Try last viewed data. */}const saved=cached(date);slate=[snapshot,saved].filter(Boolean).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0]||null;source=slate===snapshot&&snapshot?'Snapshot':'Saved';}
problem=navigator.onLine?'Live feed unavailable. Showing the newest saved data if available. Try Refresh shortly.':'Offline. Showing the last saved slate if available.';
if(slate)render();else{$('#games').innerHTML='<div class="empty"><h2>Scores couldn’t load.</h2><p>No saved data for this NBA date yet. Check your connection, then tap Refresh.</p><a href="https://www.espn.com/nba/scoreboard">Open ESPN ↗</a></div>';$('#games').setAttribute('aria-busy','false');$('#notice').hidden=false;$('#notice').textContent=problem;$('#updated').textContent='No data available';}}
finally{if(token===generation){refreshing=false;$('#refresh').disabled=false;$('#refresh').setAttribute('aria-label','Refresh scores');schedule();}}}
function changeDate(date){followingLatest=date===nbaDate();if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;stopPolling();generation++;refreshing=false;selected=date;slate=cached(date);source='Saved';problem='';highlightLoading=true;if(slate)render();else{$('#game-nav').innerHTML='';$('#game-count').textContent='Loading…';$('#games').innerHTML='<div class="skeleton" aria-label="Loading games"></div><div class="skeleton" aria-hidden="true"></div>';$('#games').setAttribute('aria-busy','true');$('#notice').hidden=true;$('#updated').textContent='Connecting…';updateHeader();}refresh();}
$('#refresh').addEventListener('click',()=>refresh(true));$('#prev').addEventListener('click',()=>changeDate(shiftDate(selected,-1)));$('#next').addEventListener('click',()=>changeDate(shiftDate(selected,1)));$('#today').addEventListener('click',()=>changeDate(nbaDate()));$('#date').addEventListener('change',e=>changeDate(e.target.value));
$('#game-nav').addEventListener('click',event=>{
  const link=event.target.closest('[data-game-link]');if(!link)return;
  const target=document.getElementById(link.getAttribute('href').slice(1));
  if(target){event.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target.focus({preventScroll:true});}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPolling();else{if(followingLatest&&selected!==nbaDate()){changeDate(nbaDate());return;}updateHeader();if(!slate||hasLiveGames()&&Date.now()-Date.parse(slate.updatedAt)>25000)refresh();else schedule();}});window.addEventListener('online',()=>{if(!document.hidden&&(!slate||hasLiveGames()))refresh();else if(slate){problem='';render();}});window.addEventListener('offline',()=>{problem='Offline. Scores and clocks show their last observed values.';render();});
setInterval(updateHeader,15000);updateHeader();slate=cached(selected);if(slate){source='Saved';render();}refresh();
if('serviceWorker'in navigator)navigator.serviceWorker.register(new URL('../sw.js',import.meta.url),{scope:new URL('../',import.meta.url).pathname}).catch(()=>{/* Normal browser fetching still works. */});
