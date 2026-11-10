// Key-free, build-time discovery. Public YouTube RSS first, public HTML fallback.
// No login, internal API, cookie, proxy, downloaded video, or external dependency.
import {readFile,writeFile,rename,mkdir,readdir,unlink} from 'node:fs/promises';
import {dateInZone,nbaDate,shiftDate,mapLimit,parsePlayers,getJSON,API} from '../js/data.mjs';
const ROOT=new URL('../data/',import.meta.url),OUT=new URL('highlights/',ROOT);
const CHANNELS=[
 {id:'UCEjOSbbaOfgnfRODEEMYlCw',name:'FreeDawkins',handle:'FreeDawkins'},
 {id:'UCWJ2lWNubArHWmf3FIHbfcQ',name:'NBA',handle:'NBA'},
 {id:'UCPVpbXIiIDwDKVvu68-Vb-A',name:'NBA Japan',handle:'NBAJPN'}
];
const JP_TEAMS={ATL:'ホークス',BOS:'セルティックス',BKN:'ネッツ',CHA:'ホーネッツ',CHI:'ブルズ',CLE:'キャバリアーズ',DAL:'マーベリックス',DEN:'ナゲッツ',DET:'ピストンズ',GS:'ウォリアーズ',GSW:'ウォリアーズ',HOU:'ロケッツ',IND:'ペイサーズ',LAC:'クリッパーズ',LAL:'レイカーズ',MEM:'グリズリーズ',MIA:'ヒート',MIL:'バックス',MIN:'ティンバーウルブズ',NO:'ペリカンズ',NOP:'ペリカンズ',NY:'ニックス',NYK:'ニックス',OKC:'サンダー',ORL:'マジック',PHI:'セブンティシクサーズ',PHX:'サンズ',POR:'トレイルブレイザーズ',SAC:'キングス',SA:'スパーズ',SAS:'スパーズ',TOR:'ラプターズ',UTAH:'ジャズ',UTA:'ジャズ',WSH:'ウィザーズ',WAS:'ウィザーズ'};
const TEAM_NAMES={ATL:'Hawks',BOS:'Celtics',BKN:'Nets',CHA:'Hornets',CHI:'Bulls',CLE:'Cavaliers',DAL:'Mavericks',DEN:'Nuggets',DET:'Pistons',GS:'Warriors',HOU:'Rockets',IND:'Pacers',LAC:'Clippers',LAL:'Lakers',MEM:'Grizzlies',MIA:'Heat',MIL:'Bucks',MIN:'Timberwolves',NO:'Pelicans',NY:'Knicks',OKC:'Thunder',ORL:'Magic',PHI:'76ers',PHX:'Suns',POR:'Trail Blazers',SAC:'Kings',SA:'Spurs',TOR:'Raptors',UTAH:'Jazz',WSH:'Wizards'};
const PLAYER_ALIASES={
 'Victor Wembanyama':['Wemby','ビクターウェンバンヤマ','ヴィクターウェンバンヤマ'],
 'Luka Doncic':['ルカドンチッチ'],'Kyrie Irving':['カイリーアービング'],
 'Cooper Flagg':['クーパーフラッグ'],'Anthony Davis':['アンソニーデイビス'],
 'Stephen Curry':['Steph Curry','ステフィンカリー','ステファンカリー'],
 'LeBron James':['レブロンジェームズ'],'Rui Hachimura':['八村塁'],
 'Yuki Kawamura':['河村勇輝'],'Nikola Jokic':['ニコラヨキッチ'],
 'Shai Gilgeous-Alexander':['シェイギルジャスアレクサンダー'],
 'Giannis Antetokounmpo':['ヤニスアデトクンボ'],'Kevin Durant':['ケビンデュラント'],
 'Jayson Tatum':['ジェイソンテイタム'],'Jalen Brunson':['ジェイレンブランソン']
};
const norm=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&(amp|lt|gt|quot|apos);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e]));
const json=async(url,fallback=null)=>{try{return JSON.parse(await readFile(url,'utf8'));}catch{return fallback;}};
async function atomic(url,value){const temp=new URL(url.href+'.tmp');await writeFile(temp,JSON.stringify(value));await rename(temp,url);}
async function publicText(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'follow'});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 const text=await response.text();if(text.length>6000000)throw new Error('Page too large');return text;
}
// Parse data already present in public HTML; never execute page JavaScript.
function assignedJSON(html,name){
 const match=new RegExp(`(?:var\\s+)?${name}\\s*=\\s*`).exec(html);if(!match)throw new Error('Public page format changed');
 let start=match.index+match[0].length,depth=0,quoted=false,escaped=false;
 for(let i=start;i<html.length;i++){
  const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
  if(c==='"'){quoted=true;continue;}if(c==='{'||c==='[')depth++;if(c==='}'||c===']'){depth--;if(!depth)return JSON.parse(html.slice(start,i+1));}
 }
 throw new Error('Incomplete public page data');
}
function walk(value,fn){if(!value||typeof value!=='object')return;fn(value);for(const child of Object.values(value))walk(child,fn);}
async function discover(channel){
 try{
  const xml=await publicText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
  if(!/<feed[\s>]/.test(xml))throw new Error('Not an Atom feed');
  const videos=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([,entry])=>({id:entry.match(/<yt:videoId>([^<]+)</)?.[1],title:decode(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]),channelId:channel.id})).filter(v=>/^[\w-]{11}$/.test(v.id));
  if(!videos.length)throw new Error('Empty feed');return {videos,method:'rss'};
 }catch{
  const html=await publicText(`https://www.youtube.com/@${channel.handle}/videos`);
  if(!html.includes(`"externalId":"${channel.id}"`))throw new Error('Channel identity not confirmed');
  const raw=assignedJSON(html,'ytInitialData'),videos=[];
  walk(raw,node=>{
   const modern=node.lockupViewModel,classic=node.videoRenderer;
   if(modern?.contentId)videos.push({id:modern.contentId,title:modern.metadata?.lockupMetadataViewModel?.title?.content||'',channelId:channel.id});
   else if(classic?.videoId)videos.push({id:classic.videoId,title:classic.title?.simpleText||classic.title?.runs?.map(r=>r.text).join('')||'',channelId:channel.id});
  });
  const unique=[...new Map(videos.filter(v=>/^[\w-]{11}$/.test(v.id)&&v.title).map(v=>[v.id,v])).values()];
  if(!unique.length)throw new Error('No readable public uploads');return {videos:unique,method:'public-page'};
 }
}
function teamMention(text,team){
 const n=norm(text),name=team.name||'',nickname=name.split(' ').slice(name.endsWith('Trail Blazers')?-2:-1).join(' ');
 const words=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim(),english=` ${words(text)} `;
 return [name,nickname,...(team.code==='POR'?['Trailblazers']:[]),...(team.code==='PHI'?['Sixers','76ers']:[])].filter(Boolean).some(alias=>english.includes(` ${words(alias)} `))||[JP_TEAMS[team.code],...(team.code==='PHI'?['シクサーズ']:[])].filter(Boolean).some(alias=>n.includes(norm(alias)));
}
function conflictingOpponent(text,title,game){
 const current=[JP_TEAMS[game.away.code],JP_TEAMS[game.home.code]];
 const opponents=[title,...[...text.matchAll(/\b(?:vs\.?|versus|against)\s+([^\n|.!?]{1,80})/gi)].map(m=>m[1])];
 return Object.entries(TEAM_NAMES).some(([code,name])=>!current.includes(JP_TEAMS[code])&&opponents.some(part=>teamMention(part,{code,name})));
}
function namedPlayers(text,game){const n=norm(text);return game.roster.filter(p=>[p.name,...(PLAYER_ALIASES[p.name]||[])].some(alias=>n.includes(norm(alias))));}
const MONTHS='january february march april may june july august september october november december'.split(' ');
function datesIn(text,year){
 const found=[];let m;
 const iso=/\b(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\b/g;
 while((m=iso.exec(text)))found.push(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 const english=/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/gi;
 while((m=english.exec(text))){const month=MONTHS.findIndex(x=>x.startsWith(m[1].slice(0,3).toLowerCase()))+1;found.push(`${m[3]||year}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}`);}
 const japanese=/(?:(20\d{2})年)?(\d{1,2})月(\d{1,2})日/g;
 while((m=japanese.exec(text)))found.push(`${m[1]||year}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
 return found;
}
function classify(title){
 if(/全試合|nightly recap|top\s*\d+\s*(plays|dunks)|preview|prediction|reaction|interview|press conference|podcast|season highlights|career highlights|all.time (?:highlights|best|plays)|throwback|compilation/i.test(title))return null;
 return /full\s*game\s*highlights|ゲームハイライト|試合ハイライト/i.test(title)?'game':'player';
}
function claimedStats(title,player){
 const categories=[['pts',/(?:PTS\b|points?\b|得点)/.source],['reb',/(?:REB\b|rebounds?\b|リバウンド)/.source],['ast',/(?:AST\b|assists?\b|アシスト)/.source],['stl',/(?:STL\b|steals?\b|スティール)/.source],['blk',/(?:BLK\b|blocks?\b|ブロック)/.source]];
 const claims=[];
 for(const [key,label]of categories){
  // Never read the trailing digits of a comma-separated career total as game stats.
  const pattern=new RegExp(`(?<![\\d,.])(\\d{1,3})\\s*(\\+)?[\\s–-]*${label}`,'gi');
  for(const m of title.matchAll(pattern)){
   const actual=player[key],value=+m[1],atLeast=!!m[2];
   if(!Number.isFinite(actual)||(atLeast?actual<value:actual!==value))return null;
   claims.push({stat:key,value,atLeast});
  }
 }
 return claims;
}
function matchVideo(video,game,anchors=null){
 if(game.state!=='post'||!video.publishedAt)return null;
 const published=Date.parse(video.publishedAt),start=Date.parse(game.start);
 if(!Number.isFinite(published)||published<start||published>start+72*3600000)return null;
 const type=classify(video.title);if(!type)return null;
 const description=(video.description||'').split(/Never miss|▼|Subscribe|Follow us/i)[0].slice(0,2200),text=video.title+'\n'+description;
 const players=type==='player'?namedPlayers(video.title,game):[];
 if(conflictingOpponent(text,video.title,game))return null;
 if(type==='game' && (!teamMention(text,game.away)||!teamMention(text,game.home)))return null;
 if(type==='player'&&!players.length)return null;
 const japan=video.channelId===CHANNELS[2].id,expected=/日本時間/.test(text)?dateInZone(new Date(game.start),'Asia/Tokyo'):game.date;
 const allowed=japan&&!/日本時間/.test(text)?[game.date,dateInZone(new Date(game.start),'Asia/Tokyo')]:[expected];
 const titleDates=datesIn(video.title,expected.slice(0,4));if(titleDates.some(d=>!allowed.includes(d)))return null;
 const hasDate=datesIn(text,expected.slice(0,4)).some(d=>allowed.includes(d));
 const hasOpponent=type==='game'||players.some(player=>teamMention(text,player.teamId===game.away.id?game.home:game.away));
 // A stated final score must agree. Avoid mistaking season labels and dates for scores.
 const pairs=[...text.matchAll(/\b(\d{2,3})\s*[-–]\s*(\d{2,3})\b/g)].map(m=>[+m[1],+m[2]]).filter(([a,b])=>a>=50&&b>=50);
 if(pairs.some(([a,b])=>!(a===game.away.score&&b===game.home.score||a===game.home.score&&b===game.away.score)))return null;
 const claims=players.length===1?claimedStats(video.title,players[0]):[];
 if(!claims)return null;
 let method='direct',corroboration=[];
 if(!hasDate||!hasOpponent){
  // A second pass may borrow the game identity only from independent direct matches.
  // Never use an inferred match to validate another inferred match.
  if(!anchors||type!=='player'||players.length!==1||published<start+90*60000||published>start+18*3600000||!/highlights?|ハイライト/i.test(text))return null;
  const stats=new Set(claims.map(c=>c.stat));
  if(hasDate ? !stats.size : stats.size<3||!stats.has('pts')||!/tonight|today|今夜|今日/i.test(text))return null;
  corroboration=(anchors.get(game.id)||[]).filter(link=>link.type==='player'&&link.id!==video.id&&link.channelId!==video.channelId&&link.players.some(p=>p.id===players[0].id)).map(link=>link.id);
  if(!corroboration.length)return null;
  method='corroborated';
 }
 return {id:video.id,title:video.title,channel:CHANNELS.find(c=>c.id===video.channelId).name,channelId:video.channelId,type,players:players.map(p=>({id:p.id,name:p.name})),publishedAt:video.publishedAt,matchedAt:new Date().toISOString(),gameDate:game.date,matchEvidence:{method,dated:hasDate,opponent:hasOpponent,stats:claims,...(corroboration.length?{corroboratingVideoIds:corroboration}:{})}};
}
async function inspect(candidate){
 const html=await publicText(`https://www.youtube.com/watch?v=${candidate.id}`),raw=assignedJSON(html,'ytInitialPlayerResponse'),v=raw.videoDetails,m=raw.microformat?.playerMicroformatRenderer;
 if(v?.videoId!==candidate.id||v.channelId!==candidate.channelId||!v.title||!m?.publishDate)throw new Error('Video identity or publication date unavailable');
 return {id:candidate.id,title:v.title,channelId:v.channelId,description:v.shortDescription||'',publishedAt:m.publishDate,checkedAt:new Date().toISOString()};
}
await mkdir(OUT,{recursive:true});
const supplied=process.argv.slice(2);if(supplied.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))throw new Error('Dates must be YYYY-MM-DD');
const slateFiles=(await readdir(ROOT)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f));
const dates=supplied.length?supplied:[...new Set([...slateFiles.map(f=>f.slice(0,10)),nbaDate(),shiftDate(nbaDate(),-1)])];
const slates=[],games=[];
for(const date of dates){const slate=await json(new URL(`${date}.json`,ROOT));if(!slate||slate.date!==date)continue;slates.push(slate);for(const g of slate.games.filter(g=>g.state==='post'))games.push({...g,date,roster:[...g.away.players.map(p=>({...p,teamId:g.away.id})),...g.home.players.map(p=>({...p,teamId:g.home.id}))]});}
if(!slates.length)throw new Error('No scoreboard snapshots available');
// All played athletes, rather than only the displayed five, are eligible for highlights.
await mapLimit(games,3,async g=>{try{const raw=await getJSON(`${API}/apis/site/v2/sports/basketball/nba/summary?event=${g.id}`);const all=[...parsePlayers(raw.boxscore,g.away.id).all.map(p=>({...p,teamId:g.away.id})),...parsePlayers(raw.boxscore,g.home.id).all.map(p=>({...p,teamId:g.home.id}))];if(all.length)g.roster=all;}catch{g.rosterPartial=true;}});
const catalog=await json(new URL('catalog.json',OUT),{videos:{}}),candidates=new Map(),sources=[];
await mapLimit(CHANNELS,3,async channel=>{
 try{const result=await discover(channel);sources.push({channel:channel.name,ok:true,method:result.method,count:result.videos.length});for(const v of result.videos)candidates.set(v.id,v);}
 catch(e){sources.push({channel:channel.name,ok:false,error:e.message});}
});
const docs=new Map();for(const slate of slates){const old=await json(new URL(`${slate.date}.json`,OUT),{});docs.set(slate.date,{schema:1,date:slate.date,checkedAt:new Date().toISOString(),sources,games:old.games||{}});}
let inspected=0,accepted=0,failed=0;
const pending=[...candidates.values()].filter(v=>{
 if(!classify(v.title))return false;
 return games.some(g=>{const dated=datesIn(v.title,g.date.slice(0,4));if(dated.length&&!dated.includes(g.date)&&!dated.includes(dateInZone(new Date(g.start),'Asia/Tokyo')))return false;return classify(v.title)==='game'?teamMention(v.title,g.away)&&teamMention(v.title,g.home):namedPlayers(v.title,g).length>0||v.channelId===CHANNELS[2].id&&/得点|リバウンド|アシスト|ブロック|ハイライト/.test(v.title);});
});
await mapLimit(pending,3,async candidate=>{
 try{
  let video=catalog.videos[candidate.id];
  if(!video||video.title!==candidate.title||Date.now()-Date.parse(video.checkedAt)>6*3600000){video=await inspect(candidate);catalog.videos[video.id]=video;inspected++;}
 }catch{failed++;}
});
// Match the recent catalog as well as this run's discoveries so an RSS-window change
// or temporarily unavailable watch page does not discard previously checked metadata.
const videos=Object.values(catalog.videos).filter(v=>CHANNELS.some(c=>c.id===v.channelId)),anchors=new Map(),matches=new Map();
function uniqueMatch(video,corroboration=null){const hits=games.map(game=>({game,link:matchVideo(video,game,corroboration)})).filter(x=>x.link);return hits.length===1?hits[0]:null;}
for(const video of videos){const hit=uniqueMatch(video);if(!hit)continue;matches.set(video.id,hit);const list=anchors.get(hit.game.id)||[];anchors.set(hit.game.id,[...list,hit.link]);}
for(const video of videos){if(matches.has(video.id))continue;const hit=uniqueMatch(video,anchors);if(hit)matches.set(video.id,hit);}
for(const {game,link}of matches.values()){const doc=docs.get(game.date),prior=doc.games[game.id]||[];doc.games[game.id]=[...prior.filter(v=>v.id!==link.id),link];accepted++;}
for(const [date,doc]of docs){
 for(const id of Object.keys(doc.games)){
  const game=games.find(g=>g.id===id&&g.date===date);if(!game){delete doc.games[id];continue;}
  doc.games[id]=doc.games[id].filter(link=>{
   const validSaved=link.gameDate===date&&CHANNELS.some(c=>c.id===link.channelId)&&/^[\w-]{11}$/.test(link.id);
   if(!validSaved)return false;
   if(!catalog.videos[link.id]||matches.get(link.id)?.game.id===id)return true;
   // A failed full-roster lookup leaves only the displayed five. Keep previously
   // verified links for other athletes until their roster can be checked again.
   return game.rosterPartial&&link.type==='player'&&link.players?.some(p=>!game.roster.some(r=>r.id===p.id));
  }).sort((a,b)=>CHANNELS.findIndex(c=>c.id===a.channelId)-CHANNELS.findIndex(c=>c.id===b.channelId)||Date.parse(a.publishedAt)-Date.parse(b.publishedAt));
 }
 doc.lookupPartial=sources.some(s=>!s.ok)||failed>0||games.some(g=>g.date===date&&g.rosterPartial);await atomic(new URL(`${date}.json`,OUT),doc);
 console.log(`${date}: ${Object.values(doc.games).flat().length} game-matched YouTube links`);
}
// Keep a bounded recent metadata catalog; dated matched links form the public archive.
const cutoff=Date.now()-30*86400000;
catalog.videos=Object.fromEntries(Object.entries(catalog.videos).filter(([,v])=>Date.parse(v.publishedAt)>=cutoff));
await atomic(new URL('catalog.json',OUT),catalog);
const archive=(await readdir(OUT)).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();for(const f of archive.slice(60))await unlink(new URL(f,OUT));
console.log(`Sources: ${sources.map(s=>`${s.channel}: ${s.ok?s.method:s.error}`).join('; ')}. Inspected ${inspected}, matched ${accepted}, unavailable ${failed}.`);
if(sources.every(s=>!s.ok))process.exitCode=1;
