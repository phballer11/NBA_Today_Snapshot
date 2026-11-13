import {isHighlightedStat,deviceZone} from './data.mjs';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(date));
export const shortDate=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,day:'numeric',month:'short'}).format(new Date(date));
export const zoneLabel=(date=new Date(),zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(date)).find(p=>p.type==='timeZoneName')?.value||zone;
const stat=value=>value===null||value===undefined?'—':esc(value);
const shooting=(made,attempted)=>made==null||attempted==null?'—':`${stat(made)}/${stat(attempted)}`;
export function playerTable(team,gameId=''){
 const key=`${gameId}-${team.id}`,roster=team.roster||[];
 const starters=roster.filter(p=>p.starter),bench=roster.filter(p=>!p.starter);
 const columns=[['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO'],['fg','FG'],['three','3PT'],['ft','FT']];
 const rows=players=>players.map(player=>`<tr role="row" data-view-key="player-${esc(team.code)}-${esc(player.name)}"><th scope="row" role="rowheader" class="player">${esc(player.name)} <span class="jersey">${player.jersey!=null?'#'+esc(player.jersey):''}</span></th>${columns.map(([k])=>`<td role="cell" class="${k==='to'&&player.to>=5?'stat-turnover':isHighlightedStat(k,player[k])?'stat-highlight':((k==='reb'||k==='ast')&&player[k]>=5&&player[k]<10||k==='pts'&&player.pts>=10&&player.pts<20)?'stat-secondary':''}">${k==='fg'?shooting(player.fgm,player.fga):k==='three'?shooting(player.tpm,player.tpa):k==='ft'?shooting(player.ftm,player.fta):stat(player[k])}</td>`).join('')}</tr>`).join('');
 const table=(players,header=true)=>`<table class="stats" role="table"><caption class="sr-only">${esc(team.name)} played roster, starters then bench. Shooting is made / attempted.</caption>${header?`<thead><tr role="row"><th class="player-label" scope="col">PLAYER</th>${columns.map(([,label])=>`<th scope="col">${label}</th>`).join('')}</tr></thead>`:''}<tbody>${rows(players)}</tbody></table>`;
 return `<section class="box" data-box-key="${esc(key)}"><div class="box-heading" data-view-key="box-${esc(team.code)}"><h3>${esc(team.code)}</h3><span>Box Score · Full roster</span></div><div class="table-wrap roster-viewport" tabindex="0" role="region" aria-label="${esc(team.name)} player statistics">${roster.length?`${table(starters)}${bench.length?`<div class="bench-divider">Bench</div>${table(bench,true)}`:''}`:'<p class="muted">Full roster is loading. Refresh if it remains unavailable.</p>'}</div></section>`;
}

export function quarterTable(game){
  const reported=[...(game.away.periods||[]),...(game.home.periods||[])];
  const count=Math.max(4,game.period||0,...reported.map(line=>line.period));
  const periods=Array.from({length:count},(_,i)=>i+1);
  const label=period=>period<=4?`Q${period}`:`OT${period-4}`;
  const current=period=>game.state==='in' && game.period===period;
  const value=(team,period)=>{
    if(game.state==='pre'||game.state==='in' && period>game.period)return '—';
    return stat(team.periods?.find(line=>line.period===period)?.score);
  };
  return `<div class="quarter-wrap" data-view-key="quarters" tabindex="0" role="region" aria-label="${esc(game.away.code)} at ${esc(game.home.code)} quarter scoring"><table class="quarter-scores"><caption class="sr-only">Scoring by quarter${game.state==='in' && game.period>0?`; ${label(game.period)} is in progress`:''}. Missing or unplayed periods show a dash.</caption><thead><tr><th scope="col">TEAM</th>${periods.map(period=>`<th scope="col" class="${current(period)?'current-period':''}"${current(period)?' aria-label="'+label(period)+' in progress"':''}>${label(period)}</th>`).join('')}<th scope="col">T</th></tr></thead><tbody>${[game.away,game.home].map(team=>`<tr><th scope="row">${esc(team.code)}</th>${periods.map(period=>`<td>${value(team,period)}</td>`).join('')}<td class="quarter-total">${game.state==='pre'?'—':stat(team.score)}</td></tr>`).join('')}</tbody></table></div>`;
}
