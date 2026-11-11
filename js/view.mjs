import {isHighlightedStat,deviceZone} from './data.mjs';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(date));
export const shortDate=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,day:'numeric',month:'short'}).format(new Date(date));
export const zoneLabel=(date=new Date(),zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(date)).find(p=>p.type==='timeZoneName')?.value||zone;
const stat=value=>value===null||value===undefined?'—':esc(value);
const shooting=(made,attempted)=>made==null||attempted==null?'—':`${stat(made)}/${stat(attempted)}`;
export function playerTable(team){
  const columns=[['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO'],['fg','FG'],['three','3PT'],['ft','FT']];
  return `<section class="box"><div class="box-heading" data-view-key="box-${esc(team.code)}"><h3>${esc(team.code)}</h3><span>Box Score${team.ranking==='Game Score'?'':' · '+esc(team.ranking)}</span></div>${team.players.length?`
    <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(team.name)} player statistics">
      <table class="stats" role="table"><caption class="sr-only">${esc(team.name)} players ranked by ${esc(team.ranking)}. Shooting is made / attempted.</caption>
      <thead><tr role="row"><th class="player-label" scope="col" role="columnheader">PLAYER</th>${columns.map(([,label])=>`<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead>
      <tbody>${team.players.map(player=>`<tr role="row" data-view-key="player-${esc(team.code)}-${esc(player.name)}"><th scope="row" role="rowheader" class="player" title="${player.rating==null?'Game Score unavailable':`Game Score ${player.rating.toFixed(1)}`}">${esc(player.name)} <span class="jersey">${player.jersey!=null?'#'+esc(player.jersey):''}</span></th>${columns.map(([key])=>`<td role="cell" class="${key==='to' && player.to>=5?'stat-turnover':isHighlightedStat(key,player[key])?'stat-highlight':((key==='reb'||key==='ast') && player[key]>=5 && player[key]<10 || key==='pts' && player.pts>=10 && player.pts<20)?'stat-secondary':''}">${key==='fg'?shooting(player.fgm,player.fga):key==='three'?shooting(player.tpm,player.tpa):key==='ft'?shooting(player.ftm,player.fta):stat(player[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>`:'<p class="muted">Player stats have not arrived yet.</p>'}</section>`;
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
