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
const numeric = v => v !== undefined && v !== null && v !== '' && v !== '--' && Number.isFinite(Number(v)) ? Number(v) : null;
const pair = v => /^\d+[-/]\d+$/.test(String(v)) ? String(v).split(/[-/]/).map(Number) : [null, null];
export function sortGames(games){const order={in:0,post:1,pre:2};return [...games].sort((a,b)=>(order[a.state]??3)-(order[b.state]??3)||((a.state==='pre'?1:-1)*(Date.parse(a.state==='post'?(a.finishedAt||a.start):a.start)-Date.parse(b.state==='post'?(b.finishedAt||b.start):b.start)))||String(a.id).localeCompare(String(b.id)));}
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
      const p = { starter:row.starter===true, minutes:v.MIN??null, id:String(row.athlete.id), name:row.athlete.fullName || row.athlete.displayName || 'Unknown player', jersey:row.athlete.jersey ?? null, ...s };
      players.set(p.id, p);
    }
  }
  const all = [...players.values()];
  return { players:all, all, ranking:'Roster' };
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
export function isHighlightedStat(key, value) {
  const thresholds = {pts:20, reb:10, ast:10, stl:4, blk:4};
  return value != null && Number.isFinite(Number(value)) && thresholds[key] !== undefined && Number(value) >= thresholds[key];
}
export function applySummary(game, summary) {
  if (!summary?.boxscore || !Array.isArray(summary.boxscore.players)) throw new Error('Player stats unavailable');
  const away=parsePlayers(summary.boxscore,game.away.id), home=parsePlayers(summary.boxscore,game.home.id);
  if(!away.all.length || !home.all.length) throw new Error('Player stats pending');
  const end=game.state==='post'?(summary.plays||[]).filter(p=>p.wallclock&&p.period?.number>=Math.max(4,game.period||0)&&/end of.*(?:quarter|period|game)|game end/i.test(p.text||'')).at(-1)?.wallclock:null;
  return {...game, finishedAt:end||game.finishedAt||null, away:{...game.away,players:away.players,roster:away.all,ranking:away.ranking},home:{...game.home,players:home.players,roster:home.all,ranking:home.ranking},notes:[],detailsUpdatedAt:new Date().toISOString(),detailsError:false};
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
      for(const side of ['away','home']) Object.assign(game[side],{players:old[side].roster||old[side].players||[],roster:old[side].roster||null,ranking:old[side].ranking||'Game Score'});
      game.finishedAt=old.finishedAt||null;game.detailsUpdatedAt=old.detailsUpdatedAt; game.detailsError=!!old.detailsUpdatedAt;
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
    if(game.state==='post' && old?.state==='post' && old.detailsUpdatedAt && !old.detailsError && old.away.roster && old.home.roster && Date.now()-Date.parse(old.detailsUpdatedAt)<600000) {game.notes=old.notes;game.detailsError=false;return;}
    try {
      const result=applySummary(game,await fetchJSON(`${API}/apis/site/v2/sports/basketball/nba/summary?event=${game.id}`));
      Object.assign(game,result);
    } catch {game.detailsError=true;}
    onProgress(structuredClone(slate));
  });
  await standingsJob;
  return slate;
}
