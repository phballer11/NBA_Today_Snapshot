import {isHighlightedStat,deviceZone} from './data.mjs';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const time=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(date));
export const shortDate=(date,zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,day:'numeric',month:'short'}).format(new Date(date));
export const zoneLabel=(date=new Date(),zone=deviceZone())=>new Intl.DateTimeFormat(undefined,{timeZone:zone,timeZoneName:'short'}).formatToParts(new Date(date)).find(p=>p.type==='timeZoneName')?.value||zone;
const stat=value=>value===null||value===undefined?'—':esc(value);
const shooting=(made,attempted)=>made==null||attempted==null?'—':`${stat(made)}/${stat(attempted)}`;
export function playerTable(team){
  const columns=[['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK'],['to','TO'],['fg','FG'],['three','3PT'],['ft','FT']];
  return `<section class="box"><div class="box-heading"><h3>${esc(team.code)}</h3><span>Box Score${team.ranking==='Game Score'?'':' · '+esc(team.ranking)}</span></div>${team.players.length?`
    <div class="table-wrap" tabindex="0" role="region" aria-label="${esc(team.name)} player statistics">
      <table class="stats" role="table"><caption class="sr-only">${esc(team.name)} players ranked by ${esc(team.ranking)}. Shooting is made / attempted.</caption>
      <thead><tr role="row"><th class="player-label" scope="col" role="columnheader">PLAYER</th>${columns.map(([,label])=>`<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead>
      <tbody>${team.players.map(player=>`<tr role="row"><th scope="row" role="rowheader" class="player" title="${player.rating==null?'Game Score unavailable':`Game Score ${player.rating.toFixed(1)}`}">${esc(player.name)} <span class="jersey">${player.jersey!=null?'#'+esc(player.jersey):''}</span></th>${columns.map(([key])=>`<td role="cell" class="${key==='to' && player.to>=5?'stat-turnover':isHighlightedStat(key,player[key])?'stat-highlight':''}">${key==='fg'?shooting(player.fgm,player.fga):key==='three'?shooting(player.tpm,player.tpa):key==='ft'?shooting(player.ftm,player.fta):stat(player[key])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>`:'<p class="muted">Player stats have not arrived yet.</p>'}</section>`;
}
