// Shared by the browser and the optional GitHub Actions snapshot collector.
export const API = 'https://site.api.espn.com';
export function deviceZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
export function dateInZone(now = new Date(), zone = deviceZone()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k).value).join('-');
}
export function shiftDate(date, offset) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10);
}
// NBA slate remains on the previous Eastern date until 06:00 ET (including DST).
export function nbaDate(now = new Date()) {
  const date = dateInZone(now, 'America/New_York');
  const hour = +new Intl.DateTimeFormat('en-GB', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(now);
  return hour < 6 ? shiftDate(date, -1) : date;
}
export function gameScore(s) {
  return s.pts + .4*s.fgm - .7*s.fga - .4*(s.fta-s.ftm) + .7*s.oreb + .3*s.dreb + s.stl + .7*s.ast + .7*s.blk - .4*s.pf - s.to;
}
const numeric = v => v !== undefined && v !== null && v !== '' && v !== '--' && Number.isFinite(Number(v)) ? Number(v) : null;
const pair = v => /^\d+[-/]\d+$/.test(String(v)) ? String(v).split(/[-/]/).map(Number) : [null, null];
export function parsePlayers(boxscore, teamId) {
  const team = boxscore?.players?.find(t => String(t.team?.id) === String(teamId));
  const players = new Map();
  for (const group of team?.statistics || []) {
    const labels = group.labels || group.names || [];
    for (const row of group.athletes || []) {
      if (row.didNotPlay || !row.stats?.length) continue;
      const v = Object.fromEntries(labels.map((k, i) => [k.toUpperCase(), row.stats[i]]));
      const [fgm, fga] = pair(v.FG), [tpm, tpa] = pair(v['3PT'] ?? v['3P']), [ftm, fta] = pair(v.FT);
      const s = {pts:numeric(v.PTS),reb:numeric(v.REB),ast:numeric(v.AST),stl:numeric(v.STL),blk:numeric(v.BLK),oreb:numeric(v.OREB),dreb:numeric(v.DREB),pf:numeric(v.PF),to:numeric(v.TO),fgm,fga,tpm,tpa,ftm,fta};
      const complete = ['pts','fgm','fga','ftm','fta','oreb','dreb','stl','ast','blk','pf','to'].every(k => s[k] !== null);
      const p = { id:String(row.athlete.id), name:row.athlete.fullName || row.athlete.displayName || 'Unknown player', jersey:row.athlete.jersey ?? null, ...s, rating:complete ? gameScore(s) : null };
      players.set(p.id, p);
    }
  }
  const all = [...players.values()];
  // Never mix incomplete Game Scores with complete scores: fall back for the whole team.
  const ranked = all.every(p => p.rating !== null);
  all.sort((a,b) => (ranked ? b.rating-a.rating : (b.pts??0)-(a.pts??0)) || (b.pts??0)-(a.pts??0) || a.name.localeCompare(b.name));
  return { players:all.slice(0,5), all, ranking:ranked ? 'Game Score' : 'Points · incomplete box score' };
}
export function parseStandings(raw) {
  const result = {};
  for (const conference of raw?.children || []) {
    if (!conference.isConference) continue;
    const entries = conference.standings?.entries || [];
    const stat = (e,k) => e.stats?.find(s=>s.name===k);
    const pct = e => numeric(stat(e,'winPercent')?.value);
    for (const e of entries) {
      const reliable = e.stats?.find(s => ['conferenceRank','rank','playoffSeed'].includes(s.name) && !/project/i.test(s.description||''));
      const fraction = pct(e), ties = fraction === null ? 0 : entries.filter(x=>pct(x)===fraction).length;
      // A standings position without tie-break guesses; '=' visibly marks shared positions.
      const derived = fraction === null ? null : 1 + entries.filter(x=>pct(x)!==null && pct(x)>fraction).length;
      result[e.team.id] = { rank:numeric(reliable?.value) ?? derived, tied:!reliable && ties>1, derived:!reliable, conference:conference.abbreviation, record:stat(e,'overall')?.displayValue || null };
    }
  }
  return result;
}
export function statusText(status = {}) {
  const t = status.type || {};
  if (t.completed || t.state === 'post') return `Final${status.period>4 ? ` / OT${status.period-4}` : ''}`;
  if (t.state === 'in') {
    if (/half|end|delay|suspend/i.test(`${t.name} ${t.description}`)) return t.shortDetail || t.description;
    const p = +status.period;
    return `${p>4 ? `OT${p-4}` : `Q${p||1}`} ${status.displayClock || '—'}`;
  }
  return t.description || 'Scheduled';
}
export function normalizeScoreboard(raw, date, standings = {}) {
  if (!raw || !Array.isArray(raw.events)) throw new Error('Scoreboard format changed');
  return {
    schema:1, date, updatedAt:new Date().toISOString(), source:'ESPN', games:raw.events.map(e => {
      const c = e.competitions?.[0];
      if (!c?.competitors || c.competitors.length !== 2) return null;
      const status = e.status || c.status || {};
      const team = side => {
        const t = c.competitors.find(x=>x.homeAway===side); if (!t) throw new Error('Missing team');
        const standing = standings[t.id];
        const seed = numeric(t.curatedRank?.current);
        return { id:String(t.id), code:t.team.abbreviation, name:t.team.displayName, color:/^[0-9a-f]{6}$/i.test(t.team.color||'') ? `#${t.team.color}` : '#7589ab', score:numeric(t.score), periods:(t.linescores||[]).map((line,index)=>({period:numeric(line.period)??index+1,score:numeric(line.value??line.displayValue)})).filter(line=>Number.isInteger(line.period)&&line.period>0), record:t.records?.find(r=>r.type==='total'||r.name==='overall')?.summary || standing?.record || null, rank:standing?.rank ?? (seed>0 && seed<=15 ? seed : null), tied:standing?.tied||false, rankDerived:standing?.derived||false, conference:standing?.conference||'', players:[], ranking:'Game Score' };
      };
      return {id:String(e.id), start:e.date, period:numeric(status.period)??0, state:status.type?.completed ? 'post' : (status.type?.state||'pre'), status:statusText(status), away:team('away'), home:team('home'), notes:[], detailsUpdatedAt:null, detailsError:false, venue:c.venue?.fullName||''};
    }).filter(Boolean)
  };
}
export function scoringRun(plays, game) {
  // Sequence numbers, not timestamps, define order; score corrections break the run.
  const ordered = [...plays].filter(p=>Number.isFinite(+p.sequenceNumber)).sort((a,b)=>+a.sequenceNumber- +b.sequenceNumber);
  let previous=null, side=null, points=0, best=null, last=null;
  for (const p of ordered) {
    const away=numeric(p.awayScore), home=numeric(p.homeScore);
    if (away===null||home===null) { previous=null; side=null; points=0; continue; }
    if (!previous) { previous={away,home}; continue; }
    const da=away-previous.away, dh=home-previous.home; previous={away,home};
    if (!da&&!dh) continue;
    if (da<0||dh<0) return null; // A corrected feed cannot substantiate an uninterrupted run.
    if ((da&&dh)||Math.max(da,dh)>4) { side=null;points=0;continue; }
    const next=da>0?'away':'home'; points=side===next ? points+da+dh : da+dh; side=next;
    last={side,points,period:p.period?.number,clock:p.clock?.displayValue};
    if (!best||points>=best.points) best={...last};
  }
  const run=game.state==='in' && last?.points>=8 ? last : best;
  if (!run||run.points<10) return null;
  // Live wording only if this really is the trailing uninterrupted scoring sequence.
  const active=game.state==='in' && last?.side===run.side && last?.points===run.points;
  return `${game[run.side].code} ${active?'on':'had'} ${/^(8|11|18)$/.test(String(run.points))?'an':'a'} ${run.points}–0 run${run.period ? ` · ${run.period>4?'OT'+(run.period-4):'Q'+run.period} ${run.clock||''}` : ''}`;
}
export function isHighlightedStat(key, value) {
  const thresholds = {pts:20, reb:10, ast:10, stl:4, blk:4};
  return value != null && Number.isFinite(Number(value)) && thresholds[key] !== undefined && Number(value) >= thresholds[key];
}
export function makeNotes(game, allPlayers, plays=[]) {
  const notes=[], run=scoringRun(plays, game);
  if(run) notes.push(run);
  const complete=allPlayers.every(p=>p.rating!==null);
  const players=[...allPlayers].sort((a,b)=>complete?b.rating-a.rating:(b.pts??0)-(a.pts??0));
  const first=players.find(p=>[p.pts,p.reb,p.ast,p.stl,p.blk].filter(v=>v>=10).length>=3);
  const summary=p=>[['pts','PTS'],['reb','REB'],['ast','AST'],['stl','STL'],['blk','BLK']]
    .filter(([key])=>isHighlightedStat(key,p[key])).map(([key,label])=>`${p[key]} ${label}`).join(' · ');
  if(first) notes.push(`${first.name}: ${summary(first)} (triple-double)`);
  if(notes.length<2) {
    const notable=players.find(p=>p!==first && ['pts','reb','ast','stl','blk'].some(key=>isHighlightedStat(key,p[key])));
    if(notable) notes.push(`${notable.name}: ${summary(notable)}`);
  }
  return notes.slice(0,2);
}
export function applySummary(game, summary) {
  if (!summary?.boxscore || !Array.isArray(summary.boxscore.players)) throw new Error('Player stats unavailable');
  const away=parsePlayers(summary.boxscore,game.away.id), home=parsePlayers(summary.boxscore,game.home.id);
  if(!away.all.length || !home.all.length) throw new Error('Player stats pending');
  return {...game, away:{...game.away,players:away.players,ranking:away.ranking},home:{...game.home,players:home.players,ranking:home.ranking},notes:makeNotes(game,[...away.all,...home.all],summary.plays||[]),detailsUpdatedAt:new Date().toISOString(),detailsError:false};
}
export async function getJSON(url, {timeout=9000,fetcher=globalThis.fetch}={}) {
  const response=await fetcher(url,{signal:AbortSignal.timeout(timeout),cache:'no-store',credentials:'omit'});
  if(!response.ok) throw new Error(`Feed returned ${response.status}`);
  return response.json();
}
export async function mapLimit(items, limit, fn) {
  let cursor=0; await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;await fn(items[i],i);}}));
}
const feedCache=new Map();
export async function loadSlate(date,{onProgress=()=>{},previous=null,fetchJSON=getJSON}={}) {
  let raw;
  const url=`${API}/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replaceAll('-','')}&limit=100`;
  try {raw=await fetchJSON(url);} catch {raw=await fetchJSON(url);}
  const slate=normalizeScoreboard(raw,date);
  // Render scores immediately, then fill standings and player tables in bounded parallel work.
  for(const game of slate.games) {
    const old=previous?.date===date ? previous.games?.find(g=>g.id===game.id) : null;
    if(old && game.state!=='pre') {
      for(const side of ['away','home']) Object.assign(game[side],{players:old[side].players||[],ranking:old[side].ranking||'Game Score'});
      game.detailsUpdatedAt=old.detailsUpdatedAt; game.detailsError=!!old.detailsUpdatedAt;
    }
  }
  onProgress(structuredClone(slate));
  const season=raw.season?.year || raw.leagues?.[0]?.season?.year;
  const standingsJob=(async()=>{
    try {
      const key=`standings-${season}`, cached=feedCache.get(key);
      const table=cached && Date.now()-cached.time<3600000 ? cached.value : parseStandings(await fetchJSON(`${API}/apis/v2/sports/basketball/nba/standings${season?`?season=${season}`:''}`));
      feedCache.set(key,{value:table,time:Date.now()});
      for(const game of slate.games) for(const side of ['away','home']) {
        const s=table[game[side].id];
        if(s) Object.assign(game[side],{rank:s.rank,tied:s.tied,rankDerived:s.derived,conference:s.conference});
      }
      onProgress(structuredClone(slate));
    } catch { slate.standingsUnavailable=true; }
  })();
  await mapLimit(slate.games.filter(g=>g.state!=='pre'),3,async(game)=>{
    const old=previous?.games?.find(g=>g.id===game.id);
    // Final boxes are stable enough to reuse for ten minutes; scores always fetch afresh.
    if(game.state==='post' && old?.state==='post' && old.detailsUpdatedAt && !old.detailsError && Date.now()-Date.parse(old.detailsUpdatedAt)<600000) {game.notes=old.notes;game.detailsError=false;return;}
    try {
      const result=applySummary(game,await fetchJSON(`${API}/apis/site/v2/sports/basketball/nba/summary?event=${game.id}`));
      Object.assign(game,result);
    } catch {game.detailsError=true;}
    onProgress(structuredClone(slate));
  });
  await standingsJob;
  return slate;
}
