import {esc} from './view.mjs';
const CHANNELS=new Map([['UCEjOSbbaOfgnfRODEEMYlCw','FreeDawkins'],['UCWJ2lWNubArHWmf3FIHbfcQ','NBA'],['UCPVpbXIiIDwDKVvu68-Vb-A','NBA Japan']]);
export function validHighlights(raw,date){
 if(raw?.schema!==1||raw.date!==date||!raw.games||!Number.isFinite(Date.parse(raw.checkedAt)))return null;
 const games={};
 for(const [gameId,links]of Object.entries(raw.games)){
  if(!/^\d+$/.test(gameId)||!Array.isArray(links))continue;
  games[gameId]=[...new Map(links.filter(link=>link.gameDate===date&&/^[\w-]{11}$/.test(link.id)&&CHANNELS.has(link.channelId)&&['game','player'].includes(link.type)).map(link=>[link.id,{...link,channel:CHANNELS.get(link.channelId)}])).values()];
 }
 return {...raw,games};
}
const WORKFLOW='https://github.com/phballer11/NBA_Today_Snapshot/actions/workflows/pages.yml';
function freshnessInfo(checkedAt){
 const ago=checkedAt?Math.max(0,Math.floor((Date.now()-Date.parse(checkedAt))/60000)):null;
 const elapsed=ago===null?'':ago<1?'just now':ago<60?`${ago}m ago`:ago<1440?`${Math.floor(ago/60)}h ago`:`${Math.floor(ago/1440)}d ago`;
 return {stale:ago===null||ago>=60,text:ago===null?'Video links have not been checked yet.':`Video links checked ${elapsed}${ago>=60?' · Update overdue':''}`};
}
export function updateHighlightFreshness(){
 for(const el of document.querySelectorAll('[data-highlight-checked]')){
  const info=freshnessInfo(el.dataset.highlightChecked);
  el.querySelector('.highlight-age').textContent=info.text;
  el.classList.toggle('is-stale',info.stale);
  el.querySelector('.collect-videos').hidden=!info.stale;
 }
}
export function highlightSection(game,document,loading=false){
 const links=document?.games[game.id]||[],full=links.filter(v=>v.type==='game'),players=links.filter(v=>v.type==='player');
 const link=video=>{
  const names=video.channelId==='UCPVpbXIiIDwDKVvu68-Vb-A'&&video.type==='player'?[...new Set((Array.isArray(video.players)?video.players:[]).map(p=>p?.name).filter(name=>typeof name==='string'&&name.trim()))].join(', '):'';
  return `<a class="video-link" data-view-key="video-${esc(video.id)}" data-video-id="${esc(video.id)}" href="https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}" target="_blank" rel="noopener noreferrer" aria-label="${names?esc(names)+' · ':''}${esc(video.title)} on ${esc(video.channel)}"><span class="video-link-title">${names?`<span class="video-player-name" lang="en">${esc(names)}</span> · `:''}${esc(video.title)}<span aria-hidden="true"> ↗</span></span><span class="video-source">${esc(video.channel)}</span></a>`;
 };
 const freshness=freshnessInfo(document?.checkedAt);
 const empty=game.state==='pre'?'Highlights appear after the game.':loading?'Checking saved highlight links…':document?.sources?.length && document.sources.every(source=>!source.ok)?'Video lookup is temporarily unavailable.':document?'No game-matched videos found yet.':'Highlight links have not been collected for this date yet.';
 return `<section class="highlights" aria-label="YouTube highlights for ${esc(game.away.code)} at ${esc(game.home.code)}"><div class="highlights-heading" data-view-key="highlights"><h3>YouTube highlights</h3>${links.length?`<span>${links.length} ${links.length===1?'video':'videos'}</span>`:''}</div>${full.length?`<h4>Full game</h4><div class="video-list">${full.map(link).join('')}</div>`:''}${players.length?`<h4>Player highlights</h4><div class="video-list">${players.map(link).join('')}</div>`:''}${!links.length?`<p class="highlights-empty">${empty}</p>`:''}<div class="highlights-freshness ${freshness.stale?'is-stale':''}" data-highlight-checked="${esc(document?.checkedAt||'')}"><span class="highlight-age">${freshness.text}</span>${document?.lookupPartial?'<span> · Some lookups unavailable; saved matches retained.</span>':''}<a class="collect-videos" href="${WORKFLOW}" target="_blank" rel="noopener noreferrer"${freshness.stale?'':' hidden'} aria-label="Open GitHub Actions to collect video links; repository access required">Collect video links on GitHub ↗</a></div></section>`;
}
